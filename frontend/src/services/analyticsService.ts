import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

function getToken(): string {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

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
  async getPostStats(): Promise<PostStats> {
    const token = getToken();
    return await convexClient.query(api.analytics.getPostStats, { token });
  },

  async getFollowerGrowth(): Promise<FollowerGrowth> {
    const token = getToken();
    return await convexClient.query(api.analytics.getFollowerGrowth, { token });
  },

  async getActivityStats(): Promise<ActivityStats> {
    const token = getToken();
    return await convexClient.query(api.analytics.getActivityStats, { token });
  },
};
