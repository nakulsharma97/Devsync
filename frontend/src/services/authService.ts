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
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const res = await api.post("/auth/refresh", { refreshToken });
    return res.data;
  },

  async sendOtp(email: string): Promise<void> {
    await api.post(`/auth/otp/send?email=${encodeURIComponent(email)}`);
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const res = await api.post("/auth/otp/verify", { email, otp });
    return res.data;
  },

  async oauthCallback(data: {
    email: string;
    fullName: string;
    avatarUrl?: string;
    provider: string;
  }): Promise<AuthResponse> {
    const res = await api.post("/auth/oauth/callback", data);
    return res.data;
  },

  async getMe(): Promise<UserDto> {
    const res = await api.get("/auth/me");
    return res.data;
  },

  saveSession(response: AuthResponse) {
    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("refreshToken", response.refreshToken);
    localStorage.setItem("user", JSON.stringify(response.user));
  },

  clearSession() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },

  getStoredUser(): AuthResponse["user"] | null {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("accessToken");
  },

  async forgotPassword(email: string): Promise<void> {
    console.warn("Forgot password not yet implemented on the server");
    // Endpoint will be added in a future update
  },

  async loginWithOAuth(provider: string): Promise<void> {
    const baseUrl = (api.defaults as any).baseURL || "/api";
    window.location.href = `${baseUrl.replace(/\/+$/, "")}/oauth2/authorization/${provider}`;
  },
};
