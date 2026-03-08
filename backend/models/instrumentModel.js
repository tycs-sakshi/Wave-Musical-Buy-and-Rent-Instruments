import mongoose from "mongoose";

const instrumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: String,
      default: "",
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      // buy price
      type: Number,
      required: true,
      min: 0,
    },
    rentPricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },
    rentDeposit: {
      type: Number,
      default: 0,
      min: 0,
    },
    stock: {
      // units for buy
      type: Number,
      default: 0,
      min: 0,
    },
    rentStock: {
      // units available for rent
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailableForBuy: {
      type: Boolean,
      default: true,
    },
    isAvailableForRent: {
      type: Boolean,
      default: true,
    },
    condition: {
      type: String,
      enum: ["new", "used", "refurbished"],
      default: "used",
    },
    images: [
      {
        type: String,
        default: "",
      },
    ],
    specs: {
      type: Map,
      of: String,
      default: {},
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

instrumentSchema.index({ name: "text", brand: "text", description: "text" });

export const Instrument = mongoose.model("Instrument", instrumentSchema);

