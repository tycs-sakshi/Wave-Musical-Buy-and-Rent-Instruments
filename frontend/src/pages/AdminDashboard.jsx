import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAdminAnalytics,
  getAdminNotificationsApi,
  markAdminNotificationReadApi,
  markAllAdminNotificationsReadApi,
} from "@/api/adminApi";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN");
};

const MonthlyOrdersChart = ({ title, data, fromClass, toClass, valueClass }) => {
  const maxCount = useMemo(
    () => Math.max(...(data || []).map((item) => item.count), 1),
    [data]
  );

  return (
    <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-12">
        {(data || []).map((item) => {
          const heightPct = Math.max((item.count / maxCount) * 100, item.count > 0 ? 10 : 0);
          return (
            <div key={item.monthKey} className="flex flex-col items-center gap-2">
              <div className="flex h-36 w-full items-end">
                <div
                  className={`w-full rounded-t-md bg-gradient-to-t ${fromClass} ${toClass} shadow-sm transition-all duration-300 hover:opacity-85`}
                  style={{ height: `${heightPct}%` }}
                  title={`${item.monthLabel}: ${item.count}`}
                />
              </div>
              <p className="text-[10px] font-medium text-slate-500">{item.monthLabel}</p>
              <p className={`text-xs font-semibold ${valueClass}`}>{item.count}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const currentUser = useSelector((state) => state.user.user);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [markingReadId, setMarkingReadId] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const notificationMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser?.role !== "admin") return;

    const fetchStats = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const [analyticsRes, notificationsRes] = await Promise.all([
          getAdminAnalytics(),
          getAdminNotificationsApi(12),
        ]);

        setStats(analyticsRes.data.data);
        setNotifications(notificationsRes.data?.data || []);
        setUnreadCount(Number(notificationsRes.data?.unreadCount || 0));
      } catch (error) {
        console.error(error);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchStats();
    const poll = setInterval(() => fetchStats(true), 15000);
    return () => clearInterval(poll);
  }, [currentUser]);

  useEffect(() => {
    if (!notificationOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!notificationMenuRef.current) return;
      if (!notificationMenuRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [notificationOpen]);

  const markNotificationRead = async (notificationId) => {
    if (!notificationId) return;
    try {
      setMarkingReadId(notificationId);
      const res = await markAdminNotificationReadApi(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notificationId ? { ...item, isRead: true, read: true } : item
        )
      );
      if (Number.isFinite(Number(res.data?.unreadCount))) {
        setUnreadCount(Number(res.data.unreadCount));
      } else {
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setMarkingReadId("");
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      setMarkingAllRead(true);
      await markAllAdminNotificationsReadApi();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          read: true,
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    } finally {
      setMarkingAllRead(false);
    }
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
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-4xl font-display font-bold text-slate-900">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-600">
              Manage instruments, categories, brands, orders, deals, and users.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <div ref={notificationMenuRef} className="relative">
              <Button
                variant="outline"
                size="icon"
                className="relative border-amber-300 bg-white text-slate-700 hover:bg-amber-50"
                onClick={() => setNotificationOpen((prev) => !prev)}
                aria-label="Open notifications"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>

              {notificationOpen && (
                <div className="absolute right-0 z-40 mt-2 w-[360px] max-w-[90vw] rounded-xl border border-amber-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-amber-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Order Notifications</p>
                      <p className="text-xs text-slate-500">Unread: {unreadCount}</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        disabled={markingAllRead}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-60"
                      >
                        {markingAllRead ? "Marking..." : "Mark all as read"}
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-amber-100">
                    {!notifications.length && (
                      <p className="px-4 py-5 text-sm text-slate-500">
                        No recent order notifications.
                      </p>
                    )}

                    {notifications.map((notification) => {
                      const orderType =
                        notification.orderType ||
                        (notification.type === "rent" ? "Rent" : "Purchase");
                      const instrumentName =
                        notification.instrumentName ||
                        notification.meta?.instrumentName ||
                        "Instrument";
                      const isRead = Boolean(notification.isRead ?? notification.read);

                      return (
                        <div
                          key={notification._id}
                          className={`px-4 py-3 ${
                            isRead ? "bg-white" : "bg-amber-50/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-900">
                                {notification.message || "New order placed"}
                              </p>
                              <p className="text-xs text-slate-600">
                                User: {notification.userName || "Unknown user"}
                              </p>
                              <p className="text-xs text-slate-600">Type: {orderType}</p>
                              <p className="text-xs text-slate-600">
                                Instrument: {instrumentName}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {formatDateTime(notification.createdAt)}
                              </p>
                            </div>
                            {!isRead && (
                              <button
                                type="button"
                                onClick={() => markNotificationRead(notification._id)}
                                disabled={markingReadId === notification._id}
                                className="inline-flex items-center gap-1 rounded-full border border-amber-300 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                              >
                                {markingReadId === notification._id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Check className="size-3" />
                                )}
                                {markingReadId === notification._id ? "Saving" : "Read"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Button
              className="bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => navigate("/admin/instruments")}
            >
              Instruments
            </Button>
            <Button
              className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-100"
              onClick={() => navigate("/admin/categories")}
            >
              Categories
            </Button>
            <Button
              className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-100"
              onClick={() => navigate("/admin/brands")}
            >
              Brands
            </Button>
            <Button
              className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-100"
              onClick={() => navigate("/admin/orders")}
            >
              Orders
            </Button>
            <Button
              className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-100"
              onClick={() => navigate("/admin/deals")}
            >
              Deals
            </Button>
            <Button
              className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-100"
              onClick={() => navigate("/admin/users")}
            >
              Users
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-amber-200">
          <h2 className="text-xl font-display font-semibold mb-4 text-slate-900">
            Store Overview
          </h2>
          {loading || !stats ? (
            <p className="text-slate-500 text-sm">Loading analytics...</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-lg p-4 bg-sky-50 border border-sky-100">
                  <p className="text-xs text-slate-500 mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-sky-700">{stats.totalUsers}</p>
                </div>
                <div className="rounded-lg p-4 bg-indigo-50 border border-indigo-100">
                  <p className="text-xs text-slate-500 mb-1">Total Instruments</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {stats.totalInstruments}
                  </p>
                </div>
                <div className="rounded-lg p-4 bg-amber-50 border border-amber-100">
                  <p className="text-xs text-slate-500 mb-1">Buy Orders</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {stats.totalBuyOrders}
                  </p>
                </div>
                <div className="rounded-lg p-4 bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-slate-500 mb-1">Rent Orders</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {stats.totalRentOrders}
                  </p>
                </div>
                <div className="rounded-lg p-4 bg-violet-50 border border-violet-100">
                  <p className="text-xs text-slate-500 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-violet-700">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg p-4 border border-pink-200 bg-gradient-to-r from-pink-50 to-white">
                  <p className="text-xs text-slate-500 mb-1">Buy Revenue (Arrived + Paid)</p>
                  <p className="text-xl font-bold text-pink-700">
                    {formatCurrency(stats.buyRevenue)}
                  </p>
                </div>
                <div className="rounded-lg p-4 border border-teal-200 bg-gradient-to-r from-teal-50 to-white">
                  <p className="text-xs text-slate-500 mb-1">Rent Revenue (Completed + Paid)</p>
                  <p className="text-xl font-bold text-teal-700">
                    {formatCurrency(stats.rentRevenue)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Inventory Alerts</p>
                    <p className="text-sm font-semibold text-slate-900">
                      Low threshold: {stats.lowStock?.threshold ?? 5}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose-100 border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
                      Out: {stats.lowStock?.outOfStockCount || 0}
                    </span>
                    <span className="rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                      Low: {stats.lowStock?.lowStockCount || 0}
                    </span>
                    <Button
                      className="bg-slate-900 text-white hover:bg-slate-800"
                      onClick={() => navigate("/admin/instruments")}
                    >
                      Restock Now
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  {!stats.lowStock?.instruments?.length ? (
                    <p className="text-sm text-emerald-700 font-medium">
                      No low-stock instruments right now.
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-2">
                      {stats.lowStock.instruments.slice(0, 8).map((item) => (
                        <div
                          key={item._id}
                          className="rounded-md border border-amber-200 bg-white px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.category}</p>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                              item.status === "out"
                                ? "bg-rose-100 text-rose-700 border-rose-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}
                          >
                            {item.status === "out"
                              ? "Out of Stock"
                              : `Low Stock (${item.stock})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {!loading && stats && (
          <section className="grid lg:grid-cols-2 gap-5 pb-10">
            <MonthlyOrdersChart
              title="Monthly Buy Orders"
              data={stats.monthlyBuyOrders || []}
              fromClass="from-amber-500"
              toClass="to-orange-500"
              valueClass="text-amber-700"
            />
            <MonthlyOrdersChart
              title="Monthly Rent Orders"
              data={stats.monthlyRentOrders || []}
              fromClass="from-emerald-500"
              toClass="to-teal-500"
              valueClass="text-emerald-700"
            />
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
