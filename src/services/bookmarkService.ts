import api from "./api";

export interface BookmarkRequest {
  repoName: string;
  repoUrl: string;
  description?: string;
  language?: string;
  owner?: string;
  stars?: number;
}

export interface Bookmark {
  id: number;
  userId: number;
  repoName: string;
  repoUrl: string;
  description: string;
  language: string;
  owner: string;
  stars: number;
  createdAt: string;
}

export const bookmarkService = {
  async create(data: BookmarkRequest): Promise<Bookmark> {
    const response = await api.post("/bookmarks", data);
    return response.data.data;
  },

  async getAll(): Promise<Bookmark[]> {
    const response = await api.get("/bookmarks");
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/bookmarks/${id}`);
  },
};
