import api from "./api";

export const teamService = {
  async create(data: { title: string; description?: string; rolesNeeded?: string[] }) {
    const res = await api.post("/teams", data);
    return res.data;
  },
  async getOpen() {
    const res = await api.get("/teams/open");
    return res.data;
  },
  async apply(teamId: string, data: { roleApplied?: string; message?: string }) {
    const res = await api.post(`/teams/${teamId}/apply`, data);
    return res.data;
  },
  async getApplications(teamId: string) {
    const res = await api.get(`/teams/${teamId}/applications`);
    return res.data;
  },
  async acceptApplication(applicationId: string) {
    await api.post(`/teams/applications/${applicationId}/accept`);
  },
  async rejectApplication(applicationId: string) {
    await api.post(`/teams/applications/${applicationId}/reject`);
  },
};
