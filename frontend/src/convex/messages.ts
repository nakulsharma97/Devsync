import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Send a message in a conversation.
 */
export const send = mutation({
  args: {
    token: v.string(),
    conversationId: v.id("devsync_conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    // Verify user is participant
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new Error("Conversation not found");
    if (!conv.participantIds.some((id) => id.toString() === account._id.toString())) {
      throw new Error("Not a participant");
    }

    await ctx.db.insert("devsync_messages", {
      conversationId: args.conversationId,
      senderId: account._id,
      content: args.content,
      read: false,
    });

    // Update conversation's last message
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      lastMessageText: args.content.slice(0, 100),
      lastMessageSenderId: account._id,
    });

    return { success: true };
  },
});

/**
 * Get messages in a conversation, oldest first.
 */
export const getMessages = query({
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

    const messages = await ctx.db
      .query("devsync_messages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    return await Promise.all(
      messages.map(async (m) => {
        const sender = await ctx.db.get(m.senderId);
        return {
          _id: m._id,
          content: m.content,
          read: m.read,
          createdAt: m._creationTime,
          sender: sender
            ? {
                id: sender._id,
                fullName: sender.fullName,
                avatarUrl: sender.avatarUrl,
              }
            : null,
          isMine: m.senderId.toString() === account._id.toString(),
        };
      }),
    );
  },
});

/**
 * Mark all unread messages in a conversation as read.
 */
export const markAsRead = mutation({
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

    const unread = await ctx.db
      .query("devsync_messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) => q.eq(q.field("read"), false))
      .filter((q) => q.neq(q.field("senderId"), account._id))
      .collect();

    for (const m of unread) {
      await ctx.db.patch(m._id, { read: true });
    }
    return { success: true };
  },
});
