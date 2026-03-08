import axios from "axios";

const fallbackBaseUrl = `${process.env.REACT_APP_API_URL}/api/v1`;
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
const normalizedBaseUrl = (configuredBaseUrl || fallbackBaseUrl).replace(
  /\/+$/,
  ""
);

const axiosClient = axios.create({
  baseURL: normalizedBaseUrl,
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosClient;

