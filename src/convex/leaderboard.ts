import { query } from "./_generated/server";

// Get student leaderboard
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const students = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "student"))
      .collect();

    // Sort by credits descending
    const sortedStudents = students
      .filter(student => student.credits !== undefined)
      .sort((a, b) => (b.credits || 0) - (a.credits || 0))
      .slice(0, 10); // Top 10

    return sortedStudents.map((student, index) => ({
      rank: index + 1,
      name: student.name || "Anonymous",
      credits: student.credits || 0,
      testsCompleted: student.totalTestsCompleted || 0,
    }));
  },
});
