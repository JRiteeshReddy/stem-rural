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

export const addCredits = mutation({
  args: { amount: v.number() },
  handler: async (ctx, { amount }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const currentCredits = user.credits || 0;
    const currentTests = user.totalTestsCompleted || 0;
    const newCredits = Math.max(0, currentCredits + Math.max(0, Math.floor(amount)));
    const newTotalTests = currentTests + 1; // count this game session as a completed activity

    // Simple rank thresholds
    const rank =
      newCredits >= 200 ? "Platinum" :
      newCredits >= 120 ? "Diamond"  :
      newCredits >= 70  ? "Gold"     :
      newCredits >= 30  ? "Silver"   :
                          "Bronze";

    await ctx.db.patch(userId, {
      credits: newCredits,
      totalTestsCompleted: newTotalTests,
      rank,
    });

    return { credits: newCredits, totalTestsCompleted: newTotalTests, rank };
  },
});

// List students for teacher admin view
export const listStudents = query({
  args: {
    targetClass: v.optional(v.union(
      v.literal("Class 6"),
      v.literal("Class 7"),
      v.literal("Class 8"),
      v.literal("Class 9"),
      v.literal("Class 10"),
      v.literal("Class 11"),
      v.literal("Class 12"),
    )),
    searchName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }

    const students = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();

    let filteredStudents = students;
    
    // Filter by class
    if (args.targetClass) {
      filteredStudents = filteredStudents.filter(s => s.userClass === args.targetClass);
    }
    
    // Filter by name search
    if (args.searchName) {
      const searchLower = args.searchName.toLowerCase();
      filteredStudents = filteredStudents.filter(s => 
        (s.name || "").toLowerCase().includes(searchLower)
      );
    }

    return filteredStudents.map(student => ({
      _id: student._id,
      name: student.name || "Unknown",
      email: student.email || "",
      userClass: student.userClass || "Unknown",
      credits: student.credits || 0,
      rank: student.rank || "Bronze",
      totalTestsCompleted: student.totalTestsCompleted || 0,
      phoneNumber: student.phoneNumber || "",
      address: student.address || "",
      lastLoginAt: student.lastLoginAt || null,
    }));
  },
});

// Update student profile subset (admin level)
export const updateStudentProfileSubset = mutation({
  args: {
    studentId: v.id("users"),
    name: v.optional(v.string()),
    userClass: v.optional(v.union(
      v.literal("Class 6"),
      v.literal("Class 7"),
      v.literal("Class 8"),
      v.literal("Class 9"),
      v.literal("Class 10"),
      v.literal("Class 11"),
      v.literal("Class 12"),
    )),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student || student.role !== "student") {
      throw new Error("Student not found");
    }

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.userClass !== undefined) patch.userClass = args.userClass;
    if (args.phoneNumber !== undefined) patch.phoneNumber = args.phoneNumber;
    if (args.address !== undefined) patch.address = args.address;

    await ctx.db.patch(args.studentId, patch);
    return "Student profile updated";
  },
});