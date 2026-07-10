import api from "./api";
import type { UserDto } from "./authService";
export type { UserDto };

export interface UpdateUserData {
  fullName?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  githubUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
}

export const userService = {
  async getMe(): Promise<UserDto> {
    const res = await api.get("/users/me");
    return res.data;
  },

  async updateMe(data: UpdateUserData): Promise<UserDto> {
    const res = await api.put("/users/me", data);
    return res.data;
  },

  async getUser(id: string): Promise<UserDto> {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },

  async searchUsers(query: string): Promise<UserDto[]> {
    const res = await api.get(`/users?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  async getAllUsers(): Promise<UserDto[]> {
    const res = await api.get("/users/all");
    return res.data;
  },
};
