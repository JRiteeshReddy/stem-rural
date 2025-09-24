/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as announcements from "../announcements.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as auth from "../auth.js";
import type * as chapters from "../chapters.js";
import type * as courses from "../courses.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as setup from "../setup.js";
import type * as tests from "../tests.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  announcements: typeof announcements;
  "auth/emailOtp": typeof auth_emailOtp;
  auth: typeof auth;
  chapters: typeof chapters;
  courses: typeof courses;
  http: typeof http;
  leaderboard: typeof leaderboard;
  setup: typeof setup;
  tests: typeof tests;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
