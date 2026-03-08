import mongoose from "mongoose";

const adminActivitySchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

export const AdminActivity = mongoose.model(
  "AdminActivity",
  adminActivitySchema
);

