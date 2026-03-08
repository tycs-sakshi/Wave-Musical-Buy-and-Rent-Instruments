import { Instrument } from "../models/instrumentModel.js";
import { Category } from "../models/categoryModel.js";
import { Brand } from "../models/brandModel.js";
import { BuyOrder } from "../models/buyOrderModel.js";
import { RentOrder } from "../models/rentOrderModel.js";
import { notifyAdminsForStockTransition } from "../services/inventoryAlertService.js";

const buildQuery = (query) => {
  const {
    search,
    category,
    brandId,
    minPrice,
    maxPrice,
    availableForBuy,
    availableForRent,
  } = query;

  const filter = {};

  if (category) {
    filter.category = category;
  }

  if (brandId) {
    filter.brandId = brandId;
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (availableForBuy !== undefined) {
    filter.isAvailableForBuy = availableForBuy === "true";
  }

  if (availableForRent !== undefined) {
    filter.isAvailableForRent = availableForRent === "true";
  }

  if (search) {
    filter.$or = [
      { name: new RegExp(search, "i") },
      { brand: new RegExp(search, "i") },
      { description: new RegExp(search, "i") },
    ];
  }

  return filter;
};

export const getInstruments = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const filter = buildQuery(req.query);

    let sort = { createdAt: -1 };
    if (req.query.sort === "price_asc") sort = { price: 1 };
    if (req.query.sort === "price_desc") sort = { price: -1 };

    const [items, total] = await Promise.all([
      Instrument.find(filter)
        .populate("category", "name slug gstRate")
        .populate("brandId", "name slug")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Instrument.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInstrumentByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    let instrument = null;
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      instrument = await Instrument.findById(idOrSlug).populate(
        "category",
        "name slug gstRate"
      );
    } else {
      instrument = await Instrument.findOne({ slug: idOrSlug }).populate(
        "category",
        "name slug gstRate"
      );
    }

    if (instrument) {
      await instrument.populate("brandId", "name slug");
    }

    if (!instrument) {
      return res.status(404).json({
        success: false,
        message: "Instrument not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: instrument,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTrendingInstruments = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 6));

    const [buyActivity, rentActivity] = await Promise.all([
      BuyOrder.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.instrument",
            purchaseCount: { $sum: "$items.quantity" },
          },
        },
        { $sort: { purchaseCount: -1 } },
        { $limit: limit * 4 },
      ]),
      RentOrder.aggregate([
        {
          $match: {
            status: { $nin: ["rejected", "cancelled"] },
          },
        },
        {
          $group: {
            _id: "$instrument",
            rentCount: { $sum: 1 },
          },
        },
        { $sort: { rentCount: -1 } },
        { $limit: limit * 4 },
      ]),
    ]);

    const buyCountById = new Map(
      buyActivity.map((row) => [String(row._id), Number(row.purchaseCount) || 0])
    );
    const rentCountById = new Map(
      rentActivity.map((row) => [String(row._id), Number(row.rentCount) || 0])
    );

    const candidateIds = [
      ...new Set([
        ...buyActivity.map((row) => String(row._id)),
        ...rentActivity.map((row) => String(row._id)),
      ]),
    ];

    if (!candidateIds.length) {
      return res.status(200).json({
        success: true,
        data: {
          trending: [],
          mostPurchased: [],
          mostRented: [],
        },
      });
    }

    const instruments = await Instrument.find({ _id: { $in: candidateIds } })
      .populate("category", "name slug")
      .populate("brandId", "name slug")
      .lean();

    const instrumentById = new Map(instruments.map((item) => [String(item._id), item]));

    const mostPurchased = buyActivity
      .map((row) => {
        const id = String(row._id);
        const instrument = instrumentById.get(id);
        if (!instrument) return null;
        return {
          ...instrument,
          purchaseCount: Number(row.purchaseCount) || 0,
          rentCount: rentCountById.get(id) || 0,
          activityScore: (Number(row.purchaseCount) || 0) + (rentCountById.get(id) || 0),
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    const mostRented = rentActivity
      .map((row) => {
        const id = String(row._id);
        const instrument = instrumentById.get(id);
        if (!instrument) return null;
        return {
          ...instrument,
          purchaseCount: buyCountById.get(id) || 0,
          rentCount: Number(row.rentCount) || 0,
          activityScore: (buyCountById.get(id) || 0) + (Number(row.rentCount) || 0),
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    const trending = instruments
      .map((instrument) => {
        const id = String(instrument._id);
        const purchaseCount = buyCountById.get(id) || 0;
        const rentCount = rentCountById.get(id) || 0;
        return {
          ...instrument,
          purchaseCount,
          rentCount,
          activityScore: purchaseCount + rentCount,
        };
      })
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, limit);

    return res.status(200).json({
      success: true,
      data: {
        trending,
        mostPurchased,
        mostRented,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createInstrument = async (req, res) => {
  try {
    const {
      name,
      categoryId,
      brand,
      brandId,
      description,
      price,
      rentPricePerDay,
      rentDeposit,
      stock,
      rentStock,
      isAvailableForBuy,
      isAvailableForRent,
      condition,
      images,
      specs,
    } = req.body;

    if (!name || !categoryId || price === undefined || rentPricePerDay === undefined) {
      return res.status(400).json({
        success: false,
        message: "name, categoryId, price and rentPricePerDay are required",
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    let resolvedBrandName = String(brand || "").trim();
    let resolvedBrandId = null;

    if (brandId) {
      const existingBrand = await Brand.findById(brandId);
      if (!existingBrand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }
      resolvedBrandId = existingBrand._id;
      resolvedBrandName = existingBrand.name;
    }

    const sanitizedImages = Array.isArray(images)
      ? images.map((url) => String(url || "").trim()).filter(Boolean)
      : [];

    const baseSlug = name.toLowerCase().trim().replace(/\s+/g, "-");
    const slug = `${baseSlug}-${Date.now()}`;

    const instrument = await Instrument.create({
      name,
      slug,
      category: categoryId,
      brand: resolvedBrandName,
      brandId: resolvedBrandId,
      description,
      price,
      rentPricePerDay,
      rentDeposit,
      stock,
      rentStock,
      isAvailableForBuy,
      isAvailableForRent,
      condition,
      images: sanitizedImages,
      specs,
    });

    await notifyAdminsForStockTransition({
      instrument,
      previousStock: null,
      nextStock: instrument.stock,
    });

    return res.status(201).json({
      success: true,
      message: "Instrument created successfully",
      data: instrument,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateInstrument = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      categoryId,
      brandId,
      price,
      rentPricePerDay,
      rentDeposit,
      stock,
      rentStock,
      isAvailableForBuy,
      isAvailableForRent,
      ...rest
    } = req.body;

    const updates = { ...rest };

    if (categoryId !== undefined) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
      updates.category = categoryId;
    }

    if (brandId !== undefined) {
      if (!brandId) {
        updates.brandId = null;
        updates.brand = "";
      } else {
        const existingBrand = await Brand.findById(brandId);
        if (!existingBrand) {
          return res.status(404).json({
            success: false,
            message: "Brand not found",
          });
        }
        updates.brandId = existingBrand._id;
        updates.brand = existingBrand.name;
      }
    }

    if (rest.brand !== undefined && brandId === undefined) {
      updates.brand = String(rest.brand || "").trim();
    }

    if (price !== undefined) updates.price = Number(price);
    if (rentPricePerDay !== undefined) updates.rentPricePerDay = Number(rentPricePerDay);
    if (rentDeposit !== undefined) updates.rentDeposit = Number(rentDeposit);
    if (stock !== undefined) updates.stock = Number(stock);
    if (rentStock !== undefined) updates.rentStock = Number(rentStock);
    if (isAvailableForBuy !== undefined) updates.isAvailableForBuy = Boolean(isAvailableForBuy);
    if (isAvailableForRent !== undefined) updates.isAvailableForRent = Boolean(isAvailableForRent);

    if (rest.images !== undefined) {
      updates.images = Array.isArray(rest.images)
        ? rest.images.map((url) => String(url || "").trim()).filter(Boolean)
        : [];
    }

    if (updates.name) {
      const baseSlug = updates.name.toLowerCase().trim().replace(/\s+/g, "-");
      updates.slug = `${baseSlug}-${Date.now()}`;
    }

    const numericFields = ["price", "rentPricePerDay", "rentDeposit", "stock", "rentStock"];
    for (const field of numericFields) {
      if (updates[field] !== undefined && Number.isNaN(updates[field])) {
        return res.status(400).json({
          success: false,
          message: `Invalid numeric value for ${field}`,
        });
      }
    }

    const instrument = await Instrument.findById(id);
    if (!instrument) {
      return res.status(404).json({
        success: false,
        message: "Instrument not found",
      });
    }

    const previousStock = instrument.stock;

    Object.keys(updates).forEach((key) => {
      instrument[key] = updates[key];
    });
    await instrument.save();

    if (updates.stock !== undefined) {
      await notifyAdminsForStockTransition({
        instrument,
        previousStock,
        nextStock: instrument.stock,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Instrument updated successfully",
      data: instrument,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteInstrument = async (req, res) => {
  try {
    const { id } = req.params;

    const instrument = await Instrument.findByIdAndDelete(id);

    if (!instrument) {
      return res.status(404).json({
        success: false,
        message: "Instrument not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Instrument deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

