import api from "./api";

export interface ActivityDto {
  id: string;
  user: { id: string; fullName: string; username: string | null; avatarUrl: string | null };
  projectId: string | null;
  activityType: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface ActivityPage {
  content: ActivityDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export const activityService = {
  async log(type: string) {
    await api.post("/activity/log", { type }).catch(() => {});
  },
  async getProjectActivities(projectId: string, page = 0, size = 20): Promise<ActivityPage> {
    const res = await api.get(`/projects/${projectId}/activities`, { params: { page, size } });
    return res.data;
  },
  async getContributions() {
    return [];
  },
  async getContributionsByUser(_accountId: string) {
    return [];
  },
};
