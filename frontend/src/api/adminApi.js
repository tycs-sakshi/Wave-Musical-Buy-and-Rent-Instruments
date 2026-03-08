import axiosClient from "./axiosClient";

export const getAdminAnalytics = () =>
  axiosClient.get("/admin/analytics/summary");

export const getAdminNotificationsApi = (limit = 15) =>
  axiosClient.get("/admin/notifications", {
    params: { limit },
  });

export const markAdminNotificationReadApi = (id) =>
  axiosClient.patch(`/admin/notifications/${id}/read`);

export const markAllAdminNotificationsReadApi = () =>
  axiosClient.patch("/admin/notifications/read-all");

export const getAdminBuyOrders = () => axiosClient.get("/admin/orders/buy");

export const getAdminRentOrders = () => axiosClient.get("/admin/orders/rent");

export const updateBuyOrderStatusApi = (id, status) =>
  axiosClient.patch(`/admin/buy-orders/${id}/status`, { status });

export const updateBuyOrderReturnStatusApi = (id, status, adminNote = "") =>
  axiosClient.patch(`/admin/buy-orders/${id}/return`, { status, adminNote });

export const updateBuyOrderRefundStatusApi = (id, refundStatus) =>
  axiosClient.patch(`/admin/buy-orders/${id}/refund`, { refundStatus });

export const approveRentOrderApi = (id) =>
  axiosClient.patch(`/admin/rent-orders/${id}/approve`);

export const rejectRentOrderApi = (id) =>
  axiosClient.patch(`/admin/rent-orders/${id}/reject`);

export const markRentOrderActiveApi = (id) =>
  axiosClient.patch(`/admin/rent-orders/${id}/mark-active`);

export const markRentOrderCompletedApi = (id) =>
  axiosClient.patch(`/admin/rent-orders/${id}/mark-completed`);

export const getAdminUsersApi = () => axiosClient.get("/admin/users");

export const updateAdminUserApi = (id, payload) =>
  axiosClient.patch(`/admin/users/${id}`, payload);

