import api from "./api";

export interface PostStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  dailyData: { date: string; count: number }[];
}

export interface FollowerGrowth {
  totalFollowers: number;
  totalFollowing: number;
  dailyData: { date: string; count: number }[];
}

export interface ActivityStats {
  posts: number;
  likes: number;
  comments: number;
  follows: number;
  projects: number;
}

export const analyticsService = {
  async getPostStats() {
    try { const res = await api.get("/analytics/posts"); return res.data; }
    catch { return { totalPosts: 0, totalLikes: 0, totalComments: 0, dailyData: [] }; }
  },
  async getFollowerGrowth() {
    try { const res = await api.get("/analytics/followers"); return res.data; }
    catch { return { totalFollowers: 0, totalFollowing: 0, dailyData: [] }; }
  },
  async getActivityStats() {
    try { const res = await api.get("/analytics/activity"); return res.data; }
    catch { return { posts: 0, likes: 0, comments: 0, follows: 0, projects: 0 }; }
  },
};
