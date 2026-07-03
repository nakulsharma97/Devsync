import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("devsync_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        localStorage.removeItem("devsync_token");
        localStorage.removeItem("devsync_user");
        window.location.href = "/auth";
      }

      const message = data?.error || data?.message || "An error occurred";
      return Promise.reject(new Error(message));
    }

    if (error.request) {
      return Promise.reject(new Error("Network error. Please check your connection."));
    }

    return Promise.reject(error);
  },
);

// Token management
export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem("devsync_token", token);
  } else {
    localStorage.removeItem("devsync_token");
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("devsync_token");
};

// Health check
export interface HealthStatus {
  status: string;
  components?: Record<string, { status: string }>;
}

export const checkHealth = async (): Promise<HealthStatus> => {
  const { data } = await api.get<HealthStatus>("/actuator/health");
  return data;
};

export default api;
