import api from "./api";
import type { UserDto } from "./authService";
export type { UserDto };

/**
 * Privacy-scoped profile returned for other users and search results — never
 * contains email, account metadata or login timestamps.
 */
export interface PublicUserDto {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  jobTitle: string | null;
  company: string | null;
  location: string | null;
  githubUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
  presenceStatus: string | null;
  lastActiveAt: string | null;
}

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

  async getUser(id: string): Promise<PublicUserDto> {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },

  async searchUsers(query: string): Promise<PublicUserDto[]> {
    const res = await api.get(`/users?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  async getAllUsers(): Promise<UserDto[]> {
    const res = await api.get("/users/all");
    return res.data;
  },
};
