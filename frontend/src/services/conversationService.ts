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
  /**
   * Resolve the conversation id for a DM with a user.
   *
   * The backend derives conversations from message history (no stored
   * conversation entity) and has no create-or-get endpoint — the previous
   * POST /messages/conversations/create-or-get call returned 404. Opening
   * /messages/dm_<userId> can therefore never create a duplicate: the
   * conversation exists as soon as the first message is sent.
   */
  async createOrGet(otherUserId: string): Promise<{ conversationId: string }> {
    return { conversationId: `dm_${otherUserId}` };
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
