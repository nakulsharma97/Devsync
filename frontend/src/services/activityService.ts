import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

export const activityService = {
  async log(type: "post" | "like" | "comment" | "follow" | "project") {
    const token = getAuthToken();
    if (!token) return;
    await convexClient.mutation(api.activity.log, { token, type }).catch(() => {});
  },

  async getContributions(days = 365) {
    const token = getAuthToken();
    if (!token) return [];
    return await convexClient.query(api.activity.getContributions, { token, days });
  },

  async getContributionsByUser(accountId: string, days = 365) {
    return await convexClient.query(api.activity.getContributionsByUser, {
      accountId: accountId as any,
      days,
    });
  },
};
