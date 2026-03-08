import axiosClient from "./axiosClient";

export const getReviews = (instrumentId) =>
  axiosClient.get(`/reviews/${instrumentId}`);

export const addReview = (instrumentId, payload) =>
  axiosClient.post(`/reviews/${instrumentId}`, payload);

