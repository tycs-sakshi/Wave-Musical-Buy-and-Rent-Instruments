import { Review } from "../models/reviewModel.js";
import { Instrument } from "../models/instrumentModel.js";

export const getReviewsForInstrument = async (req, res) => {
  try {
    const { instrumentId } = req.params;

    const reviews = await Review.find({
      instrument: instrumentId,
      isApproved: true,
    })
      .populate("user", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addReview = async (req, res) => {
  try {
    const userId = req.id;
    const { instrumentId } = req.params;
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({
        success: false,
        message: "rating is required",
      });
    }

    const instrument = await Instrument.findById(instrumentId);
    if (!instrument) {
      return res.status(404).json({
        success: false,
        message: "Instrument not found",
      });
    }

    // Upsert review (one per user per instrument)
    const review = await Review.findOneAndUpdate(
      { user: userId, instrument: instrumentId },
      { rating, comment },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Recalculate rating
    const stats = await Review.aggregate([
      { $match: { instrument: instrument._id, isApproved: true } },
      {
        $group: {
          _id: "$instrument",
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      instrument.avgRating = stats[0].avgRating;
      instrument.reviewCount = stats[0].reviewCount;
      await instrument.save();
    }

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

