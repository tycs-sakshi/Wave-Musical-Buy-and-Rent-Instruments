import mongoose from "mongoose";

const buyOrderItemSchema = new mongoose.Schema(
  {
    instrument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instrument",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    categoryName: {
      type: String,
      default: "",
    },
    categorySlug: {
      type: String,
      default: "",
    },
    price: {
      // snapshot price
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    gstRate: {
      type: Number,
      required: true,
      min: 0,
    },
    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      default: null,
    },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, required: true },
    line2: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String, required: true },
  },
  { _id: false }
);

const buyOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [buyOrderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCharge: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["placed", "processing", "shipped", "arrived", "cancelled", "returned"],
      default: "placed",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    returnRequest: {
      status: {
        type: String,
        enum: ["none", "requested", "approved", "rejected", "returned"],
        default: "none",
      },
      reason: {
        type: String,
        default: "",
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      adminNote: {
        type: String,
        default: "",
      },
      refundStatus: {
        type: String,
        enum: ["none", "initiated", "completed"],
        default: "none",
      },
      refundInitiatedAt: {
        type: Date,
        default: null,
      },
      refundCompletedAt: {
        type: Date,
        default: null,
      },
      returnedAt: {
        type: Date,
        default: null,
      },
    },
    shippingAddress: addressSchema,
  },
  { timestamps: true }
);

buyOrderSchema.index({ user: 1, createdAt: -1 });

export const BuyOrder = mongoose.model("BuyOrder", buyOrderSchema);

