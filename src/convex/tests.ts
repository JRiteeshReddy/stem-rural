import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get all published tests
export const getPublishedTests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.userClass) {
      return [];
    }

    const tests = await ctx.db
      .query("tests")
      .withIndex("by_class_and_published", (q) =>
        q.eq("targetClass", user.userClass!).eq("isPublished", true)
      )
      .collect();

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

function validateQuestions(questions: Array<{
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
}>) {
  if (questions.length > 10) {
    throw new Error("A test can have at most 10 questions");
  }
  for (const [i, q] of questions.entries()) {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Question ${i + 1} must have exactly 4 options`);
    }
    if (q.correctAnswer < 0 || q.correctAnswer > 3) {
      throw new Error(`Question ${i + 1} must have a correctAnswer between 0 and 3`);
    }
  }
}

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
    if (!user.userClass) {
      throw new Error("Teacher must have a registered class before creating tests");
    }

    validateQuestions(args.questions);
    const totalPoints = args.questions.reduce((sum, q) => sum + q.points, 0);

    return await ctx.db.insert("tests", {
      title: args.title,
      description: args.description,
      courseId: args.courseId,
      teacherId: user._id,
      questions: args.questions,
      totalPoints,
      isPublished: false,
      // Tag with teacher's class
      targetClass: user.userClass,
    });
  },
});

// Update entire test (title/description/courseId/questions/isPublished)
export const updateTest = mutation({
  args: {
    testId: v.id("tests"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    courseId: v.optional(v.union(v.id("courses"), v.null())),
    questions: v.optional(v.array(v.object({
      question: v.string(),
      options: v.array(v.string()),
      correctAnswer: v.number(),
      points: v.number(),
    }))),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }

    const test = await ctx.db.get(args.testId);
    if (!test) throw new Error("Test not found");
    if (test.teacherId !== user._id) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.courseId !== undefined) patch.courseId = args.courseId ?? undefined; // allow null -> undefined
    if (args.isPublished !== undefined) patch.isPublished = args.isPublished;

    if (args.questions !== undefined) {
      validateQuestions(args.questions);
      patch.questions = args.questions;
      patch.totalPoints = args.questions.reduce((sum, q) => sum + q.points, 0);
    }

    await ctx.db.patch(args.testId, patch);
    return "Test updated";
  },
});

// Delete a test
export const deleteTest = mutation({
  args: {
    testId: v.id("tests"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }
    const test = await ctx.db.get(args.testId);
    if (!test) throw new Error("Test not found");
    if (test.teacherId !== user._id) throw new Error("Forbidden");

    await ctx.db.delete(args.testId);

    // Optionally: delete related testResults
    // for await (const tr of ctx.db.query("testResults").withIndex("by_test", q => q.eq("testId", args.testId))) {
    //   await ctx.db.delete(tr._id);
    // }

    return "Test deleted";
  },
});

// Update a single question by index
export const updateTestQuestion = mutation({
  args: {
    testId: v.id("tests"),
    index: v.number(),
    question: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") throw new Error("Unauthorized");

    const test = await ctx.db.get(args.testId);
    if (!test) throw new Error("Test not found");
    if (test.teacherId !== user._id) throw new Error("Forbidden");

    if (args.index < 0 || args.index >= test.questions.length) {
      throw new Error("Invalid question index");
    }

    validateQuestions([{ question: args.question, options: args.options, correctAnswer: args.correctAnswer, points: args.points }]);

    const updated = [...test.questions];
    updated[args.index] = {
      question: args.question,
      options: args.options,
      correctAnswer: args.correctAnswer,
      points: args.points,
    };
    await ctx.db.patch(args.testId, {
      questions: updated,
      totalPoints: updated.reduce((s, q) => s + q.points, 0),
    });
    return "Question updated";
  },
});

// Delete a single question by index
export const deleteTestQuestion = mutation({
  args: {
    testId: v.id("tests"),
    index: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") throw new Error("Unauthorized");

    const test = await ctx.db.get(args.testId);
    if (!test) throw new Error("Test not found");
    if (test.teacherId !== user._id) throw new Error("Forbidden");

    if (args.index < 0 || args.index >= test.questions.length) {
      throw new Error("Invalid question index");
    }

    const updated = test.questions.filter((_, i) => i !== args.index);
    validateQuestions(updated); // still must be <= 10 and structurally valid
    await ctx.db.patch(args.testId, {
      questions: updated,
      totalPoints: updated.reduce((s, q) => s + q.points, 0),
    });
    return "Question deleted";
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

    // Calculate score and correct answer count
    let score = 0;
    let correctCount = 0;
    test.questions.forEach((question, index) => {
      if (args.answers[index] === question.correctAnswer) {
        score += question.points;
        correctCount += 1;
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

    // Credits: +1 per correct answer; update rank and stats
    const newCredits = (user.credits || 0) + correctCount;
    const newRank = computeRank(newCredits);
    await ctx.db.patch(user._id, {
      credits: newCredits,
      rank: newRank,
      totalTestsCompleted: (user.totalTestsCompleted || 0) + 1,
    });

    return { score, totalPoints: test.totalPoints, creditsEarned: correctCount };
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