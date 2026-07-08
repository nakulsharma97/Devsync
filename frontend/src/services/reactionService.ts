import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

export type EmojiReaction = "👍" | "🎉" | "❤️" | "🚀" | "👀";

export const REACTION_LIST: EmojiReaction[] = ["👍", "🎉", "❤️", "🚀", "👀"];

export const reactionService = {
  async toggle(postId: string, emoji: EmojiReaction): Promise<{ added: boolean; emoji: string }> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    return convexClient.mutation(api.reactions.toggle, {
      token,
      postId,
      emoji,
    });
  },

  async getForPost(postId: string): Promise<Record<string, { count: number; users: string[] }>> {
    return convexClient.query(api.reactions.getForPost, { postId });
  },

  async getUserReactions(postId: string): Promise<string[]> {
    const token = getAuthToken();
    if (!token) return [];
    return convexClient.query(api.reactions.getUserReactions, {
      postId,
      token,
    });
  },
};
