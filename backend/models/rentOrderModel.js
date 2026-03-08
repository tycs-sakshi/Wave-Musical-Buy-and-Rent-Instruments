import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    postalCode: { type: String },
  },
  { _id: false }
);

const rentOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    instrument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instrument",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    days: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    rentPricePerDay: {
      // snapshot
      type: Number,
      required: true,
      min: 0,
    },
    deposit: {
      type: Number,
      default: 0,
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
    shippingCharge: {
      type: Number,
      required: true,
      min: 0,
    },
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      default: null,
    },
    totalRent: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "active",
        "completed",
        "cancelled",
      ],
      default: "pending",
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
    approvalBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      default: "",
    },
    rentalReturn: {
      status: {
        type: String,
        enum: ["not_requested", "requested", "returned"],
        default: "not_requested",
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      returnedAt: {
        type: Date,
        default: null,
      },
      lateDays: {
        type: Number,
        default: 0,
        min: 0,
      },
      lateFeePerDay: {
        type: Number,
        default: 0,
        min: 0,
      },
      lateFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      lateFeeStatus: {
        type: String,
        enum: ["not_applicable", "pending", "paid"],
        default: "not_applicable",
      },
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    shippingAddress: addressSchema,
  },
  { timestamps: true }
);

rentOrderSchema.index({ user: 1, createdAt: -1 });
rentOrderSchema.index({ status: 1, startDate: 1 });

export const RentOrder = mongoose.model("RentOrder", rentOrderSchema);

