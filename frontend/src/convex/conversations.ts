import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create or retrieve a conversation between the current user and another.
 */
export const createOrGet = mutation({
  args: {
    token: v.string(),
    otherUserId: v.id("devsync_accounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    // Find existing conversation with both participants
    const conversations = await ctx.db
      .query("devsync_conversations")
      .collect();

    const existing = conversations.find((c) => {
      const ids = c.participantIds.map((id) => id.toString());
      return ids.includes(account._id.toString()) && ids.includes(args.otherUserId.toString());
    });

    if (existing) return { conversationId: existing._id };

    // Create new
    const convId = await ctx.db.insert("devsync_conversations", {
      participantIds: [account._id, args.otherUserId],
      lastMessageAt: Date.now(),
    });

    return { conversationId: convId };
  },
});

/**
 * Get all conversations for the authenticated user.
 */
export const getMyConversations = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const all = await ctx.db
      .query("devsync_conversations")
      .withIndex("by_last_message")
      .order("desc")
      .collect();

    const myConvs = all.filter((c) =>
      c.participantIds.some((id) => id.toString() === account._id.toString()),
    );

    return await Promise.all(
      myConvs.map(async (c) => {
        const otherId = c.participantIds.find(
          (id) => id.toString() !== account._id.toString(),
        );
        const otherUser = otherId ? await ctx.db.get(otherId) : null;
        // Count unread
        const unreadMsgs = await ctx.db
          .query("devsync_messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
          .filter((q) => q.eq(q.field("read"), false))
          .filter((q) => q.neq(q.field("senderId"), account._id))
          .collect();

        return {
          _id: c._id,
          otherUser: otherUser
            ? {
                id: otherUser._id,
                fullName: otherUser.fullName,
                username: otherUser.username,
                avatarUrl: otherUser.avatarUrl,
              }
            : null,
          lastMessageAt: c.lastMessageAt,
          lastMessageText: c.lastMessageText || "",
          unreadCount: unreadMsgs.length,
        };
      }),
    );
  },
});

/**
 * Get the total unread message count (for badge).
 */
export const getUnreadCount = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return 0;

    const all = await ctx.db.query("devsync_conversations").collect();
    const myConvs = all.filter((c) =>
      c.participantIds.some((id) => id.toString() === account._id.toString()),
    );

    let total = 0;
    for (const c of myConvs) {
      const unread = await ctx.db
        .query("devsync_messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
        .filter((q) => q.eq(q.field("read"), false))
        .filter((q) => q.neq(q.field("senderId"), account._id))
        .collect();
      total += unread.length;
    }
    return total;
  },
});
