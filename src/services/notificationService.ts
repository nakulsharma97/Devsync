import api from "./api";

export interface Notification {
  id: number;
  userId: number;
  senderName: string;
  senderAvatar: string;
  type: "LIKE" | "COMMENT" | "CONNECTION" | "TEAM_INVITE";
  referenceId: number;
  message: string;
  read: boolean;
  createdAt: string;
}

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    const response = await api.get("/notifications");
    return response.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get("/notifications/unread-count");
    return response.data.data.count;
  },

  async markAsRead(id: number): Promise<void> {
    await api.put(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.put("/notifications/read-all");
  },
};
