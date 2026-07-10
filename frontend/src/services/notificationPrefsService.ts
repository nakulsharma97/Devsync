import api from "./api";

export const notificationPrefsService = {
  async get() {
    try { const res = await api.get("/notification-prefs"); return res.data; }
    catch { return { likes: true, comments: true, connections: true, teamInvites: true }; }
  },
  async update(prefs: Record<string, boolean>) {
    await api.put("/notification-prefs", prefs);
  },
};
