import { Brand } from "../models/brandModel.js";
import { Instrument } from "../models/instrumentModel.js";

const buildSlug = (name) =>
  name.toLowerCase().trim().replace(/\s+/g, "-") + "-" + Date.now();

export const getBrands = async (_req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort("name");
    return res.status(200).json({
      success: true,
      data: brands,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createBrand = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name is required",
      });
    }

    const existing = await Brand.findOne({
      name: { $regex: new RegExp(`^${String(name).trim()}$`, "i") },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Brand with this name already exists",
      });
    }

    const brand = await Brand.create({
      name: String(name).trim(),
      slug: buildSlug(name),
      description,
      image,
    });

    return res.status(201).json({
      success: true,
      message: "Brand created successfully",
      data: brand,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.name) {
      const duplicate = await Brand.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${String(updates.name).trim()}$`, "i") },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Brand with this name already exists",
        });
      }

      updates.name = String(updates.name).trim();
      updates.slug = buildSlug(updates.name);
    }

    const brand = await Brand.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (updates.name) {
      await Instrument.updateMany(
        { brandId: brand._id },
        {
          $set: {
            brand: brand.name,
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      data: brand,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findByIdAndDelete(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    await Instrument.updateMany(
      { brandId: id },
      {
        $unset: { brandId: "" },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

