import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";

export interface SearchResults {
  developers: Array<{
    id: string;
    email: string;
    fullName: string;
    username: string;
    bio?: string;
    avatarUrl?: string;
    role: string;
    createdAt: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    techStack: string;
    tags: string[];
  }>;
  bookmarks: Array<{
    id: string;
    repoName: string;
    owner: string;
    language: string;
    stars: number;
  }>;
}

export const searchService = {
  async search(query: string): Promise<SearchResults> {
    return await convexClient.query(api.search.search, { query });
  },
};
