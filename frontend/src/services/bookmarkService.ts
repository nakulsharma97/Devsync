import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

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
  userId?: string;
  repoName: string;
  repoUrl: string;
  description: string;
  language: string;
  owner: string;
  stars: number;
  createdAt: string;
}

function getToken(): string {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export const bookmarkService = {
  async create(data: BookmarkRequest): Promise<Bookmark> {
    const token = getToken();
    return await convexClient.mutation(api.bookmarks.create, {
      token,
      ...data,
    });
  },

  async getAll(): Promise<Bookmark[]> {
    const token = getToken();
    return await convexClient.query(api.bookmarks.getAll, { token });
  },

  async delete(id: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.bookmarks.deleteBookmark, {
      token,
      id: id as any,
    });
  },
};
