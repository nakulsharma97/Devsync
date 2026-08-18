import api from "./api";

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  jobTitle: string | null;
  company: string | null;
  location: string | null;
  githubUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  role: string;
  emailVerified: boolean;
  authProvider: string;
  createdAt: string;
  lastLoginAt: string | null;
  /** Present on /users responses (search, by-id) — absent on /auth/me. */
  presenceStatus?: string | null;
  lastActiveAt?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  /** Never populated in browser responses — the refresh token lives in an HttpOnly cookie. */
  refreshToken?: string;
  tokenType: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
    role: string;
  };
}

export const authService = {
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    username?: string;
  }): Promise<AuthResponse> {
    const res = await api.post("/auth/register", data);
    return res.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
  },

  async refresh(): Promise<AuthResponse> {
    // The refresh token is sent automatically via the HttpOnly cookie.
    const res = await api.post("/auth/refresh", {});
    return res.data;
  },

  async logout(): Promise<void> {
    // Revokes the refresh token server-side and clears the cookie.
    await api.post("/auth/logout", {});
  },

  async sendOtp(email: string): Promise<void> {
    await api.post(`/auth/otp/send?email=${encodeURIComponent(email)}`);
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const res = await api.post("/auth/otp/verify", { email, otp });
    return res.data;
  },

  async getMe(): Promise<UserDto> {
    const res = await api.get("/auth/me");
    return res.data;
  },

  saveSession(response: AuthResponse) {
    // Only the short-lived access token and the user profile live in localStorage.
    // The refresh token is an HttpOnly cookie and never touches JavaScript.
    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("user", JSON.stringify(response.user));
  },

  clearSession() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  },

  getStoredUser(): AuthResponse["user"] | null {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.id === "string" &&
        typeof parsed.email === "string"
      ) {
        return parsed;
      }
    } catch {
      // Corrupt value (e.g. written by an older app version) — fall through and
      // clear it so the app boots into a clean, logged-out state instead of
      // crashing the whole tree at AuthProvider mount.
    }
    localStorage.removeItem("user");
    return null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("accessToken");
  },

  /** Generic response — the server never reveals whether the email exists. */
  async forgotPassword(email: string): Promise<void> {
    await api.post("/auth/forgot-password", { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post("/auth/reset-password", { token, newPassword });
  },

  /** Sends a verification link to an unverified account (silently skipped otherwise). */
  async requestEmailVerification(email: string): Promise<void> {
    await api.post("/auth/email/verify/request", { email });
  },

  async verifyEmail(token: string): Promise<void> {
    await api.post("/auth/email/verify", { token });
  },

  async loginWithOAuth(provider: string): Promise<void> {
    const baseUrl = api.defaults.baseURL || "/api";
    window.location.href = `${baseUrl.replace(/\/+$/, "")}/oauth2/authorization/${provider}`;
  },
};
