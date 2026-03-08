import express from "express";
import {
  createPayment,
  updatePaymentStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../controllers/paymentController.js";
import {
  isAdmin,
  isAuthenticated,
} from "../middleware/isAuthenticated.js";

const router = express.Router();

// User creates a generic payment (e.g. COD)
router.post("/", isAuthenticated, createPayment);

// Razorpay specific endpoints (online payment demo)
router.post("/razorpay/create-order", isAuthenticated, createRazorpayOrder);
router.post("/razorpay/verify", isAuthenticated, verifyRazorpayPayment);

// Admin or system can update payment status
router.patch("/:id/status", isAuthenticated, isAdmin, updatePaymentStatus);

export default router;

