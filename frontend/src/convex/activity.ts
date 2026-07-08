import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Log a single activity event (post, like, comment, follow, project).
 */
export const log = mutation({
  args: {
    token: v.string(),
    type: v.union(
      v.literal("post"),
      v.literal("like"),
      v.literal("comment"),
      v.literal("follow"),
      v.literal("project"),
    ),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    await ctx.db.insert("devsync_activity", {
      userId: account._id,
      type: args.type,
      count: 1,
    });
    return { success: true };
  },
});

/**
 * Get activity counts per day for the last N days.
 * Returns an array of { date: "YYYY-MM-DD", count: number }.
 */
export const getContributions = query({
  args: {
    token: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 365;
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const cutoff = Date.now() - days * 86400 * 1000;

    const activities = await ctx.db
      .query("devsync_activity")
      .withIndex("by_user", (q) => q.eq("userId", account._id))
      .collect();

    // Filter to last N days and aggregate by day
    const dayMap = new Map<string, number>();
    for (const a of activities) {
      if (a._creationTime < cutoff) continue;
      const date = new Date(a._creationTime).toISOString().slice(0, 10);
      dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
    }

    return Array.from(dayMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  },
});

/**
 * Get activity counts per day for a specific user by ID (for viewing other profiles).
 */
export const getContributionsByUser = query({
  args: {
    accountId: v.id("devsync_accounts"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 365;
    const cutoff = Date.now() - days * 86400 * 1000;

    const activities = await ctx.db
      .query("devsync_activity")
      .withIndex("by_user", (q) => q.eq("userId", args.accountId))
      .collect();

    const dayMap = new Map<string, number>();
    for (const a of activities) {
      if (a._creationTime < cutoff) continue;
      const date = new Date(a._creationTime).toISOString().slice(0, 10);
      dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
    }

    return Array.from(dayMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  },
});
