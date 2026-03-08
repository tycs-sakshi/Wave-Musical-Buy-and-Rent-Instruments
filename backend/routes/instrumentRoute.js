import express from "express";
import {
  createInstrument,
  deleteInstrument,
  getInstrumentByIdOrSlug,
  getInstruments,
  getTrendingInstruments,
  updateInstrument,
} from "../controllers/instrumentController.js";
import {
  isAdmin,
  isAuthenticated,
} from "../middleware/isAuthenticated.js";

const router = express.Router();

// Public
router.get("/", getInstruments);
router.get("/trending/popular", getTrendingInstruments);
router.get("/:idOrSlug", getInstrumentByIdOrSlug);

// Admin
router.post("/", isAuthenticated, isAdmin, createInstrument);
router.put("/:id", isAuthenticated, isAdmin, updateInstrument);
router.delete("/:id", isAuthenticated, isAdmin, deleteInstrument);

export default router;

