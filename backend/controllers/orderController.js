import { BuyOrder } from "../models/buyOrderModel.js";
import { RentOrder } from "../models/rentOrderModel.js";
import { Instrument } from "../models/instrumentModel.js";
import { Notification } from "../models/notificationModel.js";
import { Deal } from "../models/dealModel.js";
import { User } from "../models/userModel.js";
import {
  sendBuyOrderStatusEmail,
  sendBuyReturnUpdateEmail,
  sendOrderEmail,
  sendRentalReturnSummaryEmail,
} from "../services/emailService.js";
import { notifyAdminsForStockTransition } from "../services/inventoryAlertService.js";
import {
  buildPricingSummary,
  calculateBuyItemAmounts,
  calculateRentAmounts,
  getShippingCharge,
} from "../services/pricingService.js";
import {
  deactivateExpiredDeals,
  getActiveDealCriteria,
} from "../services/dealLifecycleService.js";

const isValidObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ""));

const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Invalid dates" };
  }

  if (end <= start) {
    return { error: "End date must be after start date" };
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return { days: diffDays, start, end };
};

const isValidShippingAddress = (shippingAddress) => {
  if (!shippingAddress || typeof shippingAddress !== "object") {
    return false;
  }

  const requiredFields = [
    "line1",
    "line2",
    "city",
    "state",
    "country",
    "postalCode",
  ];

  return requiredFields.every((field) =>
    String(shippingAddress[field] || "").trim()
  );
};

const INDIA_COUNTRY = "india";
const MAHARASHTRA_STATE = "maharashtra";
const BUY_RETURN_WINDOW_DAYS = Math.max(
  1,
  Number(process.env.BUY_RETURN_WINDOW_DAYS) || 7
);
const RENT_LATE_FEE_MULTIPLIER = Math.max(
  0,
  Number(process.env.RENT_LATE_FEE_MULTIPLIER) || 1
);
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

const normalizeAddressValue = (value) => String(value || "").trim().toLowerCase();
const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const ORDER_TYPE = {
  PURCHASE: "Purchase",
  RENT: "Rent",
};

const summarizeInstrumentNames = (names = []) => {
  const cleanedNames = (names || [])
    .map((name) => String(name || "").trim())
    .filter(Boolean);

  if (!cleanedNames.length) return "Instrument";
  if (cleanedNames.length === 1) return cleanedNames[0];
  return `${cleanedNames[0]} + ${cleanedNames.length - 1} more`;
};

const createAdminOrderNotifications = async ({
  placedByUserId,
  orderId,
  orderType,
  instrumentName,
}) => {
  const adminUsers = await User.find({ role: "admin" }).select("_id");
  if (!adminUsers.length) return;

  const message =
    orderType === ORDER_TYPE.PURCHASE
      ? "New Purchase Order Placed by User"
      : "New Rental Order Placed by User";

  const notificationDocs = adminUsers.map((admin) => ({
    user: admin._id,
    userId: placedByUserId,
    orderId,
    orderType,
    instrumentName: instrumentName || "Instrument",
    title: message,
    message,
    type: orderType === ORDER_TYPE.PURCHASE ? "order" : "rent",
    forAdmin: true,
    isRead: false,
    read: false,
  }));

  await Notification.insertMany(notificationDocs);
};

const normalizeLegacyRentPricing = (order) => {
  if (!order) return order;

  const subtotal = Number(order?.subtotal);
  const gstRate = Number(order?.gstRate);
  const gstAmount = Number(order?.gstAmount);
  const shippingCharge = Number(order?.shippingCharge);
  const totalRent = Number(order?.totalRent);
  const days = Number(order?.days);
  const rentPricePerDay = Number(order?.rentPricePerDay);

  if (!Number.isFinite(days) || days < 1) {
    const start = order?.startDate ? new Date(order.startDate) : null;
    const end = order?.endDate ? new Date(order.endDate) : null;
    const derivedDays =
      start &&
      end &&
      Number.isFinite(start.getTime()) &&
      Number.isFinite(end.getTime()) &&
      end > start
        ? Math.ceil((end.getTime() - start.getTime()) / ONE_DAY_MS)
        : 1;
    order.days = Math.max(1, derivedDays);
  }

  if (!Number.isFinite(subtotal)) {
    order.subtotal = Number.isFinite(totalRent) ? roundMoney(totalRent) : 0;
  }

  if (!Number.isFinite(gstRate)) {
    order.gstRate = 0;
  }

  if (!Number.isFinite(gstAmount)) {
    order.gstAmount = 0;
  }

  if (!Number.isFinite(shippingCharge)) {
    order.shippingCharge = 0;
  }

  if (!Number.isFinite(totalRent)) {
    order.totalRent = roundMoney(
      Number(order.subtotal || 0) +
        Number(order.gstAmount || 0) +
        Number(order.shippingCharge || 0)
    );
  }

  if (!Number.isFinite(rentPricePerDay) || rentPricePerDay < 0) {
    const safeDays = Math.max(1, Number(order.days) || 1);
    order.rentPricePerDay = roundMoney(Number(order.subtotal || 0) / safeDays);
  }

  return order;
};

const buildInstrumentMap = async (instrumentIds) => {
  const uniqueInstrumentIds = [...new Set(instrumentIds.map(String))];
  const instruments = await Instrument.find({
    _id: { $in: uniqueInstrumentIds },
  }).populate("category", "name slug gstRate");

  const instrumentMap = new Map();
  instruments.forEach((instrument) =>
    instrumentMap.set(String(instrument._id), instrument)
  );

  return { instruments, instrumentMap, uniqueInstrumentIds };
};

const loadActiveDealsMap = async ({ dealIds, dealType }) => {
  const uniqueDealIds = [...new Set((dealIds || []).filter(isValidObjectId))];
  if (uniqueDealIds.length === 0) {
    return new Map();
  }

  await deactivateExpiredDeals();
  const deals = await Deal.find({
    _id: { $in: uniqueDealIds },
    ...getActiveDealCriteria(dealType),
  });

  const dealMap = new Map();
  deals.forEach((deal) => dealMap.set(String(deal._id), deal));
  return dealMap;
};

const normalizeBuyItem = (item = {}) => ({
  type: "buy",
  instrumentId: String(item.instrumentId || ""),
  quantity: Number(item.quantity) || 0,
  dealId: item.dealId ? String(item.dealId) : null,
});

const normalizeRentItem = (item = {}) => ({
  type: "rent",
  instrumentId: String(item.instrumentId || ""),
  days: Number(item.days) || 0,
  startDate: item.startDate,
  endDate: item.endDate,
  dealId: item.dealId ? String(item.dealId) : null,
});

const applyDealToBuyItem = ({ dealMap, item, instrument }) => {
  if (!item.dealId) return null;
  const deal = dealMap.get(String(item.dealId));
  if (!deal) return null;
  if (String(deal.instrumentId) !== String(instrument._id)) return null;
  return deal;
};

const applyDealToRentItem = ({ dealMap, item, instrument }) => {
  if (!item.dealId) return null;
  const deal = dealMap.get(String(item.dealId));
  if (!deal) return null;
  if (String(deal.instrumentId) !== String(instrument._id)) return null;
  return deal;
};

const buildBuyQuote = async (rawItems) => {
  const buyItems = (rawItems || [])
    .filter((item) => item?.type === "buy")
    .map(normalizeBuyItem);

  if (buyItems.length === 0) {
    return {
      items: [],
      subtotal: 0,
      gstAmount: 0,
      shippingCharge: 0,
      total: 0,
    };
  }

  if (buyItems.some((item) => !isValidObjectId(item.instrumentId))) {
    throw new Error("Each buy item must include a valid instrumentId");
  }

  const instrumentIds = buyItems.map((item) => item.instrumentId);
  const { instrumentMap, uniqueInstrumentIds } = await buildInstrumentMap(
    instrumentIds
  );

  if (instrumentMap.size !== uniqueInstrumentIds.length) {
    throw new Error("One or more instruments are unavailable");
  }

  const dealMap = await loadActiveDealsMap({
    dealIds: buyItems.map((item) => item.dealId),
    dealType: "buy",
  });

  const quoteItems = [];
  let subtotal = 0;
  let gstAmount = 0;

  for (const item of buyItems) {
    if (!item.instrumentId || item.quantity <= 0) {
      throw new Error("Each buy item must include a valid instrumentId and quantity");
    }

    const instrument = instrumentMap.get(item.instrumentId);
    if (!instrument || !instrument.isAvailableForBuy) {
      throw new Error("One or more instruments are not available for buy");
    }

    const appliedDeal = applyDealToBuyItem({ dealMap, item, instrument });
    const unitPrice = appliedDeal ? appliedDeal.dealPrice : instrument.price;
    const amounts = calculateBuyItemAmounts({
      instrument,
      quantity: item.quantity,
      unitPrice,
    });

    subtotal += amounts.taxableAmount;
    gstAmount += amounts.gstAmount;

    quoteItems.push({
      type: "buy",
      instrumentId: item.instrumentId,
      name: instrument.name,
      quantity: amounts.quantity,
      price: amounts.unitPrice,
      subtotal: amounts.taxableAmount,
      gstRate: amounts.gstRate,
      gstAmount: amounts.gstAmount,
      lineTotal: amounts.lineTotal,
      dealId: appliedDeal ? appliedDeal._id : null,
      categoryName: instrument.category?.name || "",
    });
  }

  const summary = buildPricingSummary({
    subtotal,
    gstAmount,
    shippingCharge: getShippingCharge("buy", subtotal),
  });

  return {
    items: quoteItems,
    ...summary,
  };
};

const buildRentQuote = async (rawItems) => {
  const rentItems = (rawItems || [])
    .filter((item) => item?.type === "rent")
    .map(normalizeRentItem);

  if (rentItems.length === 0) {
    return {
      items: [],
      subtotal: 0,
      gstAmount: 0,
      shippingCharge: 0,
      total: 0,
    };
  }

  if (rentItems.some((item) => !isValidObjectId(item.instrumentId))) {
    throw new Error("Each rent item must include a valid instrumentId");
  }

  const instrumentIds = rentItems.map((item) => item.instrumentId);
  const { instrumentMap, uniqueInstrumentIds } = await buildInstrumentMap(
    instrumentIds
  );

  if (instrumentMap.size !== uniqueInstrumentIds.length) {
    throw new Error("One or more instruments are unavailable");
  }

  const dealMap = await loadActiveDealsMap({
    dealIds: rentItems.map((item) => item.dealId),
    dealType: "rent",
  });

  const quoteItems = [];
  let subtotal = 0;
  let gstAmount = 0;

  for (const item of rentItems) {
    if (!item.instrumentId) {
      throw new Error("Each rent item must include a valid instrumentId");
    }

    const instrument = instrumentMap.get(item.instrumentId);
    if (!instrument || !instrument.isAvailableForRent) {
      throw new Error("One or more instruments are not available for rent");
    }

    const inferredDays =
      item.days > 0
        ? item.days
        : calculateDays(item.startDate, item.endDate).days || 0;

    if (!Number.isFinite(inferredDays) || inferredDays <= 0) {
      throw new Error("Each rent item must include valid rental dates");
    }

    const appliedDeal = applyDealToRentItem({ dealMap, item, instrument });
    const rentPricePerDay = appliedDeal
      ? appliedDeal.dealPrice
      : instrument.rentPricePerDay;

    const amounts = calculateRentAmounts({
      instrument,
      days: inferredDays,
      rentPricePerDay,
      deposit: instrument.rentDeposit || 0,
      shippingCharge: getShippingCharge(
        "rent",
        inferredDays * rentPricePerDay + (instrument.rentDeposit || 0)
      ),
    });

    subtotal += amounts.subtotal;
    gstAmount += amounts.gstAmount;

    quoteItems.push({
      type: "rent",
      instrumentId: item.instrumentId,
      name: instrument.name,
      days: amounts.days,
      rentPricePerDay: amounts.rentPricePerDay,
      deposit: amounts.deposit,
      subtotal: amounts.subtotal,
      gstRate: amounts.gstRate,
      gstAmount: amounts.gstAmount,
      lineTotal: amounts.total,
      dealId: appliedDeal ? appliedDeal._id : null,
      categoryName: instrument.category?.name || "",
      startDate: item.startDate,
      endDate: item.endDate,
    });
  }

  const summary = buildPricingSummary({
    subtotal,
    gstAmount,
    shippingCharge: getShippingCharge("rent", subtotal),
  });

  return {
    items: quoteItems,
    ...summary,
  };
};

export const getOrderQuote = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items array is required",
      });
    }

    const [buyQuote, rentQuote] = await Promise.all([
      buildBuyQuote(items),
      buildRentQuote(items),
    ]);

    const overall = buildPricingSummary({
      subtotal: buyQuote.subtotal + rentQuote.subtotal,
      gstAmount: buyQuote.gstAmount + rentQuote.gstAmount,
      shippingCharge: buyQuote.shippingCharge + rentQuote.shippingCharge,
    });

    return res.status(200).json({
      success: true,
      data: {
        buy: buyQuote,
        rent: rentQuote,
        ...overall,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to calculate quote",
    });
  }
};

export const createBuyOrder = async (req, res) => {
  try {
    const userId = req.id;
    const { items, shippingAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    if (!isValidShippingAddress(shippingAddress)) {
      return res.status(400).json({
        success: false,
        message:
          "A complete shipping address is required (line1, line2, city, state, country, postalCode)",
      });
    }

    if (normalizeAddressValue(shippingAddress.country) !== INDIA_COUNTRY) {
      return res.status(400).json({
        success: false,
        message: "Orders are supported only for India",
      });
    }

    const normalizedItems = items.map(normalizeBuyItem);
    if (normalizedItems.some((item) => !isValidObjectId(item.instrumentId))) {
      return res.status(400).json({
        success: false,
        message: "Each item must have a valid instrumentId",
      });
    }

    const instrumentIds = normalizedItems.map((item) => item.instrumentId);
    const { instruments, instrumentMap, uniqueInstrumentIds } = await buildInstrumentMap(
      instrumentIds
    );

    const availableForBuyCount = instruments.filter(
      (instrument) => instrument.isAvailableForBuy
    ).length;

    if (
      instrumentMap.size !== uniqueInstrumentIds.length ||
      availableForBuyCount !== uniqueInstrumentIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more instruments are not available for buy",
      });
    }

    const dealMap = await loadActiveDealsMap({
      dealIds: normalizedItems.map((item) => item.dealId),
      dealType: "buy",
    });

    const requiredQuantityByInstrument = new Map();
    for (const item of normalizedItems) {
      requiredQuantityByInstrument.set(
        item.instrumentId,
        (requiredQuantityByInstrument.get(item.instrumentId) || 0) + item.quantity
      );
    }

    for (const [instrumentId, totalQuantity] of requiredQuantityByInstrument.entries()) {
      const instrument = instrumentMap.get(instrumentId);
      if (!instrument) {
        return res.status(400).json({
          success: false,
          message: "Instrument not found or not available",
        });
      }

      if (instrument.stock < totalQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${instrument.name}`,
        });
      }
    }

    const orderItems = [];
    let subtotal = 0;
    let gstAmount = 0;
    const dealUsageMap = new Map();

    for (const item of normalizedItems) {
      if (!item.instrumentId || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a valid instrumentId and quantity",
        });
      }

      const instrument = instrumentMap.get(item.instrumentId);
      if (!instrument) {
        return res.status(400).json({
          success: false,
          message: "Instrument not found or not available",
        });
      }

      const appliedDeal = applyDealToBuyItem({
        dealMap,
        item,
        instrument,
      });
      const unitPrice = appliedDeal ? appliedDeal.dealPrice : instrument.price;
      const amounts = calculateBuyItemAmounts({
        instrument,
        quantity: item.quantity,
        unitPrice,
      });

      subtotal += amounts.taxableAmount;
      gstAmount += amounts.gstAmount;

      const resolvedDealId = appliedDeal ? String(appliedDeal._id) : null;
      if (resolvedDealId) {
        dealUsageMap.set(
          resolvedDealId,
          (dealUsageMap.get(resolvedDealId) || 0) + amounts.quantity
        );
      }

      orderItems.push({
        instrument: instrument._id,
        name: instrument.name,
        categoryName: instrument.category?.name || "",
        categorySlug: instrument.category?.slug || "",
        price: amounts.unitPrice,
        quantity: amounts.quantity,
        subtotal: amounts.taxableAmount,
        gstRate: amounts.gstRate,
        gstAmount: amounts.gstAmount,
        lineTotal: amounts.lineTotal,
        ...(resolvedDealId ? { dealId: resolvedDealId } : {}),
      });
    }

    const summary = buildPricingSummary({
      subtotal,
      gstAmount,
      shippingCharge: getShippingCharge("buy", subtotal),
    });

    for (const [instrumentId, quantity] of requiredQuantityByInstrument.entries()) {
      const instrument = instrumentMap.get(instrumentId);
      const previousStock = instrument.stock;
      instrument.stock -= quantity;
      await instrument.save();
      await notifyAdminsForStockTransition({
        instrument,
        previousStock,
        nextStock: instrument.stock,
      });
    }

    const order = await BuyOrder.create({
      user: userId,
      items: orderItems,
      subtotal: summary.subtotal,
      gstAmount: summary.gstAmount,
      shippingCharge: summary.shippingCharge,
      totalAmount: summary.total,
      status: "placed",
      paymentStatus: "pending",
      shippingAddress,
    });

    if (dealUsageMap.size > 0) {
      await Deal.bulkWrite(
        Array.from(dealUsageMap.entries()).map(([dealId, qty]) => ({
          updateOne: {
            filter: { _id: dealId },
            update: { $inc: { buyCount: qty } },
          },
        }))
      );
    }

    const buyInstrumentSummary = summarizeInstrumentNames(
      orderItems.map((item) => item.name)
    );

    await Notification.create({
      user: userId,
      title: "Buy order placed",
      message: `Your order #${order._id.toString().slice(-6)} has been placed.`,
      type: "order",
      isRead: false,
      read: false,
    });

    await createAdminOrderNotifications({
      placedByUserId: userId,
      orderId: order._id,
      orderType: ORDER_TYPE.PURCHASE,
      instrumentName: buyInstrumentSummary,
    });

    if (req.user?.email) {
      sendBuyOrderStatusEmail({
        to: req.user.email,
        order,
        status: "placed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Buy order created successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyBuyOrders = async (req, res) => {
  try {
    const userId = req.id;
    const orders = await BuyOrder.find({ user: userId })
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

export const getBuyOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;
    const role = req.user?.role;

    const order = await BuyOrder.findById(id)
      .populate("items.instrument", "name images")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (String(order.user) !== String(userId) && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const requestBuyOrderReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;
    const reason = String(req.body?.reason || "").trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Return reason is required",
      });
    }

    const order = await BuyOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (String(order.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to request return for this order",
      });
    }

    if (order.status !== "arrived") {
      return res.status(400).json({
        success: false,
        message: "Return can be requested only after delivery",
      });
    }

    if (order.returnRequest?.status === "requested") {
      return res.status(400).json({
        success: false,
        message: "Return request is already submitted",
      });
    }

    if (["approved", "returned"].includes(order.returnRequest?.status)) {
      return res.status(400).json({
        success: false,
        message: "Return request is already processed",
      });
    }

    const deliveredAt = order.deliveredAt || order.updatedAt || order.createdAt;
    const returnDeadline = new Date(deliveredAt);
    returnDeadline.setDate(returnDeadline.getDate() + BUY_RETURN_WINDOW_DAYS);
    if (new Date() > returnDeadline) {
      return res.status(400).json({
        success: false,
        message: `Return window closed. Returns are allowed within ${BUY_RETURN_WINDOW_DAYS} days after delivery.`,
      });
    }

    order.returnRequest = {
      ...order.returnRequest,
      status: "requested",
      reason,
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      adminNote: "",
      refundStatus: "none",
      refundInitiatedAt: null,
      refundCompletedAt: null,
      returnedAt: null,
    };
    await order.save();

    await Notification.create({
      user: userId,
      title: "Return requested",
      message: `Return request submitted for order #${order._id.toString().slice(-6)}.`,
      type: "order",
    });

    if (req.user?.email) {
      sendBuyReturnUpdateEmail({
        to: req.user.email,
        order,
        returnStatus: "requested",
        reason,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Return request submitted successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createRentOrder = async (req, res) => {
  try {
    const userId = req.id;
    const { instrumentId, startDate, endDate, notes, dealId, shippingAddress } =
      req.body;

    if (!instrumentId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "instrumentId, startDate and endDate are required",
      });
    }

    if (!isValidObjectId(instrumentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid instrumentId",
      });
    }

    if (!isValidShippingAddress(shippingAddress)) {
      return res.status(400).json({
        success: false,
        message:
          "A complete shipping address is required (line1, line2, city, state, country, postalCode)",
      });
    }

    if (normalizeAddressValue(shippingAddress.country) !== INDIA_COUNTRY) {
      return res.status(400).json({
        success: false,
        message: "Rental orders are supported only for India",
      });
    }

    if (normalizeAddressValue(shippingAddress.state) !== MAHARASHTRA_STATE) {
      return res.status(400).json({
        success: false,
        message: "Rent service is currently available only in Maharashtra",
      });
    }

    const { days, error } = calculateDays(startDate, endDate);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const instrument = await Instrument.findById(instrumentId).populate(
      "category",
      "name slug gstRate"
    );
    if (!instrument || !instrument.isAvailableForRent) {
      return res.status(404).json({
        success: false,
        message: "Instrument not available for rent",
      });
    }

    const overlappingCount = await RentOrder.countDocuments({
      instrument: instrumentId,
      status: { $in: ["pending", "approved", "active"] },
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
    });

    if (overlappingCount >= (instrument.rentStock || 1)) {
      return res.status(400).json({
        success: false,
        message:
          "This instrument is already booked for the selected dates. Please choose another date.",
      });
    }

    let appliedDeal = null;
    if (dealId && isValidObjectId(dealId)) {
      const dealMap = await loadActiveDealsMap({
        dealIds: [dealId],
        dealType: "rent",
      });
      const candidate = dealMap.get(String(dealId));
      if (candidate && String(candidate.instrumentId) === String(instrument._id)) {
        appliedDeal = candidate;
      }
    }

    const rentPricePerDay = appliedDeal
      ? appliedDeal.dealPrice
      : instrument.rentPricePerDay;
    const pricing = calculateRentAmounts({
      instrument,
      days,
      rentPricePerDay,
      deposit: instrument.rentDeposit || 0,
      shippingCharge: getShippingCharge(
        "rent",
        days * rentPricePerDay + (instrument.rentDeposit || 0)
      ),
    });

    const rentSubtotal = Number.isFinite(Number(pricing?.subtotal))
      ? roundMoney(pricing.subtotal)
      : 0;
    const rentDays =
      Number.isFinite(Number(pricing?.days)) && Number(pricing.days) > 0
        ? Math.ceil(Number(pricing.days))
        : Math.max(1, Number(days) || 1);
    const normalizedRentPricePerDay = Number.isFinite(Number(pricing?.rentPricePerDay))
      ? roundMoney(pricing.rentPricePerDay)
      : Math.max(0, Number(rentPricePerDay) || 0);
    const rentDeposit = Number.isFinite(Number(pricing?.deposit))
      ? roundMoney(pricing.deposit)
      : roundMoney(Number(instrument.rentDeposit || 0));
    const rentGstRate = Number.isFinite(Number(pricing?.gstRate))
      ? Number(pricing.gstRate)
      : 0;
    const rentGstAmount = Number.isFinite(Number(pricing?.gstAmount))
      ? roundMoney(pricing.gstAmount)
      : 0;
    const rentShippingCharge = Number.isFinite(Number(pricing?.shippingCharge))
      ? roundMoney(pricing.shippingCharge)
      : 0;
    const rentTotal = Number.isFinite(Number(pricing?.total))
      ? roundMoney(pricing.total)
      : roundMoney(rentSubtotal + rentGstAmount + rentShippingCharge);

    const rentOrder = await RentOrder.create({
      user: userId,
      instrument: instrument._id,
      startDate,
      endDate,
      days: rentDays,
      subtotal: rentSubtotal,
      rentPricePerDay: normalizedRentPricePerDay,
      deposit: rentDeposit,
      gstRate: rentGstRate,
      gstAmount: rentGstAmount,
      shippingCharge: rentShippingCharge,
      totalRent: rentTotal,
      status: "pending",
      paymentStatus: "pending",
      notes,
      shippingAddress,
      ...(appliedDeal ? { dealId: appliedDeal._id } : {}),
    });

    if (appliedDeal) {
      await Deal.findByIdAndUpdate(appliedDeal._id, { $inc: { rentCount: 1 } });
    }

    await Notification.create({
      user: userId,
      title: "Rent request submitted",
      message: `Your rent request for ${instrument.name} has been submitted.`,
      type: "rent",
      isRead: false,
      read: false,
    });

    await createAdminOrderNotifications({
      placedByUserId: userId,
      orderId: rentOrder._id,
      orderType: ORDER_TYPE.RENT,
      instrumentName: instrument.name,
    });

    if (req.user?.email) {
      sendOrderEmail({
        to: req.user.email,
        subject: "Rent Request Submitted Successfully",
        text: `Your rent request ${rentOrder._id} has been submitted.\nSubtotal: Rs ${rentSubtotal}\nGST: Rs ${rentGstAmount}\nShipping: Rs ${rentShippingCharge}\nTotal: Rs ${rentTotal}`,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Rent order created successfully",
      data: rentOrder,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyRentOrders = async (req, res) => {
  try {
    const userId = req.id;

    await RentOrder.updateMany(
      { user: userId, status: "completed", paymentStatus: "pending" },
      { $set: { paymentStatus: "paid" } }
    );

    const orders = await RentOrder.find({ user: userId })
      .populate("instrument", "name images rentPricePerDay")
      .sort({ createdAt: -1 })
      .lean();

    const normalizedOrders = orders.map((order) =>
      normalizeLegacyRentPricing({
        ...order,
      })
    );

    return res.status(200).json({
      success: true,
      data: normalizedOrders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRentOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;
    const role = req.user?.role;

    const order = await RentOrder.findById(id)
      .populate("instrument", "name images rentPricePerDay")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Rent order not found",
      });
    }

    if (String(order.user) !== String(userId) && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this rent order",
      });
    }

    return res.status(200).json({
      success: true,
      data: normalizeLegacyRentPricing({
        ...order,
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const returnRentOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const order = await RentOrder.findById(id)
      .populate("instrument", "name")
      .populate("user", "email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Rent order not found",
      });
    }

    if (String(order.user?._id || order.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to return this rent order",
      });
    }

    if (["rejected", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "This rent order cannot be returned",
      });
    }

    if (order.rentalReturn?.status === "returned") {
      return res.status(400).json({
        success: false,
        message: "Rental instrument is already returned",
      });
    }

    const now = new Date();
    const endDate = new Date(order.endDate);
    if (now < endDate) {
      return res.status(400).json({
        success: false,
        message: "Rental return is available only after rental end date",
      });
    }

    const lateDays = Math.max(0, Math.ceil((now.getTime() - endDate.getTime()) / ONE_DAY_MS));
    const lateFeePerDay = roundMoney((order.rentPricePerDay || 0) * RENT_LATE_FEE_MULTIPLIER);
    const lateFee = roundMoney(lateDays * lateFeePerDay);

    normalizeLegacyRentPricing(order);

    order.rentalReturn = {
      status: "returned",
      requestedAt: now,
      returnedAt: now,
      lateDays,
      lateFeePerDay,
      lateFee,
      lateFeeStatus: lateFee > 0 ? "pending" : "not_applicable",
    };
    order.status = "completed";
    await order.save();

    await Notification.create({
      user: userId,
      title: "Rental returned",
      message:
        lateFee > 0
          ? `Rental return recorded. Late fee: Rs ${lateFee.toFixed(2)}.`
          : "Rental return recorded successfully.",
      type: "rent",
    });

    if (order.user?.email) {
      sendRentalReturnSummaryEmail({
        to: order.user.email,
        orderId: order._id,
        instrumentName: order.instrument?.name,
        returnedAt: now,
        lateDays,
        lateFee,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        lateFee > 0
          ? `Rental returned with late fee Rs ${lateFee.toFixed(2)}`
          : "Rental returned successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
