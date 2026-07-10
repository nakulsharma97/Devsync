import api from "./api";

export const activityService = {
  async log(type: string) {
    await api.post("/activity/log", { type }).catch(() => {});
  },
  async getContributions(days = 365) {
    return [];
  },
  async getContributionsByUser(accountId: string, days = 365) {
    return [];
  },
};
