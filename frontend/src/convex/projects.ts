import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new project for the authenticated user.
 */
export const create = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    techStack: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
    liveDemo: v.optional(v.string()),
    videoDemo: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { token, ...projectData } = args;

    // Find the user by token
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const projectId = await ctx.db.insert("devsync_projects", {
      userId: account._id,
      title: projectData.title,
      description: projectData.description,
      techStack: projectData.techStack,
      githubRepo: projectData.githubRepo,
      liveDemo: projectData.liveDemo,
      videoDemo: projectData.videoDemo,
      tags: projectData.tags,
      status: "ACTIVE",
      updatedAt: Date.now(),
    });

    const project = await ctx.db.get(projectId);
    return formatProject(project!);
  },
});

/**
 * Get all projects for the authenticated user.
 */
export const getAll = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const projects = await ctx.db
      .query("devsync_projects")
      .withIndex("by_user", (q) => q.eq("userId", account._id))
      .order("desc")
      .collect();

    return projects.map(formatProject);
  },
});

/**
 * Get a single project by ID.
 */
export const getById = query({
  args: { token: v.string(), id: v.id("devsync_projects") },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");
    if (project.userId !== account._id) throw new Error("Not authorized");

    return formatProject(project);
  },
});

/**
 * Update a project.
 */
export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("devsync_projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    techStack: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
    liveDemo: v.optional(v.string()),
    videoDemo: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { token, id, ...fields } = args;

    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const project = await ctx.db.get(id);
    if (!project) throw new Error("Project not found");
    if (project.userId !== account._id) throw new Error("Not authorized");

    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });

    const updated = await ctx.db.get(id);
    return formatProject(updated!);
  },
});

/**
 * Delete a project.
 */
export const deleteProject = mutation({
  args: {
    token: v.string(),
    id: v.id("devsync_projects"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");
    if (project.userId !== account._id) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});

function formatProject(project: any) {
  return {
    id: project._id,
    userId: project.userId,
    title: project.title,
    description: project.description || "",
    techStack: project.techStack || "",
    githubRepo: project.githubRepo || "",
    liveDemo: project.liveDemo || "",
    videoDemo: project.videoDemo || "",
    tags: project.tags || [],
    status: project.status,
    createdAt: new Date(project._creationTime).toISOString(),
    updatedAt: project.updatedAt
      ? new Date(project.updatedAt).toISOString()
      : new Date(project._creationTime).toISOString(),
  };
}
