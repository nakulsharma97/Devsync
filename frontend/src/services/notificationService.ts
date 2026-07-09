import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

export interface Notification {
  _id: string;
  userId: string;
  type: "LIKE" | "COMMENT" | "CONNECTION" | "INVITE";
  message: string;
  read: boolean;
  actorId?: string;
  referenceId?: string;
  referenceType?: string;
  actorName?: string | null;
  createdAt: number;
}

function getToken(): string {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    const token = getToken();
    return await convexClient.query(api.notifications.getAll, { token });
  },

  async getActivityFeed(): Promise<ActivityEvent[]> {
    const token = getToken();
    return await convexClient.query(api.notifications.getActivityFeed, { token });
  },

  async getUnreadCount(): Promise<number> {
    const token = getToken();
    return await convexClient.query(api.notifications.getUnreadCount, { token });
  },

  async markAsRead(notificationId: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.notifications.markAsRead, {
      token,
      notificationId: notificationId as any,
    });
  },

  async markAllAsRead(): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.notifications.markAllAsRead, { token });
  },
};

export type ActivityEvent =
  | {
      _id: string;
      type: "like";
      actorName: string;
      actorAvatar?: string;
      actorUsername: string;
      actorId?: string;
      referenceId?: string;
      referenceType?: string;
      message: string;
      createdAt: number;
    }
  | {
      _id: string;
      type: "comment";
      actorName: string;
      actorAvatar?: string;
      actorUsername: string;
      actorId?: string;
      referenceId?: string;
      referenceType?: string;
      message: string;
      createdAt: number;
    }
  | {
      _id: string;
      type: "follow";
      actorName: string;
      actorAvatar?: string;
      actorUsername: string;
      actorId?: string;
      createdAt: number;
    };

export type { Notification as NotificationType };
