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

// Same-origin by default: the nginx reverse proxy (prod) and the Vite dev
// server (dev) both forward /api to the backend. A bare path never leaks a
// localhost hostname into a production bundle, and the browser always uses the
// correct http/https scheme.
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send the HttpOnly refresh-token cookie on /api/auth requests
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

// Response interceptor — handle 401, token refresh and stale-role 403s
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // A 403 on an admin endpoint means the current token's role is no longer
    // sufficient (e.g. the admin was downgraded or blocked while logged in).
    // Drop the cached role and let AuthContext re-fetch the authoritative
    // profile from the server - never trust client-side role state.
    if (error.response?.status === 403 && originalRequest?.url?.includes("/admin/")) {
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:authorization-changed"));
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // The HttpOnly refresh cookie is sent automatically (withCredentials).
        // No token is read from or written to localStorage here — the new refresh
        // token is set as a fresh cookie by the server (rotation).
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        localStorage.setItem("accessToken", data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed (expired/rotated/revoked, or the account was blocked).
        // Clean up and send the user to the login screen.
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/auth";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
