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

  devsync_connections: defineTable({
    followerId: v.id("devsync_accounts"),
    followingId: v.id("devsync_accounts"),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_follower_following", ["followerId", "followingId"]),

  devsync_notifications: defineTable({
    userId: v.id("devsync_accounts"),
    type: v.string(),
    message: v.string(),
    read: v.boolean(),
    actorId: v.optional(v.id("devsync_accounts")),
    referenceId: v.optional(v.string()),
    referenceType: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_created", ["_creationTime"]),

  // ── Activity log for contribution graph ───────────────
  devsync_activity: defineTable({
    userId: v.id("devsync_accounts"),
    type: v.string(),      // "post" | "like" | "comment" | "follow" | "project"
    count: v.number(),     // always 1, aggregated later
  })
    .index("by_user_day", ["userId", "_creationTime"])
    .index("by_user", ["userId"]),

  // ── Notification preferences ──────────────────────────
  devsync_notification_prefs: defineTable({
    userId: v.id("devsync_accounts"),
    likes: v.boolean(),
    comments: v.boolean(),
    connections: v.boolean(),
    teamInvites: v.boolean(),
  })
    .index("by_user", ["userId"]),

  // ── Conversations for direct messaging ────────────────
  devsync_conversations: defineTable({
    participantIds: v.array(v.id("devsync_accounts")),
    lastMessageAt: v.number(),
    lastMessageText: v.optional(v.string()),
    lastMessageSenderId: v.optional(v.id("devsync_accounts")),
    isTeamRoom: v.optional(v.boolean()),
    projectId: v.optional(v.id("devsync_projects")),
    roomName: v.optional(v.string()),
  })
    .index("by_participants", ["participantIds"])
    .index("by_last_message", ["lastMessageAt"]),

  // ── Messages within a conversation ────────────────────
  devsync_messages: defineTable({
    conversationId: v.id("devsync_conversations"),
    senderId: v.id("devsync_accounts"),
    content: v.string(),
    read: v.boolean(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "_creationTime"]),

  // ── Post emoji reactions ───────────────────────────────
  devsync_post_reactions: defineTable({
    postId: v.id("devsync_posts"),
    userId: v.id("devsync_accounts"),
    emoji: v.string(),
  })
    .index("by_post_user_emoji", ["postId", "userId", "emoji"])
    .index("by_post", ["postId"]),

  // ── Typing status for conversations ────────────────────
  devsync_typing_status: defineTable({
    conversationId: v.id("devsync_conversations"),
    userId: v.id("devsync_accounts"),
    lastTypingAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  // ── Kanban board columns ──────────────────────────────
  devsync_board_columns: defineTable({
    projectId: v.id("devsync_projects"),
    title: v.string(),
    sortOrder: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_order", ["projectId", "sortOrder"]),

  // ── Kanban board tasks ────────────────────────────────
  devsync_board_tasks: defineTable({
    columnId: v.id("devsync_board_columns"),
    projectId: v.id("devsync_projects"),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.id("devsync_accounts")),
    priority: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_column", ["columnId"])
    .index("by_project", ["projectId"])
    .index("by_project_column", ["projectId", "columnId"]),

  // ── User online presence ─────────────────────────────
  devsync_presence: defineTable({
    userId: v.id("devsync_accounts"),
    lastSeenAt: v.number(),
  })
    .index("by_user", ["userId"]),
});
