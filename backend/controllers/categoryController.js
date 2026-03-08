import { Category } from "../models/categoryModel.js";

const buildSlug = (name) =>
  name.toLowerCase().trim().replace(/\s+/g, "-") + "-" + Date.now();

export const getCategories = async (_req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort("name");
    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description, image, gstRate } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name is required",
      });
    }

    if (gstRate !== undefined && gstRate !== null && gstRate !== "") {
      const parsedGst = Number(gstRate);
      if (!Number.isFinite(parsedGst) || parsedGst < 0 || parsedGst > 100) {
        return res.status(400).json({
          success: false,
          message: "gstRate must be a number between 0 and 100",
        });
      }
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const slug = buildSlug(name);

    const category = await Category.create({
      name,
      slug,
      description,
      image,
      ...(gstRate !== undefined && gstRate !== null && gstRate !== ""
        ? { gstRate: Number(gstRate) }
        : {}),
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.name) {
      updates.slug = buildSlug(updates.name);
    }

    if (updates.gstRate !== undefined) {
      if (updates.gstRate === "" || updates.gstRate === null) {
        updates.gstRate = null;
      } else {
        updates.gstRate = Number(updates.gstRate);
        if (
          !Number.isFinite(updates.gstRate) ||
          updates.gstRate < 0 ||
          updates.gstRate > 100
        ) {
          return res.status(400).json({
            success: false,
            message: "gstRate must be a number between 0 and 100",
          });
        }
      }
    }

    const category = await Category.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
