import api from "./api";

export type ReviewCategory =
  | "OVERALL_EXPERIENCE"
  | "PROJECT_MANAGEMENT"
  | "MESSAGING"
  | "KANBAN"
  | "GITHUB_INTEGRATION"
  | "UI_UX"
  | "PERFORMANCE"
  | "OTHER";

export type FeedbackCategory =
  | "BUG"
  | "FEATURE_REQUEST"
  | "UI_UX"
  | "PERFORMANCE"
  | "SECURITY"
  | "GENERAL";

export interface MyReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  category: string;
  status: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  rating: number;
  title?: string;
  comment: string;
  category?: string;
}

export interface MyFeedback {
  id: string;
  category: string;
  message: string;
  rating: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  category: string;
  message: string;
  rating?: number;
}

export const reviewService = {
  async getMyReview(): Promise<MyReview | null> {
    const res = await api.get("/reviews/me");
    return res.data;
  },

  async submitReview(input: CreateReviewInput): Promise<MyReview> {
    const res = await api.post("/reviews", input);
    return res.data;
  },

  async updateMyReview(input: CreateReviewInput): Promise<MyReview> {
    const res = await api.put("/reviews/me", input);
    return res.data;
  },

  async submitFeedback(input: CreateFeedbackInput): Promise<MyFeedback> {
    const res = await api.post("/feedback", input);
    return res.data;
  },

  async getMyFeedback(): Promise<MyFeedback[]> {
    const res = await api.get("/feedback/me");
    return res.data;
  },
};
