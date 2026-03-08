import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import dealApi from "@/api/dealApi";
import { getInstruments } from "@/api/instrumentApi";
import { toast } from "sonner";

const AdminDeals = () => {
  const currentUser = useSelector((state) => state.user.user);
  const navigate = useNavigate();

  const [deals, setDeals] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [formData, setFormData] = useState({
    instrumentId: "",
    title: "",
    description: "",
    originalPrice: "",
    dealPrice: "",
    discount: "",
    startDate: "",
    endDate: "",
    dealType: "buy",
  });

  const getDealStatus = (deal) => {
    const now = new Date();
    const start = new Date(deal.startDate);
    const end = new Date(deal.endDate);

    if (!deal.isActive || end < now) return "Expired";
    if (start > now) return "Scheduled";
    return "Active";
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") {
      navigate("/");
      return;
    }
    fetchDeals();
    fetchInstruments();
  }, [currentUser, navigate]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const res = await dealApi.getAllDealsAdmin();
      setDeals(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstruments = async () => {
    try {
      const res = await getInstruments({});
      setInstruments(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (
      !formData.instrumentId ||
      !formData.title ||
      !formData.originalPrice ||
      !formData.dealPrice ||
      !formData.startDate ||
      !formData.endDate
    ) {
      toast.error("Please fill all required fields");
      return false;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error("End date must be after start date");
      return false;
    }

    if (parseFloat(formData.dealPrice) >= parseFloat(formData.originalPrice)) {
      toast.error("Deal price must be less than original price");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const payload = {
        ...formData,
        originalPrice: parseFloat(formData.originalPrice),
        dealPrice: parseFloat(formData.dealPrice),
        discount:
          formData.discount ||
          Math.round(
            ((parseFloat(formData.originalPrice) - parseFloat(formData.dealPrice)) /
              parseFloat(formData.originalPrice)) *
              100
          ),
      };

      if (editingDeal) {
        await dealApi.updateDeal(editingDeal._id, payload);
        toast.success("Deal updated successfully");
      } else {
        await dealApi.createDeal(payload);
        toast.success("Deal created successfully");
      }

      resetForm();
      fetchDeals();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to save deal");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (deal) => {
    setEditingDeal(deal);
    setFormData({
      instrumentId: deal.instrumentId._id,
      title: deal.title,
      description: deal.description,
      originalPrice: deal.originalPrice,
      dealPrice: deal.dealPrice,
      discount: deal.discount,
      startDate: deal.startDate.split("T")[0],
      endDate: deal.endDate.split("T")[0],
      dealType: deal.dealType,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this deal?")) {
      try {
        await dealApi.deleteDeal(id);
        toast.success("Deal deleted successfully");
        fetchDeals();
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete deal");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      instrumentId: "",
      title: "",
      description: "",
      originalPrice: "",
      dealPrice: "",
      discount: "",
      startDate: "",
      endDate: "",
      dealType: "buy",
    });
    setEditingDeal(null);
    setShowModal(false);
  };

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-slate-600">You are not authorized to view this page.</p>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-amber-50">
      <div className="max-w-6xl mx-auto px-4 space-y-8 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Deal Management</h1>
            <p className="text-sm text-slate-600">
              Create and manage special offers for your customers
            </p>
          </div>
          <Button
            className="bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            Create New Deal
          </Button>
        </div>

        {/* Deals Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-amber-200">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-slate-500">Loading deals...</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-500">No deals found. Create one to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-amber-100/70 border-b border-amber-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Instrument
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Discount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Deal Usage
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {deals.map((deal) => (
                    <tr key={deal._id} className="hover:bg-amber-50/60 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-800 font-semibold">
                        {deal.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {deal.instrumentId?.name || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-semibold">
                        <span className="font-bold text-slate-900">
                          ₹{deal.dealPrice}
                        </span>
                        <span className="text-slate-400 line-through ml-2 text-xs">
                          ₹{deal.originalPrice}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg text-xs font-semibold">
                          {deal.discount}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {new Date(deal.startDate).toLocaleDateString()} –{" "}
                        {new Date(deal.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const status = getDealStatus(deal);
                          const statusClass =
                            status === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : status === "Scheduled"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-slate-100 text-slate-700";
                          return (
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-bold ${statusClass}`}
                            >
                              {status}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        <p>Purchases: {deal.buyCount || 0}</p>
                        <p>Rentals: {deal.rentCount || 0}</p>
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => handleEdit(deal)}
                        >
                          Edit
                        </Button>
                        <Button
                          className="bg-rose-600 text-white hover:bg-rose-700"
                          onClick={() => handleDelete(deal._id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-amber-200">
            <div className="sticky top-0 bg-amber-50 border-b border-amber-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-display font-semibold text-slate-900">
                {editingDeal ? "Edit Deal" : "Create New Deal"}
              </h2>
              <button
                className="text-slate-500 hover:text-slate-700 font-semibold text-2xl"
                onClick={() => resetForm()}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Instrument Select */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Instrument *
                  </label>
                  <select
                    name="instrumentId"
                    value={formData.instrumentId}
                    onChange={handleInputChange}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select Instrument</option>
                    {instruments.map((inst) => (
                      <option key={inst._id} value={inst._id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deal Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Deal Type *
                  </label>
                  <select
                    name="dealType"
                    value={formData.dealType}
                    onChange={handleInputChange}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="buy">Buy</option>
                    <option value="rent">Rent</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g., Limited Time Offer"
                    required
                  />
                </div>

                {/* Original Price */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Original Price *
                  </label>
                  <input
                    type="number"
                    name="originalPrice"
                    value={formData.originalPrice}
                    onChange={handleInputChange}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="0"
                    required
                  />
                </div>

                {/* Deal Price */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Deal Price *
                  </label>
                  <input
                    type="number"
                    name="dealPrice"
                    value={formData.dealPrice}
                    onChange={handleInputChange}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="0"
                    required
                  />
                </div>

                {/* Discount % */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Discount % (Auto-calculated)
                  </label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-amber-50"
                    placeholder="Auto"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm h-20"
                  placeholder="Add deal description..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-amber-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resetForm()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={loading}
                >
                  {loading ? "Saving..." : editingDeal ? "Update Deal" : "Create Deal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeals;
