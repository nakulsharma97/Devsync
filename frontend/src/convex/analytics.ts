import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get post creation stats grouped by day for the last 30 days.
 */
export const getPostStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return { totalPosts: 0, totalLikes: 0, totalComments: 0, dailyData: [] };

    // Get all user's posts
    const posts = await ctx.db
      .query("devsync_posts")
      .withIndex("by_user", (q) => q.eq("userId", account._id))
      .collect();

    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, p) => sum + p.likeCount, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.commentCount, 0);

    // Daily post counts for the last 30 days
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const dailyMap = new Map<string, number>();

    for (const post of posts) {
      if (post._creationTime >= thirtyDaysAgo) {
        const day = new Date(post._creationTime).toISOString().slice(0, 10);
        dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
      }
    }

    // Fill in missing days with 0
    const dailyData: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyData.push({ date: key, count: dailyMap.get(key) || 0 });
    }

    return { totalPosts, totalLikes, totalComments, dailyData };
  },
});

/**
 * Get follower growth over time (last 30 days).
 */
export const getFollowerGrowth = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return { totalFollowers: 0, totalFollowing: 0, dailyData: [] };

    const followers = await ctx.db
      .query("devsync_connections")
      .withIndex("by_following", (q) => q.eq("followingId", account._id))
      .collect();

    const following = await ctx.db
      .query("devsync_connections")
      .withIndex("by_follower", (q) => q.eq("followerId", account._id))
      .collect();

    const totalFollowers = followers.length;
    const totalFollowing = following.length;

    // Cumulative follower growth over last 30 days
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const dailyData: { date: string; count: number }[] = [];
    let runningCount = followers.filter((f) => f._creationTime < thirtyDaysAgo).length;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const key = d.toISOString().slice(0, 10);

      const newFollowers = followers.filter(
        (f) => f._creationTime >= dayStart && f._creationTime < dayEnd,
      ).length;
      runningCount += newFollowers;
      dailyData.push({ date: key, count: runningCount });
    }

    return { totalFollowers, totalFollowing, dailyData };
  },
});

/**
 * Get activity breakdown by type.
 */
export const getActivityStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return { posts: 0, likes: 0, comments: 0, follows: 0, projects: 0 };

    const activity = await ctx.db
      .query("devsync_activity")
      .withIndex("by_user", (q) => q.eq("userId", account._id))
      .collect();

    const counts = { posts: 0, likes: 0, comments: 0, follows: 0, projects: 0 };
    for (const a of activity) {
      if (a.type in counts) {
        (counts as any)[a.type] += a.count;
      }
    }

    return counts;
  },
});
