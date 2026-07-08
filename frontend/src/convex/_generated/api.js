/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

/**
 * A utility for referencing Convex functions in your app's API.
 * Uses Symbol.for("functionName") which is the internal property
 * that Convex's getFunctionAddress and getFunctionName check for.
 */

const $fnSym = Symbol.for("functionName");

const $makeRef = (module, name) =>
  Object.freeze({ [$fnSym]: module + ":" + name });

export const api = {
  auth: {},
  activity: {
    log: $makeRef("activity", "log"),
    getContributions: $makeRef("activity", "getContributions"),
    getContributionsByUser: $makeRef("activity", "getContributionsByUser"),
  },
  notificationPrefs: {
    get: $makeRef("notificationPrefs", "get"),
    update: $makeRef("notificationPrefs", "update"),
  },
  conversations: {
    createOrGet: $makeRef("conversations", "createOrGet"),
    getMyConversations: $makeRef("conversations", "getMyConversations"),
    getUnreadCount: $makeRef("conversations", "getUnreadCount"),
  },
  messages: {
    send: $makeRef("messages", "send"),
    getMessages: $makeRef("messages", "getMessages"),
    markAsRead: $makeRef("messages", "markAsRead"),
  },
  users: {
    currentUser: $makeRef("users", "currentUser"),
    getAccountByToken: $makeRef("users", "getAccountByToken"),
    getAccountById: $makeRef("users", "getAccountById"),
    updateAccountProfile: $makeRef("users", "updateAccountProfile"),
    login: $makeRef("users", "login"),
    register: $makeRef("users", "register"),
  },
  reactions: {
    toggle: $makeRef("reactions", "toggle"),
    getForPost: $makeRef("reactions", "getForPost"),
    getUserReactions: $makeRef("reactions", "getUserReactions"),
  },
  posts: {
    createPost: $makeRef("posts", "createPost"),
    getFeed: $makeRef("posts", "getFeed"),
    deletePost: $makeRef("posts", "deletePost"),
    toggleLike: $makeRef("posts", "toggleLike"),
    hasLiked: $makeRef("posts", "hasLiked"),
    addComment: $makeRef("posts", "addComment"),
    getComments: $makeRef("posts", "getComments"),
    getPostsByUser: $makeRef("posts", "getPostsByUser"),
    generateUploadUrl: $makeRef("posts", "generateUploadUrl"),
    storeFile: $makeRef("posts", "storeFile"),
  },
  projects: {
    create: $makeRef("projects", "create"),
    getAll: $makeRef("projects", "getAll"),
    getById: $makeRef("projects", "getById"),
    update: $makeRef("projects", "update"),
    deleteProject: $makeRef("projects", "deleteProject"),
  },
  bookmarks: {
    create: $makeRef("bookmarks", "create"),
    getAll: $makeRef("bookmarks", "getAll"),
    deleteBookmark: $makeRef("bookmarks", "deleteBookmark"),
  },
  teams: {
    create: $makeRef("teams", "create"),
    getOpen: $makeRef("teams", "getOpen"),
    apply: $makeRef("teams", "apply"),
    getApplications: $makeRef("teams", "getApplications"),
    acceptApplication: $makeRef("teams", "acceptApplication"),
    rejectApplication: $makeRef("teams", "rejectApplication"),
  },
  search: {
    search: $makeRef("search", "search"),
  },
  connections: {
    follow: $makeRef("connections", "follow"),
    unfollow: $makeRef("connections", "unfollow"),
    isFollowing: $makeRef("connections", "isFollowing"),
    getFollowingIds: $makeRef("connections", "getFollowingIds"),
    getFollowerCount: $makeRef("connections", "getFollowerCount"),
    getFollowingCount: $makeRef("connections", "getFollowingCount"),
    getAllUsers: $makeRef("connections", "getAllUsers"),
  },
  typing: {
    startTyping: $makeRef("typing", "startTyping"),
    stopTyping: $makeRef("typing", "stopTyping"),
    getTypingUsers: $makeRef("typing", "getTypingUsers"),
  },
  notifications: {
    create: $makeRef("notifications", "create"),
    getAll: $makeRef("notifications", "getAll"),
    getUnreadCount: $makeRef("notifications", "getUnreadCount"),
    markAsRead: $makeRef("notifications", "markAsRead"),
    markAllAsRead: $makeRef("notifications", "markAllAsRead"),
  },
};

export const internal = {
  usersInternal: {
    getAccountByEmail: $makeRef("usersInternal", "getAccountByEmail"),
    createAccount: $makeRef("usersInternal", "createAccount"),
    updateAccountToken: $makeRef("usersInternal", "updateAccountToken"),
  },
};
