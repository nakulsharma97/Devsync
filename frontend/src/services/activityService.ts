import api from "./api";

export const activityService = {
  async log(type: string) {
    await api.post("/activity/log", { type }).catch(() => {});
  },
  async getContributions() {
    return [];
  },
  async getContributionsByUser(_accountId: string) {
    return [];
  },
};
