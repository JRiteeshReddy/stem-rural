import { GlobalHeader } from "@/components/GlobalHeader";
import { PixelButton } from "@/components/PixelButton";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
/* removed duplicate useState import */
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import React, { useMemo, useState } from "react";

export default function Courses() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isTeacher = Boolean(user && user.role === "teacher");
  const isStudent = Boolean(user && user.role === "student");

  // Queries
  const teacherCourses = useQuery(api.courses.getCoursesByTeacher);
  const studentCourses = useQuery(api.courses.getAllCoursesForStudent);

  // Mutations
  const createCourse = useMutation(api.courses.createCourse);
  const ensureDefaults = useMutation(api.courses.ensureDefaultCoursesForUserClass);
  const markCourseAccessed = useMutation(api.courses.markCourseAccessed);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseSearch, setCourseSearch] = useState("");

  // Simple client-side search over title/description for teacher and student lists
  const q = (courseSearch || "").trim().toLowerCase();

  const filteredStudentCourses = useMemo(() => {
    if (!Array.isArray(studentCourses)) return [];
    if (!q) return studentCourses;
    return studentCourses.filter((c: any) => {
      const t = String(c?.title || "").toLowerCase();
      const d = String(c?.description || "").toLowerCase();
      return t.includes(q) || d.includes(q);
    });
  }, [studentCourses, q]);

  const filteredTeacherCourses = useMemo(() => {
    if (!Array.isArray(teacherCourses)) return [];
    if (!q) return teacherCourses;
    return teacherCourses.filter((c: any) => {
      const t = String(c?.title || "").toLowerCase();
      const d = String(c?.description || "").toLowerCase();
      return t.includes(q) || d.includes(q);
    });
  }, [teacherCourses, q]);

  const handleCreate = async () => {
    try {
      if (!title.trim() || !description.trim()) {
        toast.error("Please enter title and description");
        return;
      }
      const id = await createCourse({ title, description });
      toast.success("Course created");
      setTitle("");
      setDescription("");
      // optional: navigate to detail later when implemented
    } catch (e: any) {
      toast.error(e?.message || "Failed to create course");
    }
  };

  const handleOpenCourse = async (courseId: string, courseTitle: string) => {
    try {
      await markCourseAccessed({ courseId: courseId as any });
      if (courseTitle === "Mathematics") {
        navigate("/tests?game=math");
      } else {
        navigate("/tests");
      }
    } catch {
      toast.error("Failed to open course");
    }
  };

  // Seed defaults for students if needed
  const handleSeedDefaults = async () => {
    try {
      await ensureDefaults({});
      toast.success("Default courses ensured for your class");
    } catch (e: any) {
      toast.error(e?.message || "Could not ensure defaults");
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <GlobalHeader />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div
          className="bg-black/70 border-4 border-yellow-600 p-4 shadow-[0_0_12px_rgba(255,255,0,0.5)]"
          style={{ fontFamily: "'Pixelify Sans', monospace" }}
        >
          <h1
            className="text-2xl md:text-3xl font-bold text-yellow-300"
            style={{ textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
          >
            Courses
          </h1>
          <p className="text-yellow-100/90 mt-1">
            Explore and manage retro STEM courses.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              placeholder="Search courses..."
              className="pl-9"
            />
          </div>
        </div>

        {isStudent && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2
                className="text-xl font-bold text-yellow-300"
                style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
              >
                Your Courses
              </h2>
              <PixelButton size="sm" onClick={handleSeedDefaults}>
                Ensure Default Courses
              </PixelButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudentCourses.map((c: any) => (
                <div
                  key={c._id}
                  className="relative p-4 bg-neutral-900/60 border-2 border-yellow-700"
                  style={{ fontFamily: "'Pixelify Sans', monospace" }}
                >
                  {c.isNew && (
                    <span className="absolute -top-3 -right-3 text-xs px-2 py-1 bg-yellow-300 border-2 border-yellow-700 text-black font-bold shadow-[0_0_10px_rgba(255,220,0,0.8)]">
                      ★ NEW ★
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-yellow-100 font-bold">
                      <span className="text-xl">
                        {c.title === "Mathematics" ? "📐" :
                         c.title === "Physics" ? "⚛️" :
                         c.title === "Chemistry" ? "🧪" :
                         c.title === "Biology" ? "🌱" :
                         c.title === "Computer Science" ? "💻" :
                         c.title === "Robotics" ? "🤖" :
                         c.title === "Astronomy" ? "🌌" : "📘"}
                      </span>
                      <span>{c.title}</span>
                    </div>
                    <div className="text-xs bg-yellow-300 text-black border border-yellow-700 px-2 py-0.5">
                      {c.subjectType || "custom"}
                    </div>
                  </div>
                  <div className="mb-3 text-yellow-200 text-xs opacity-90">{c.description}</div>
                  <div className="w-full h-3 bg-neutral-800 border-2 border-yellow-800 mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 shadow-[0_0_10px_rgba(255,200,0,0.8)]"
                      style={{ width: `${Math.max(0, Math.min(100, c.progress || 0))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-300 text-xs font-bold">{Math.round(c.progress || 0)}%</span>
                    <PixelButton size="sm" onClick={() => handleOpenCourse(c._id, c.title)}>
                      {c.progress > 0 ? "Continue" : "Play"}
                    </PixelButton>
                  </div>
                </div>
              ))}
              {(!studentCourses || studentCourses.length === 0) && (
                <div className="text-yellow-200">No courses yet for your class.</div>
              )}
            </div>
          </section>
        )}

        {isTeacher && (
          <>
            <section className="space-y-3">
              <h2
                className="text-xl font-bold text-yellow-300"
                style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
              >
                Retro Control Console
              </h2>
              <div className="bg-black/70 border-4 border-green-600 p-4 shadow-[0_0_14px_rgba(0,255,120,0.5)]">
                <div className="grid gap-3 md:grid-cols-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                  <input
                    className="px-3 py-2 bg-neutral-900/70 border-2 border-green-700 text-green-200 outline-none"
                    placeholder="Course title (e.g., Environmental Science)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <input
                    className="px-3 py-2 bg-neutral-900/70 border-2 border-green-700 text-green-200 outline-none"
                    placeholder="Short description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="mt-3">
                  <PixelButton onClick={handleCreate} className="shadow-[0_0_10px_rgba(0,255,120,0.7)]">
                    + Add New Course
                  </PixelButton>
                </div>
                <p className="text-green-200/80 text-xs mt-2">
                  Courses are automatically scoped to your registered class and appear instantly for students.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2
                className="text-xl font-bold text-yellow-300"
                style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000" }}
              >
                Your Courses
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeacherCourses.map((c: any) => (
                  <div key={c._id} className="p-4 bg-neutral-900/60 border-2 border-yellow-700" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-yellow-100 font-bold">
                        <span className="text-xl">
                          {c.title === "Mathematics" ? "📐" :
                           c.title === "Physics" ? "⚛️" :
                           c.title === "Chemistry" ? "🧪" :
                           c.title === "Biology" ? "🌱" :
                           c.title === "Computer Science" ? "💻" :
                           c.title === "Robotics" ? "🤖" :
                           c.title === "Astronomy" ? "🌌" : "📘"}
                        </span>
                        <span>{c.title}</span>
                      </div>
                      <div className="text-xs bg-yellow-300 text-black border border-yellow-700 px-2 py-0.5">
                        {(c.subjectType || "custom")} · {c.isPublished ? "Published" : "Draft"}
                      </div>
                    </div>
                    <div className="text-yellow-200 text-xs opacity-90">{c.description}</div>
                  </div>
                ))}
                {(!teacherCourses || teacherCourses.length === 0) && (
                  <div className="text-yellow-200">No courses yet. Create your first course!</div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}