import express from "express";
import {
  getMyNotifications,
  markNotificationRead,
} from "../controllers/notificationController.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

router.get("/my", isAuthenticated, getMyNotifications);
router.patch("/:id/read", isAuthenticated, markNotificationRead);

export default router;

