import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create or get a team chat room for a project.
 */
export const createOrGet = mutation({
  args: {
    token: v.string(),
    projectId: v.id("devsync_projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    // Check if a room for this project already exists
    const existing = await ctx.db
      .query("devsync_conversations")
      .filter((q) => q.eq(q.field("projectId"), args.projectId))
      .unique();

    if (existing) return existing._id;

    // Create new team room
    const roomId = await ctx.db.insert("devsync_conversations", {
      participantIds: [account._id],
      lastMessageAt: Date.now(),
      lastMessageText: "Room created",
      lastMessageSenderId: account._id,
      isTeamRoom: true,
      projectId: args.projectId,
      roomName: args.name,
    });

    return roomId;
  },
});

/**
 * Join a team room.
 */
export const joinRoom = mutation({
  args: {
    token: v.string(),
    roomId: v.id("devsync_conversations"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (!room.isTeamRoom) throw new Error("Not a team room");

    // Check if already a participant
    if (room.participantIds.includes(account._id)) return { success: true };

    // Add user to participants
    await ctx.db.patch(args.roomId, {
      participantIds: [...room.participantIds, account._id],
    });

    return { success: true };
  },
});

/**
 * Invite a user to a team room.
 */
export const inviteToRoom = mutation({
  args: {
    token: v.string(),
    roomId: v.id("devsync_conversations"),
    userId: v.id("devsync_accounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) throw new Error("Not authenticated");

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (!room.isTeamRoom) throw new Error("Not a team room");

    // Check inviter is a participant
    if (!room.participantIds.includes(account._id)) {
      throw new Error("You are not a participant in this room");
    }

    // Check if already a participant
    if (room.participantIds.includes(args.userId)) {
      return { success: true, alreadyMember: true };
    }

    // Add user to participants
    await ctx.db.patch(args.roomId, {
      participantIds: [...room.participantIds, args.userId],
    });

    // Send a system message notifying the room
    const invitedUser = await ctx.db.get(args.userId);
    if (invitedUser) {
      await ctx.db.insert("devsync_messages", {
        conversationId: args.roomId,
        senderId: account._id,
        content: `👋 ${invitedUser.fullName} was invited to the room by ${account.fullName}`,
        read: false,
      });

      // Create an INVITE notification for the invited user
      await ctx.db.insert("devsync_notifications", {
        userId: args.userId,
        type: "INVITE",
        message: `${account.fullName} invited you to join ${room.roomName || "a team room"}`,
        read: false,
        actorId: account._id,
        referenceId: args.roomId,
        referenceType: "room",
      });
    }

    return { success: true, alreadyMember: false };
  },
});

/**
 * Get participants of a team room with their details.
 */
export const getRoomParticipants = query({
  args: {
    token: v.string(),
    roomId: v.id("devsync_conversations"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    const room = await ctx.db.get(args.roomId);
    if (!room) return [];

    const participants = await Promise.all(
      room.participantIds.map(async (pid) => {
        const user = await ctx.db.get(pid);
        return user
          ? {
              id: user._id,
              fullName: user.fullName,
              username: user.username,
              avatarUrl: user.avatarUrl,
              isMe: user._id.toString() === account._id.toString(),
            }
          : null;
      }),
    );

    return participants.filter(Boolean);
  },
});

/**
 * Get all team rooms for the user's projects.
 */
export const getMyTeamRooms = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("devsync_accounts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!account) return [];

    // Get user's projects
    const projects = await ctx.db
      .query("devsync_projects")
      .withIndex("by_user", (q) => q.eq("userId", account._id))
      .collect();
    const projectIds = projects.map((p) => p._id.toString());

    // Find conversations that are team rooms linked to these projects
    const allRooms = await ctx.db
      .query("devsync_conversations")
      .filter((q) => q.eq(q.field("isTeamRoom"), true))
      .collect();

    const myRooms = allRooms.filter(
      (r) =>
        r.participantIds.includes(account._id) ||
        (r.projectId && projectIds.includes(r.projectId.toString())),
    );

    return await Promise.all(
      myRooms.map(async (room) => {
        const project = room.projectId
          ? await ctx.db.get(room.projectId)
          : null;

        // Count participants
        const participantCount = room.participantIds.length;

        // Count unread messages
        const messages = await ctx.db
          .query("devsync_messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", room._id))
          .collect();
        const unreadCount = messages.filter(
          (m) => !m.read && m.senderId !== account._id,
        ).length;

        return {
          _id: room._id,
          roomName: room.roomName || project?.title || "Team Room",
          isTeamRoom: true,
          projectId: room.projectId,
          projectName: project?.title || null,
          participantCount,
          lastMessageText: room.lastMessageText,
          lastMessageAt: room.lastMessageAt,
          unreadCount,
        };
      }),
    );
  },
});
