import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const REACTIONS = ["👍", "🎉", "❤️", "🚀", "👀"];

/** Toggle an emoji reaction on a post */
export const toggle = mutation({
  args: {
    token: v.string(),
    postId: v.id("devsync_posts"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    if (!REACTIONS.includes(args.emoji)) {
      throw new Error("Invalid emoji");
    }

    const existing = await ctx.db
      .query("devsync_post_reactions")
      .withIndex("by_post_user_emoji", (q) =>
        q
          .eq("postId", args.postId)
          .eq("userId", account._id)
          .eq("emoji", args.emoji),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { added: false, emoji: args.emoji };
    } else {
      await ctx.db.insert("devsync_post_reactions", {
        postId: args.postId,
        userId: account._id,
        emoji: args.emoji,
      });

      // Log activity for contribution graph
      await ctx.db.insert("devsync_activity", {
        userId: account._id,
        type: "like",
        count: 1,
      });

      return { added: true, emoji: args.emoji };
    }
  },
});

/** Get all reactions for a post, grouped by emoji with user info */
export const getForPost = query({
  args: { postId: v.id("devsync_posts") },
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("devsync_post_reactions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    // Group by emoji
    const grouped: Record<string, { count: number; users: string[] }> = {};
    for (const r of reactions) {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { count: 0, users: [] };
      }
      grouped[r.emoji].count++;
      const user = await ctx.db.get(r.userId);
      if (user) {
        grouped[r.emoji].users.push(user.fullName);
      }
    }

    return grouped;
  },
});

/** Get which emojis the current user has reacted with */
export const getUserReactions = query({
  args: { postId: v.id("devsync_posts"), token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const reactions = await ctx.db
      .query("devsync_post_reactions")
      .withIndex("by_post_user_emoji", (q) =>
        q.eq("postId", args.postId).eq("userId", account._id),
      )
      .collect();

    return reactions.map((r) => r.emoji);
  },
});
