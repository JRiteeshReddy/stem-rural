import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// List chapters for a course, ordered by "order" ascending
export const getChaptersByCourse = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    // Order by order ascending and then by _creationTime for stability
    return chapters.sort((a, b) => {
      if (a.order === b.order) return a._creationTime - b._creationTime;
      return a.order - b.order;
    });
  },
});

// Create a chapter in a course
export const createChapter = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    // Only the course owner can create chapters
    if (course.teacherId !== user._id) {
      throw new Error("Forbidden");
    }

    let order = args.order ?? 0;
    if (args.order === undefined) {
      // Compute next order = max(order) + 1
      const existing = await ctx.db
        .query("chapters")
        .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
        .collect();
      order = existing.length
        ? Math.max(...existing.map((c) => c.order)) + 1
        : 0;
    }

    return await ctx.db.insert("chapters", {
      courseId: args.courseId,
      title: args.title,
      content: args.content,
      imageUrl: args.imageUrl,
      order,
    });
  },
});

// Update chapter fields
export const updateChapter = mutation({
  args: {
    chapterId: v.id("chapters"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    imageUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) throw new Error("Chapter not found");

    const course = await ctx.db.get(chapter.courseId);
    if (!course) throw new Error("Parent course not found");
    if (course.teacherId !== user._id) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.content !== undefined) patch.content = args.content;
    if (args.imageUrl !== undefined) patch.imageUrl = args.imageUrl;

    await ctx.db.patch(args.chapterId, patch);
    return "Chapter updated";
  },
});

// Set chapter order
export const setChapterOrder = mutation({
  args: {
    chapterId: v.id("chapters"),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) throw new Error("Chapter not found");

    const course = await ctx.db.get(chapter.courseId);
    if (!course) throw new Error("Parent course not found");
    if (course.teacherId !== user._id) throw new Error("Forbidden");

    await ctx.db.patch(args.chapterId, { order: args.order });
    return "Order updated";
  },
});

// Delete a chapter
export const deleteChapter = mutation({
  args: {
    chapterId: v.id("chapters"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) throw new Error("Chapter not found");

    const course = await ctx.db.get(chapter.courseId);
    if (!course) throw new Error("Parent course not found");
    if (course.teacherId !== user._id) throw new Error("Forbidden");

    await ctx.db.delete(args.chapterId);
    return "Chapter deleted";
  },
});

function computeRank(credits: number): string {
  if (credits >= 100) return "Platinum";
  if (credits >= 80) return "Diamond";
  if (credits >= 60) return "Gold";
  if (credits >= 40) return "Silver";
  if (credits >= 20) return "Bronze";
  return "Banana Sprout";
}

// Mark a chapter as completed by a student (+1 credit, update progress & rank)
export const completeChapter = mutation({
  args: {
    chapterId: v.id("chapters"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") {
      throw new Error("Unauthorized");
    }

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) throw new Error("Chapter not found");
    const course = await ctx.db.get(chapter.courseId);
    if (!course || !course.isPublished) throw new Error("Course not found or not published");

    // Check if already completed
    const existing = await ctx.db
      .query("chapterCompletions")
      .withIndex("by_student_and_chapter", (q) =>
        q.eq("studentId", user._id).eq("chapterId", args.chapterId),
      )
      .unique();

    if (existing) {
      return "Already completed";
    }

    // Record completion
    await ctx.db.insert("chapterCompletions", {
      chapterId: args.chapterId,
      courseId: chapter.courseId,
      studentId: user._id,
      completedAt: Date.now(),
    });

    // Update credits (+1) and rank
    const newCredits = (user.credits || 0) + 1;
    const newRank = computeRank(newCredits);
    await ctx.db.patch(user._id, {
      credits: newCredits,
      rank: newRank,
    });

    // Update enrollment progress if enrolled
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_course_and_student", (q) =>
        q.eq("courseId", chapter.courseId).eq("studentId", user._id),
      )
      .unique();

    if (enrollment) {
      const allChapters = await ctx.db
        .query("chapters")
        .withIndex("by_course", (q) => q.eq("courseId", chapter.courseId))
        .collect();
      const completedCount = await ctx.db
        .query("chapterCompletions")
        .withIndex("by_student", (q) => q.eq("studentId", user._id))
        .collect()
        .then((rows) => rows.filter((r) => r.courseId === chapter.courseId).length);

      const total = allChapters.length || 1;
      const progress = Math.round((completedCount / total) * 100);
      await ctx.db.patch(enrollment._id, { progress });
    }

    return "Chapter completed";
  },
});