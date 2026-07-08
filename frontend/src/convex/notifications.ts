import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const NOTIFICATION_TYPES = {
  LIKE: "LIKE",
  COMMENT: "COMMENT",
  CONNECTION: "CONNECTION",
} as const;

/**
 * Create a notification for a user.
 * Used internally by posts.ts and connections.ts to trigger notifications.
 */
export const create = mutation({
  args: {
    userId: v.id("devsync_accounts"),
    type: v.union(
      v.literal("LIKE"),
      v.literal("COMMENT"),
      v.literal("CONNECTION"),
    ),
    message: v.string(),
    actorId: v.optional(v.id("devsync_accounts")),
    referenceId: v.optional(v.string()),
    referenceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("devsync_notifications", {
      userId: args.userId,
      type: args.type,
      message: args.message,
      read: false,
      actorId: args.actorId,
      referenceId: args.referenceId,
      referenceType: args.referenceType,
    });
    return { success: true };
  },
});

/**
 * Get all notifications for the authenticated user, newest first.
 */
export const getAll = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const notifications = await ctx.db
      .query("devsync_notifications")
      .withIndex("by_user", (q) => q.eq("userId", account._id))
      .order("desc")
      .collect();

    return await Promise.all(
      notifications.map(async (n) => {
        let actorName: string | null = null;
        if (n.actorId) {
          const actor = await ctx.db.get(n.actorId);
          actorName = actor?.fullName || null;
        }
        return {
          _id: n._id,
          userId: n.userId,
          type: n.type,
          message: n.message,
          read: n.read,
          actorId: n.actorId,
          referenceId: n.referenceId,
          referenceType: n.referenceType,
          actorName,
          createdAt: n._creationTime,
        };
      }),
    );
  },
});

/**
 * Get recent activity events (LIKE, COMMENT, CONNECTION) for displaying in the feed.
 */
export const getActivityFeed = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    // Fetch the latest 30 notifications
    const notifications = await ctx.db
      .query("devsync_notifications")
      .withIndex("by_user", (q) => q.eq("userId", account._id))
      .order("desc")
      .take(30);

    return await Promise.all(
      notifications.map(async (n) => {
        let actorName = "Someone";
        let actorAvatar: string | undefined;
        let actorUsername = "";
        if (n.actorId) {
          const actor = await ctx.db.get(n.actorId);
          if (actor) {
            actorName = actor.fullName;
            actorAvatar = actor.avatarUrl;
            actorUsername = actor.username;
          }
        }
        // Only include the event type, not the raw notification
        if (n.type === "LIKE") {
          return {
            _id: n._id,
            type: "like" as const,
            actorName,
            actorAvatar,
            actorUsername,
            actorId: n.actorId,
            referenceId: n.referenceId,
            referenceType: n.referenceType,
            message: n.message,
            createdAt: n._creationTime,
          };
        }
        if (n.type === "COMMENT") {
          return {
            _id: n._id,
            type: "comment" as const,
            actorName,
            actorAvatar,
            actorUsername,
            actorId: n.actorId,
            referenceId: n.referenceId,
            referenceType: n.referenceType,
            message: n.message,
            createdAt: n._creationTime,
          };
        }
        // CONNECTION
        return {
          _id: n._id,
          type: "follow" as const,
          actorName,
          actorAvatar,
          actorUsername,
          actorId: n.actorId,
          createdAt: n._creationTime,
        };
      }),
    );
  },
});

/**
 * Get unread notification count for the authenticated user.
 */
export const getUnreadCount = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return 0;

    const notifications = await ctx.db
      .query("devsync_notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", account._id).eq("read", false),
      )
      .collect();

    return notifications.length;
  },
});

/**
 * Mark a single notification as read.
 */
export const markAsRead = mutation({
  args: {
    token: v.string(),
    notificationId: v.id("devsync_notifications"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== account._id)
      throw new Error("Not authorized");

    await ctx.db.patch(args.notificationId, { read: true });
    return { success: true };
  },
});

/**
 * Mark all notifications as read for the authenticated user.
 */
export const markAllAsRead = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const notifications = await ctx.db
      .query("devsync_notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", account._id).eq("read", false),
      )
      .collect();

    for (const n of notifications) {
      await ctx.db.patch(n._id, { read: true });
    }

    return { success: true };
  },
});
