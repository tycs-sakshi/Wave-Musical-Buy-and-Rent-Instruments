import { Payment } from "../models/paymentModel.js";
import { BuyOrder } from "../models/buyOrderModel.js";
import { RentOrder } from "../models/rentOrderModel.js";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendBuyOrderStatusEmail } from "../services/emailService.js";

// Base payment creation (e.g. COD or generic provider)
export const createPayment = async (req, res) => {
  try {
    const userId = req.id;
    const { type, orderId, provider = "cod", amount, currency = "INR" } =
      req.body;

    if (!type || !["buy", "rent"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type",
      });
    }

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: "orderId and amount are required",
      });
    }

    // Ensure order belongs to user (basic check)
    if (type === "buy") {
      const order = await BuyOrder.findById(orderId);
      if (!order || String(order.user) !== String(userId)) {
        return res.status(404).json({
          success: false,
          message: "Buy order not found for this user",
        });
      }
    } else {
      const order = await RentOrder.findById(orderId);
      if (!order || String(order.user) !== String(userId)) {
        return res.status(404).json({
          success: false,
          message: "Rent order not found for this user",
        });
      }
    }

    const payment = await Payment.create({
      user: userId,
      type,
      orderId,
      provider,
      amount,
      currency,
      status: provider === "cod" ? "paid" : "created",
    });

    return res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, providerOrderId, providerPaymentId, providerSignature } =
      req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    const payment = await Payment.findByIdAndUpdate(
      id,
      {
        status,
        providerOrderId,
        providerPaymentId,
        providerSignature,
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Optionally: update corresponding order paymentStatus
    if (payment.type === "buy") {
      const buyOrder = await BuyOrder.findByIdAndUpdate(payment.orderId, {
        paymentStatus: status === "paid" ? "paid" : "failed",
        ...(status === "paid" ? { status: "processing" } : {}),
      }).populate("user", "email");

      if (status === "paid") {
        sendBuyOrderStatusEmail({
          to: buyOrder?.user?.email || req.user?.email,
          order: buyOrder || { _id: payment.orderId },
          status: "processing",
        });
      }
    } else if (payment.type === "rent") {
      await RentOrder.findByIdAndUpdate(payment.orderId, {
        paymentStatus: status === "paid" ? "paid" : "failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment status updated",
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------- Razorpay Integration (online payment demo) ----------

const getRazorpayConfig = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    return null;
  }

  return { keyId, keySecret };
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const razorpayConfig = getRazorpayConfig();
    if (!razorpayConfig) {
      return res.status(500).json({
        success: false,
        message:
          "Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
    }

    const razorpayInstance = new Razorpay({
      key_id: razorpayConfig.keyId,
      key_secret: razorpayConfig.keySecret,
    });

    const userId = req.id;
    const { type, orderId, amount, currency = "INR" } = req.body;

    if (!type || !["buy", "rent"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type",
      });
    }

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: "orderId and amount are required",
      });
    }

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid orderId",
      });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be a valid number greater than 0",
      });
    }

    // Ensure order belongs to user
    let orderDoc;
    if (type === "buy") {
      orderDoc = await BuyOrder.findById(orderId);
    } else {
      orderDoc = await RentOrder.findById(orderId);
    }

    if (!orderDoc || String(orderDoc.user) !== String(userId)) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this user",
      });
    }

    const expectedAmount = Number(
      type === "buy" ? orderDoc.totalAmount : orderDoc.totalRent
    );
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order amount is invalid",
      });
    }

    const amountInPaise = Math.round(expectedAmount * 100);
    if (amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum online payment amount is INR 1",
      });
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `${type}_${String(orderId).slice(-24)}`,
      notes: { type, orderId },
    });

    const payment = await Payment.create({
      user: userId,
      type,
      orderId,
      provider: "razorpay",
      amount: expectedAmount,
      currency,
      status: "created",
      providerOrderId: razorpayOrder.id,
    });

    return res.status(201).json({
      success: true,
      message: "Razorpay order created",
      data: {
        keyId: razorpayConfig.keyId,
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise,
        currency,
        paymentId: payment._id,
      },
    });
  } catch (error) {
    const statusCode =
      typeof error?.statusCode === "number" ? error.statusCode : 500;
    const razorpayMessage =
      error?.error?.description || error?.description || error?.message;

    return res.status(statusCode).json({
      success: false,
      message: razorpayMessage || "Unable to create Razorpay order",
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const razorpayConfig = getRazorpayConfig();
    if (!razorpayConfig) {
      return res.status(500).json({
        success: false,
        message:
          "Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
    }

    const {
      paymentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!paymentId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay verification fields",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", razorpayConfig.keySecret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    const isValidSignature = expectedSignature === razorpay_signature;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (!isValidSignature) {
      payment.status = "failed";
      payment.providerPaymentId = razorpay_payment_id;
      payment.providerSignature = razorpay_signature;
      await payment.save();

      if (payment.type === "buy") {
        await BuyOrder.findByIdAndUpdate(payment.orderId, {
          paymentStatus: "failed",
        });
      } else if (payment.type === "rent") {
        await RentOrder.findByIdAndUpdate(payment.orderId, {
          paymentStatus: "failed",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    payment.status = "paid";
    payment.providerPaymentId = razorpay_payment_id;
    payment.providerSignature = razorpay_signature;
    await payment.save();

    if (payment.type === "buy") {
      const buyOrder = await BuyOrder.findByIdAndUpdate(payment.orderId, {
        paymentStatus: "paid",
        status: "processing",
      }).populate("user", "email");

      sendBuyOrderStatusEmail({
        to: buyOrder?.user?.email || req.user?.email,
        order: buyOrder || { _id: payment.orderId },
        status: "processing",
      });
    } else if (payment.type === "rent") {
      await RentOrder.findByIdAndUpdate(payment.orderId, {
        paymentStatus: "paid",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

