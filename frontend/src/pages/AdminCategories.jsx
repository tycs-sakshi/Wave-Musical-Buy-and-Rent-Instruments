import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAllCategories,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from "@/api/categoryApi";
import { toast } from "sonner";

const AdminCategories = () => {
  const currentUser = useSelector((state) => state.user.user);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [gstRate, setGstRate] = useState("");
  const [editingId, setEditingId] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await getAllCategories();
      setCategories(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      loadCategories();
    }
  }, [currentUser]);

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-slate-600">You are not authorized to view this page.</p>
      </div>
    );
  }

  const resetForm = () => {
    setName("");
    setGstRate("");
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      setSubmitting(true);
      if (editingId) {
        await updateCategoryApi(editingId, {
          name: name.trim(),
          gstRate: gstRate === "" ? null : Number(gstRate),
        });
        toast.success("Category updated successfully");
      } else {
        await createCategoryApi({
          name: name.trim(),
          gstRate: gstRate === "" ? undefined : Number(gstRate),
        });
        toast.success("Category created successfully");
      }
      await loadCategories();
      resetForm();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || "Failed to save category";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (category) => {
    setEditingId(category._id);
    setName(category.name || "");
    setGstRate(
      category.gstRate !== undefined && category.gstRate !== null
        ? String(category.gstRate)
        : ""
    );
  };

  const handleDeleteClick = async (categoryId) => {
    const ok = window.confirm(
      "Are you sure you want to delete this category?"
    );
    if (!ok) return;
    try {
      await deleteCategoryApi(categoryId);
      toast.success("Category deleted");
      await loadCategories();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || "Failed to delete category";
      toast.error(msg);
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-amber-50">
      <div className="max-w-4xl mx-auto px-4 pb-10">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-6">
          {editingId ? "Edit Category" : "Add Category"}
        </h1>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-6 grid gap-4 text-sm mb-8 border border-amber-200"
        >
          <div className="grid gap-2">
            <Label className="font-semibold text-slate-700">Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-amber-300 rounded-lg"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label className="font-semibold text-slate-700">GST Rate (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
              className="border border-amber-300 rounded-lg"
              placeholder="Auto from tax mapping if empty"
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={submitting}
            >
              {submitting
                ? editingId
                  ? "Updating..."
                  : "Saving..."
                : editingId
                ? "Update Category"
                : "Save Category"}
            </Button>
            {editingId && (
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

        <h2 className="text-2xl font-display font-semibold mb-4 text-slate-900">
          Categories
        </h2>
        <div className="bg-white rounded-xl shadow-sm p-6 overflow-x-auto border border-amber-200">
          {loading ? (
            <p className="text-sm text-slate-500">Loading categories...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-slate-500">
              No categories found. Create one using the form above.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-amber-200 bg-amber-100/70">
                  <th className="py-3 pr-3 font-semibold text-slate-700">Name</th>
                  <th className="py-3 pr-3 font-semibold text-slate-700">GST</th>
                  <th className="py-3 pr-3 font-semibold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id} className="border-b border-amber-100 hover:bg-amber-50/60 transition-colors">
                    <td className="py-3 pr-3 text-slate-800">{cat.name}</td>
                    <td className="py-3 pr-3 text-slate-700">
                      {cat.gstRate !== undefined && cat.gstRate !== null
                        ? `${cat.gstRate}%`
                        : "Auto"}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEditClick(cat)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          className="bg-rose-600 text-white hover:bg-rose-700"
                          onClick={() => handleDeleteClick(cat._id)}
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
  );
};

export default AdminCategories;

