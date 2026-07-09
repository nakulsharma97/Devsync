import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

export interface Conversation {
  _id: string;
  otherUser: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
  } | null;
  isTeamRoom?: boolean;
  roomName?: string | null;
  projectName?: string | null;
  participantCount?: number;
  lastMessageAt: number;
  lastMessageText: string;
  unreadCount: number;
}

export const conversationService = {
  async createOrGet(otherUserId: string): Promise<{ conversationId: string }> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    return await convexClient.mutation(api.conversations.createOrGet, {
      token,
      otherUserId: otherUserId as any,
    });
  },

  async getMyConversations(): Promise<Conversation[]> {
    const token = getAuthToken();
    if (!token) return [];
    return await convexClient.query(api.conversations.getMyConversations, { token });
  },

  async getUnreadCount(): Promise<number> {
    const token = getAuthToken();
    if (!token) return 0;
    return await convexClient.query(api.conversations.getUnreadCount, { token });
  },
};
