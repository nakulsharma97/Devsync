import api from "./api";

export const searchService = {
  async searchUsers(query: string) {
    const res = await api.get(`/users?q=${encodeURIComponent(query)}`);
    return res.data;
  },
  async searchProjects(query: string) {
    const res = await api.get(`/projects/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },
};
