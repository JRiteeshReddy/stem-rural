import React from "react";
import { useNavigate } from "react-router";
import { PixelCard } from "@/components/PixelCard";
import { PixelButton } from "@/components/PixelButton";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  ClipboardList,
  BarChart3,
  Medal,
  Megaphone,
  Users,
} from "lucide-react";

type Props = {
  teacherName?: string | null;
  teacherClass?: string | number | null;
  totalCoursesCreated?: number | null;
  totalStudentsEnrolled?: number | null;
  xp?: number | null; // optional XP if tracked; we’ll fall back to derived values
};

export default function TeacherHub({
  teacherName,
  teacherClass,
  totalCoursesCreated,
  totalStudentsEnrolled,
  xp,
}: Props) {
  const navigate = useNavigate();

  // Fallbacks to keep UI robust
  const courses = Math.max(0, Number(totalCoursesCreated ?? 0));
  const students = Math.max(0, Number(totalStudentsEnrolled ?? 0));
  const derivedXp = Math.min(1000, courses * 25 + students * 5);
  const currentXp = Math.max(0, Number(xp ?? derivedXp));

  // Simple level curve for teachers (gamified): each level requires +200 XP
  const level = Math.floor(currentXp / 200) + 1;
  const levelBase = (level - 1) * 200;
  const levelTop = level * 200;
  const pct = Math.min(100, Math.round(((currentXp - levelBase) / (levelTop - levelBase || 1)) * 100));

  const cardBase =
    "bg-black/70 border-yellow-600 text-white shadow-[0_0_0_3px_#000,0_6px_0_#2a2a2a] rounded-none";

  const ActionCard = ({
    title,
    desc,
    icon,
    buttonLabel = "Open",
    onClick,
    accent = "text-yellow-400",
  }: {
    title: string;
    desc: string;
    icon: React.ReactNode;
    buttonLabel?: string;
    onClick: () => void;
    accent?: string;
  }) => (
    <PixelCard className={`${cardBase} p-4 flex flex-col justify-between`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 ${accent}`}>{icon}</div>
        <div>
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          <p className="text-sm opacity-90">{desc}</p>
        </div>
      </div>
      <div className="mt-4">
        <PixelButton
          onClick={onClick}
          className="bg-yellow-400 text-black border-2 border-black hover:brightness-110"
        >
          {buttonLabel}
        </PixelButton>
      </div>
    </PixelCard>
  );

  const Badge = ({
    label,
    earned,
  }: {
    label: string;
    earned: boolean;
  }) => (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-2 border-yellow-600 ${earned ? "bg-yellow-400 text-black" : "bg-black/60 text-white opacity-80"} shadow-[0_0_0_2px_#000]`}
    >
      <Medal className={`w-4 h-4 ${earned ? "text-black" : "text-yellow-300"}`} />
      <span className="text-sm font-bold">{label}</span>
    </div>
  );

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left Panel */}
      <div className="xl:col-span-1 space-y-6">
        <PixelCard className={`${cardBase} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">
              👩‍🏫 Teacher Tools & Achievements
            </h2>
            <span className="text-yellow-300 text-sm">
              Class: {teacherClass ?? "—"}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-90">
                Teacher Level
              </span>
              <span className="text-yellow-300 font-extrabold">
                Lv. {level}
              </span>
            </div>
            <Progress value={pct} className="h-3 rounded-none bg-black/50" />
            <div className="flex items-center justify-between text-xs opacity-80">
              <span>{currentXp - levelBase} / {levelTop - levelBase} XP</span>
              <span>Total XP: {currentXp}</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Badge label="Master Educator" earned={courses >= 5} />
            <Badge label="Class Mentor" earned={students >= 20} />
            <Badge label="Top Performer" earned={courses >= 10} />
            <Badge label="Knowledge Builder" earned={students >= 40} />
          </div>
          <div className="mt-5 text-sm opacity-90">
            <div>Welcome, {teacherName ?? "Teacher"}!</div>
            <div className="mt-1">
              Courses: <span className="text-yellow-300 font-bold">{courses}</span> • Students:{" "}
              <span className="text-yellow-300 font-bold">{students}</span>
            </div>
          </div>
        </PixelCard>
      </div>

      {/* Right Panel */}
      <div className="xl:col-span-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ActionCard
            title="Create Task / Assignment"
            desc="Design assignments and quizzes for your class."
            icon={<ClipboardList className="w-8 h-8" />}
            onClick={() => navigate("/tests")}
            buttonLabel="Create"
          />
          <ActionCard
            title="Manage Student Profiles"
            desc="View and manage student details and progress."
            icon={<Users className="w-8 h-8" />}
            onClick={() => navigate("/leaderboard")}
            buttonLabel="Manage"
          />
          <ActionCard
            title="Track Class Progress"
            desc="Monitor activity and performance across your class."
            icon={<BarChart3 className="w-8 h-8" />}
            onClick={() => navigate("/dashboard")}
            buttonLabel="Open"
          />
          <ActionCard
            title="Review Reports & Analytics"
            desc="See participation, credits, and completion stats."
            icon={<BookOpen className="w-8 h-8" />}
            onClick={() => navigate("/dashboard")}
            buttonLabel="Open"
          />
          <ActionCard
            title="Award Achievements"
            desc="Celebrate milestones and motivate learners."
            icon={<Medal className="w-8 h-8" />}
            onClick={() => navigate("/dashboard")}
            buttonLabel="Award"
          />
          <ActionCard
            title="Send Announcements"
            desc="Publish updates to your class feed."
            icon={<Megaphone className="w-8 h-8" />}
            onClick={() => navigate("/announcements")}
            buttonLabel="Post"
          />
        </div>
      </div>
    </div>
  );
}
