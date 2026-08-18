import api from "./api";

export interface FollowUserDto {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  followsYou: boolean;
  isSelf: boolean;
}

export interface SocialProfileDto {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  jobTitle: string | null;
  company: string | null;
  location: string | null;
  memberSince: string | null;
  posts: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  followsYou: boolean;
  isSelf: boolean;
}

export const socialService = {
  async follow(userId: string): Promise<void> {
    await api.post("/connections/follow", { followingId: userId });
  },

  async unfollow(userId: string): Promise<void> {
    await api.post("/connections/unfollow", { followingId: userId });
  },

  async isFollowing(userId: string): Promise<boolean> {
    const res = await api.get(`/connections/is-following/${userId}`);
    return res.data?.isFollowing ?? false;
  },

  /** Authenticated profile view with social stats + relationship. */
  async getProfile(username: string): Promise<SocialProfileDto> {
    const res = await api.get(
      `/connections/profile/${encodeURIComponent(username)}`
    );
    return res.data;
  },

  /** Users who follow {@code userId}. */
  async getFollowers(userId: string): Promise<FollowUserDto[]> {
    const res = await api.get(`/connections/followers/${userId}`);
    return res.data;
  },

  /** Users {@code userId} follows. */
  async getFollowing(userId: string): Promise<FollowUserDto[]> {
    const res = await api.get(`/connections/following/${userId}`);
    return res.data;
  },
};
