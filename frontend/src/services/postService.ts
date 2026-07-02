import api from "./api";

export interface PostRequest {
  content: string;
  imageUrl?: string;
  postType?: "TEXT" | "IMAGE" | "PROJECT_UPDATE" | "ACHIEVEMENT";
}

export interface CommentRequest {
  content: string;
}

export interface Post {
  id: number;
  userId?: number;
  user?: { id: number; fullName?: string; email?: string };
  content: string;
  imageUrl: string;
  postType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  userId?: number;
  user?: { id: number; fullName?: string; email?: string };
  postId?: number;
  post?: { id: number };
  content: string;
  createdAt: string;
}

export interface FeedPage {
  content: Post[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export const postService = {
  async create(data: PostRequest): Promise<Post> {
    const response = await api.post("/posts", data);
    return response.data.data;
  },

  async getFeed(page = 0, size = 20): Promise<FeedPage> {
    const response = await api.get(`/posts/feed?page=${page}&size=${size}`);
    return response.data.data;
  },

  async getById(id: number): Promise<Post> {
    const response = await api.get(`/posts/${id}`);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/posts/${id}`);
  },

  async toggleLike(id: number): Promise<{ liked: boolean; count: number }> {
    const response = await api.post(`/posts/${id}/like`);
    return response.data.data;
  },

  async addComment(postId: number, data: CommentRequest): Promise<Comment> {
    const response = await api.post(`/posts/${postId}/comments`, data);
    return response.data.data;
  },

  async getComments(postId: number): Promise<Comment[]> {
    const response = await api.get(`/posts/${postId}/comments`);
    return response.data.data;
  },
};
