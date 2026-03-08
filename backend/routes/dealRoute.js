import express from "express";
import {
  getDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  getAllDealsAdmin,
} from "../controllers/dealController.js";
import { isAdmin, isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Public routes
router.get("/", getDeals);

// Admin routes
router.post("/create", isAuthenticated, isAdmin, createDeal);
router.put("/:id", isAuthenticated, isAdmin, updateDeal);
router.delete("/:id", isAuthenticated, isAdmin, deleteDeal);
router.get("/admin/all", isAuthenticated, isAdmin, getAllDealsAdmin);

export default router;
