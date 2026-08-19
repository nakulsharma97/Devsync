import api from "./api";
import type { AttachmentDto } from "./attachmentService";
export type { AttachmentDto };

export interface ReactionDto {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface MessageDto {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  roomId: string | null;
  receiverId: string | null;
  content: string;
  messageType: string;
  systemMessage: boolean;
  attachmentId?: string | null;
  attachment?: AttachmentDto | null;
  status?: string | null;
  readAt?: string | null;
  createdAt: string;
  /** Reply threads: id of the message this one replies to (null = top-level). */
  parentMessageId?: string | null;
  edited?: boolean;
  editedAt?: string | null;
  reactions?: ReactionDto[];
  replyCount?: number;
}

export interface ConversationDto {
  id: string;
  type: "direct" | "room";
  name: string;
  projectName: string | null;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  participantCount: number;
  otherUserId: string | null;
  otherUserName: string | null;
  roomId: string | null;
  otherUserPresence?: string | null;
  otherUserLastActiveAt?: string | null;
}

export const messageService = {
  async getConversations(): Promise<ConversationDto[]> {
    const res = await api.get("/messages/conversations");
    return res.data;
  },

  async getRoomMessages(roomId: string, limit = 100, cursor?: string): Promise<MessageDto[]> {
    const params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    const res = await api.get(`/messages/room/${roomId}`, { params });
    return res.data;
  },

  async getConversation(otherUserId: string, limit = 100): Promise<MessageDto[]> {
    const res = await api.get(`/messages/dm/${otherUserId}?limit=${limit}`);
    return res.data;
  },

  async sendMessage(data: {
    roomId?: string;
    receiverId?: string;
    content: string;
    messageType?: string;
    systemMessage?: boolean;
    attachmentId?: string;
    parentMessageId?: string;
  }): Promise<MessageDto> {
    const res = await api.post("/messages", data);
    return res.data;
  },

  /** Mark a direct conversation as read. Returns the remaining unread count. */
  async markDirectRead(otherUserId: string): Promise<{ unreadCount: number }> {
    const res = await api.post(`/messages/dm/${otherUserId}/read`);
    return res.data;
  },

  /** Mark a room as read for the current user. Returns the remaining unread count. */
  async markRoomRead(roomId: string): Promise<{ unreadCount: number }> {
    const res = await api.post(`/messages/room/${roomId}/read`);
    return res.data;
  },

  // ── Message upgrades: edit / delete / react / threads / search ──

  /** Edit a message (sender only). Returns the updated message. */
  async editMessage(messageId: string, content: string): Promise<MessageDto> {
    const res = await api.put(`/messages/${messageId}`, { content });
    return res.data;
  },

  /** Soft-delete a message (sender only). */
  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}`);
  },

  /** Toggle the caller's reaction on a message. Returns the updated reaction list. */
  async toggleReaction(messageId: string, emoji: string): Promise<ReactionDto[]> {
    const res = await api.post(`/messages/${messageId}/reactions`, { emoji });
    return res.data;
  },

  /** Replies in a thread (participant only). */
  async getThread(parentMessageId: string): Promise<MessageDto[]> {
    const res = await api.get(`/messages/thread/${parentMessageId}`);
    return res.data;
  },

  /** Search the caller's own conversations (DMs + rooms they participate in). */
  async searchMessages(q: string, limit = 20): Promise<MessageDto[]> {
    const res = await api.get("/messages/search", { params: { q, limit } });
    return res.data;
  },
};
