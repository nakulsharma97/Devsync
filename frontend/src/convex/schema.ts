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

  devsync_posts: defineTable({
    userId: v.id("devsync_accounts"),
    content: v.string(),
    fileUrl: v.optional(v.string()),
    fileType: v.optional(v.string()),
    postType: v.string(),
    likeCount: v.number(),
    commentCount: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["_creationTime"]),

  devsync_post_likes: defineTable({
    postId: v.id("devsync_posts"),
    userId: v.id("devsync_accounts"),
  })
    .index("by_post_user", ["postId", "userId"])
    .index("by_post", ["postId"]),

  devsync_comments: defineTable({
    postId: v.id("devsync_posts"),
    userId: v.id("devsync_accounts"),
    content: v.string(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_post", ["postId"])
    .index("by_created", ["_creationTime"]),

  devsync_projects: defineTable({
    userId: v.id("devsync_accounts"),
    title: v.string(),
    description: v.optional(v.string()),
    techStack: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
    liveDemo: v.optional(v.string()),
    videoDemo: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.string(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["_creationTime"]),

  devsync_bookmarks: defineTable({
    userId: v.id("devsync_accounts"),
    repoName: v.string(),
    repoUrl: v.string(),
    description: v.optional(v.string()),
    language: v.optional(v.string()),
    owner: v.optional(v.string()),
    stars: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["_creationTime"]),

  devsync_teams: defineTable({
    ownerId: v.id("devsync_accounts"),
    title: v.string(),
    description: v.optional(v.string()),
    rolesNeeded: v.optional(v.array(v.string())),
    open: v.boolean(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_open", ["open"])
    .index("by_created", ["_creationTime"]),

  devsync_team_applications: defineTable({
    teamId: v.id("devsync_teams"),
    applicantId: v.id("devsync_accounts"),
    roleApplied: v.optional(v.string()),
    message: v.optional(v.string()),
    status: v.string(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_team", ["teamId"])
    .index("by_applicant", ["applicantId"])
    .index("by_team_status", ["teamId", "status"]),
});
