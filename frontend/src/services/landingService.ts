import api from "./api";

export interface PublicStats {
  users: number;
  projects: number;
  publicProjects: number;
  completedProjects: number;
  tasks: number;
  tasksCompleted: number;
  members: number;
  messages: number;
  githubRepos: number;
  reviews: number;
  averageRating: number;
}

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  category: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  company: string | null;
  createdAt: string;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

export interface PublicReviewsResponse {
  reviews: PublicReview[];
  featured: PublicReview[];
  summary: RatingSummary;
}

export const landingService = {
  async getStats(): Promise<PublicStats> {
    const res = await api.get("/public/stats");
    return res.data;
  },

  async getReviews(): Promise<PublicReviewsResponse> {
    const res = await api.get("/public/reviews");
    return res.data;
  },
};
