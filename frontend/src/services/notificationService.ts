import api from "./api";

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string | null;
  actorId: string | null;
  actorName: string | null;
  actorAvatar: string | null;
  referenceId: string | null;
  referenceType: string | null;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

export const notificationService = {
  async getNotifications(limit = 50): Promise<NotificationDto[]> {
    const res = await api.get(`/notifications?limit=${limit}`);
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get("/notifications/unread-count");
    return res.data.count;
  },

  async markAsRead(id: string): Promise<void> {
    await api.put(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.put("/notifications/read-all");
  },
};
