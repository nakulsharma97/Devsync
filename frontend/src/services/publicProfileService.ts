import api from "./api";

export interface TrendPointDto {
  date: string;
  count: number;
}

export interface PublicProfileDto {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  jobTitle: string | null;
  company: string | null;
  location: string | null;
  memberSince: string;
  presenceStatus: string | null;
  contributions: {
    projectsCreated: number;
    tasksCompleted: number;
    messagesSent: number;
    postsCreated: number;
    commentsAdded: number;
    currentStreak: number;
    monthlyActivity: TrendPointDto[];
    heatmap: TrendPointDto[];
  };
}

export const publicProfileService = {
  async getProfile(username: string): Promise<PublicProfileDto> {
    const res = await api.get(`/public/users/${encodeURIComponent(username)}`);
    return res.data;
  },
};
