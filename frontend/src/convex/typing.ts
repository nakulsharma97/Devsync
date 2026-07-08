import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TYPING_TIMEOUT_MS = 4000; // Consider user "not typing" after 4s of no update

/**
 * Update the typing timestamp for a user in a conversation.
 * Call this whenever the user types or modifies their input.
 */
export const startTyping = mutation({
  args: {
    token: v.string(),
    conversationId: v.id("devsync_conversations"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    // Upsert: check if entry exists
    const existing = await ctx.db
      .query("devsync_typing_status")
      .withIndex("by_conversation_user", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("userId", account._id),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { lastTypingAt: now });
    } else {
      await ctx.db.insert("devsync_typing_status", {
        conversationId: args.conversationId,
        userId: account._id,
        lastTypingAt: now,
      });
    }
  },
});

/**
 * Explicitly stop typing (e.g., when message is sent).
 */
export const stopTyping = mutation({
  args: {
    token: v.string(),
    conversationId: v.id("devsync_conversations"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return;

    const existing = await ctx.db
      .query("devsync_typing_status")
      .withIndex("by_conversation_user", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("userId", account._id),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Get the names of users currently typing in a conversation
 * (users who have updated their typing status within the last TYPING_TIMEOUT_MS).
 * Excludes the requesting user.
 */
export const getTypingUsers = query({
  args: {
    token: v.string(),
    conversationId: v.id("devsync_conversations"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const now = Date.now();
    const cutoff = now - TYPING_TIMEOUT_MS;

    const entries = await ctx.db
      .query("devsync_typing_status")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    const activeEntries = entries.filter(
      (e) =>
        e.lastTypingAt > cutoff &&
        e.userId.toString() !== account._id.toString(),
    );

    return await Promise.all(
      activeEntries.map(async (e) => {
        const user = await ctx.db.get(e.userId);
        return user?.fullName || "Someone";
      }),
    );
  },
});
