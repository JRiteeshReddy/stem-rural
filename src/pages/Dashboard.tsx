import { GlobalHeader } from "@/components/GlobalHeader";
import { PixelButton } from "@/components/PixelButton";
import { PixelCard } from "@/components/PixelCard";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { BookOpen, FileText, Trophy, Users, Plus, TrendingUp } from "lucide-react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const courses = useQuery(api.courses.getPublishedCourses);
  const tests = useQuery(api.tests.getPublishedTests);
  const leaderboard = useQuery(api.leaderboard.getLeaderboard);

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!user.role) {
    navigate("/role-selection");
    return null;
  }

  const isTeacher = user.role === "teacher";
  const isStudent = user.role === "student";

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-orange-200 to-yellow-300">
      <GlobalHeader />
      
      <main className="max-w-7xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-black mb-2" style={{ fontFamily: "monospace" }}>
            Welcome back, {user.name}! 🍌
          </h1>
          <p className="text-lg text-gray-700" style={{ fontFamily: "monospace" }}>
            {isTeacher ? "Manage your courses and track student progress" : "Continue your learning journey"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          {isStudent && (
            <>
              <PixelCard variant="banana">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-2">💰</div>
                  <h3 className="text-2xl font-bold text-black" style={{ fontFamily: "monospace" }}>
                    {user.credits || 0}
                  </h3>
                  <p className="text-gray-700" style={{ fontFamily: "monospace" }}>Credits Earned</p>
                </div>
              </PixelCard>

              <PixelCard variant="orange">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-2">🏆</div>
                  <h3 className="text-xl font-bold text-black" style={{ fontFamily: "monospace" }}>
                    {user.rank || "Banana Sprout"}
                  </h3>
                  <p className="text-gray-700" style={{ fontFamily: "monospace" }}>Current Rank</p>
                </div>
              </PixelCard>

              <PixelCard variant="default">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-2">📝</div>
                  <h3 className="text-2xl font-bold text-black" style={{ fontFamily: "monospace" }}>
                    {user.totalTestsCompleted || 0}
                  </h3>
                  <p className="text-gray-700" style={{ fontFamily: "monospace" }}>Tests Completed</p>
                </div>
              </PixelCard>
            </>
          )}

          {isTeacher && (
            <>
              <PixelCard variant="banana">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-2">📚</div>
                  <h3 className="text-2xl font-bold text-black" style={{ fontFamily: "monospace" }}>
                    {user.totalCoursesCreated || 0}
                  </h3>
                  <p className="text-gray-700" style={{ fontFamily: "monospace" }}>Courses Created</p>
                </div>
              </PixelCard>

              <PixelCard variant="orange">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <h3 className="text-2xl font-bold text-black" style={{ fontFamily: "monospace" }}>
                    {user.totalStudentsEnrolled || 0}
                  </h3>
                  <p className="text-gray-700" style={{ fontFamily: "monospace" }}>Students Enrolled</p>
                </div>
              </PixelCard>

              <PixelCard variant="default">
                <div className="p-6 text-center">
                  <Plus size={48} className="mx-auto mb-2 text-black" />
                  <PixelButton onClick={() => navigate("/courses")} size="sm">
                    Create Course
                  </PixelButton>
                </div>
              </PixelCard>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Courses */}
          <PixelCard variant="banana">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black flex items-center gap-2" style={{ fontFamily: "monospace" }}>
                  <BookOpen size={24} />
                  Recent Courses
                </h2>
                <PixelButton onClick={() => navigate("/courses")} size="sm">
                  View All
                </PixelButton>
              </div>
              <div className="space-y-3">
                {courses?.slice(0, 3).map((course) => (
                  <motion.div
                    key={course._id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-yellow-300 border-2 border-yellow-500 p-3 cursor-pointer"
                    onClick={() => navigate(`/courses/${course._id}`)}
                  >
                    <h3 className="font-bold text-black" style={{ fontFamily: "monospace" }}>
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-700" style={{ fontFamily: "monospace" }}>
                      by {course.teacherName}
                    </p>
                  </motion.div>
                )) || (
                  <p className="text-gray-700" style={{ fontFamily: "monospace" }}>
                    No courses available yet
                  </p>
                )}
              </div>
            </div>
          </PixelCard>

          {/* Leaderboard Preview */}
          <PixelCard variant="orange">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black flex items-center gap-2" style={{ fontFamily: "monospace" }}>
                  <Trophy size={24} />
                  Top Students
                </h2>
                <PixelButton onClick={() => navigate("/leaderboard")} size="sm">
                  View All
                </PixelButton>
              </div>
              <div className="space-y-2">
                {leaderboard?.slice(0, 5).map((student, index) => (
                  <div key={index} className="flex items-center justify-between bg-orange-200 border-2 border-orange-400 p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}</span>
                      <span className="font-bold text-black" style={{ fontFamily: "monospace" }}>
                        {student.name}
                      </span>
                    </div>
                    <span className="font-bold text-black" style={{ fontFamily: "monospace" }}>
                      {student.credits} 💰
                    </span>
                  </div>
                )) || (
                  <p className="text-gray-700" style={{ fontFamily: "monospace" }}>
                    No students on leaderboard yet
                  </p>
                )}
              </div>
            </div>
          </PixelCard>
        </div>
      </main>
    </div>
  );
}
