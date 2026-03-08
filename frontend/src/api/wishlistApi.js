import axiosClient from "./axiosClient";

export const getWishlist = () => axiosClient.get("/user/wishlist");

export const addToWishlistApi = (instrumentId) =>
  axiosClient.post(`/user/wishlist/${instrumentId}`);

export const removeFromWishlistApi = (instrumentId) =>
  axiosClient.delete(`/user/wishlist/${instrumentId}`);

