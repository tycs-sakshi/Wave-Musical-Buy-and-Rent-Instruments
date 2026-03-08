import "dotenv/config";
import { Instrument } from "../models/instrumentModel.js";
import { Notification } from "../models/notificationModel.js";
import { User } from "../models/userModel.js";
import { sendOrderEmail } from "./emailService.js";

const STOCK_STATE = {
  NORMAL: "normal",
  LOW: "low",
  OUT: "out",
};

export const getLowStockThreshold = () => {
  const parsed = Number(process.env.LOW_STOCK_THRESHOLD);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 5;
  }
  return Math.floor(parsed);
};

const getStockState = (stock, threshold) => {
  const safeStock = Number.isFinite(Number(stock)) ? Number(stock) : 0;
  if (safeStock <= 0) return STOCK_STATE.OUT;
  if (safeStock <= threshold) return STOCK_STATE.LOW;
  return STOCK_STATE.NORMAL;
};

const buildStockAlertMessage = (instrumentName, stock, threshold) => {
  if (stock <= 0) {
    return {
      title: "Out of Stock",
      message: `${instrumentName} is out of stock and needs immediate restock.`,
      badge: "Out of Stock",
    };
  }

  return {
    title: "Low Stock",
    message: `${instrumentName} is running low (${stock} left, threshold: ${threshold}).`,
    badge: "Low Stock",
  };
};

const stockEmailEnabled = () =>
  String(process.env.ENABLE_STOCK_ALERT_EMAIL || "true").toLowerCase() !==
  "false";

const hasRecentAlert = async (adminId, instrumentId, state) => {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const recent = await Notification.findOne({
    user: adminId,
    type: "system",
    "meta.instrumentId": String(instrumentId),
    "meta.stockState": state,
    createdAt: { $gte: since },
  }).lean();

  return Boolean(recent);
};

export const notifyAdminsForStockTransition = async ({
  instrument,
  previousStock,
  nextStock,
}) => {
  try {
    if (!instrument?._id) return;

    const threshold = getLowStockThreshold();
    const prevState =
      previousStock === undefined || previousStock === null
        ? STOCK_STATE.NORMAL
        : getStockState(previousStock, threshold);
    const nextState = getStockState(nextStock, threshold);

    if (nextState === STOCK_STATE.NORMAL || prevState === nextState) {
      return;
    }

    const admins = await User.find({ role: "admin" })
      .select("_id firstName lastName email")
      .lean();

    if (!admins.length) return;

    const { title, message, badge } = buildStockAlertMessage(
      instrument.name || "Instrument",
      Number(nextStock) || 0,
      threshold
    );

    for (const admin of admins) {
      const skip = await hasRecentAlert(admin._id, instrument._id, nextState);
      if (skip) continue;

      await Notification.create({
        user: admin._id,
        title,
        message,
        type: "system",
        meta: {
          instrumentId: String(instrument._id),
          instrumentName: instrument.name || "Instrument",
          stock: Number(nextStock) || 0,
          threshold,
          stockState: nextState,
        },
      });

      if (stockEmailEnabled() && admin.email) {
        sendOrderEmail({
          to: admin.email,
          subject: `[Inventory Alert] ${title}: ${instrument.name || "Instrument"}`,
          html: `
            <div style="font-family:Segoe UI,Arial,sans-serif;padding:16px;color:#0f172a;">
              <h2 style="margin:0 0 10px;color:#be123c;">${title}</h2>
              <p style="margin:0 0 12px;">${message}</p>
              <div style="background:#fff7ed;border:1px solid #fed7aa;padding:12px;border-radius:8px;">
                <p style="margin:0 0 6px;"><strong>Instrument:</strong> ${instrument.name || "Instrument"}</p>
                <p style="margin:0 0 6px;"><strong>Status:</strong> ${badge}</p>
                <p style="margin:0;"><strong>Current Stock:</strong> ${Number(nextStock) || 0}</p>
              </div>
            </div>
          `,
        });
      }
    }
  } catch (error) {
    // Best-effort alerting: order/instrument flows should not fail because of reminder delivery.
    console.error("Stock alert dispatch failed:", error.message);
  }
};

export const getLowStockOverview = async () => {
  const threshold = getLowStockThreshold();
  const instruments = await Instrument.find({ stock: { $lte: threshold } })
    .select("name stock category updatedAt")
    .populate("category", "name")
    .sort({ stock: 1, updatedAt: -1 })
    .lean();

  const normalized = (instruments || []).map((item) => ({
    _id: item._id,
    name: item.name,
    stock: Number(item.stock) || 0,
    category: item.category?.name || "-",
    status: Number(item.stock) <= 0 ? "out" : "low",
    updatedAt: item.updatedAt,
  }));

  return {
    threshold,
    outOfStockCount: normalized.filter((item) => item.status === "out").length,
    lowStockCount: normalized.filter((item) => item.status === "low").length,
    instruments: normalized,
  };
};

