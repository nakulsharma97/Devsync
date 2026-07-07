import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ════════════════════════════════════════════════════════════════
// Post CRUD
// ════════════════════════════════════════════════════════════════

/** Create a new post with optional file attachment */
export const createPost = mutation({
  args: {
    token: v.string(),
    content: v.string(),
    fileUrl: v.optional(v.string()),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const postId = await ctx.db.insert("devsync_posts", {
      userId: account._id,
      content: args.content,
      fileUrl: args.fileUrl,
      fileType: args.fileType,
      postType: args.fileType?.startsWith("image/") ? "IMAGE" : "TEXT",
      likeCount: 0,
      commentCount: 0,
      updatedAt: Date.now(),
    });

    return {
      _id: postId,
      content: args.content,
      fileUrl: args.fileUrl,
      fileType: args.fileType,
      createdAt: Date.now(),
    };
  },
});

/** Get the feed (paginated, newest first) */
export const getFeed = query({
  args: { limit: v.optional(v.number()), cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const posts = await ctx.db
      .query("devsync_posts")
      .order("desc")
      .take(limit + 1);

    const items = await Promise.all(
      posts.slice(0, limit).map(async (post) => {
        const user = await ctx.db.get(post.userId);
        return {
          _id: post._id,
          content: post.content,
          fileUrl: post.fileUrl,
          fileType: post.fileType,
          postType: post.postType,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          createdAt: post._creationTime,
          user: user
            ? {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
              }
            : null,
        };
      })
    );

    return {
      items,
      hasMore: posts.length > limit,
    };
  },
});

/** Delete a post */
export const deletePost = mutation({
  args: { postId: v.id("devsync_posts"), token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.userId !== account._id) throw new Error("Not authorized");

    // Delete associated likes and comments
    const likes = await ctx.db
      .query("devsync_post_likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    const comments = await ctx.db
      .query("devsync_comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    await ctx.db.delete(args.postId);
    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════
// Likes
// ════════════════════════════════════════════════════════════════

/** Toggle like on a post */
export const toggleLike = mutation({
  args: { postId: v.id("devsync_posts"), token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("devsync_post_likes")
      .withIndex("by_post_user", (q) =>
        q.eq("postId", args.postId).eq("userId", account._id)
      )
      .unique();

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.postId, { likeCount: post.likeCount - 1 });
      return { liked: false, count: post.likeCount - 1 };
    } else {
      await ctx.db.insert("devsync_post_likes", {
        postId: args.postId,
        userId: account._id,
      });
      await ctx.db.patch(args.postId, { likeCount: post.likeCount + 1 });

      // Notify the post owner (unless you liked your own post)
      if (post.userId !== account._id) {
        await ctx.db.insert("devsync_notifications", {
          userId: post.userId,
          type: "LIKE",
          message: `${account.fullName} liked your post`,
          read: false,
          actorId: account._id,
          referenceId: args.postId,
          referenceType: "post",
        });
      }

      return { liked: true, count: post.likeCount + 1 };
    }
  },
});

/** Check if current user liked a post */
export const hasLiked = query({
  args: { postId: v.id("devsync_posts"), token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return false;

    const like = await ctx.db
      .query("devsync_post_likes")
      .withIndex("by_post_user", (q) =>
        q.eq("postId", args.postId).eq("userId", account._id)
      )
      .unique();
    return !!like;
  },
});

// ════════════════════════════════════════════════════════════════
// Comments
// ════════════════════════════════════════════════════════════════

/** Add a comment to a post */
export const addComment = mutation({
  args: {
    postId: v.id("devsync_posts"),
    token: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const commentId = await ctx.db.insert("devsync_comments", {
      postId: args.postId,
      userId: account._id,
      content: args.content,
      updatedAt: Date.now(),
    });

    // Increment comment count
    const post = await ctx.db.get(args.postId);
    if (post) {
      await ctx.db.patch(args.postId, { commentCount: post.commentCount + 1 });

      // Notify the post owner (unless you commented on your own post)
      if (post.userId !== account._id) {
        await ctx.db.insert("devsync_notifications", {
          userId: post.userId,
          type: "COMMENT",
          message: `${account.fullName} commented on your post`,
          read: false,
          actorId: account._id,
          referenceId: args.postId,
          referenceType: "post",
        });
      }
    }

    return {
      _id: commentId,
      content: args.content,
      createdAt: Date.now(),
      user: {
        id: account._id,
        fullName: account.fullName,
        email: account.email,
      },
    };
  },
});

/** Get comments for a post */
export const getComments = query({
  args: { postId: v.id("devsync_posts") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("devsync_comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();

    return await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          _id: comment._id,
          content: comment.content,
          createdAt: comment._creationTime,
          user: user
            ? { id: user._id, fullName: user.fullName, email: user.email }
            : null,
        };
      })
    );
  },
});

// ════════════════════════════════════════════════════════════════
// File Upload (Convex Storage)
// ════════════════════════════════════════════════════════════════

/** Generate an upload URL for file uploads */
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

/** Store a file reference after upload (to get the URL) */
export const storeFile = mutation({
  args: {
    storageId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const url = await ctx.storage.getUrl(args.storageId);
    return url;
  },
});
