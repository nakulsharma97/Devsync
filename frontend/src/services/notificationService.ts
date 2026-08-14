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

export interface NotificationPage {
  content: NotificationDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export const notificationService = {
  /**
   * Server-side paginated list (GET /notifications?page=&size=).
   * `page` is 0-based; totals are server-accurate regardless of the page loaded.
   */
  async getNotifications(params: { page?: number; size?: number } = {}): Promise<NotificationPage> {
    const { page = 0, size = 50 } = params;
    const res = await api.get(`/notifications?page=${page}&size=${size}`);
    return res.data;
  },

  /** Latest N notifications as a flat list (dropdown / toast polling). */
  async getLatestNotifications(limit = 20): Promise<NotificationDto[]> {
    const res = await api.get(`/notifications?page=0&size=${limit}`);
    return res.data.content ?? [];
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
