import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

export const typingService = {
  async startTyping(conversationId: string): Promise<void> {
    const token = getAuthToken();
    if (!token) return;
    await convexClient.mutation(api.typing.startTyping, {
      token,
      conversationId: conversationId as any,
    });
  },

  async stopTyping(conversationId: string): Promise<void> {
    const token = getAuthToken();
    if (!token) return;
    await convexClient.mutation(api.typing.stopTyping, {
      token,
      conversationId: conversationId as any,
    });
  },

  async getTypingUsers(conversationId: string): Promise<string[]> {
    const token = getAuthToken();
    if (!token) return [];
    return await convexClient.query(api.typing.getTypingUsers, {
      token,
      conversationId: conversationId as any,
    });
  },
};
