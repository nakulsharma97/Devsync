import api from "./api";
import type { User } from "./userService";
import type { Project } from "./projectService";
import type { Bookmark } from "./bookmarkService";

export interface SearchResults {
  developers: User[];
  projects: Project[];
  bookmarks: Bookmark[];
}

export const searchService = {
  async search(query: string): Promise<SearchResults> {
    const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
    return response.data.data;
  },
};
