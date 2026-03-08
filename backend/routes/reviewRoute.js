import express from "express";
import {
  addReview,
  getReviewsForInstrument,
} from "../controllers/reviewController.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Public: get reviews for an instrument
router.get("/:instrumentId", getReviewsForInstrument);

// Authenticated: add or update review for an instrument
router.post("/:instrumentId", isAuthenticated, addReview);

export default router;

