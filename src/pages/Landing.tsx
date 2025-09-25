import { PixelButton } from "@/components/PixelButton";
import { PixelCard } from "@/components/PixelCard";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { BookOpen, Trophy, Users, Zap, Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect } from "react";

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users away from homepage based on role
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!user) return;
    if (user.role) {
      navigate("/dashboard");
    } else {
      navigate("/role-selection");
    }
  }, [isAuthenticated, user, navigate]);

  const features = [
    {
      icon: BookOpen,
      title: "Interactive Courses",
      description: "Learn with engaging, pixel-perfect course content designed for maximum retention",
    },
    {
      icon: Trophy,
      title: "Gamified Learning",
      description: "Earn credits, climb ranks, and compete with friends on the leaderboard",
    },
    {
      icon: Users,
      title: "Teacher Tools",
      description: "Create courses, design tests, and track student progress with ease",
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description: "Get immediate results and personalized recommendations for improvement",
    },
  ];

  // Add: student snapshot data (subjects, progress, achievements)
  const subjects: Array<{ key: string; label: string; icon: string }> = [
    { key: "mathematics", label: "Mathematics", icon: "📐" },
    { key: "physics", label: "Physics", icon: "⚛️" },
    { key: "chemistry", label: "Chemistry", icon: "🧪" },
    { key: "biology", label: "Biology", icon: "🌱" },
    { key: "computer_science", label: "Computer Science", icon: "💻" },
    { key: "robotics", label: "Robotics", icon: "🤖" },
    { key: "astronomy", label: "Astronomy", icon: "🌌" },
  ];

  // Target progress derived from user stats (animated from 0%)
  const baseTests = user?.totalTestsCompleted || 0;
  const baseCredits = user?.credits || 0;
  const targetProgress = subjects.map((s, i) => {
    const pct = Math.min(100, baseTests * 12 + i * 6 + Math.floor(baseCredits / 3));
    return { ...s, pct };
  });

  // Achievements rules (glow if earned, grayscale if locked)
  const achievements = [
    { key: "math_wizard", label: "Math Wizard", icon: "🧙", earned: baseCredits >= 10 },
    { key: "coding_hero", label: "Coding Hero", icon: "💾", earned: baseCredits >= 20 },
    { key: "science_explorer", label: "Science Explorer", icon: "🌌", earned: baseTests >= 3 },
    { key: "problem_solver", label: "Problem Solver", icon: "🏆", earned: baseTests >= 5 },
    { key: "robot_master", label: "Robot Master", icon: "🤖", earned: baseCredits >= 30 },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="bg-yellow-400 border-b-4 border-yellow-600 px-4 py-3 shadow-[0_4px_0px_0px_rgba(0,0,0,0.2)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="flex items-center gap-3"
          >
            <div className="text-4xl">📘</div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}>
              Edufun
            </h1>
          </motion.div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <PixelButton
                onClick={() => navigate(user?.role ? "/dashboard" : "/role-selection")}
              >
                {user?.role ? "Dashboard" : "Complete Setup"}
              </PixelButton>
            ) : (
              <>
                <PixelButton onClick={() => navigate("/auth")} variant="secondary">
                  Login
                </PixelButton>
                <PixelButton onClick={() => navigate("/auth")}>
                  Get Started
                </PixelButton>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-9xl mb-6"
            >
              📘
            </motion.div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-yellow-300 mb-6" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1.5px 0 #000, -1.5px 0 #000, 0 1.5px #000, 0 -1.5px #000" }}>
              Edufun
            </h1>
            
            <p className="text-2xl md:text-3xl text-black mb-8 max-w-4xl mx-auto" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}>
              Gaming-inspired learning platform. Level up your knowledge with interactive experiences.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <PixelButton
                onClick={() => navigate("/auth")}
                size="lg"
                className="text-xl px-8 py-4"
              >
                Start Learning <ArrowRight className="ml-2" size={20} />
              </PixelButton>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 text-yellow-300 font-bold"
                style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
              >
                <Star className="text-yellow-600" size={20} />
                <span>Join 1000+ Happy Learners!</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Add: Student Snapshot (only for logged-in students) */}
      {isAuthenticated && user?.role === "student" && (
        <section className="py-10 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2
                  className="text-3xl md:text-4xl font-bold text-yellow-300"
                  style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1.5px 0 #000, -1.5px 0 #000, 0 1.5px #000, 0 -1.5px #000" }}
                >
                  👾 Welcome back, {user.name || "Explorer"}!
                </h2>
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

            {/* Progress + Achievements + Mini-Games */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Progress Bars */}
              <div className="lg:col-span-2 bg-black/70 border-4 border-yellow-600 p-6 shadow-[0_0_16px_rgba(255,255,0,0.4)]">
                <h3
                  className="text-2xl font-bold text-yellow-300 mb-4"
                  style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
                >
                  Student Performance Dashboard
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {targetProgress.map((s) => {
                    const color =
                      s.pct < 34 ? "from-yellow-400 to-yellow-500" :
                      s.pct < 67 ? "from-orange-400 to-orange-500" :
                                   "from-red-500 to-red-600";
                    return (
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
                        <div className="w-full h-4 bg-neutral-800 border-2 border-yellow-800 relative overflow-hidden">
                          <motion.div
                            className={`h-full bg-gradient-to-r ${color} shadow-[0_0_10px_rgba(255,200,0,0.8)]`}
                            initial={{ width: "0%" }}
                            animate={{ width: `${s.pct}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Achievements */}
              <div className="bg-black/70 border-4 border-yellow-600 p-6 shadow-[0_0_16px_rgba(255,255,0,0.4)]">
                <h3
                  className="text-xl font-bold text-yellow-300 mb-4"
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
            </div>

            {/* Mini-Games showcase (routes to existing content) */}
            <div className="mt-6 bg-black/70 border-4 border-yellow-600 p-6 shadow-[0_0_16px_rgba(255,255,0,0.4)]">
              <h3
                className="text-2xl font-bold text-yellow-300 mb-4"
                style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
              >
                Course Levels & Retro Mini-Games
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Math Snake", icon: "📐", desc: "Eat correct answers to grow your snake." },
                  { label: "Physics Logic Builder", icon: "⚛️", desc: "AND/OR/NOT puzzles in retro circuits." },
                  { label: "Chemistry Mixer", icon: "🧪", desc: "Combine elements to form compounds." },
                  { label: "Biology Pixel Quest", icon: "🌱", desc: "Match cells/organs to functions." },
                  { label: "Coding Debugger", icon: "💻", desc: "Fix pixel code to level up." },
                  { label: "Robotics Builder", icon: "🤖", desc: "Assemble robots to solve tasks." },
                ].map((g) => (
                  <div key={g.label} className="p-4 border-2 border-yellow-700 bg-neutral-900/60" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-yellow-200 font-bold">
                        <span>{g.icon}</span>
                        <span>{g.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-100 text-sm">{g.desc}</span>
                      <PixelButton size="sm" onClick={() => navigate("/tests")} className="px-3 py-1">
                        PLAY
                      </PixelButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-4" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}>
              Why Choose Edufun? 🤔
            </h2>
            <p className="text-xl text-white" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}>
              We make STEM feel like an arcade—learn by playing.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                >
                  <PixelCard variant="orange" className="h-full">
                    <div className="p-6 text-center">
                      <div className="bg-yellow-300 border-2 border-yellow-500 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Icon size={32} className="text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}>
                        {feature.title}
                      </h3>
                      <p className="text-white" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}>
                        {feature.description}
                      </p>
                    </div>
                  </PixelCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <PixelCard variant="orange" className="text-center">
            <div className="p-12">
              <h2 className="text-4xl font-bold text-yellow-300 mb-4" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}>
                Ready to Level Up Your Learning?
              </h2>
              
              <p className="text-xl text-white mb-8" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}>
                Join students and teachers in our retro arcade learning universe!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <PixelButton
                  onClick={() => navigate("/auth")}
                  size="lg"
                  className="text-xl px-8 py-4"
                >
                  I'm a Student 🎒
                </PixelButton>
                
                <PixelButton
                  onClick={() => navigate("/auth")}
                  variant="secondary"
                  size="lg"
                  className="text-xl px-8 py-4"
                >
                  I'm a Teacher 👩‍🏫
                </PixelButton>
              </div>
            </div>
          </PixelCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-yellow-400 border-t-4 border-yellow-600 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-3xl">📘</div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}>
              Edufun
            </h3>
          </div>
          <p className="text-white" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}>
            Making education fun with a retro twist! ✨
          </p>
        </div>
      </footer>
    </div>
  );
}