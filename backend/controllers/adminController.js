import { User } from "../models/userModel.js";
import { Instrument } from "../models/instrumentModel.js";
import { BuyOrder } from "../models/buyOrderModel.js";
import { RentOrder } from "../models/rentOrderModel.js";
import { AdminActivity } from "../models/adminActivityModel.js";
import { Notification } from "../models/notificationModel.js";
import { getLowStockOverview } from "../services/inventoryAlertService.js";
import {
  sendBuyOrderStatusEmail,
  sendBuyReturnUpdateEmail,
} from "../services/emailService.js";

const BUY_ORDER_STATUSES = [
  "placed",
  "processing",
  "shipped",
  "arrived",
  "cancelled",
  "returned",
];

const USER_ROLES = ["user", "admin"];
const DEFAULT_NOTIFICATION_LIMIT = 20;
const MAX_NOTIFICATION_LIMIT = 100;

const buildMonthSeries = (aggRows, startMonthDate) => {
  const countsByMonth = new Map(
    aggRows.map((row) => {
      const key = `${row._id.year}-${String(row._id.month).padStart(2, "0")}`;
      return [key, row.count];
    })
  );

  const series = [];
  for (let i = 0; i < 12; i += 1) {
    const date = new Date(startMonthDate);
    date.setMonth(startMonthDate.getMonth() + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    series.push({
      monthKey: key,
      monthLabel: date.toLocaleString("en-US", { month: "short" }),
      year: date.getFullYear(),
      count: countsByMonth.get(key) || 0,
    });
  }

  return series;
};

const sanitizeLimit = (value, fallback = DEFAULT_NOTIFICATION_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_NOTIFICATION_LIMIT);
};

const formatUserName = (user) => {
  if (!user) return "Unknown user";
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return fullName || user.email || "Unknown user";
};

export const getAdminNotifications = async (req, res) => {
  try {
    const adminId = req.id;
    const limit = sanitizeLimit(req.query.limit);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: adminId, forAdmin: true })
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({
        user: adminId,
        forAdmin: true,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications.map((notification) => ({
        ...notification,
        userName: formatUserName(notification.userId),
        isRead: Boolean(notification.isRead ?? notification.read),
      })),
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markAdminNotificationRead = async (req, res) => {
  try {
    const adminId = req.id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: adminId, forAdmin: true },
      { isRead: true, read: true },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const unreadCount = await Notification.countDocuments({
      user: adminId,
      forAdmin: true,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        ...notification,
        isRead: true,
      },
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markAllAdminNotificationsRead = async (req, res) => {
  try {
    const adminId = req.id;
    const updateResult = await Notification.updateMany(
      { user: adminId, forAdmin: true, isRead: false },
      { $set: { isRead: true, read: true } }
    );

    return res.status(200).json({
      success: true,
      updatedCount: updateResult.modifiedCount || 0,
      unreadCount: 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllBuyOrders = async (_req, res) => {
  try {
    const orders = await BuyOrder.find()
      .populate("user", "firstName lastName email")
      .populate("items.instrument", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllRentOrders = async (_req, res) => {
  try {
    // Legacy bug fix: normalize old completed orders to paid.
    await RentOrder.updateMany(
      { status: "completed", paymentStatus: "pending" },
      { $set: { paymentStatus: "paid" } }
    );

    const orders = await RentOrder.find()
      .populate("user", "firstName lastName email")
      .populate("instrument", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBuyOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.id;

    if (!status || !BUY_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${BUY_ORDER_STATUSES.join(
          ", "
        )}`,
      });
    }

    const existingOrder = await BuyOrder.findById(id).populate("user", "email");
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Buy order not found",
      });
    }

    const previousStatus = existingOrder.status;
    const updates = { status };
    if (status === "arrived") {
      updates.paymentStatus = "paid";
      if (!existingOrder.deliveredAt) {
        updates.deliveredAt = new Date();
      }
    }

    const order = await BuyOrder.findByIdAndUpdate(id, updates, {
      new: true,
    }).populate("user", "email");

    await AdminActivity.create({
      admin: adminId,
      action: "UPDATE_BUY_ORDER_STATUS",
      meta: { buyOrderId: id, status },
    });

    if (previousStatus !== status && order?.user?.email) {
      sendBuyOrderStatusEmail({
        to: order.user.email,
        order,
        status,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Buy order status updated",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBuyOrderReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote = "" } = req.body;
    const adminId = req.id;
    const allowedStatuses = ["approved", "rejected", "returned"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid return status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    const order = await BuyOrder.findById(id).populate("user", "email");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Buy order not found",
      });
    }

    const currentReturnStatus = order.returnRequest?.status || "none";
    if (status === "approved" && currentReturnStatus !== "requested") {
      return res.status(400).json({
        success: false,
        message: "Only requested returns can be approved",
      });
    }

    if (status === "rejected" && currentReturnStatus !== "requested") {
      return res.status(400).json({
        success: false,
        message: "Only requested returns can be rejected",
      });
    }

    if (status === "returned" && currentReturnStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved returns can be marked as returned",
      });
    }

    order.returnRequest = {
      ...order.returnRequest,
      status,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      adminNote: String(adminNote || "").trim(),
      refundStatus:
        status === "approved"
          ? "initiated"
          : status === "returned"
            ? "completed"
            : "none",
      refundInitiatedAt: status === "approved" ? new Date() : order.returnRequest?.refundInitiatedAt,
      refundCompletedAt: status === "returned" ? new Date() : null,
      returnedAt: status === "returned" ? new Date() : null,
    };

    if (status === "returned") {
      order.status = "returned";
      order.paymentStatus = "refunded";
    }

    await order.save();

    await AdminActivity.create({
      admin: adminId,
      action: "UPDATE_BUY_RETURN_STATUS",
      meta: { buyOrderId: id, returnStatus: status },
    });

    if (order.user?.email) {
      sendBuyReturnUpdateEmail({
        to: order.user.email,
        order,
        returnStatus: status,
        reason: order.returnRequest?.reason,
        adminNote: order.returnRequest?.adminNote,
        refundStatus: order.returnRequest?.refundStatus,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Return status updated to ${status}`,
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBuyOrderRefundStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { refundStatus } = req.body;
    const adminId = req.id;
    const allowedRefundStatuses = ["none", "initiated", "completed"];

    if (!allowedRefundStatuses.includes(refundStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid refund status. Allowed values: ${allowedRefundStatuses.join(", ")}`,
      });
    }

    const order = await BuyOrder.findById(id).populate("user", "email");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Buy order not found",
      });
    }

    const currentReturnStatus = order.returnRequest?.status || "none";
    if (["none", "requested", "rejected"].includes(currentReturnStatus) && refundStatus !== "none") {
      return res.status(400).json({
        success: false,
        message: "Refund can be updated only for approved/returned requests",
      });
    }

    order.returnRequest = {
      ...order.returnRequest,
      refundStatus,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      refundInitiatedAt:
        refundStatus === "initiated"
          ? order.returnRequest?.refundInitiatedAt || new Date()
          : order.returnRequest?.refundInitiatedAt || null,
      refundCompletedAt:
        refundStatus === "completed" ? new Date() : order.returnRequest?.refundCompletedAt || null,
    };

    if (refundStatus === "completed") {
      order.paymentStatus = "refunded";
    }

    await order.save();

    await AdminActivity.create({
      admin: adminId,
      action: "UPDATE_BUY_REFUND_STATUS",
      meta: { buyOrderId: id, refundStatus },
    });

    if (order.user?.email) {
      sendBuyReturnUpdateEmail({
        to: order.user.email,
        order,
        returnStatus: order.returnRequest?.status,
        reason: order.returnRequest?.reason,
        adminNote: order.returnRequest?.adminNote,
        refundStatus,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Refund status updated to ${refundStatus}`,
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const approveRentOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.id;

    const order = await RentOrder.findByIdAndUpdate(
      id,
      { status: "approved", approvalBy: adminId },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Rent order not found",
      });
    }

    await AdminActivity.create({
      admin: adminId,
      action: "APPROVE_RENT",
      meta: { rentOrderId: id },
    });

    return res.status(200).json({
      success: true,
      message: "Rent order approved",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const rejectRentOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.id;

    const order = await RentOrder.findByIdAndUpdate(
      id,
      { status: "rejected", approvalBy: adminId },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Rent order not found",
      });
    }

    await AdminActivity.create({
      admin: adminId,
      action: "REJECT_RENT",
      meta: { rentOrderId: id },
    });

    return res.status(200).json({
      success: true,
      message: "Rent order rejected",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markRentOrderActive = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.id;

    const order = await RentOrder.findByIdAndUpdate(
      id,
      { status: "active", approvalBy: adminId },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Rent order not found",
      });
    }

    await AdminActivity.create({
      admin: adminId,
      action: "MARK_RENT_ACTIVE",
      meta: { rentOrderId: id },
    });

    return res.status(200).json({
      success: true,
      message: "Rent order marked active",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markRentOrderCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.id;

    const order = await RentOrder.findByIdAndUpdate(
      id,
      {
        status: "completed",
        paymentStatus: "paid",
        approvalBy: adminId,
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Rent order not found",
      });
    }

    await AdminActivity.create({
      admin: adminId,
      action: "MARK_RENT_COMPLETED",
      meta: { rentOrderId: id },
    });

    return res.status(200).json({
      success: true,
      message: "Rent order marked completed",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllUsersAdmin = async (_req, res) => {
  try {
    const users = await User.find()
      .select("-password -otp -otpExpiry -token")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isVerified } = req.body;
    const adminId = req.id;

    const updates = {};

    if (role !== undefined) {
      if (!USER_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Allowed values: ${USER_ROLES.join(", ")}`,
        });
      }
      updates.role = role;
    }

    if (isVerified !== undefined) {
      updates.isVerified = Boolean(isVerified);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update",
      });
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select(
      "-password -otp -otpExpiry -token"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await AdminActivity.create({
      admin: adminId,
      action: "UPDATE_USER_ACCOUNT",
      meta: { userId: id, updates },
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAnalyticsSummary = async (_req, res) => {
  try {
    const startMonthDate = new Date();
    startMonthDate.setDate(1);
    startMonthDate.setHours(0, 0, 0, 0);
    startMonthDate.setMonth(startMonthDate.getMonth() - 11);

    const [
      totalUsers,
      totalInstruments,
      totalBuyOrders,
      totalRentOrders,
      buyRevenueAgg,
      rentRevenueAgg,
      buyMonthlyAgg,
      rentMonthlyAgg,
      lowStockOverview,
    ] = await Promise.all([
      User.countDocuments(),
      Instrument.countDocuments(),
      BuyOrder.countDocuments(),
      RentOrder.countDocuments(),
      BuyOrder.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            status: { $in: ["arrived", "completed"] },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      RentOrder.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalRent" },
          },
        },
      ]),
      BuyOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startMonthDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      RentOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startMonthDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      getLowStockOverview(),
    ]);

    const buyRevenue = buyRevenueAgg[0]?.totalRevenue || 0;
    const rentRevenue = rentRevenueAgg[0]?.totalRevenue || 0;
    const totalRevenue = buyRevenue + rentRevenue;

    const monthlyBuyOrders = buildMonthSeries(buyMonthlyAgg, startMonthDate);
    const monthlyRentOrders = buildMonthSeries(rentMonthlyAgg, startMonthDate);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalInstruments,
        totalBuyOrders,
        totalRentOrders,
        totalRevenue,
        buyRevenue,
        rentRevenue,
        monthlyBuyOrders,
        monthlyRentOrders,
        lowStock: lowStockOverview,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

