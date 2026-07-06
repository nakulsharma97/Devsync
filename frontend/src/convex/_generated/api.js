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
  users: {
    currentUser: $makeRef("users", "currentUser"),
    getAccountByToken: $makeRef("users", "getAccountByToken"),
    getAccountById: $makeRef("users", "getAccountById"),
    updateAccountProfile: $makeRef("users", "updateAccountProfile"),
    login: $makeRef("users", "login"),
    register: $makeRef("users", "register"),
  },
  posts: {
    createPost: $makeRef("posts", "createPost"),
    getFeed: $makeRef("posts", "getFeed"),
    deletePost: $makeRef("posts", "deletePost"),
    toggleLike: $makeRef("posts", "toggleLike"),
    hasLiked: $makeRef("posts", "hasLiked"),
    addComment: $makeRef("posts", "addComment"),
    getComments: $makeRef("posts", "getComments"),
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
};

export const internal = {
  usersInternal: {
    getAccountByEmail: $makeRef("usersInternal", "getAccountByEmail"),
    createAccount: $makeRef("usersInternal", "createAccount"),
    updateAccountToken: $makeRef("usersInternal", "updateAccountToken"),
  },
};
