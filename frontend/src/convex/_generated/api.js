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
};

export const internal = {
  usersInternal: {
    getAccountByEmail: $makeRef("usersInternal", "getAccountByEmail"),
    createAccount: $makeRef("usersInternal", "createAccount"),
    updateAccountToken: $makeRef("usersInternal", "updateAccountToken"),
  },
};
