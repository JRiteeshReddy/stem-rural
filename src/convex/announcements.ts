import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get all announcements
export const getAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const announcements = await ctx.db
      .query("announcements")
      .collect();

    // Get author info for each announcement
    const announcementsWithAuthor = await Promise.all(
      announcements.map(async (announcement) => {
        const author = await ctx.db.get(announcement.authorId);
        return {
          ...announcement,
          authorName: author?.name || "Unknown",
        };
      })
    );

    return announcementsWithAuthor.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Create announcement
export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    isGlobal: v.boolean(),
    courseId: v.optional(v.id("courses")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("announcements", {
      title: args.title,
      content: args.content,
      authorId: user._id,
      isGlobal: args.isGlobal,
      courseId: args.courseId,
      priority: args.priority,
    });
  },
});
