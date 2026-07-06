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
const $makeRef = (_type, _module, _name) => Object.freeze({ _type, _module, _name });

export const api = {
  auth: {},
  users: {
    currentUser: $makeRef("query", "users", "currentUser"),
    getAccountByToken: $makeRef("query", "users", "getAccountByToken"),
    getAccountById: $makeRef("query", "users", "getAccountById"),
    updateAccountProfile: $makeRef("mutation", "users", "updateAccountProfile"),
    login: $makeRef("action", "users", "login"),
    register: $makeRef("action", "users", "register"),
  },
  posts: {
    createPost: $makeRef("mutation", "posts", "createPost"),
    getFeed: $makeRef("query", "posts", "getFeed"),
    deletePost: $makeRef("mutation", "posts", "deletePost"),
    toggleLike: $makeRef("mutation", "posts", "toggleLike"),
    hasLiked: $makeRef("query", "posts", "hasLiked"),
    addComment: $makeRef("mutation", "posts", "addComment"),
    getComments: $makeRef("query", "posts", "getComments"),
    generateUploadUrl: $makeRef("mutation", "posts", "generateUploadUrl"),
    storeFile: $makeRef("mutation", "posts", "storeFile"),
  },
};

export const internal = {
  usersInternal: {
    getAccountByEmail: $makeRef("query", "usersInternal", "getAccountByEmail"),
    createAccount: $makeRef("mutation", "usersInternal", "createAccount"),
    updateAccountToken: $makeRef("mutation", "usersInternal", "updateAccountToken"),
  },
};
