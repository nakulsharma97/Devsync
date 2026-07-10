import api from "./api";

export interface Conversation {
  id: string;
  name: string;
  type: "direct" | "room";
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  otherUserId: string | null;
  roomId: string | null;
}

export const conversationService = {
  async createOrGet(otherUserId: string): Promise<{ conversationId: string }> {
    const res = await api.post("/messages/conversations/create-or-get", { otherUserId });
    return res.data;
  },
  async getMyConversations(): Promise<Conversation[]> {
    const res = await api.get("/messages/conversations");
    return res.data;
  },
  async getUnreadCount(): Promise<number> {
    try { const res = await api.get("/messages/conversations/unread-count"); return res.data?.count || 0; }
    catch { return 0; }
  },
};
