import mongoose from "mongoose";
import { User } from "../models/userModel.js";

const WISHLIST_POPULATE = [
  {
    path: "wishlist",
    select:
      "name slug price rentPricePerDay rentDeposit stock rentStock isAvailableForBuy isAvailableForRent images category brand brandId",
    populate: [
      { path: "category", select: "name slug" },
      { path: "brandId", select: "name slug" },
    ],
  },
];

const loadWishlist = async (userId) => {
  const user = await User.findById(userId).populate(WISHLIST_POPULATE).lean();
  return (user?.wishlist || []).filter(Boolean);
};

export const getMyWishlist = async (req, res) => {
  try {
    const wishlist = await loadWishlist(req.id);
    return res.status(200).json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { instrumentId } = req.params;
    if (!mongoose.isValidObjectId(instrumentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid instrumentId",
      });
    }

    await User.findByIdAndUpdate(
      req.id,
      { $addToSet: { wishlist: instrumentId } },
      { new: true }
    );

    const wishlist = await loadWishlist(req.id);
    return res.status(200).json({
      success: true,
      message: "Instrument added to wishlist",
      data: wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { instrumentId } = req.params;
    if (!mongoose.isValidObjectId(instrumentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid instrumentId",
      });
    }

    await User.findByIdAndUpdate(
      req.id,
      { $pull: { wishlist: instrumentId } },
      { new: true }
    );

    const wishlist = await loadWishlist(req.id);
    return res.status(200).json({
      success: true,
      message: "Instrument removed from wishlist",
      data: wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
