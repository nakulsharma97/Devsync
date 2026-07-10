import api from "./api";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: string;
  avatarUrl?: string;
  postCount: number;
  followerCount: number;
  createdAt: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalPosts: number;
  totalProjects: number;
  totalTeams: number;
  totalConnections: number;
}

export interface AdminPost {
  id: string;
  content: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: { id: string; fullName: string; email: string } | null;
}

export const adminService = {
  async isAdmin(): Promise<boolean> {
    try { const res = await api.get("/admin/check"); return res.data?.isAdmin || false; }
    catch { return false; }
  },
  async getPlatformStats(): Promise<PlatformStats> {
    try { const res = await api.get("/admin/stats"); return res.data; }
    catch { return { totalUsers: 0, totalPosts: 0, totalProjects: 0, totalTeams: 0, totalConnections: 0 }; }
  },
  async getAllUsers(): Promise<AdminUser[]> {
    try { const res = await api.get("/admin/users"); return res.data; }
    catch { return []; }
  },
  async getAllPosts(): Promise<any[]> {
    try { const res = await api.get("/admin/posts"); return res.data; }
    catch { return []; }
  },
  async updateUserRole(userId: string, role: string): Promise<void> {
    await api.put(`/admin/users/${userId}/role`, { role });
  },
  async deletePost(postId: string): Promise<void> {
    await api.delete(`/admin/posts/${postId}`);
  },
};
