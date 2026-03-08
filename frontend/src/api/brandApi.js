import axiosClient from "./axiosClient";

export const getAllBrands = () => axiosClient.get("/brands");

export const createBrandApi = (payload) => axiosClient.post("/brands", payload);

export const updateBrandApi = (id, payload) =>
  axiosClient.put(`/brands/${id}`, payload);

export const deleteBrandApi = (id) => axiosClient.delete(`/brands/${id}`);

