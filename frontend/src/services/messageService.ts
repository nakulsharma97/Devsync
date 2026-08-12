import api from "./api";
import type { AttachmentDto } from "./attachmentService";
export type { AttachmentDto };

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

  async getRoomMessages(roomId: string, limit = 100): Promise<MessageDto[]> {
    const res = await api.get(`/messages/room/${roomId}?limit=${limit}`);
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
};
