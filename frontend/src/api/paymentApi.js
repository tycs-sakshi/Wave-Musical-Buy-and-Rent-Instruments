import axiosClient from "./axiosClient";

export const createRazorpayOrderApi = (payload) =>
  axiosClient.post("/payments/razorpay/create-order", payload);

export const verifyRazorpayPaymentApi = (payload) =>
  axiosClient.post("/payments/razorpay/verify", payload);

