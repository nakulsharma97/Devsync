import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new bookmark for the authenticated user.
 */
export const create = mutation({
  args: {
    token: v.string(),
    repoName: v.string(),
    repoUrl: v.string(),
    description: v.optional(v.string()),
    language: v.optional(v.string()),
    owner: v.optional(v.string()),
    stars: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { token, ...bookmarkData } = args;

    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const bookmarkId = await ctx.db.insert("devsync_bookmarks", {
      userId: account._id,
      repoName: bookmarkData.repoName,
      repoUrl: bookmarkData.repoUrl,
      description: bookmarkData.description,
      language: bookmarkData.language,
      owner: bookmarkData.owner,
      stars: bookmarkData.stars,
    });

    const bookmark = await ctx.db.get(bookmarkId);
    return formatBookmark(bookmark!);
  },
});

/**
 * Get all bookmarks for the authenticated user.
 */
export const getAll = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const bookmarks = await ctx.db
      .query("devsync_bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", account._id))
      .order("desc")
      .collect();

    return bookmarks.map(formatBookmark);
  },
});

/**
 * Delete a bookmark.
 */
export const deleteBookmark = mutation({
  args: {
    token: v.string(),
    id: v.id("devsync_bookmarks"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark) throw new Error("Bookmark not found");
    if (bookmark.userId !== account._id) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});

function formatBookmark(bookmark: any) {
  return {
    id: bookmark._id,
    userId: bookmark.userId,
    repoName: bookmark.repoName,
    repoUrl: bookmark.repoUrl,
    description: bookmark.description || "",
    language: bookmark.language || "",
    owner: bookmark.owner || "",
    stars: bookmark.stars || 0,
    createdAt: new Date(bookmark._creationTime).toISOString(),
  };
}
