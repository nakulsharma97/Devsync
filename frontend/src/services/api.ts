import axios from "axios";

// Re-export for legacy consumers — now returns null since tokens are in HttpOnly cookies.
export function getAuthToken(): string | null {
  return null;
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
// server (dev) both forward /api to the backend.
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send HttpOnly cookies (access_token + refresh_token)
  headers: {
    "Content-Type": "application/json",
  },
});

// CSRF initialization: fetch the token before any state-changing requests.
// The XSRF-TOKEN cookie is set by the CsrfFilter on this GET response.
// Subsequent POST/PUT/DELETE requests read it from the cookie and attach
// it as the X-XSRF-TOKEN header.
async function initCsrf(): Promise<void> {
  try {
    await axios.get(`${API_BASE_URL}/auth/csrf`, { withCredentials: true });
  } catch {
    // CSRF init failure — the POST will fail with 403, which is correct behavior.
  }
}
/**
 * Read a cookie value by name. Used to extract the CSRF token from the
 * X-XSRF-TOKEN cookie that Spring Security sets on the first response.
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

// Request interceptor — attach CSRF token for state-changing requests.
// Uses the SPA pattern: CSRF token is read from the XSRF-TOKEN cookie
// (set by CsrfFilter on the initCsrf GET response) and sent as a header.
api.interceptors.request.use(
  async (config) => {
    const method = (config.method || "").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      // Always verify the cookie is actually present, not just the flag —
      // the flag can be stale (true) while the session-only XSRF-TOKEN
      // cookie has been cleared (browser restart, privacy settings, etc).
      if (!getCookie("XSRF-TOKEN")) {
        await initCsrf();
      }
      const csrfToken = getCookie("XSRF-TOKEN");
      if (csrfToken) {
        config.headers["X-XSRF-TOKEN"] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 (token refresh via cookie)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";

    // A 403 on an admin endpoint means the current role is no longer sufficient.
    if (error.response?.status === 403 && requestUrl.includes("/admin/")) {
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:authorization-changed"));
    }

    // Skip refresh for auth-page requests: /auth/csrf, /auth/me, and /auth/refresh
    // itself. These fire during session bootstrap — there is no valid refresh token
    // to rotate, so attempting one would waste a request and could trigger the
    // rate limiter. Also skip if we are already on /auth to prevent a redirect loop.
    const isAuthPageRequest = requestUrl.includes("/auth/");
    const onAuthPage =
      window.location.pathname === "/auth" ||
      window.location.pathname.startsWith("/auth?");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthPageRequest &&
      !onAuthPage
    ) {
      originalRequest._retry = true;

      try {
        // The HttpOnly refresh_token cookie is sent automatically.
        // The server rotates the refresh cookie and sets a new access_token cookie.
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        // The new user data is in the response — store user profile (not tokens).
        if (data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        return api(originalRequest);
      } catch {
        // Refresh failed — clean up and redirect to login.
        localStorage.removeItem("user");
        window.location.href = "/auth";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
