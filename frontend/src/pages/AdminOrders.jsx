import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  approveRentOrderApi,
  getAdminBuyOrders,
  getAdminRentOrders,
  markRentOrderActiveApi,
  markRentOrderCompletedApi,
  rejectRentOrderApi,
  updateBuyOrderReturnStatusApi,
  updateBuyOrderStatusApi,
} from "@/api/adminApi";

const BUY_STATUS_OPTIONS = [
  "placed",
  "processing",
  "shipped",
  "arrived",
  "cancelled",
  "returned",
];

const normalizeBuyStatus = (status) => {
  if (status === "pending") return "placed";
  if (status === "paid") return "processing";
  if (status === "completed") return "arrived";
  return status;
};

const toLabel = (value) => {
  if (!value) return "Unknown";
  if (value === "arrived") return "Delivered";
  const normalized = String(value).replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getUserName = (user) => {
  if (!user) return "Unknown user";
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return fullName || user.email || "Unknown user";
};

const summarizeBuyOrderItems = (items = []) => {
  const names = items
    .map((item) => item?.name || item?.instrument?.name)
    .filter(Boolean);
  if (!names.length) return "Instrument unavailable";
  if (names.length === 1) return names[0];
  return `${names[0]} + ${names.length - 1} more`;
};

const statusBadgeClass = (status) => {
  const normalized = normalizeBuyStatus(status);
  if (["arrived", "completed", "returned", "paid"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-100 text-emerald-800";
  }
  if (["pending", "placed", "processing", "approved", "active"].includes(normalized)) {
    return "border-amber-200 bg-amber-100 text-amber-800";
  }
  if (["rejected", "cancelled", "failed"].includes(normalized)) {
    return "border-rose-200 bg-rose-100 text-rose-800";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
};

const StatusFilterTabs = ({ value, onChange, options }) => (
  <Tabs value={value} onValueChange={onChange} className="space-y-4">
    <TabsList className="flex w-full flex-wrap gap-2 bg-amber-50 border border-amber-200 h-auto p-2">
      {options.map((opt) => (
        <TabsTrigger
          key={opt.value}
          value={opt.value}
          className="data-[state=active]:bg-slate-900 data-[state=active]:text-white flex-1 min-w-[120px]"
        >
          {opt.label} ({opt.count})
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);

const AdminOrders = () => {
  const currentUser = useSelector((state) => state.user.user);
  const [buyOrders, setBuyOrders] = useState([]);
  const [rentOrders, setRentOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [orderTab, setOrderTab] = useState("purchase");
  const [buyStatusTab, setBuyStatusTab] = useState("placed");
  const [rentStatusTab, setRentStatusTab] = useState("pending");
  const [buyStatusById, setBuyStatusById] = useState({});

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [buyRes, rentRes] = await Promise.all([
        getAdminBuyOrders(),
        getAdminRentOrders(),
      ]);
      setBuyOrders(buyRes.data.data || []);
      setRentOrders(rentRes.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch orders");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role !== "admin") return;
    fetchOrders();
    const poll = setInterval(() => fetchOrders(true), 15000);
    return () => clearInterval(poll);
  }, [currentUser, fetchOrders]);

  useEffect(() => {
    setBuyStatusById((prev) => {
      const next = { ...prev };
      buyOrders.forEach((order) => {
        next[order._id] = normalizeBuyStatus(order.status);
      });
      return next;
    });
  }, [buyOrders]);

  const updateBuyStatus = async (orderId) => {
    const nextStatus = buyStatusById[orderId];
    if (!nextStatus) return;

    try {
      setUpdatingId(`buy-status:${orderId}`);
      await updateBuyOrderStatusApi(orderId, nextStatus);
      toast.success("Purchase order status updated");
      await fetchOrders(true);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update purchase status");
    } finally {
      setUpdatingId("");
    }
  };

  const runBuyReturnAction = async (orderId, status) => {
    try {
      setUpdatingId(`buy-return:${orderId}:${status}`);
      await updateBuyOrderReturnStatusApi(orderId, status);
      toast.success(`Return ${toLabel(status)}`);
      await fetchOrders(true);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update return status");
    } finally {
      setUpdatingId("");
    }
  };

  const runRentAction = async (orderId, action) => {
    try {
      setUpdatingId(`rent:${orderId}`);
      await action(orderId);
      toast.success("Rental order updated");
      await fetchOrders(true);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update rental status");
    } finally {
      setUpdatingId("");
    }
  };

  const sortedBuyOrders = useMemo(
    () => [...buyOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [buyOrders]
  );

  const sortedRentOrders = useMemo(
    () => [...rentOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [rentOrders]
  );

  const buySections = useMemo(() => {
    const placed = sortedBuyOrders.filter(
      (order) => normalizeBuyStatus(order.status) === "placed"
    );
    const processing = sortedBuyOrders.filter(
      (order) => normalizeBuyStatus(order.status) === "processing"
    );
    const shipped = sortedBuyOrders.filter(
      (order) => normalizeBuyStatus(order.status) === "shipped"
    );
    const completed = sortedBuyOrders.filter((order) =>
      ["arrived", "completed", "returned"].includes(normalizeBuyStatus(order.status))
    );

    return {
      all: sortedBuyOrders,
      placed,
      processing,
      shipped,
      completed,
    };
  }, [sortedBuyOrders]);

  const rentSections = useMemo(() => {
    const pending = sortedRentOrders.filter((order) => order.status === "pending");
    const approved = sortedRentOrders.filter((order) =>
      ["approved", "active"].includes(order.status)
    );
    const rejected = sortedRentOrders.filter((order) => order.status === "rejected");
    const completed = sortedRentOrders.filter((order) => order.status === "completed");

    return {
      all: sortedRentOrders,
      pending,
      approved,
      rejected,
      completed,
    };
  }, [sortedRentOrders]);

  const buyStatusOptions = [
    { value: "placed", label: "Placed", count: buySections.placed.length },
    {
      value: "processing",
      label: "Processing",
      count: buySections.processing.length,
    },
    { value: "shipped", label: "Shipped", count: buySections.shipped.length },
    {
      value: "completed",
      label: "Delivered/Returned",
      count: buySections.completed.length,
    },
    { value: "all", label: "All", count: buySections.all.length },
  ];

  const rentStatusOptions = [
    { value: "pending", label: "Pending", count: rentSections.pending.length },
    { value: "approved", label: "Approved", count: rentSections.approved.length },
    { value: "rejected", label: "Rejected", count: rentSections.rejected.length },
    { value: "completed", label: "Completed", count: rentSections.completed.length },
    { value: "all", label: "All", count: rentSections.all.length },
  ];

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-slate-600">You are not authorized to view this page.</p>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-amber-50">
      <div className="max-w-7xl mx-auto px-4 pb-10 space-y-6">
        <h1 className="text-3xl font-display font-bold text-slate-900">Order Management</h1>

        <Tabs value={orderTab} onValueChange={setOrderTab} className="space-y-5">
          <TabsList className="bg-white border border-amber-300 shadow-sm">
            <TabsTrigger
              value="purchase"
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              Purchase Orders ({buyOrders.length})
            </TabsTrigger>
            <TabsTrigger
              value="rental"
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              Rental Orders ({rentOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchase" className="space-y-4">
            <StatusFilterTabs
              value={buyStatusTab}
              onChange={setBuyStatusTab}
              options={buyStatusOptions}
            />

            <section className="overflow-x-auto rounded-xl border border-amber-200 bg-white shadow-sm">
              <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Purchase Orders:{" "}
                  {buyStatusOptions.find((opt) => opt.value === buyStatusTab)?.label || "All"}
                </h2>
              </div>

              {loading ? (
                <p className="p-4 text-sm text-slate-500">Loading purchase orders...</p>
              ) : !(buySections[buyStatusTab] || []).length ? (
                <p className="p-4 text-sm text-slate-500">No purchase orders found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-amber-100/70">
                    <tr className="text-left text-slate-700">
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">User Name</th>
                      <th className="px-4 py-3">Instrument Name</th>
                      <th className="px-4 py-3">Order Date</th>
                      <th className="px-4 py-3">Payment Status</th>
                      <th className="px-4 py-3">Order Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {(buySections[buyStatusTab] || []).map((order) => {
                      const returnStatus = order.returnRequest?.status || "none";
                      const savingStatus = updatingId === `buy-status:${order._id}`;

                      return (
                        <tr key={order._id} className="hover:bg-amber-50/60">
                          <td className="px-4 py-3 font-medium text-slate-800">{order._id}</td>
                          <td className="px-4 py-3 text-slate-700">{getUserName(order.user)}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {summarizeBuyOrderItems(order.items || [])}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(order.createdAt).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                                order.paymentStatus
                              )}`}
                            >
                              {toLabel(order.paymentStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <span
                                className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                                  order.status
                                )}`}
                              >
                                {toLabel(order.status)}
                              </span>
                              {returnStatus !== "none" && (
                                <p className="text-[11px] font-semibold text-violet-700">
                                  Return: {toLabel(returnStatus)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={buyStatusById[order._id] || normalizeBuyStatus(order.status)}
                                  onChange={(event) =>
                                    setBuyStatusById((prev) => ({
                                      ...prev,
                                      [order._id]: event.target.value,
                                    }))
                                  }
                                  className="rounded border border-amber-300 bg-white px-2 py-1"
                                >
                                  {BUY_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                      {toLabel(status)}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  className="bg-slate-900 text-white hover:bg-slate-800"
                                  disabled={savingStatus}
                                  onClick={() => updateBuyStatus(order._id)}
                                >
                                  {savingStatus ? "Saving..." : "Save"}
                                </Button>
                              </div>

                              {returnStatus === "requested" && (
                                <div className="flex gap-2">
                                  <Button
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                    disabled={updatingId === `buy-return:${order._id}:approved`}
                                    onClick={() => runBuyReturnAction(order._id, "approved")}
                                  >
                                    Approve Return
                                  </Button>
                                  <Button
                                    className="bg-rose-600 text-white hover:bg-rose-700"
                                    disabled={updatingId === `buy-return:${order._id}:rejected`}
                                    onClick={() => runBuyReturnAction(order._id, "rejected")}
                                  >
                                    Reject Return
                                  </Button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </TabsContent>

          <TabsContent value="rental" className="space-y-4">
            <StatusFilterTabs
              value={rentStatusTab}
              onChange={setRentStatusTab}
              options={rentStatusOptions}
            />

            <section className="overflow-x-auto rounded-xl border border-amber-200 bg-white shadow-sm">
              <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Rental Orders:{" "}
                  {rentStatusOptions.find((opt) => opt.value === rentStatusTab)?.label || "All"}
                </h2>
              </div>

              {loading ? (
                <p className="p-4 text-sm text-slate-500">Loading rental orders...</p>
              ) : !(rentSections[rentStatusTab] || []).length ? (
                <p className="p-4 text-sm text-slate-500">No rental orders found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-amber-100/70">
                    <tr className="text-left text-slate-700">
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">User Name</th>
                      <th className="px-4 py-3">Instrument Name</th>
                      <th className="px-4 py-3">Order Date</th>
                      <th className="px-4 py-3">Payment Status</th>
                      <th className="px-4 py-3">Order Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {(rentSections[rentStatusTab] || []).map((order) => {
                      const loadingRentAction = updatingId === `rent:${order._id}`;

                      return (
                        <tr key={order._id} className="hover:bg-amber-50/60">
                          <td className="px-4 py-3 font-medium text-slate-800">{order._id}</td>
                          <td className="px-4 py-3 text-slate-700">{getUserName(order.user)}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {order.instrument?.name || "Instrument rental"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(order.createdAt).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                                order.paymentStatus
                              )}`}
                            >
                              {toLabel(order.paymentStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                                order.status
                              )}`}
                            >
                              {toLabel(order.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {order.status === "pending" && (
                                <>
                                  <Button
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                    disabled={loadingRentAction}
                                    onClick={() => runRentAction(order._id, approveRentOrderApi)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    className="bg-rose-600 text-white hover:bg-rose-700"
                                    disabled={loadingRentAction}
                                    onClick={() => runRentAction(order._id, rejectRentOrderApi)}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}

                              {order.status === "approved" && (
                                <Button
                                  className="bg-sky-600 text-white hover:bg-sky-700"
                                  disabled={loadingRentAction}
                                  onClick={() => runRentAction(order._id, markRentOrderActiveApi)}
                                >
                                  Mark Active
                                </Button>
                              )}

                              {order.status === "active" && (
                                <Button
                                  className="bg-slate-900 text-white hover:bg-slate-800"
                                  disabled={loadingRentAction}
                                  onClick={() => runRentAction(order._id, markRentOrderCompletedApi)}
                                >
                                  Mark Completed
                                </Button>
                              )}

                              {!["pending", "approved", "active"].includes(order.status) && (
                                <span className="text-xs text-slate-500">No actions</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminOrders;
