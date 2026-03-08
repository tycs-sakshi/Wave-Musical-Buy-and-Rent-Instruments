import mongoose from "mongoose";

const dealSchema = new mongoose.Schema(
  {
    instrumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instrument",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    dealPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    image: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    dealType: {
      type: String,
      enum: ["buy", "rent"],
      default: "buy",
    },
    buyCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export const Deal = mongoose.model("Deal", dealSchema);
