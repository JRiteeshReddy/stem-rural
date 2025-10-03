import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// SmartBanana user roles
export const ROLES = {
  TEACHER: "teacher",
  STUDENT: "student",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.TEACHER),
  v.literal(ROLES.STUDENT),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      
      // Student-specific fields
      credits: v.optional(v.number()), // student credits earned
      rank: v.optional(v.string()), // student rank/level
      totalTestsCompleted: v.optional(v.number()),
      
      // Teacher-specific fields
      totalCoursesCreated: v.optional(v.number()),
      totalStudentsEnrolled: v.optional(v.number()),

      // Extended registration profile (new)
      registrationId: v.optional(v.string()),
      dateOfBirth: v.optional(v.number()), // store as epoch ms
      gender: v.optional(v.union(v.literal("Male"), v.literal("Female"), v.literal("Others"))),
      userClass: v.optional(
        v.union(
          v.literal("Class 6"),
          v.literal("Class 7"),
          v.literal("Class 8"),
          v.literal("Class 9"),
          v.literal("Class 10"),
          v.literal("Class 11"),
          v.literal("Class 12"),
        )
      ),

      // Additional profile fields
      schoolName: v.optional(v.string()),
      bloodGroup: v.optional(v.string()),
      parentsName: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      address: v.optional(v.string()),

      // Password authentication fields
      passwordHash: v.optional(v.string()),
      passwordAlgo: v.optional(v.literal("scrypt")),
      lastLoginAt: v.optional(v.number()),
    }).index("email", ["email"])
      .index("by_role", ["role"]),

    // Sessions table for password auth
    sessions: defineTable({
      userId: v.id("users"),
      tokenHash: v.string(),
      userAgent: v.optional(v.string()),
      ip: v.optional(v.string()),
      createdAt: v.number(),
      expiresAt: v.number(),
    }).index("by_userId", ["userId"])
      .index("by_tokenHash", ["tokenHash"]),

    // Password reset tokens table
    passwordResetTokens: defineTable({
      userId: v.id("users"),
      tokenHash: v.string(),
      requestedAt: v.number(),
      expiresAt: v.number(),
      used: v.boolean(),
    }).index("by_userId", ["userId"])
      .index("by_tokenHash", ["tokenHash"]),

    // Courses table
    courses: defineTable({
      title: v.string(),
      description: v.string(),
      teacherId: v.id("users"),
      isPublished: v.boolean(),
      enrolledStudents: v.array(v.id("users")),
      totalLessons: v.number(),
      // Add: class tagging for scoping
      targetClass: v.union(
        v.literal("Class 6"),
        v.literal("Class 7"),
        v.literal("Class 8"),
        v.literal("Class 9"),
        v.literal("Class 10"),
        v.literal("Class 11"),
        v.literal("Class 12"),
      ),
      // Add: subject type and updatedAt
      subjectType: v.optional(v.union(v.literal("default"), v.literal("custom"))),
      updatedAt: v.optional(v.number()),
    }).index("by_teacher", ["teacherId"])
      .index("by_published", ["isPublished"])
      // Add: index to query by class & published together
      .index("by_class_and_published", ["targetClass", "isPublished"]),

    // Chapters table (NEW)
    chapters: defineTable({
      courseId: v.id("courses"),
      title: v.string(),
      content: v.string(),
      imageUrl: v.optional(v.string()),
      order: v.number(), // display order within a course
    }).index("by_course", ["courseId"])
      .index("by_course_and_order", ["courseId", "order"]),

    // Tests table
    tests: defineTable({
      title: v.string(),
      description: v.string(),
      courseId: v.optional(v.id("courses")),
      teacherId: v.id("users"),
      questions: v.array(v.object({
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        points: v.number(),
      })),
      totalPoints: v.number(),
      isPublished: v.boolean(),
      // Add: class tagging for scoping
      targetClass: v.union(
        v.literal("Class 6"),
        v.literal("Class 7"),
        v.literal("Class 8"),
        v.literal("Class 9"),
        v.literal("Class 10"),
        v.literal("Class 11"),
        v.literal("Class 12"),
      ),
      // Add: difficulty and updatedAt
      difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
      updatedAt: v.optional(v.number()),
    }).index("by_teacher", ["teacherId"])
      .index("by_course", ["courseId"])
      .index("by_published", ["isPublished"])
      // Add: index to query by class & published together
      .index("by_class_and_published", ["targetClass", "isPublished"]),

    // Test Results table
    testResults: defineTable({
      testId: v.id("tests"),
      studentId: v.id("users"),
      score: v.number(),
      totalPoints: v.number(),
      answers: v.array(v.number()),
      completedAt: v.number(),
    }).index("by_test", ["testId"])
      .index("by_student", ["studentId"])
      .index("by_test_and_student", ["testId", "studentId"]),

    // Announcements table
    announcements: defineTable({
      title: v.string(),
      content: v.string(),
      authorId: v.id("users"),
      isGlobal: v.boolean(), // true for admin announcements, false for course-specific
      courseId: v.optional(v.id("courses")),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      // Add: class tagging for scoping
      targetClass: v.union(
        v.literal("Class 6"),
        v.literal("Class 7"),
        v.literal("Class 8"),
        v.literal("Class 9"),
        v.literal("Class 10"),
        v.literal("Class 11"),
        v.literal("Class 12"),
      ),
      // Add: scheduled announcements
      scheduleAt: v.optional(v.number()),
    }).index("by_author", ["authorId"])
      .index("by_course", ["courseId"])
      .index("by_global", ["isGlobal"])
      // Add: index to query by class
      .index("by_targetClass", ["targetClass"])
      .index("by_scheduleAt", ["scheduleAt"]),

    // Course Enrollments table
    enrollments: defineTable({
      courseId: v.id("courses"),
      studentId: v.id("users"),
      enrolledAt: v.number(),
      progress: v.number(), // percentage completed
      // Add: lastAccessed timestamp
      lastAccessed: v.optional(v.number()),
    }).index("by_course", ["courseId"])
      .index("by_student", ["studentId"])
      .index("by_course_and_student", ["courseId", "studentId"]),

    // Track student completions of chapters
    chapterCompletions: defineTable({
      chapterId: v.id("chapters"),
      courseId: v.id("courses"),
      studentId: v.id("users"),
      completedAt: v.number(),
    })
      .index("by_student", ["studentId"])
      .index("by_chapter", ["chapterId"])
      .index("by_student_and_chapter", ["studentId", "chapterId"]),

    // Game results tracking for analytics
    gameResults: defineTable({
      userId: v.id("users"),
      subject: v.string(), // "math", "chemistry", "biology", "history", "physics", "english", "geography"
      difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
      correctCount: v.number(),
      totalQuestions: v.number(),
      xpAwarded: v.number(),
      durationMs: v.number(),
      completedAt: v.number(),
      userClass: v.optional(v.string()),
    })
      .index("by_user", ["userId"])
      .index("by_subject", ["subject"])
      .index("by_user_and_subject", ["userId", "subject"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;