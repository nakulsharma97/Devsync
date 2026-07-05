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
 */
export const api = {
  auth: {},
  users: {
    currentUser: { type: "query", module: "users", name: "currentUser" },
    getAccountByToken: {
      type: "query",
      module: "users",
      name: "getAccountByToken",
    },
    getAccountById: {
      type: "query",
      module: "users",
      name: "getAccountById",
    },
    updateAccountProfile: {
      type: "mutation",
      module: "users",
      name: "updateAccountProfile",
    },
    login: { type: "action", module: "users", name: "login" },
    register: { type: "action", module: "users", name: "register" },
  },
  posts: {
    createPost: { type: "mutation", module: "posts", name: "createPost" },
    getFeed: { type: "query", module: "posts", name: "getFeed" },
    deletePost: { type: "mutation", module: "posts", name: "deletePost" },
    toggleLike: { type: "mutation", module: "posts", name: "toggleLike" },
    hasLiked: { type: "query", module: "posts", name: "hasLiked" },
    addComment: { type: "mutation", module: "posts", name: "addComment" },
    getComments: { type: "query", module: "posts", name: "getComments" },
    generateUploadUrl: {
      type: "mutation",
      module: "posts",
      name: "generateUploadUrl",
    },
    storeFile: { type: "mutation", module: "posts", name: "storeFile" },
  },
};

export const internal = {
  usersInternal: {
    getAccountByEmail: {
      type: "query",
      module: "usersInternal",
      name: "getAccountByEmail",
    },
    createAccount: {
      type: "mutation",
      module: "usersInternal",
      name: "createAccount",
    },
    updateAccountToken: {
      type: "mutation",
      module: "usersInternal",
      name: "updateAccountToken",
    },
  },
};
