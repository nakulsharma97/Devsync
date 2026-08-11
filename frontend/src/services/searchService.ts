import api from "./api";

export const searchService = {
  async searchUsers(query: string) {
    const res = await api.get(`/users?q=${encodeURIComponent(query)}`);
    return res.data;
  },
  async searchProjects(query: string) {
    // NOTE: there is no /projects/search endpoint — the backend exposes public
    // project search via /projects/discover?search=. This was previously a 404.
    const res = await api.get("/projects/discover", {
      params: { search: query },
    });
    return res.data;
  },
};
