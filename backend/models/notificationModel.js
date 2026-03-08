import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["order", "rent", "system"],
      default: "system",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    orderType: {
      type: String,
      enum: ["Purchase", "Rent"],
      default: undefined,
    },
    instrumentName: {
      type: String,
      default: "",
    },
    forAdmin: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    meta: {
      type: Object,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, forAdmin: 1, isRead: 1, createdAt: -1 });

notificationSchema.pre("save", function syncReadFlags(next) {
  if (this.isModified("isRead")) {
    this.read = this.isRead;
  } else if (this.isModified("read")) {
    this.isRead = this.read;
  }
  next();
});

export const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

