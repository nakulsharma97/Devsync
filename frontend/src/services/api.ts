import axios from "axios";

// Re-export for Convex-based services (legacy, will be migrated)
export function getAuthToken(): string | null {
  return localStorage.getItem("accessToken");
}

export interface RateLimitState {
  isRateLimited: boolean;
  retryAfter: number;
  retryAt: number | null;
}

const rateLimitStore: RateLimitState = {
  isRateLimited: false,
  retryAfter: 0,
  retryAt: null,
};

export function getRateLimitState(): RateLimitState {
  // Auto-expire if retry window has passed
  if (rateLimitStore.retryAt && Date.now() > rateLimitStore.retryAt) {
    rateLimitStore.isRateLimited = false;
    rateLimitStore.retryAfter = 0;
    rateLimitStore.retryAt = null;
  }
  return { ...rateLimitStore };
}

export function setRateLimit(seconds: number): void {
  rateLimitStore.isRateLimited = true;
  rateLimitStore.retryAfter = seconds;
  rateLimitStore.retryAt = Date.now() + seconds * 1000;
}

export function clearRateLimit(): void {
  rateLimitStore.isRateLimited = false;
  rateLimitStore.retryAfter = 0;
  rateLimitStore.retryAt = null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/auth";
        }
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/auth";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
