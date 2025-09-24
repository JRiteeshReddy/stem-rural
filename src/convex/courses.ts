import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get all published courses
export const getPublishedCourses = query({
  args: {},
  handler: async (ctx) => {
    // Scope by current user's class
    const user = await getCurrentUser(ctx);
    if (!user || !user.userClass) {
      // If not signed in or no class selected, show nothing to avoid cross-class leakage
      return [];
    }

    const courses = await ctx.db
      .query("courses")
      .withIndex("by_class_and_published", (q) =>
        q.eq("targetClass", user.userClass!).eq("isPublished", true)
      )
      .collect();

    const coursesWithTeacher = await Promise.all(
      courses.map(async (course) => {
        const teacher = await ctx.db.get(course.teacherId);
        return {
          ...course,
          teacherName: teacher?.name || "Unknown Teacher",
        };
      })
    );

    return coursesWithTeacher;
  },
});

// Get courses by teacher
export const getCoursesByTeacher = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    // Return an empty list for non-teachers to avoid Unauthorized errors on pages that always subscribe.
    if (!user || user.role !== "teacher") {
      return [];
    }

    return await ctx.db
      .query("courses")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .collect();
  },
});

// Create a new course
export const createCourse = mutation({
  args: {
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "teacher") {
      throw new Error("Unauthorized");
    }
    if (!user.userClass) {
      throw new Error("Teacher must have a registered class before creating courses");
    }

    const courseId = await ctx.db.insert("courses", {
      title: args.title,
      description: args.description,
      teacherId: user._id,
      isPublished: false,
      enrolledStudents: [],
      totalLessons: 0,
      // Tag with teacher's class
      targetClass: user.userClass,
    });

    await ctx.db.patch(user._id, {
      totalCoursesCreated: (user.totalCoursesCreated || 0) + 1,
    });

    return courseId;
  },
});

// Enroll student in course
export const enrollInCourse = mutation({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") {
      throw new Error("Unauthorized");
    }
    if (!user.userClass) {
      throw new Error("Student must have a registered class to enroll");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course || !course.isPublished) {
      throw new Error("Course not found or not published");
    }

    // Enforce same-class enrollment
    if (course.targetClass !== user.userClass) {
      throw new Error("You can only enroll in courses for your class");
    }

    const existingEnrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_course_and_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentId", user._id)
      )
      .unique();

    if (existingEnrollment) {
      throw new Error("Already enrolled in this course");
    }

    await ctx.db.insert("enrollments", {
      courseId: args.courseId,
      studentId: user._id,
      enrolledAt: Date.now(),
      progress: 0,
    });

    await ctx.db.patch(args.courseId, {
      enrolledStudents: [...course.enrolledStudents, user._id],
    });

    const teacher = await ctx.db.get(course.teacherId);
    if (teacher) {
      await ctx.db.patch(course.teacherId, {
        totalStudentsEnrolled: (teacher.totalStudentsEnrolled || 0) + 1,
      });
    }

    return "Enrolled successfully";
  },
});

// Ensure default STEM courses exist for the current user's class.
// Inserts missing defaults tagged to the user's class and published.
export const ensureDefaultCoursesForUserClass = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.userClass) {
      throw new Error("Unauthorized or no class selected");
    }

    // Default subjects
    const defaults: Array<{ title: string; description: string }> = [
      { title: "Mathematics", description: "Core math adventures and challenges." },
      { title: "Physics", description: "Explore motion, forces, and energy." },
      { title: "Chemistry", description: "Elements, compounds, and reactions." },
      { title: "Biology", description: "Life sciences and ecosystems." },
      { title: "Computer Science", description: "Algorithms, logic, and code." },
      { title: "Robotics", description: "Sensors, control, and automation." },
      { title: "Astronomy", description: "Stars, planets, and the universe." },
    ];

    // For each default subject, ensure a course exists for this class
    for (const d of defaults) {
      const existing = await ctx.db
        .query("courses")
        .withIndex("by_class_and_published", (q) =>
          q.eq("targetClass", user.userClass!).eq("isPublished", true)
        )
        .collect();

      const hasCourse = existing.some(
        (c) => c.title === d.title && (c.subjectType === "default" || c.subjectType === undefined)
      );

      if (!hasCourse) {
        await ctx.db.insert("courses", {
          title: d.title,
          description: d.description,
          teacherId: user._id, // Owner for defaults (first caller). Simple and effective.
          isPublished: true,
          enrolledStudents: [],
          totalLessons: 0,
          targetClass: user.userClass!,
          subjectType: "default",
          updatedAt: Date.now(),
        });
      }
    }

    return "ok";
  },
});

// Student: all published courses for their class with progress and NEW tag.
export const getAllCoursesForStudent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student" || !user.userClass) {
      return [];
    }

    const courses = await ctx.db
      .query("courses")
      .withIndex("by_class_and_published", (q) =>
        q.eq("targetClass", user.userClass!).eq("isPublished", true)
      )
      .collect();

    // Map progress from enrollment
    const result = await Promise.all(
      courses.map(async (course) => {
        const enrollment = await ctx.db
          .query("enrollments")
          .withIndex("by_course_and_student", (q) =>
            q.eq("courseId", course._id).eq("studentId", user._id)
          )
          .unique();

        const teacher = await ctx.db.get(course.teacherId);

        return {
          ...course,
          teacherName: teacher?.name || "Unknown Teacher",
          progress: enrollment?.progress ?? 0,
          lastAccessed: enrollment?.lastAccessed ?? null,
          isNew: !enrollment?.lastAccessed, // retro NEW tag
          isEnrolled: Boolean(enrollment),
        };
      })
    );

    return result;
  },
});

// Mark a course as accessed for the current student, creating enrollment if needed.
export const markCourseAccessed = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") throw new Error("Unauthorized");

    const course = await ctx.db.get(courseId);
    if (!course || !course.isPublished) throw new Error("Course not found");

    // Enforce same-class
    if (course.targetClass !== user.userClass) throw new Error("Wrong class");

    let enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_course_and_student", (q) =>
        q.eq("courseId", courseId).eq("studentId", user._id)
      )
      .unique();

    const now = Date.now();

    if (!enrollment) {
      await ctx.db.insert("enrollments", {
        courseId,
        studentId: user._id,
        enrolledAt: now,
        progress: 0,
        lastAccessed: now,
      });
      await ctx.db.patch(courseId, {
        enrolledStudents: [...course.enrolledStudents, user._id],
      });
    } else {
      await ctx.db.patch(enrollment._id, { lastAccessed: now });
    }

    return { ok: true };
  },
});