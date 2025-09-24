import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get all published tests
export const getPublishedTests = query({
  args: {},
  handler: async (ctx) => {
    const tests = await ctx.db
      .query("tests")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect();

    // Get teacher info for each test
    const testsWithTeacher = await Promise.all(
      tests.map(async (test) => {
        const teacher = await ctx.db.get(test.teacherId);
        return {
          ...test,
          teacherName: teacher?.name || "Unknown Teacher",
        };
      })
    );

    return testsWithTeacher;
  },
});

// Get tests by teacher
export const getTestsByTeacher = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("tests")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .collect();
  },
});

// Create a new test
export const createTest = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    courseId: v.optional(v.id("courses")),
    questions: v.array(v.object({
      question: v.string(),
      options: v.array(v.string()),
      correctAnswer: v.number(),
      points: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }

    const totalPoints = args.questions.reduce((sum, q) => sum + q.points, 0);

    return await ctx.db.insert("tests", {
      title: args.title,
      description: args.description,
      courseId: args.courseId,
      teacherId: user._id,
      questions: args.questions,
      totalPoints,
      isPublished: false,
    });
  },
});

// Submit test answers
export const submitTest = mutation({
  args: {
    testId: v.id("tests"),
    answers: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") {
      throw new Error("Unauthorized");
    }

    const test = await ctx.db.get(args.testId);
    if (!test || !test.isPublished) {
      throw new Error("Test not found or not published");
    }

    // Calculate score
    let score = 0;
    test.questions.forEach((question, index) => {
      if (args.answers[index] === question.correctAnswer) {
        score += question.points;
      }
    });

    // Save result
    await ctx.db.insert("testResults", {
      testId: args.testId,
      studentId: user._id,
      score,
      totalPoints: test.totalPoints,
      answers: args.answers,
      completedAt: Date.now(),
    });

    // Update student credits and stats
    const creditsEarned = Math.floor(score / 10); // 1 credit per 10 points
    await ctx.db.patch(user._id, {
      credits: (user.credits || 0) + creditsEarned,
      totalTestsCompleted: (user.totalTestsCompleted || 0) + 1,
    });

    return { score, totalPoints: test.totalPoints, creditsEarned };
  },
});

// Get student's test results
export const getStudentTestResults = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("testResults")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .collect();
  },
});
