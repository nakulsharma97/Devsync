import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Search across developers, projects, and bookmarks.
 * Returns limited results for each category.
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.toLowerCase().trim();
    if (!q) return { developers: [], projects: [], bookmarks: [] };

    // Search developers by name, username, or email
    const allAccounts = await ctx.db.query("devsync_accounts").collect();
    const developers = allAccounts
      .filter(
        (a) =>
          a.fullName?.toLowerCase().includes(q) ||
          a.username?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q),
      )
      .slice(0, 10)
      .map((a) => ({
        id: a._id,
        email: a.email,
        fullName: a.fullName,
        username: a.username,
        bio: a.bio ?? undefined,
        avatarUrl: a.avatarUrl ?? undefined,
        role: a.role,
        createdAt: new Date(a._creationTime).toISOString(),
      }));

    // Search projects by title, description, or techStack
    const allProjects = await ctx.db.query("devsync_projects").collect();
    const projects = allProjects
      .filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.techStack?.toLowerCase().includes(q),
      )
      .slice(0, 10)
      .map((p) => ({
        id: p._id,
        title: p.title,
        description: p.description || "",
        techStack: p.techStack || "",
        tags: p.tags || [],
      }));

    // Search bookmarks by repo name, language, or owner
    const allBookmarks = await ctx.db.query("devsync_bookmarks").collect();
    const bookmarks = allBookmarks
      .filter(
        (b) =>
          b.repoName?.toLowerCase().includes(q) ||
          b.language?.toLowerCase().includes(q) ||
          b.owner?.toLowerCase().includes(q),
      )
      .slice(0, 10)
      .map((b) => ({
        id: b._id,
        repoName: b.repoName,
        owner: b.owner || "",
        language: b.language || "",
        stars: b.stars || 0,
      }));

    return { developers, projects, bookmarks };
  },
});
