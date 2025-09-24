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
