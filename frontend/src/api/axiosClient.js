import axios from "axios";

const DEFAULT_API_ORIGIN = "https://waves-musical.onrender.com";

const normalizeBaseUrl = (rawValue) => {
  const trimmedValue = String(rawValue || "").trim();
  if (!trimmedValue) return `${DEFAULT_API_ORIGIN}/api/v1`;

  const withoutTrailingSlash = trimmedValue.replace(/\/+$/, "");
  return /\/api\/v1$/i.test(withoutTrailingSlash)
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api/v1`;
};

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
const normalizedBaseUrl = normalizeBaseUrl(configuredBaseUrl);

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

