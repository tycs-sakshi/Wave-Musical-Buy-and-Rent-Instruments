import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createInstrumentApi,
  deleteInstrumentApi,
  getCategories,
  getInstruments,
  updateInstrumentApi,
} from "@/api/instrumentApi";
import { getAllBrands } from "@/api/brandApi";
import { uploadImageToCloudinary } from "@/utils/cloudinary";

const LOW_STOCK_THRESHOLD = 5;

const initialForm = {
  name: "",
  brandId: "",
  categoryId: "",
  price: "",
  rentPricePerDay: "",
  rentDeposit: "",
  stock: "",
  rentStock: "",
  isAvailableForBuy: true,
  isAvailableForRent: true,
  condition: "used",
  description: "",
};

const AdminInstruments = () => {
  const currentUser = useSelector((state) => state.user.user);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [instruments, setInstruments] = useState([]);
  const [loadingInstruments, setLoadingInstruments] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState(null);

  const resetForm = () => {
    setForm(initialForm);
    setImageFiles([]);
    setExistingImages([]);
    setEditingInstrument(null);
  };

  const loadInstruments = async () => {
    try {
      setLoadingInstruments(true);
      const res = await getInstruments();
      setInstruments(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load instruments");
    } finally {
      setLoadingInstruments(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role !== "admin") return;

    const loadCategories = async () => {
      try {
        const res = await getCategories();
        setCategories(res.data.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load categories");
      }
    };

    const loadBrands = async () => {
      try {
        const res = await getAllBrands();
        setBrands(res.data.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load brands");
      }
    };

    loadCategories();
    loadBrands();
    loadInstruments();
    const poll = setInterval(loadInstruments, 15000);
    return () => clearInterval(poll);
  }, [currentUser]);

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-slate-600">You are not authorized to view this page.</p>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name || !form.categoryId || !form.price || !form.rentPricePerDay) {
      toast.error("Please fill required fields (name, category, prices).");
      return;
    }

    try {
      setSubmitting(true);
      let uploadedImages = [];

      if (imageFiles.length > 0) {
        uploadedImages = await Promise.all(
          imageFiles.map((file) =>
            uploadImageToCloudinary(file, "waves-musical/instruments")
          )
        );
      }

      const allImages = [...existingImages, ...uploadedImages];

      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        ...(form.brandId ? { brandId: form.brandId } : {}),
        description: form.description.trim(),
        price: Number(form.price),
        rentPricePerDay: Number(form.rentPricePerDay),
        rentDeposit: Number(form.rentDeposit) || 0,
        stock: Number(form.stock) || 0,
        rentStock: Number(form.rentStock) || 0,
        isAvailableForBuy: form.isAvailableForBuy,
        isAvailableForRent: form.isAvailableForRent,
        condition: form.condition,
        images: allImages,
      };

      if (editingInstrument) {
        await updateInstrumentApi(editingInstrument._id, payload);
        toast.success("Instrument updated successfully");
      } else {
        await createInstrumentApi(payload);
        toast.success("Instrument created successfully");
      }

      await loadInstruments();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          "Failed to create/update instrument (no server response)"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (instrument) => {
    setEditingInstrument(instrument);
    setForm({
      name: instrument.name || "",
      brandId: instrument.brandId?._id || "",
      categoryId:
        (instrument.category && instrument.category._id) ||
        instrument.categoryId ||
        "",
      price: instrument.price != null ? String(instrument.price) : "",
      rentPricePerDay:
        instrument.rentPricePerDay != null
          ? String(instrument.rentPricePerDay)
          : "",
      rentDeposit:
        instrument.rentDeposit != null ? String(instrument.rentDeposit) : "",
      stock: instrument.stock != null ? String(instrument.stock) : "",
      rentStock: instrument.rentStock != null ? String(instrument.rentStock) : "",
      isAvailableForBuy:
        instrument.isAvailableForBuy != null
          ? instrument.isAvailableForBuy
          : true,
      isAvailableForRent:
        instrument.isAvailableForRent != null
          ? instrument.isAvailableForRent
          : true,
      condition: instrument.condition || "used",
      description: instrument.description || "",
    });
    setExistingImages(instrument.images || []);
    setImageFiles([]);
  };

  const handleDeleteClick = async (instrumentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this instrument?"
    );
    if (!confirmed) return;

    try {
      await deleteInstrumentApi(instrumentId);
      toast.success("Instrument deleted");
      await loadInstruments();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to delete instrument");
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-amber-50">
      <div className="max-w-5xl mx-auto px-4 pb-10">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-6">
          {editingInstrument ? "Edit Instrument" : "Add Instrument"}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-6 grid gap-4 text-sm mb-8 border border-amber-200"
        >
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Brand</Label>
            <select
              name="brandId"
              value={form.brandId}
              onChange={handleChange}
              className="border border-amber-300 rounded-lg px-3 py-2"
            >
              <option value="">Select brand</option>
              {brands.map((brand) => (
                <option key={brand._id} value={brand._id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Category *</Label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className="border border-amber-300 rounded-lg px-3 py-2"
              required
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Buy Price (Rs) *</Label>
              <Input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Rent Price / Day (Rs) *</Label>
              <Input
                type="number"
                name="rentPricePerDay"
                value={form.rentPricePerDay}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Rent Deposit (Rs)</Label>
              <Input
                type="number"
                name="rentDeposit"
                value={form.rentDeposit}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-2">
              <Label>Condition</Label>
              <select
                name="condition"
                value={form.condition}
                onChange={handleChange}
                className="border border-amber-300 rounded-lg px-3 py-2"
              >
                <option value="new">new</option>
                <option value="used">used</option>
                <option value="refurbished">refurbished</option>
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Stock (Buy)</Label>
              <Input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-2">
              <Label>Rent Stock</Label>
              <Input
                type="number"
                name="rentStock"
                value={form.rentStock}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="flex gap-4 items-center bg-amber-50 p-4 rounded-lg border border-amber-200">
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                name="isAvailableForBuy"
                checked={form.isAvailableForBuy}
                onChange={handleChange}
              />
              Buy available
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                name="isAvailableForRent"
                checked={form.isAvailableForRent}
                onChange={handleChange}
              />
              Rent available
            </label>
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="border border-amber-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="grid gap-2">
            <Label>Instrument Images</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                setImageFiles(Array.from(event.target.files || []))
              }
            />
            <p className="text-xs text-slate-500">
              Upload multiple images. Thumbnails are used on product gallery.
            </p>
            {(existingImages.length > 0 || imageFiles.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {existingImages.map((imageUrl) => (
                  <div
                    key={imageUrl}
                    className="relative rounded-lg overflow-hidden border border-amber-200"
                  >
                    <img
                      src={imageUrl}
                      alt="Instrument"
                      className="h-24 w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white"
                      onClick={() =>
                        setExistingImages((prev) =>
                          prev.filter((url) => url !== imageUrl)
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {imageFiles.map((file) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-slate-700"
                  >
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
              {submitting
                ? editingInstrument
                  ? "Updating..."
                  : "Saving..."
                : editingInstrument
                ? "Update Instrument"
                : "Save Instrument"}
            </Button>
            {editingInstrument && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={submitting}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </form>

        <div className="mt-10">
          <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">
            Instruments
          </h2>
          <div className="bg-white rounded-xl shadow-sm p-4 overflow-x-auto border border-amber-200">
            {loadingInstruments ? (
              <p className="text-sm text-slate-500">Loading instruments...</p>
            ) : instruments.length === 0 ? (
              <p className="text-sm text-slate-500">
                No instruments found. Create one using the form above.
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-amber-200 bg-amber-100/70">
                    <th className="py-3 pr-3">Name</th>
                    <th className="py-3 pr-3">Brand</th>
                    <th className="py-3 pr-3">Category</th>
                    <th className="py-3 pr-3">Price</th>
                    <th className="py-3 pr-3">Rent / Day</th>
                    <th className="py-3 pr-3">Stock</th>
                    <th className="py-3 pr-3">Rent Stock</th>
                    <th className="py-3 pr-3">Inventory Alert</th>
                    <th className="py-3 pr-3">Available</th>
                    <th className="py-3 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {instruments.map((instrument) => (
                    <tr
                      key={instrument._id}
                      className="border-b border-amber-100 hover:bg-amber-50/60"
                    >
                      <td className="py-3 pr-3 text-slate-800 font-medium">
                        {instrument.name}
                      </td>
                      <td className="py-3 pr-3 text-slate-700">
                        {instrument.brandId?.name || instrument.brand || "-"}
                      </td>
                      <td className="py-3 pr-3 text-slate-700">
                        {instrument.category?.name || "-"}
                      </td>
                      <td className="py-3 pr-3 text-slate-700">
                        {instrument.price != null ? `Rs ${instrument.price}` : "-"}
                      </td>
                      <td className="py-3 pr-3 text-slate-700">
                        {instrument.rentPricePerDay != null
                          ? `Rs ${instrument.rentPricePerDay}`
                          : "-"}
                      </td>
                      <td className="py-3 pr-3 text-slate-700 text-center">
                        {instrument.stock ?? "-"}
                      </td>
                      <td className="py-3 pr-3 text-slate-700 text-center">
                        {instrument.rentStock ?? "-"}
                      </td>
                      <td className="py-3 pr-3 text-slate-700">
                        {Number(instrument.stock) <= 0 ? (
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                            Out of Stock
                          </span>
                        ) : Number(instrument.stock) <= LOW_STOCK_THRESHOLD ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Low Stock ({instrument.stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-slate-700">
                        Buy: {instrument.isAvailableForBuy ? "yes" : "no"} | Rent:{" "}
                        {instrument.isAvailableForRent ? "yes" : "no"}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleEditClick(instrument)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            className="bg-rose-600 text-white hover:bg-rose-700"
                            onClick={() => handleDeleteClick(instrument._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInstruments;
