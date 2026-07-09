import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

function getToken(): string {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: string;
  avatarUrl?: string;
  postCount: number;
  followerCount: number;
  createdAt: number;
}

export interface PlatformStats {
  totalUsers: number;
  totalPosts: number;
  totalProjects: number;
  totalTeams: number;
  totalConnections: number;
}

export interface AdminPost {
  _id: string;
  content: string;
  likeCount: number;
  commentCount: number;
  createdAt: number;
  author: { id: string; fullName: string; email: string } | null;
}

export const adminService = {
  async isAdmin(): Promise<boolean> {
    const token = getToken();
    return await convexClient.query(api.admin.isAdmin, { token });
  },

  async getPlatformStats(): Promise<PlatformStats> {
    const token = getToken();
    return await convexClient.query(api.admin.getPlatformStats, { token });
  },

  async getAllUsers(): Promise<AdminUser[]> {
    const token = getToken();
    return await convexClient.query(api.admin.getAllUsers, { token });
  },

  async getAllPosts(): Promise<AdminPost[]> {
    const token = getToken();
    return await convexClient.query(api.admin.getAllPosts, { token });
  },

  async updateUserRole(userId: string, role: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.admin.updateUserRole, {
      token,
      userId: userId as any,
      role,
    });
  },

  async deletePost(postId: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.admin.deletePost, {
      token,
      postId: postId as any,
    });
  },
};
