import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Check if an account exists by email */
export const getAccountByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("devsync_accounts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

/** Create a new DevSync account */
export const createAccount = internalMutation({
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

/** Update a DevSync account's session token */
export const updateAccountToken = internalMutation({
  args: { id: v.id("devsync_accounts"), token: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { token: args.token });
  },
});
