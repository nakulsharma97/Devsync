import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Check if the current user has admin role.
 */
export const isAdmin = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    return account?.role === "ADMIN";
  },
});

/**
 * Get all platform users (admin only).
 */
export const getAllUsers = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account || account.role !== "ADMIN") throw new Error("Not authorized");

    const allAccounts = await ctx.db.query("devsync_accounts").collect();

    return await Promise.all(
      allAccounts.map(async (u) => {
        // Count posts
        const posts = await ctx.db
          .query("devsync_posts")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .collect();

        // Count followers
        const followers = await ctx.db
          .query("devsync_connections")
          .withIndex("by_following", (q) => q.eq("followingId", u._id))
          .collect();

        return {
          id: u._id,
          email: u.email,
          fullName: u.fullName,
          username: u.username,
          role: u.role,
          avatarUrl: u.avatarUrl,
          postCount: posts.length,
          followerCount: followers.length,
          createdAt: u._creationTime,
        };
      }),
    );
  },
});

/**
 * Update a user's role (admin only).
 */
export const updateUserRole = mutation({
  args: {
    token: v.string(),
    userId: v.id("devsync_accounts"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account || account.role !== "ADMIN") throw new Error("Not authorized");

    await ctx.db.patch(args.userId, { role: args.role, updatedAt: Date.now() });
    return { success: true };
  },
});

/**
 * Delete any post by ID (admin only).
 */
export const deletePost = mutation({
  args: { token: v.string(), postId: v.id("devsync_posts") },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account || account.role !== "ADMIN") throw new Error("Not authorized");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    // Delete associated likes
    const likes = await ctx.db
      .query("devsync_post_likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const like of likes) await ctx.db.delete(like._id);

    // Delete associated comments
    const comments = await ctx.db
      .query("devsync_comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const comment of comments) await ctx.db.delete(comment._id);

    await ctx.db.delete(args.postId);
    return { success: true };
  },
});

/**
 * Get all reported content / all posts for moderation (admin only).
 */
export const getAllPosts = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account || account.role !== "ADMIN") throw new Error("Not authorized");

    const allPosts = await ctx.db
      .query("devsync_posts")
      .order("desc")
      .take(100);

    return await Promise.all(
      allPosts.map(async (post) => {
        const author = await ctx.db.get(post.userId);
        return {
          _id: post._id,
          content: post.content.slice(0, 200),
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          createdAt: post._creationTime,
          author: author
            ? { id: author._id, fullName: author.fullName, email: author.email }
            : null,
        };
      }),
    );
  },
});

/**
 * Get platform dashboard stats (admin only).
 */
export const getPlatformStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account || account.role !== "ADMIN") throw new Error("Not authorized");

    const allUsers = await ctx.db.query("devsync_accounts").collect();
    const allPosts = await ctx.db.query("devsync_posts").collect();
    const allProjects = await ctx.db.query("devsync_projects").collect();
    const allTeams = await ctx.db.query("devsync_teams").collect();
    const allConnections = await ctx.db.query("devsync_connections").collect();

    return {
      totalUsers: allUsers.length,
      totalPosts: allPosts.length,
      totalProjects: allProjects.length,
      totalTeams: allTeams.length,
      totalConnections: allConnections.length,
    };
  },
});
