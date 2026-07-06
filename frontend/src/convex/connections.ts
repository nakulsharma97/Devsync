import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Follow a user.
 */
export const follow = mutation({
  args: {
    token: v.string(),
    followingId: v.id("devsync_accounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");
    if (account._id === args.followingId) throw new Error("Cannot follow yourself");

    // Check if already following
    const existing = await ctx.db
      .query("devsync_connections")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", account._id).eq("followingId", args.followingId),
      )
      .unique();
    if (existing) throw new Error("Already following this user");

    await ctx.db.insert("devsync_connections", {
      followerId: account._id,
      followingId: args.followingId,
    });

    return { success: true };
  },
});

/**
 * Unfollow a user.
 */
export const unfollow = mutation({
  args: {
    token: v.string(),
    followingId: v.id("devsync_accounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("devsync_connections")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", account._id).eq("followingId", args.followingId),
      )
      .unique();
    if (!existing) throw new Error("Not following this user");

    await ctx.db.delete(existing._id);
    return { success: true };
  },
});

/**
 * Check if the current user is following a specific user.
 */
export const isFollowing = query({
  args: {
    token: v.string(),
    followingId: v.id("devsync_accounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return false;

    const existing = await ctx.db
      .query("devsync_connections")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", account._id).eq("followingId", args.followingId),
      )
      .unique();

    return !!existing;
  },
});

/**
 * Get the list of user IDs that the authenticated user is following.
 */
export const getFollowingIds = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const connections = await ctx.db
      .query("devsync_connections")
      .withIndex("by_follower", (q) => q.eq("followerId", account._id))
      .collect();

    return connections.map((c) => c.followingId);
  },
});

/**
 * Get the follower count for a user.
 */
export const getFollowerCount = query({
  args: { userId: v.id("devsync_accounts") },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("devsync_connections")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();
    return connections.length;
  },
});

/**
 * Get the following count for a user.
 */
export const getFollowingCount = query({
  args: { userId: v.id("devsync_accounts") },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("devsync_connections")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();
    return connections.length;
  },
});
