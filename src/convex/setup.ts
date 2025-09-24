import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// Initialize user role and setup
export const setupUserRole = mutation({
  args: {
    role: v.union(v.literal("teacher"), v.literal("student")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    const updates: any = {
      role: args.role,
      name: args.name,
    };

    if (args.role === "student") {
      updates.credits = 0;
      updates.rank = "Banana Sprout";
      updates.totalTestsCompleted = 0;
    } else if (args.role === "teacher") {
      updates.totalCoursesCreated = 0;
      updates.totalStudentsEnrolled = 0;
    }

    await ctx.db.patch(user._id, updates);
    return "User setup complete";
  },
});

export const setupExtendedRegistration = mutation({
  args: {
    registrationId: v.string(),
    dateOfBirth: v.number(), // epoch ms
    gender: v.union(v.literal("Male"), v.literal("Female"), v.literal("Others")),
    userClass: v.union(
      v.literal("Class 6"),
      v.literal("Class 7"),
      v.literal("Class 8"),
      v.literal("Class 9"),
      v.literal("Class 10"),
      v.literal("Class 11"),
      v.literal("Class 12"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      registrationId: args.registrationId,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      userClass: args.userClass,
    });
    return "Extended registration saved";
  },
});