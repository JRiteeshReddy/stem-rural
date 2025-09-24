import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    schoolName: v.optional(v.string()),
    bloodGroup: v.optional(v.string()),
    parentsName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.schoolName !== undefined) patch.schoolName = args.schoolName;
    if (args.bloodGroup !== undefined) patch.bloodGroup = args.bloodGroup;
    if (args.parentsName !== undefined) patch.parentsName = args.parentsName;
    if (args.phoneNumber !== undefined) patch.phoneNumber = args.phoneNumber;
    if (args.address !== undefined) patch.address = args.address;
    if (args.dateOfBirth !== undefined) patch.dateOfBirth = args.dateOfBirth;

    await ctx.db.patch(user._id, patch);
    return "Profile updated";
  },
});