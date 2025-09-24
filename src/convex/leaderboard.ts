import { query } from "./_generated/server";

// Get student leaderboard
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const students = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();

    const sortedStudents = students
      .filter((student) => student.credits !== undefined)
      .sort((a, b) => (b.credits || 0) - (a.credits || 0))
      .slice(0, 10);

    return sortedStudents.map((student, index) => ({
      // include user id so teachers can manage accounts
      userId: student._id,
      rank: index + 1,
      name: student.name || "Anonymous",
      credits: student.credits || 0,
      testsCompleted: student.totalTestsCompleted || 0,
      image: student.image || null,
      badge: student.rank || "Banana Sprout",
    }));
  },
});