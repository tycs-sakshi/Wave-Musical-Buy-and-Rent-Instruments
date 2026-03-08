import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../controllers/categoryController.js";
import {
  isAdmin,
  isAuthenticated,
} from "../middleware/isAuthenticated.js";

const router = express.Router();

// Public
router.get("/", getCategories);

// Admin
router.post("/", isAuthenticated, isAdmin, createCategory);
router.put("/:id", isAuthenticated, isAdmin, updateCategory);
router.delete("/:id", isAuthenticated, isAdmin, deleteCategory);

export default router;

