import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new team.
 */
export const create = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    rolesNeeded: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { token, ...teamData } = args;
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const teamId = await ctx.db.insert("devsync_teams", {
      ownerId: account._id,
      title: teamData.title,
      description: teamData.description,
      rolesNeeded: teamData.rolesNeeded,
      open: true,
      updatedAt: Date.now(),
    });

    const team = await ctx.db.get(teamId);
    return formatTeam(team!, account);
  },
});

/**
 * Get all open teams.
 */
export const getOpen = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db
      .query("devsync_teams")
      .withIndex("by_open", (q) => q.eq("open", true))
      .order("desc")
      .collect();

    return await Promise.all(
      teams.map(async (team) => {
        const owner = await ctx.db.get(team.ownerId);
        return formatTeam(team, owner);
      }),
    );
  },
});

/**
 * Apply to a team.
 */
export const apply = mutation({
  args: {
    token: v.string(),
    teamId: v.id("devsync_teams"),
    roleApplied: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (!team.open) throw new Error("Team is no longer accepting applications");

    const appId = await ctx.db.insert("devsync_team_applications", {
      teamId: args.teamId,
      applicantId: account._id,
      roleApplied: args.roleApplied,
      message: args.message,
      status: "PENDING",
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);
    return formatApplication(app!, account);
  },
});

/**
 * Get applications for a team (owner only).
 */
export const getApplications = query({
  args: { token: v.string(), teamId: v.id("devsync_teams") },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.ownerId !== account._id) throw new Error("Not authorized");

    const apps = await ctx.db
      .query("devsync_team_applications")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();

    return await Promise.all(
      apps.map(async (app) => {
        const applicant = await ctx.db.get(app.applicantId);
        return formatApplication(app, applicant);
      }),
    );
  },
});

/**
 * Accept an application.
 */
export const acceptApplication = mutation({
  args: { token: v.string(), applicationId: v.id("devsync_team_applications") },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new Error("Application not found");
    const team = await ctx.db.get(app.teamId);
    if (!team || team.ownerId !== account._id) throw new Error("Not authorized");

    await ctx.db.patch(args.applicationId, { status: "ACCEPTED", updatedAt: Date.now() });
    return { success: true };
  },
});

/**
 * Reject an application.
 */
export const rejectApplication = mutation({
  args: { token: v.string(), applicationId: v.id("devsync_team_applications") },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new Error("Application not found");
    const team = await ctx.db.get(app.teamId);
    if (!team || team.ownerId !== account._id) throw new Error("Not authorized");

    await ctx.db.patch(args.applicationId, { status: "REJECTED", updatedAt: Date.now() });
    return { success: true };
  },
});

function formatTeam(team: any, owner: any) {
  return {
    id: team._id,
    ownerId: team.ownerId,
    owner: owner
      ? { id: owner._id, fullName: owner.fullName, email: owner.email }
      : null,
    title: team.title,
    description: team.description || "",
    rolesNeeded: team.rolesNeeded || [],
    open: team.open,
    createdAt: new Date(team._creationTime).toISOString(),
    updatedAt: team.updatedAt
      ? new Date(team.updatedAt).toISOString()
      : new Date(team._creationTime).toISOString(),
  };
}

function formatApplication(app: any, applicant: any) {
  return {
    id: app._id,
    teamId: app.teamId,
    applicantId: app.applicantId,
    applicant: applicant
      ? { id: applicant._id, fullName: applicant.fullName, email: applicant.email }
      : null,
    roleApplied: app.roleApplied || "",
    message: app.message || "",
    status: app.status,
    createdAt: new Date(app._creationTime).toISOString(),
  };
}
