import { getAuthUserId } from "@convex-dev/auth/server";
import { query, QueryCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

export const deleteStudentAccount = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, { targetUserId }) => {
    const requesterId = await getAuthUserId(ctx);
    if (!requesterId) throw new Error("Unauthorized");
    const requester = await ctx.db.get(requesterId);
    if (!requester || requester.role !== "teacher") {
      throw new Error("Only teachers can delete student accounts");
    }

    const target = await ctx.db.get(targetUserId);
    if (!target) throw new Error("User not found");
    if (target.role !== "student") {
      throw new Error("Only student accounts can be deleted");
    }

    await ctx.db.delete(targetUserId);
    return { success: true };
  },
});