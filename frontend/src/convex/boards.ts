import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ════════════════════════════════════════════════════════════════
// Columns
// ════════════════════════════════════════════════════════════════

/** Initialize default columns for a new project board */
export const initDefaults = mutation({
  args: {
    token: v.string(),
    projectId: v.id("devsync_projects"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    // Check if columns already exist
    const existing = await ctx.db
      .query("devsync_board_columns")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    if (existing.length > 0) return existing;

    const defaults = ["To Do", "In Progress", "Done"];
    const columns = [];
    for (let i = 0; i < defaults.length; i++) {
      const colId = await ctx.db.insert("devsync_board_columns", {
        projectId: args.projectId,
        title: defaults[i],
        sortOrder: i,
      });
      const col = await ctx.db.get(colId);
      if (col) columns.push(col);
    }
    return columns;
  },
});

/** Add a new column */
export const addColumn = mutation({
  args: {
    token: v.string(),
    projectId: v.id("devsync_projects"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("devsync_board_columns")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const colId = await ctx.db.insert("devsync_board_columns", {
      projectId: args.projectId,
      title: args.title,
      sortOrder: existing.length,
    });

    return await ctx.db.get(colId);
  },
});

/** Get columns for a project */
export const getColumns = query({
  args: {
    token: v.string(),
    projectId: v.id("devsync_projects"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const columns = await ctx.db
      .query("devsync_board_columns")
      .withIndex("by_project_order", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();

    return await Promise.all(
      columns.map(async (col) => ({
        _id: col._id,
        title: col.title,
        sortOrder: col.sortOrder,
        tasks: [] as any[],
      })),
    );
  },
});

// ════════════════════════════════════════════════════════════════
// Tasks
// ════════════════════════════════════════════════════════════════

/** Add a task to a column */
export const addTask = mutation({
  args: {
    token: v.string(),
    columnId: v.id("devsync_board_columns"),
    projectId: v.id("devsync_projects"),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("devsync_board_tasks")
      .withIndex("by_column", (q) => q.eq("columnId", args.columnId))
      .collect();

    const taskId = await ctx.db.insert("devsync_board_tasks", {
      columnId: args.columnId,
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      priority: args.priority,
      sortOrder: existing.length,
    });

    return await ctx.db.get(taskId);
  },
});

/** Move a task to a different column (for drag and drop) */
export const moveTask = mutation({
  args: {
    token: v.string(),
    taskId: v.id("devsync_board_tasks"),
    newColumnId: v.id("devsync_board_columns"),
    newSortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    await ctx.db.patch(args.taskId, {
      columnId: args.newColumnId,
      sortOrder: args.newSortOrder,
    });

    return { success: true };
  },
});

/** Update a task */
export const updateTask = mutation({
  args: {
    token: v.string(),
    taskId: v.id("devsync_board_tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
    assigneeId: v.optional(v.id("devsync_accounts")),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const { token, taskId, ...fields } = args;
    await ctx.db.patch(taskId, { ...fields });
    return { success: true };
  },
});

/** Delete a task */
export const deleteTask = mutation({
  args: {
    token: v.string(),
    taskId: v.id("devsync_board_tasks"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    await ctx.db.delete(args.taskId);
    return { success: true };
  },
});

/** Get all tasks grouped by column for a project */
export const getBoard = query({
  args: {
    token: v.string(),
    projectId: v.id("devsync_projects"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const columns = await ctx.db
      .query("devsync_board_columns")
      .withIndex("by_project_order", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();

    const tasks = await ctx.db
      .query("devsync_board_tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return await Promise.all(
      columns.map(async (col) => {
        const colTasks = tasks
          .filter((t) => t.columnId.toString() === col._id.toString())
          .sort((a, b) => a.sortOrder - b.sortOrder);

        return {
          _id: col._id,
          title: col.title,
          sortOrder: col.sortOrder,
          tasks: await Promise.all(
            colTasks.map(async (t) => {
              const assignee = t.assigneeId ? await ctx.db.get(t.assigneeId) : null;
              return {
                _id: t._id,
                title: t.title,
                description: t.description,
                priority: t.priority,
                sortOrder: t.sortOrder,
                assignee: assignee
                  ? { id: assignee._id, fullName: assignee.fullName, avatarUrl: assignee.avatarUrl }
                  : null,
                createdAt: t._creationTime,
              };
            }),
          ),
        };
      }),
    );
  },
});
