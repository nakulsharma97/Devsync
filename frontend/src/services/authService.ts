import api, { setAuthToken } from "./api";

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
  userId: number;
  email: string;
  fullName: string;
  role: string;
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>("/auth/login", data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Login failed");
    }
    setAuthToken(response.data.data.token);
    return response.data.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>("/auth/register", data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Registration failed");
    }
    setAuthToken(response.data.data.token);
    return response.data.data;
  },
};
