import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { setAuthToken } from "./api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  username: string;
}

export interface AuthResponse {
  userId?: string;
  email: string;
  fullName: string;
  role: string;
  token: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const result = await convexClient.action(api.users.login, data);
      setAuthToken(result.token);
      return result;
    } catch (error: any) {
      throw new Error(error?.message || "Login failed");
    }
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const result = await convexClient.action(api.users.register, data);
      setAuthToken(result.token);
      return result;
    } catch (error: any) {
      throw new Error(error?.message || "Registration failed");
    }
  },
};
