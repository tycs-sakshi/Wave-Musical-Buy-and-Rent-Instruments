import axiosClient from "./axiosClient";

const dealApi = {
  getDeals: async () => {
    const response = await axiosClient.get("/deals");
    return response;
  },

  getAllDealsAdmin: async () => {
    const response = await axiosClient.get("/deals/admin/all");
    return response;
  },

  createDeal: async (payload) => {
    const response = await axiosClient.post("/deals/create", payload);
    return response;
  },

  updateDeal: async (id, payload) => {
    const response = await axiosClient.put(`/deals/${id}`, payload);
    return response;
  },

  deleteDeal: async (id) => {
    const response = await axiosClient.delete(`/deals/${id}`);
    return response;
  },
};

export default dealApi;
