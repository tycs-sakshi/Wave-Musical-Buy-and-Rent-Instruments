import express from "express";
import {
  createBrand,
  deleteBrand,
  getBrands,
  updateBrand,
} from "../controllers/brandController.js";
import { isAdmin, isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

router.get("/", getBrands);
router.post("/", isAuthenticated, isAdmin, createBrand);
router.put("/:id", isAuthenticated, isAdmin, updateBrand);
router.delete("/:id", isAuthenticated, isAdmin, deleteBrand);

export default router;

