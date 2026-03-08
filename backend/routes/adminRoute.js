import express from "express";
import {
  approveRentOrder,
  getAllBuyOrders,
  getAllRentOrders,
  getAllUsersAdmin,
  getAnalyticsSummary,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  markRentOrderActive,
  markRentOrderCompleted,
  rejectRentOrder,
  updateBuyOrderReturnStatus,
  updateBuyOrderRefundStatus,
  updateBuyOrderStatus,
  updateUserAccount,
} from "../controllers/adminController.js";
import {
  isAdmin,
  isAuthenticated,
} from "../middleware/isAuthenticated.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(isAuthenticated, isAdmin);

// Orders management
router.get("/orders/buy", getAllBuyOrders);
router.get("/orders/rent", getAllRentOrders);
router.patch("/buy-orders/:id/status", updateBuyOrderStatus);
router.patch("/buy-orders/:id/return", updateBuyOrderReturnStatus);
router.patch("/buy-orders/:id/refund", updateBuyOrderRefundStatus);

router.patch("/rent-orders/:id/approve", approveRentOrder);
router.patch("/rent-orders/:id/reject", rejectRentOrder);
router.patch("/rent-orders/:id/mark-active", markRentOrderActive);
router.patch("/rent-orders/:id/mark-completed", markRentOrderCompleted);

router.get("/users", getAllUsersAdmin);
router.patch("/users/:id", updateUserAccount);

// Dashboard analytics
router.get("/analytics/summary", getAnalyticsSummary);
router.get("/notifications", getAdminNotifications);
router.patch("/notifications/read-all", markAllAdminNotificationsRead);
router.patch("/notifications/:id/read", markAdminNotificationRead);

export default router;

