import { GlobalHeader } from "@/components/GlobalHeader";
import { PixelButton } from "@/components/PixelButton";
import { PixelCard } from "@/components/PixelCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAction, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { BookOpen, FileText, Trophy, Users, Plus, TrendingUp } from "lucide-react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useState } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const courses = useQuery(api.courses.getPublishedCourses);
  const tests = useQuery(api.tests.getPublishedTests);
  const leaderboard = useQuery(api.leaderboard.getLeaderboard);

  const generateUploadUrl = useAction(api.profile.generateUploadUrl);
  const setProfileImage = useMutation(api.profileMutations.setProfileImage);

  const handleProfileImageUpload = async (file: File) => {
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await setProfileImage({ fileId: storageId });
      toast.success("Profile picture updated!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update profile picture");
    }
  };

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

  // Add: student portal UI state and derived data
  // Today's Goals (quest-style)
  const goals = [
    { text: "Complete any 1 Test", done: (user.totalTestsCompleted || 0) >= 1 },
    { text: "Earn 10 XP", done: (user.credits || 0) >= 10 },
    { text: "Set Display Name", done: Boolean(user.name && user.name.trim().length > 0) },
    { text: "Upload Profile Picture", done: Boolean(user.image && user.image.length > 0) },
  ];

  // Subjects + dynamic progress derived from student activity
  const subjectList: Array<{
    key: string;
    label: string;
    icon: string;
    tagline: string;
    theme: {
      border: string; // full class string for border color
      bg: string; // full class string for soft tinted background
      glow: string; // css shadow glow
      badge: string; // small badge background/border
      playGlow: string; // play button glow
    };
  }> = [
    {
      key: "mathematics",
      label: "Mathematics",
      icon: "📐",
      tagline: "Number Ninja — slice equations, master numbers",
      theme: {
        border: "border-yellow-700",
        bg: "bg-yellow-900/20",
        glow: "shadow-[0_0_16px_rgba(255,255,0,0.35)]",
        badge: "bg-yellow-300 border-yellow-600 text-black",
        playGlow: "shadow-[0_0_10px_rgba(255,230,0,0.7)]",
      },
    },
    {
      key: "physics",
      label: "Physics",
      icon: "⚛️",
      tagline: "Gravity Dash — bend gravity, beat the level",
      theme: {
        border: "border-violet-700",
        bg: "bg-violet-900/20",
        glow: "shadow-[0_0_16px_rgba(150,120,255,0.35)]",
        badge: "bg-violet-300 border-violet-600 text-black",
        playGlow: "shadow-[0_0_10px_rgba(150,120,255,0.7)]",
      },
    },
    {
      key: "chemistry",
      label: "Chemistry",
      icon: "🧪",
      tagline: "Element Mixer — craft the right compounds",
      theme: {
        border: "border-green-700",
        bg: "bg-green-900/20",
        glow: "shadow-[0_0_16px_rgba(0,200,120,0.35)]",
        badge: "bg-green-300 border-green-600 text-black",
        playGlow: "shadow-[0_0_10px_rgba(0,200,120,0.7)]",
      },
    },
    {
      key: "biology",
      label: "Biology",
      icon: "🌱",
      tagline: "Cell Defender — hold the line against viruses",
      theme: {
        border: "border-emerald-700",
        bg: "bg-emerald-900/20",
        glow: "shadow-[0_0_16px_rgba(20,220,160,0.35)]",
        badge: "bg-emerald-300 border-emerald-600 text-black",
        playGlow: "shadow-[0_0_10px_rgba(20,220,160,0.7)]",
      },
    },
    {
      key: "computer_science",
      label: "Computer Science",
      icon: "💻",
      tagline: "Code Runner — debug, escape, and deploy",
      theme: {
        border: "border-cyan-700",
        bg: "bg-cyan-900/20",
        glow: "shadow-[0_0_16px_rgba(0,200,255,0.35)]",
        badge: "bg-cyan-300 border-cyan-600 text-black",
        playGlow: "shadow-[0_0_10px_rgba(0,200,255,0.7)]",
      },
    },
    {
      key: "robotics",
      label: "Robotics",
      icon: "🤖",
      tagline: "Bot Builder — assemble logic, complete missions",
      theme: {
        border: "border-rose-700",
        bg: "bg-rose-900/20",
        glow: "shadow-[0_0_16px_rgba(255,90,120,0.35)]",
        badge: "bg-rose-300 border-rose-600 text-black",
        playGlow: "shadow-[0_0_10px_rgba(255,90,120,0.7)]",
      },
    },
    {
      key: "astronomy",
      label: "Astronomy",
      icon: "🌌",
      tagline: "Star Voyager — answer to fuel your voyage",
      theme: {
        border: "border-indigo-700",
        bg: "bg-indigo-900/20",
        glow: "shadow-[0_0_16px_rgba(120,140,255,0.35)]",
        badge: "bg-indigo-300 border-indigo-600 text-black",
        playGlow: "shadow-[0_0_10px_rgba(120,140,255,0.7)]",
      },
    },
  ];

  // Derive pseudo-dynamic progress from available user stats
  const baseTests = (user.totalTestsCompleted || 0);
  const baseCredits = (user.credits || 0);
  // Force all subject progress to 0% and Level 1 (progress now tied to course completion, not games)
  const subjectsWithProgress = subjectList.map((s) => {
    return { ...s, pct: 0, level: 1 };
  });

  // Simple achievement rules using credits/tests
  const achievements = [
    { key: "math_wizard", label: "Math Wizard", icon: "🧙", earned: baseCredits >= 10 },
    { key: "coding_hero", label: "Coding Hero", icon: "💾", earned: baseCredits >= 20 },
    { key: "science_explorer", label: "Science Explorer", icon: "🌌", earned: baseTests >= 3 },
    { key: "problem_solver", label: "Problem Solver", icon: "🏆", earned: baseTests >= 5 },
    { key: "robot_master", label: "Robot Master", icon: "🤖", earned: baseCredits >= 30 },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <GlobalHeader />
      
      <main className="max-w-7xl mx-auto p-6">
        {/* Student Portal Header (retro, neon) */}
        {isStudent && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h1
                className="text-3xl md:text-4xl font-bold text-yellow-300"
                style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1.5px 0 #000, -1.5px 0 #000, 0 1.5px #000, 0 -1.5px #000" }}
              >
                👾 Welcome back, {user.name || "Explorer"}!
              </h1>
              <div
                className="flex items-center gap-3 bg-black/70 border-4 border-yellow-600 px-4 py-2 shadow-[0_0_12px_rgba(255,255,0,0.6)]"
                style={{ fontFamily: "'Pixelify Sans', monospace" }}
              >
                <span className="text-yellow-300 text-xl">🪙</span>
                <span className="text-yellow-300 font-bold">
                  XP: {user.credits || 0}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Teacher Class Panel */}
        {isTeacher && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className="bg-black/70 border-4 border-yellow-600 p-4 flex items-center justify-between shadow-[0_0_12px_rgba(255,255,0,0.5)]"
                 style={{ fontFamily: "'Pixelify Sans', monospace" }}>
              <div className="text-yellow-300 font-bold">
                Managing content for: <span className="px-2 py-1 bg-yellow-700/40 border-2 border-yellow-800 ml-1">Class {user.userClass?.split(" ")[1] || "-"}</span>
              </div>
              <div className="text-yellow-200 text-sm">
                Only students in your class will see your announcements, courses, and tests.
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Play (Student) */}
        {isStudent && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-black/70 border-4 border-yellow-600 p-6 shadow-[0_0_16px_rgba(255,255,0,0.5)]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div
                  className="text-yellow-300 font-bold"
                  style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
                >
                  Ready to continue your learning quest?
                </div>
                <PixelButton
                  size="lg"
                  className="text-xl px-8 py-4"
                  onClick={() => navigate("/tests")}
                >
                  🎮 Continue Your Quest
                </PixelButton>
              </div>
            </div>
          </motion.div>
        )}

        {/* Student Performance + Goals */}
        {isStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Performance Dashboard */}
            <div className="lg:col-span-2">
              <div className="bg-black/70 border-4 border-yellow-600 p-6 shadow-[0_0_16px_rgba(255,255,0,0.4)]">
                <h2
                  className="text-2xl font-bold text-yellow-300 mb-4"
                  style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
                >
                  Student Performance Dashboard
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjectsWithProgress.map((s) => (
                    <div
                      key={s.key}
                      className="bg-neutral-900/60 border-2 border-yellow-700 p-4"
                      style={{ fontFamily: "'Pixelify Sans', monospace" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-yellow-200 font-bold">
                          <span>{s.icon}</span>
                          <span>{s.label}</span>
                        </div>
                        <span className="text-yellow-300 font-bold">{s.pct}%</span>
                      </div>
                      <div className="w-full h-4 bg-neutral-800 border-2 border-yellow-800 relative">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 shadow-[0_0_10px_rgba(255,200,0,0.8)]"
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Today's Goals */}
            <div className="">
              <div className="bg-black/70 border-4 border-yellow-600 p-6 shadow-[0_0_16px_rgba(255,255,0,0.4)]">
                <h3
                  className="text-xl font-bold text-yellow-300 mb-4"
                  style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
                >
                  Today's Goals
                </h3>
                <div className="space-y-3" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                  {goals.map((g, idx) => (
                    <div
                      key={idx}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 border-2 ${
                        g.done
                          ? "bg-green-600/40 border-green-700"
                          : "bg-neutral-900/50 border-yellow-700"
                      }`}
                      style={{ pointerEvents: "none" }}
                    >
                      <span className="text-xl">{g.done ? "✔" : "✖"}</span>
                      <span className={`text-yellow-100 ${g.done ? "opacity-90" : ""}`}>
                        {g.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Achievements + Levels & Games */}
        {isStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Achievements */}
            <div className="bg-black/70 border-4 border-yellow-600 p-6 shadow-[0_0_16px_rgba(255,255,0,0.4)]">
              <h3
                className="text-2xl font-bold text-yellow-300 mb-4"
                style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
              >
                Achievements
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {achievements.map((a) => (
                  <div
                    key={a.key}
                    className={`p-4 border-2 ${
                      a.earned
                        ? "bg-neutral-900/60 border-yellow-700 shadow-[0_0_14px_rgba(255,220,0,0.6)]"
                        : "bg-neutral-800/60 border-neutral-700 grayscale opacity-80"
                    }`}
                    style={{ fontFamily: "'Pixelify Sans', monospace" }}
                  >
                    <div className="text-3xl mb-2">{a.icon}</div>
                    <div className="text-yellow-100 font-bold">{a.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Levels & Games — per-subject retro arcade tiles with unique looks */}
            <div className="bg-black/70 border-4 border-yellow-600 p-6 shadow-[0_0_16px_rgba(255,255,0,0.4)]">
              <h3
                className="text-2xl font-bold text-yellow-300 mb-4"
                style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
              >
                Course Levels & Games
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectsWithProgress.map((s) => (
                  <div
                    key={s.key}
                    className={`p-4 border-2 ${s.theme.border} ${s.theme.bg} ${s.theme.glow}`}
                    style={{ fontFamily: "'Pixelify Sans', monospace" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-bold text-yellow-100">
                        <span className="text-xl">{s.icon}</span>
                        <span>{s.label}</span>
                      </div>
                      <div className={`text-xs px-2 py-0.5 border ${s.theme.badge} font-bold`}>
                        Level {s.level}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-200 text-xs md:text-sm opacity-90">{s.tagline}</span>
                      <PixelButton
                        size="sm"
                        onClick={() => navigate(s.key === "mathematics" ? "/tests?game=math" : s.key === "physics" ? "/tests?game=physics" : "/tests")}
                        className={`px-3 py-1 ${s.theme.playGlow}`}
                      >
                        Play
                      </PixelButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer / Navigation (Student) */}
        {isStudent && (
          <div className="flex justify-center mb-4">
            <PixelButton size="md" onClick={() => navigate("/")}>
              🕹 Back to Arcade Lobby
            </PixelButton>
          </div>
        )}

        {/* Teacher View (unchanged) */}
        {isTeacher && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold text-black mb-2" style={{ fontFamily: "monospace" }}>
                Welcome back, {user.name}!
              </h1>
              <p className="text-lg text-gray-700" style={{ fontFamily: "monospace" }}>
                Manage your courses and track student progress
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}
                          </span>
                          <Avatar className="h-8 w-8 border border-orange-600 rounded-none">
                            <AvatarImage src={(student as any).image || undefined} alt={student.name} />
                            <AvatarFallback className="rounded-none bg-orange-300 text-black">
                              {student.name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-black" style={{ fontFamily: "monospace" }}>
                            {student.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-black" style={{ fontFamily: "monospace" }}>
                            {student.credits} 💰
                          </span>
                          <span className="text-xs bg-orange-300 border border-orange-500 px-2 py-0.5 text-black">
                            {(student as any).badge || "Banana Sprout"}
                          </span>
                        </div>
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
          </>
        )}
      </main>
    </div>
  );
}