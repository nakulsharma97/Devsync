import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, mutation, query, QueryCtx } from "./_generated/server";
import { api } from "./_generated/api";

// ════════════════════════════════════════════════════════════════
// Convex Auth (email-otp) - uses the `users` table managed by Convex
// ════════════════════════════════════════════════════════════════

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Uses Convex Auth's session management (the `users` table).
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) return null;
    return user;
  },
});

export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get(userId);
};

// ════════════════════════════════════════════════════════════════
// DevSync Auth (email/password) - uses the `devsync_accounts` table
// ════════════════════════════════════════════════════════════════

/** Register a new DevSync account with email and password */
export const register = action({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const { email, password, fullName, username } = args;

    // Check for existing account
    const existing = await ctx.runQuery(api.users.getAccountByEmail, {
      email,
    });
    if (existing) {
      throw new Error("Email already registered");
    }

    // Hash password with pbkdf2 via Node.js crypto
    const crypto = await import("node:crypto");
    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await new Promise<string>((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, key) => {
        if (err) reject(err);
        else resolve(key.toString("hex"));
      });
    });

    // Generate session token
    const token = crypto.randomBytes(32).toString("hex");

    // Store account
    await ctx.runMutation(api.users.createAccount, {
      email,
      hashedPassword,
      salt,
      fullName,
      username,
      token,
    });

    return { email, fullName, role: "DEVELOPER", token };
  },
});

/** Login with email and password */
export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { email, password } = args;

    // Find account
    const account = await ctx.runQuery(api.users.getAccountByEmail, { email });
    if (!account) {
      throw new Error("No account found with this email address.");
    }

    // Verify password
    const crypto = await import("node:crypto");
    const hashedInput = await new Promise<string>((resolve, reject) => {
      crypto.pbkdf2(password, account.salt, 100000, 64, "sha512", (err, key) => {
        if (err) reject(err);
        else resolve(key.toString("hex"));
      });
    });

    if (hashedInput !== account.hashedPassword) {
      throw new Error("Incorrect password. Please try again.");
    }

    // Rotate token
    const token = crypto.randomBytes(32).toString("hex");
    await ctx.runMutation(api.users.updateAccountToken, {
      id: account._id,
      token,
    });

    return {
      userId: account._id,
      email: account.email,
      fullName: account.fullName,
      role: account.role || "DEVELOPER",
      token,
    };
  },
});

// ─── Internal queries & mutations ───

export const getAccountByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("devsync_accounts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const createAccount = mutation({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
    salt: v.string(),
    fullName: v.string(),
    username: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("devsync_accounts", {
      email: args.email,
      hashedPassword: args.hashedPassword,
      salt: args.salt,
      fullName: args.fullName,
      username: args.username,
      token: args.token,
      bio: "",
      avatarUrl: "",
      bannerUrl: "",
      location: "",
      githubUsername: "",
      linkedinLink: "",
      portfolioWebsite: "",
      role: "DEVELOPER",
      updatedAt: Date.now(),
    });
  },
});

export const updateAccountToken = mutation({
  args: { id: v.id("devsync_accounts"), token: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { token: args.token });
  },
});

/** Get the DevSync account by session token */
export const getAccountByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return null;
    return {
      id: account._id,
      email: account.email,
      fullName: account.fullName,
      username: account.username,
      bio: account.bio,
      avatarUrl: account.avatarUrl,
      bannerUrl: account.bannerUrl,
      location: account.location,
      githubUsername: account.githubUsername,
      linkedinLink: account.linkedinLink,
      portfolioWebsite: account.portfolioWebsite,
      role: account.role,
      createdAt: new Date(account._creationTime).toISOString(),
    };
  },
});

/** Update DevSync account profile */
export const updateAccountProfile = mutation({
  args: {
    token: v.string(),
    fullName: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
    linkedinLink: v.optional(v.string()),
    portfolioWebsite: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { token, ...fields } = args;
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!account) throw new Error("Not authenticated");
    await ctx.db.patch(account._id, { ...fields, updatedAt: Date.now() });
    return { success: true };
  },
});

/** Get a DevSync account by ID */
export const getAccountById = query({
  args: { accountId: v.id("devsync_accounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) return null;
    return {
      id: account._id,
      email: account.email,
      fullName: account.fullName,
      username: account.username,
      bio: account.bio,
      avatarUrl: account.avatarUrl,
      bannerUrl: account.bannerUrl,
      location: account.location,
      githubUsername: account.githubUsername,
      linkedinLink: account.linkedinLink,
      portfolioWebsite: account.portfolioWebsite,
      role: account.role,
      createdAt: new Date(account._creationTime).toISOString(),
    };
  },
});
