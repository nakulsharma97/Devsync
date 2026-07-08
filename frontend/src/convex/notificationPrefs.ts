import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULTS = {
  likes: true,
  comments: true,
  connections: true,
  teamInvites: true,
};

export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return DEFAULTS;

    const prefs = await ctx.db
      .query("devsync_notification_prefs")
      .withIndex("by_user", (q) => q.eq("userId", account._id))
      .unique();

    return prefs || DEFAULTS;
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    likes: v.optional(v.boolean()),
    comments: v.optional(v.boolean()),
    connections: v.optional(v.boolean()),
    teamInvites: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { token, ...prefs } = args;
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("devsync_notification_prefs")
      .withIndex("by_user", (q) => q.eq("userId", account._id))
      .unique();

    const data = { ...DEFAULTS, ...prefs, userId: account._id };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("devsync_notification_prefs", data);
    }

    return { success: true };
  },
});

/**
 * Check if a user has a specific notification type enabled.
 * Called internally by other mutations.
 */
export const isEnabled = query({
  args: {
    userId: v.id("devsync_accounts"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("devsync_notification_prefs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!prefs) return true; // default to enabled

    switch (args.type) {
      case "LIKE": return prefs.likes;
      case "COMMENT": return prefs.comments;
      case "CONNECTION": return prefs.connections;
      case "TEAM_INVITE": return prefs.teamInvites;
      default: return true;
    }
  },
});
