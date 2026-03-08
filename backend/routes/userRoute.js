import express from 'express'
import { allUser, changePassword, forgotPassword, getUserById, login, logout, register, reVerify, updateProfile, verify, verifyOTP } from '../controllers/userController.js';
import { isAdmin, isAuthenticated } from '../middleware/isAuthenticated.js';
import {
  addToWishlist,
  getMyWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";


const router = express.Router()

router.post("/register", register)
router.post("/verify", verify)
router.post("/reverify", reVerify)
router.post("/login", login)
router.post("/logout", isAuthenticated, logout)
router.post("/forgotPassword",forgotPassword )
router.post("/verify-otp/:email",verifyOTP )
router.post("/changePassword/:email",changePassword )
router.get("/all-user",isAuthenticated,isAdmin ,allUser )
router.get("/get-user/:userId",getUserById )
router.put("/profile", isAuthenticated, updateProfile)
router.get("/wishlist", isAuthenticated, getMyWishlist)
router.post("/wishlist/:instrumentId", isAuthenticated, addToWishlist)
router.delete("/wishlist/:instrumentId", isAuthenticated, removeFromWishlist)

export default router;
