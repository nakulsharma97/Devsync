import api from "./api";

export type EmojiReaction = "👍" | "🎉" | "❤️" | "🚀" | "👀";
export const REACTION_LIST: EmojiReaction[] = ["👍", "🎉", "❤️", "🚀", "👀"];

export const reactionService = {
  async toggle(postId: string, emoji: EmojiReaction): Promise<{ added: boolean; emoji: string }> {
    const res = await api.post(`/posts/${postId}/reactions`, { emoji });
    return res.data;
  },
  async getForPost(postId: string): Promise<Record<string, { count: number; users: string[] }>> {
    try { const res = await api.get(`/posts/${postId}/reactions`); return res.data; }
    catch { return {}; }
  },
  async getUserReactions(postId: string): Promise<string[]> {
    try { const res = await api.get(`/posts/${postId}/reactions/mine`); return res.data; }
    catch { return []; }
  },
};
