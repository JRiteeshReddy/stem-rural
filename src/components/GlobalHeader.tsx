import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BookOpen, Home, Trophy, Users, FileText, Bell, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { PixelButton } from "./PixelButton";

export function GlobalHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Home", path: "/dashboard", icon: Home },
    { label: "Courses", path: "/courses", icon: BookOpen },
    { label: "Tests", path: "/tests", icon: FileText },
    { label: "Announcements", path: "/announcements", icon: Bell },
    { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
    { label: "Profile", path: "/profile", icon: User },
  ];

  if (!user) return null;

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-yellow-400 border-b-4 border-yellow-600 px-4 py-3 shadow-[0_4px_0px_0px_rgba(0,0,0,0.2)]"
      style={{ imageRendering: "pixelated" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <div className="text-4xl">🍌</div>
          <h1 className="text-2xl font-bold text-black" style={{ fontFamily: "monospace" }}>
            SmartBanana
          </h1>
        </motion.div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 border-2 font-bold transition-all",
                  "rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]",
                  isActive
                    ? "bg-orange-400 border-orange-600 text-black"
                    : "bg-yellow-300 border-yellow-500 text-black hover:bg-yellow-200"
                )}
                style={{ fontFamily: "monospace" }}
              >
                <Icon size={16} />
                <span className="hidden lg:inline">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* User Stats & Actions */}
        <div className="flex items-center gap-4">
          {user.role === "student" && (
            <div className="flex items-center gap-4 text-black font-bold" style={{ fontFamily: "monospace" }}>
              <div className="flex items-center gap-1">
                <span>💰</span>
                <span>Credits: {user.credits || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🏆</span>
                <span>Rank: {user.rank || "Banana Sprout"}</span>
              </div>
            </div>
          )}

          {user.role === "teacher" && (
            <div className="flex items-center gap-4 text-black font-bold" style={{ fontFamily: "monospace" }}>
              <div className="flex items-center gap-1">
                <span>📚</span>
                <span>Courses: {user.totalCoursesCreated || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>👥</span>
                <span>Students: {user.totalStudentsEnrolled || 0}</span>
              </div>
            </div>
          )}

          <PixelButton onClick={signOut} variant="danger" size="sm">
            Logout
          </PixelButton>
        </div>
      </div>
    </motion.header>
  );
}
