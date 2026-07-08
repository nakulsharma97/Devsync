import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

export interface NotificationPrefs {
  likes: boolean;
  comments: boolean;
  connections: boolean;
  teamInvites: boolean;
}

export const notificationPrefsService = {
  async get(): Promise<NotificationPrefs> {
    const token = getAuthToken();
    if (!token) return { likes: true, comments: true, connections: true, teamInvites: true };
    return await convexClient.query(api.notificationPrefs.get, { token });
  },

  async update(prefs: Partial<NotificationPrefs>): Promise<void> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    await convexClient.mutation(api.notificationPrefs.update, { token, ...prefs });
  },
};
