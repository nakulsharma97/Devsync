import api from "./api";

export const typingService = {
  async startTyping(conversationId: string): Promise<void> {
    await api.post("/messages/typing/start", { conversationId }).catch(() => {});
  },
  async stopTyping(conversationId: string): Promise<void> {
    await api.post("/messages/typing/stop", { conversationId }).catch(() => {});
  },
  async getTypingUsers(conversationId: string): Promise<string[]> {
    try { const res = await api.get(`/messages/typing/${conversationId}`); return res.data; }
    catch { return []; }
  },
};
