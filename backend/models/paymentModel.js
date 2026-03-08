import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["buy", "rent"],
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true, // BuyOrder or RentOrder
    },
    provider: {
      type: String,
      enum: ["stripe", "razorpay", "cod"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed", "refunded"],
      default: "created",
    },
    providerOrderId: {
      type: String,
      default: "",
    },
    providerPaymentId: {
      type: String,
      default: "",
    },
    providerSignature: {
      type: String,
      default: "",
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });

export const Payment = mongoose.model("Payment", paymentSchema);

