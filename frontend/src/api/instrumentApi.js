import axiosClient from "./axiosClient";

export const getInstruments = (params = {}) =>
  axiosClient.get("/instruments", { params });

export const getTrendingInstruments = (params = {}) =>
  axiosClient.get("/instruments/trending/popular", { params });

export const getInstrumentByIdOrSlug = (idOrSlug) =>
  axiosClient.get(`/instruments/${idOrSlug}`);

export const getCategories = () => axiosClient.get("/categories");

export const createInstrumentApi = (payload) =>
  axiosClient.post("/instruments", payload);

export const updateInstrumentApi = (id, payload) =>
  axiosClient.put(`/instruments/${id}`, payload);

export const deleteInstrumentApi = (id) =>
  axiosClient.delete(`/instruments/${id}`);

