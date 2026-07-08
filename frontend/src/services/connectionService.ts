import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

function getToken(): string {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export const connectionService = {
  async follow(followingId: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.connections.follow, {
      token,
      followingId: followingId as any,
    });
  },

  async unfollow(followingId: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.connections.unfollow, {
      token,
      followingId: followingId as any,
    });
  },

  async isFollowing(followingId: string): Promise<boolean> {
    const token = getToken();
    return await convexClient.query(api.connections.isFollowing, {
      token,
      followingId: followingId as any,
    });
  },

  async getFollowingIds(): Promise<string[]> {
    const token = getToken();
    return await convexClient.query(api.connections.getFollowingIds, {
      token,
    });
  },

  async getFollowerCount(userId: string): Promise<number> {
    return await convexClient.query(api.connections.getFollowerCount, {
      userId: userId as any,
    });
  },

  async getFollowingCount(userId: string): Promise<number> {
    return await convexClient.query(api.connections.getFollowingCount, {
      userId: userId as any,
    });
  },

  async getAllUsers(searchQuery?: string): Promise<any[]> {
    const token = getToken();
    return await convexClient.query(api.connections.getAllUsers, {
      token,
      searchQuery,
    });
  },
};
