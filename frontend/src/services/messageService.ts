import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

export interface Message {
  _id: string;
  content: string;
  read: boolean;
  createdAt: number;
  sender: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  } | null;
  isMine: boolean;
}

export const messageService = {
  async send(conversationId: string, content: string): Promise<void> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    await convexClient.mutation(api.messages.send, {
      token,
      conversationId: conversationId as any,
      content,
    });
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const token = getAuthToken();
    if (!token) return [];
    return await convexClient.query(api.messages.getMessages, {
      token,
      conversationId: conversationId as any,
    });
  },

  async markAsRead(conversationId: string): Promise<void> {
    const token = getAuthToken();
    if (!token) return;
    await convexClient.mutation(api.messages.markAsRead, {
      token,
      conversationId: conversationId as any,
    });
  },
};
