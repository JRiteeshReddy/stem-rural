import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

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

// Update announcement (author-only)
export const updateAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    isGlobal: v.optional(v.boolean()),
    courseId: v.optional(v.union(v.id("courses"), v.null())),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }
    const ann = await ctx.db.get(args.announcementId);
    if (!ann) throw new Error("Announcement not found");
    if (ann.authorId !== user._id) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.content !== undefined) patch.content = args.content;
    if (args.priority !== undefined) patch.priority = args.priority;
    if (args.isGlobal !== undefined) patch.isGlobal = args.isGlobal;
    if (args.courseId !== undefined) patch.courseId = args.courseId ?? undefined; // allow null -> undefined
    await ctx.db.patch(args.announcementId, patch);
    return "Announcement updated";
  },
});

// Delete announcement (author-only)
export const deleteAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }
    const ann = await ctx.db.get(args.announcementId);
    if (!ann) throw new Error("Announcement not found");
    if (ann.authorId !== user._id) throw new Error("Forbidden");
    await ctx.db.delete(args.announcementId);
    return "Announcement deleted";
  },
});