import { v } from "convex/values";
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  // Convex Auth manages the `users` table internally.
  // We add a separate `devsync_accounts` table for email/password auth
  // to avoid conflicts with Convex Auth's user schema.
  devsync_accounts: defineTable({
    email: v.string(),
    hashedPassword: v.string(),
    salt: v.string(),
    fullName: v.string(),
    username: v.string(),
    token: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
    linkedinLink: v.optional(v.string()),
    portfolioWebsite: v.optional(v.string()),
    role: v.string(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_token", ["token"]),
});
