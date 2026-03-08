import axiosClient from "./axiosClient";

export const createBuyOrder = (payload) =>
  axiosClient.post("/orders/buy", payload);

export const createRentOrder = (payload) =>
  axiosClient.post("/orders/rent", payload);

export const getOrderQuote = (payload) => axiosClient.post("/orders/quote", payload);

export const getMyBuyOrders = () => axiosClient.get("/orders/buy/my");

export const getMyRentOrders = () => axiosClient.get("/orders/rent/my");

export const getBuyOrderById = (orderId) => axiosClient.get(`/orders/buy/${orderId}`);

export const getRentOrderById = (orderId) => axiosClient.get(`/orders/rent/${orderId}`);

export const requestBuyOrderReturn = (orderId, payload) =>
  axiosClient.post(`/orders/buy/${orderId}/return`, payload);

export const returnRentOrder = (orderId) =>
  axiosClient.post(`/orders/rent/${orderId}/return`);

export const getOrderInvoice = (type, orderId, config = {}) =>
  axiosClient.get(`/orders/invoice/${type}/${orderId}`, config);

export const emailOrderInvoice = (type, orderId) =>
  axiosClient.post(`/orders/invoice/${type}/${orderId}/email`);

