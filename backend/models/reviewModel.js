import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    instrument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instrument",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ instrument: 1, user: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);

