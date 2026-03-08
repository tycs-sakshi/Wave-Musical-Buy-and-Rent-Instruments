import { Deal } from "../models/dealModel.js";
import { Instrument } from "../models/instrumentModel.js";
import {
  deactivateExpiredDeals,
  getActiveDealCriteria,
} from "../services/dealLifecycleService.js";

const ensureDealWindow = (startDate, endDate) => new Date(endDate) > new Date(startDate);

// Get all active deals
export const getDeals = async (req, res) => {
  try {
    await deactivateExpiredDeals();
    const deals = await Deal.find(getActiveDealCriteria())
      .populate("instrumentId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: deals,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deals",
    });
  }
};

// Create a deal (admin only)
export const createDeal = async (req, res) => {
  try {
    const {
      instrumentId,
      title,
      description,
      originalPrice,
      dealPrice,
      discount,
      image,
      startDate,
      endDate,
      dealType,
    } = req.body;

    if (!ensureDealWindow(startDate, endDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    // Verify instrument exists
    const instrument = await Instrument.findById(instrumentId);
    if (!instrument) {
      return res.status(404).json({
        success: false,
        message: "Instrument not found",
      });
    }

    const deal = new Deal({
      instrumentId,
      title,
      description,
      originalPrice,
      dealPrice,
      discount: discount || Math.round(((originalPrice - dealPrice) / originalPrice) * 100),
      image: image || instrument.images?.[0],
      startDate,
      endDate,
      dealType,
      isActive: new Date(endDate) >= new Date(),
    });

    await deal.save();

    res.status(201).json({
      success: true,
      message: "Deal created successfully",
      data: deal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create deal",
    });
  }
};

// Update a deal (admin only)
export const updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    const currentDeal = await Deal.findById(id);

    if (!currentDeal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    const nextStartDate = updates.startDate || currentDeal.startDate;
    const nextEndDate = updates.endDate || currentDeal.endDate;

    if (!ensureDealWindow(nextStartDate, nextEndDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    updates.isActive = new Date(nextEndDate) >= new Date();

    const deal = await Deal.findByIdAndUpdate(id, updates, { new: true });

    res.status(200).json({
      success: true,
      message: "Deal updated successfully",
      data: deal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update deal",
    });
  }
};

// Delete a deal (admin only)
export const deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findByIdAndDelete(id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Deal deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete deal",
    });
  }
};

// Get all deals for admin (including inactive)
export const getAllDealsAdmin = async (req, res) => {
  try {
    await deactivateExpiredDeals();
    const deals = await Deal.find()
      .populate("instrumentId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: deals,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deals",
    });
  }
};
