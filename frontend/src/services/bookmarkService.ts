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
  id: string;
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
    const res = await api.post("/bookmarks", data);
    return res.data;
  },
  async getAll(): Promise<Bookmark[]> {
    const res = await api.get("/bookmarks");
    return res.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/bookmarks/${id}`);
  },
};
