import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

export interface UserProfileRequest {
  fullName?: string;
  username?: string;
  bio?: string;
  location?: string;
  githubUsername?: string;
  linkedinLink?: string;
  portfolioWebsite?: string;
  avatarUrl?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  location?: string;
  githubUsername?: string;
  linkedinLink?: string;
  portfolioWebsite?: string;
  role: string;
  createdAt: string;
}

export const userService = {
  async getCurrentUser(): Promise<User> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    const user = await convexClient.query(api.users.getAccountByToken, {
      token,
    });
    if (!user) throw new Error("User not found");
    return user;
  },

  async updateProfile(data: UserProfileRequest): Promise<User> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    await convexClient.mutation(api.users.updateAccountProfile, {
      token,
      ...data,
    });
    // Return updated user
    const updated = await convexClient.query(api.users.getAccountByToken, {
      token,
    });
    if (!updated) throw new Error("User not found");
    return updated;
  },

  async getUserById(id: string): Promise<User> {
    const user = await convexClient.query(api.users.getAccountById, {
      accountId: id as any,
    });
    if (!user) throw new Error("User not found");
    return user;
  },
};
