import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get all published courses
export const getPublishedCourses = query({
  args: {},
  handler: async (ctx) => {
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect();

    // Get teacher info for each course
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

    const courseId = await ctx.db.insert("courses", {
      title: args.title,
      description: args.description,
      teacherId: user._id,
      isPublished: false,
      enrolledStudents: [],
      totalLessons: 0,
    });

    // Update teacher's course count
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

    const course = await ctx.db.get(args.courseId);
    if (!course || !course.isPublished) {
      throw new Error("Course not found or not published");
    }

    // Check if already enrolled
    const existingEnrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_course_and_student", (q) => 
        q.eq("courseId", args.courseId).eq("studentId", user._id)
      )
      .unique();

    if (existingEnrollment) {
      throw new Error("Already enrolled in this course");
    }

    // Create enrollment
    await ctx.db.insert("enrollments", {
      courseId: args.courseId,
      studentId: user._id,
      enrolledAt: Date.now(),
      progress: 0,
    });

    // Update course enrolled students
    await ctx.db.patch(args.courseId, {
      enrolledStudents: [...course.enrolledStudents, user._id],
    });

    // Update teacher's student count
    const teacher = await ctx.db.get(course.teacherId);
    if (teacher) {
      await ctx.db.patch(course.teacherId, {
        totalStudentsEnrolled: (teacher.totalStudentsEnrolled || 0) + 1,
      });
    }

    return "Enrolled successfully";
  },
});