import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const setProfileImage = mutation({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const url = await ctx.storage.getUrl(args.fileId);
    if (!url) throw new Error("File not found");
    await ctx.db.patch(user._id, { image: url });
    return "Profile image updated";
  },
});
