import api from "./api";

export interface AdminUserSummary {
  id: string;
  email: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  role: string;
  blocked: boolean;
  createdAt: string;
}

export interface AdminProjectSummary {
  id: string;
  name: string;
  status: string;
  ownerId: string;
  createdAt: string;
}

export interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalProjects: number;
  totalTeams: number;
  totalTasks: number;
  totalMessages: number;
  totalPosts: number;
  recentUsers: AdminUserSummary[];
  recentProjects: AdminProjectSummary[];
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: string;
  avatarUrl?: string;
  blocked: boolean;
  postCount: number;
  followerCount: number;
  createdAt: string;
}

export interface AdminPostAuthor {
  id: string;
  fullName: string;
  email: string;
  username?: string;
  avatarUrl?: string;
}

export interface AdminPost {
  id: string;
  content: string;
  imageUrl?: string;
  postType?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: AdminPostAuthor | null;
}

export interface PlatformStats {
  totalUsers: number;
  totalPosts: number;
  totalProjects: number;
  totalTeams: number;
  totalConnections: number;
}

export type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";

export interface AdminUserListItem {
  id: string;
  avatarUrl?: string | null;
  fullName: string;
  username?: string | null;
  email: string;
  role: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AdminTeamSummary {
  id: string;
  name: string;
  createdAt: string;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  fullName: string;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  location?: string | null;
  role: string;
  status: UserStatus;
  emailVerified: boolean;
  authProvider: string;
  createdAt: string;
  lastLoginAt?: string | null;
  projectsJoined: AdminProjectSummary[];
  projectsOwned: AdminProjectSummary[];
  teams: AdminTeamSummary[];
  postsCount: number;
  messagesCount: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AdminUsersQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  role?: string;
  status?: string;
}

export const adminService = {
  async isAdmin(): Promise<boolean> {
    try {
      const res = await api.get("/admin/check");
      return res.data?.isAdmin || false;
    } catch {
      return false;
    }
  },

  async getDashboard(): Promise<AdminDashboard> {
    try {
      const res = await api.get("/admin/dashboard");
      return res.data;
    } catch {
      return {
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        totalProjects: 0,
        totalTeams: 0,
        totalTasks: 0,
        totalMessages: 0,
        totalPosts: 0,
        recentUsers: [],
        recentProjects: [],
      };
    }
  },

  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const res = await api.get("/admin/stats");
      return res.data;
    } catch {
      return { totalUsers: 0, totalPosts: 0, totalProjects: 0, totalTeams: 0, totalConnections: 0 };
    }
  },

  async getAllUsers(): Promise<AdminUser[]> {
    try {
      const res = await api.get("/admin/users");
      return res.data;
    } catch {
      return [];
    }
  },

  async getUsersPage(query: AdminUsersQuery = {}): Promise<PageResponse<AdminUserListItem>> {
    const res = await api.get("/admin/users/paged", { params: query });
    return res.data;
  },

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const res = await api.get(`/admin/users/${userId}`);
    return res.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}`);
  },

  async getAllPosts(): Promise<AdminPost[]> {
    try {
      const res = await api.get("/admin/posts");
      return res.data;
    } catch {
      return [];
    }
  },

  async updateUserRole(userId: string, role: string): Promise<AdminUser> {
    const res = await api.put(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  async setUserBlocked(userId: string, blocked: boolean): Promise<AdminUser> {
    const res = await api.put(`/admin/users/${userId}/${blocked ? "block" : "unblock"}`);
    return res.data;
  },

  async deletePost(postId: string): Promise<void> {
    await api.delete(`/admin/posts/${postId}`);
  },
};
