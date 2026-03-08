import express from "express";
import {
  createBuyOrder,
  createRentOrder,
  getBuyOrderById,
  getMyBuyOrders,
  getOrderQuote,
  getMyRentOrders,
  getRentOrderById,
  requestBuyOrderReturn,
  returnRentOrder,
} from "../controllers/orderController.js";
import { emailOrderInvoice, getOrderInvoice } from "../services/invoiceService.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Buy orders
router.post("/quote", isAuthenticated, getOrderQuote);
router.post("/buy", isAuthenticated, createBuyOrder);
router.get("/buy/my", isAuthenticated, getMyBuyOrders);
router.get("/buy/:id", isAuthenticated, getBuyOrderById);
router.post("/buy/:id/return", isAuthenticated, requestBuyOrderReturn);

// Rent orders
router.post("/rent", isAuthenticated, createRentOrder);
router.get("/rent/my", isAuthenticated, getMyRentOrders);
router.get("/rent/:id", isAuthenticated, getRentOrderById);
router.post("/rent/:id/return", isAuthenticated, returnRentOrder);

// Invoice
router.get("/invoice/:type/:orderId", isAuthenticated, getOrderInvoice);
router.post("/invoice/:type/:orderId/email", isAuthenticated, emailOrderInvoice);

export default router;

