import api from "./api";
import type { UserDto } from "./authService";

/** A user as returned by `GET /users?q=` — profile fields plus network state. */
export interface ConnectionUserDto extends UserDto {
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  followerCount: number;
  followingCount: number;
}

export const connectionService = {
  async follow(followingId: string): Promise<void> {
    await api.post("/connections/follow", { followingId });
  },
  async unfollow(followingId: string): Promise<void> {
    await api.post("/connections/unfollow", { followingId });
  },
  async isFollowing(followingId: string): Promise<boolean> {
    try { const res = await api.get(`/connections/is-following/${followingId}`); return res.data?.isFollowing || false; }
    catch { return false; }
  },
  async getFollowingIds(): Promise<string[]> {
    try { const res = await api.get("/connections/following"); return res.data; }
    catch { return []; }
  },
  async getFollowerCount(userId: string): Promise<number> {
    try { const res = await api.get(`/connections/followers/count/${userId}`); return res.data?.count || 0; }
    catch { return 0; }
  },
  async getFollowingCount(userId: string): Promise<number> {
    try { const res = await api.get(`/connections/following/count/${userId}`); return res.data?.count || 0; }
    catch { return 0; }
  },
  async getAllUsers(searchQuery?: string): Promise<ConnectionUserDto[]> {
    try { const res = await api.get(`/users?q=${encodeURIComponent(searchQuery || "")}`); return res.data; }
    catch { return []; }
  },
};
