import axiosClient from "./axiosClient";

export const getAllCategories = () => axiosClient.get("/categories");

export const createCategoryApi = (payload) =>
  axiosClient.post("/categories", payload);

export const updateCategoryApi = (id, payload) =>
  axiosClient.put(`/categories/${id}`, payload);

export const deleteCategoryApi = (id) =>
  axiosClient.delete(`/categories/${id}`);

