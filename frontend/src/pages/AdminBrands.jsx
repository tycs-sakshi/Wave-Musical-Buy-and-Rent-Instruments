import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBrandApi,
  deleteBrandApi,
  getAllBrands,
  updateBrandApi,
} from "@/api/brandApi";

const initialForm = {
  name: "",
  description: "",
};

const AdminBrands = () => {
  const currentUser = useSelector((state) => state.user.user);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const res = await getAllBrands();
      setBrands(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      loadBrands();
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
    setForm(initialForm);
    setEditingBrandId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Brand name is required");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
      };

      if (editingBrandId) {
        await updateBrandApi(editingBrandId, payload);
        toast.success("Brand updated successfully");
      } else {
        await createBrandApi(payload);
        toast.success("Brand created successfully");
      }

      await loadBrands();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to save brand");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (brandId) => {
    const ok = window.confirm("Are you sure you want to delete this brand?");
    if (!ok) return;

    try {
      await deleteBrandApi(brandId);
      toast.success("Brand deleted");
      await loadBrands();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to delete brand");
    }
  };

  const handleEdit = (brand) => {
    setEditingBrandId(brand._id);
    setForm({
      name: brand.name || "",
      description: brand.description || "",
    });
  };

  return (
    <div className="pt-24 min-h-screen bg-amber-50">
      <div className="max-w-4xl mx-auto px-4 pb-10">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-6">
          {editingBrandId ? "Edit Brand" : "Add Brand"}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-6 grid gap-4 text-sm mb-8 border border-amber-200"
        >
          <div className="grid gap-2">
            <Label className="font-semibold text-slate-700">Brand Name *</Label>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label className="font-semibold text-slate-700">Description</Label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              className="border border-amber-300 rounded-lg px-3 py-2"
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={submitting}
            >
              {submitting
                ? editingBrandId
                  ? "Updating..."
                  : "Saving..."
                : editingBrandId
                ? "Update Brand"
                : "Save Brand"}
            </Button>
            {editingBrandId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
          </div>
        </form>

        <h2 className="text-2xl font-display font-semibold mb-4 text-slate-900">
          Brands
        </h2>
        <div className="bg-white rounded-xl shadow-sm p-6 overflow-x-auto border border-amber-200">
          {loading ? (
            <p className="text-sm text-slate-500">Loading brands...</p>
          ) : brands.length === 0 ? (
            <p className="text-sm text-slate-500">
              No brands found. Create one using the form above.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-amber-200 bg-amber-100/70">
                  <th className="py-3 pr-3 font-semibold text-slate-700">Name</th>
                  <th className="py-3 pr-3 font-semibold text-slate-700">
                    Description
                  </th>
                  <th className="py-3 pr-3 font-semibold text-slate-700 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr
                    key={brand._id}
                    className="border-b border-amber-100 hover:bg-amber-50/60 transition-colors"
                  >
                    <td className="py-3 pr-3 text-slate-800 font-medium">
                      {brand.name}
                    </td>
                    <td className="py-3 pr-3 text-slate-700">
                      {brand.description || "-"}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEdit(brand)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          className="bg-rose-600 text-white hover:bg-rose-700"
                          onClick={() => handleDelete(brand._id)}
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

export default AdminBrands;

