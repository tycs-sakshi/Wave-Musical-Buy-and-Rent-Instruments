import { Notification } from "../models/notificationModel.js";

export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.id;
    const notifications = await Notification.find({
      user: userId,
      forAdmin: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { read: true, isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

