import api from "./api";

export interface UserProfileRequest {
  fullName?: string;
  username?: string;
  bio?: string;
  location?: string;
  githubUsername?: string;
  linkedinLink?: string;
  portfolioWebsite?: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  location: string;
  githubUsername: string;
  linkedinLink: string;
  portfolioWebsite: string;
  role: string;
  createdAt: string;
}

export const userService = {
  async getCurrentUser(): Promise<User> {
    const response = await api.get("/users/me");
    return response.data.data;
  },

  async updateProfile(data: UserProfileRequest): Promise<User> {
    const response = await api.put("/users/me/profile", data);
    return response.data.data;
  },

  async getUserById(id: number): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data.data;
  },
};
