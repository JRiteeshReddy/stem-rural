import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GlobalHeader } from "@/components/GlobalHeader";
import { PixelCard } from "@/components/PixelCard";
import { PixelButton } from "@/components/PixelButton";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  BookOpen,
  Play,
  Users,
  FileText,
  Megaphone,
  BarChart3,
  Settings,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CourseForm from "@/components/dashboard/CourseForm";
import StudentForm from "@/components/dashboard/StudentForm";
import TeacherHub from "@/components/dashboard/TeacherHub";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Add local error messages state
  const [errors, setErrors] = useState<string[]>([]);

  // Data queries
  const studentCourses = useQuery(api.courses.getAllCoursesForStudent, {});

  // Teacher admin queries
  const allCourses = useQuery(api.courses.listAllCoursesForTeacher, user?.role === "teacher" ? {} : "skip");
  const allTests = useQuery(api.tests.listAllTestsForTeacher, user?.role === "teacher" ? {} : "skip");
  const allStudents = useQuery(api.users.listStudents, user?.role === "teacher" ? {} : "skip");

  // Mutations
  const ensureDefaults = useMutation(api.courses.ensureDefaultCoursesForUserClass);
  const markCourseAccessed = useMutation(api.courses.markCourseAccessed);
  
  // Teacher admin mutations
  const createCourse = useMutation(api.courses.createCourse);
  const updateCourse = useMutation(api.courses.updateCourse);
  const deleteCourse = useMutation(api.courses.deleteCourse);
  const updateTestMeta = useMutation(api.tests.updateTestMeta);
  const deleteTest = useMutation(api.tests.deleteTest);
  const updateStudentProfile = useMutation(api.users.updateStudentProfileSubset);
  const deleteStudentAccount = useMutation(api.users.deleteStudentAccount);

  // State for dialogs and forms
  const [activeTab, setActiveTab] = useState("courses");
  const [courseDialog, setCourseDialog] = useState({ open: false, course: null as any });
  const [testDialog, setTestDialog] = useState({ open: false, test: null as any });
  const [studentDialog, setStudentDialog] = useState({ open: false, student: null as any });
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  // Add loading flags for teacher data
  const isCoursesLoading = user?.role === "teacher" && allCourses === undefined;
  const isTestsLoading = user?.role === "teacher" && allTests === undefined;
  const isStudentsLoading = user?.role === "teacher" && allStudents === undefined;

  // Add environment and network error checks
  useEffect(() => {
    const msgs: Array<string> = [];
    // Detect missing Convex URL (most common source of "Failed to fetch")
    if (!import.meta.env.VITE_CONVEX_URL) {
      msgs.push(
        "Backend not configured: Set VITE_CONVEX_URL in the Integrations / API Keys tab to your Convex deployment URL, then hard refresh."
      );
    }
    // Initial offline status
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      msgs.push("You are offline. Check your internet connection.");
    }
    setErrors(msgs);

    // Live network updates
    const onOnline = () => {
      setErrors((prev) => prev.filter((m) => !m.includes("offline")));
      toast.success("Back online");
    };
    const onOffline = () => {
      setErrors((prev) => {
        if (prev.some((m) => m.includes("offline"))) return prev;
        return [...prev, "You are offline. Check your internet connection."];
      });
      toast.warning("You are offline");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Helper to render inline error banner
  const renderErrorBanner = () =>
    errors.length > 0 ? (
      <PixelCard
        variant="orange"
        className="mb-4 border-red-600 bg-red-600/20 text-red-200"
      >
        <div className="space-y-2">
          <div className="font-bold text-red-300">Connection Issues</div>
          <ul className="list-disc pl-5 space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-sm">
                {e}
              </li>
            ))}
          </ul>
        </div>
      </PixelCard>
    ) : null;

  // ... keep existing useEffect for student defaults

  useEffect(() => {
    if (user?.role === "student" && user?.userClass) {
      ensureDefaults({});
    }
  }, [user?.role, user?.userClass, ensureDefaults]);

  // ... keep existing handlers

  // Profile image upload is handled on the Profile page.

  const handleOpenCourse = async (courseId: string, courseTitle: string) => {
    await markCourseAccessed({ courseId: courseId as any });
    if (courseTitle === "Mathematics") {
      navigate("/tests?game=math");
    } else {
      navigate("/tests");
    }
  };

  // Teacher admin handlers
  const handleCreateCourse = async (data: { title: string; description: string; targetClass?: string }) => {
    try {
      await createCourse({
        title: data.title,
        description: data.description,
      });
      toast.success("Course created successfully!");
      setCourseDialog({ open: false, course: null });
    } catch (error) {
      toast.error("Failed to create course");
    }
  };

  const handleUpdateCourse = async (courseId: string, data: any) => {
    try {
      await updateCourse({ courseId, ...data });
      toast.success("Course updated successfully!");
      setCourseDialog({ open: false, course: null });
    } catch (error) {
      toast.error("Failed to update course");
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm("Are you sure you want to delete this course?")) {
      try {
        await deleteCourse({ courseId: courseId as any });
        toast.success("Course deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete course");
      }
    }
  };

  const handleUpdateTest = async (testId: string, data: any) => {
    try {
      await updateTestMeta({ testId, ...data });
      toast.success("Test updated successfully!");
      setTestDialog({ open: false, test: null });
    } catch (error) {
      toast.error("Failed to update test");
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (confirm("Are you sure you want to delete this test?")) {
      try {
        await deleteTest({ testId: testId as any });
        toast.success("Test deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete test");
      }
    }
  };

  const handleUpdateStudent = async (studentId: string, data: any) => {
    try {
      await updateStudentProfile({ studentId, ...data });
      toast.success("Student updated successfully!");
      setStudentDialog({ open: false, student: null });
    } catch (error) {
      toast.error("Failed to update student");
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (confirm("Are you sure you want to delete this student account?")) {
      try {
        await deleteStudentAccount({ targetUserId: studentId as any });
        toast.success("Student account deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete student account");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-pixel">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const isStudent = user.role === "student";
  const isTeacher = user.role === "teacher";

  if (isStudent) {
    // ... keep existing student view code
    const baseCredits = user.credits || 0;
    const baseTests = user.totalTestsCompleted || 0;

    const subjects = [
      { name: "Mathematics", icon: "📐", pct: 0, level: 1, color: "bg-yellow-500" },
      { name: "Chemistry", icon: "🧪", pct: 0, level: 1, color: "bg-green-500" },
      { name: "Biology", icon: "🌱", pct: 0, level: 1, color: "bg-blue-500" },
      { name: "Computer Science", icon: "💻", pct: 0, level: 1, color: "bg-purple-500" },
      { name: "Robotics", icon: "🤖", pct: 0, level: 1, color: "bg-red-500" },
      { name: "Astronomy", icon: "🌟", pct: 0, level: 1, color: "bg-indigo-500" },
    ];

    const goals = [
      { text: "Complete any 1 Test", achieved: baseTests >= 1 },
      { text: "Earn 10 XP", achieved: baseCredits >= 10 },
      { text: "Set Display Name", achieved: !!user.name },
      { text: "Upload Profile Picture", achieved: !!user.image },
    ];

    const achievements = [
      { name: "Math Wizard", icon: "🧙‍♂️", earned: baseCredits >= 10 },
      { name: "Coding Hero", icon: "👨‍💻", earned: baseCredits >= 20 },
      { name: "Science Explorer", icon: "🔬", earned: baseTests >= 3 },
      { name: "Problem Solver", icon: "🧩", earned: baseTests >= 5 },
      { name: "Robot Master", icon: "🤖", earned: baseCredits >= 30 },
    ];

    const gameSubjects = subjects.filter(s => s.name !== "Physics");

    return (
      <div className="min-h-screen bg-transparent">
        <GlobalHeader />
        <div className="container mx-auto px-4 py-8 space-y-8">
          {renderErrorBanner()}
          {/* Student Portal Header - Translucent black card like old UI */}
          <PixelCard
            variant="orange"
            className="p-6 bg-black/70 border-yellow-600 shadow-[0_0_16px_rgba(255,204,0,0.25)]"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row items-center justify-between gap-4"
            >
              <div className="text-center lg:text-left space-y-2">
                <h1 className="text-4xl font-bold text-yellow-300">
                  👾 Welcome back, {user.name || "Explorer"}!
                </h1>
                <div className="text-yellow-200">
                  Ready to continue your learning quest?
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-black/70 border-2 border-yellow-600 px-4 py-2 text-yellow-300 font-bold">
                  🪙 XP: {user.credits || 0}
                </div>
                <PixelButton
                  onClick={() => navigate("/tests")}
                  className="bg-yellow-400 hover:bg-yellow-300 text-black px-6 py-3"
                >
                  🎮 Continue Your Quest
                </PixelButton>
              </div>
            </motion.div>
          </PixelCard>

          {/* Student Performance Dashboard */}
          <PixelCard
            variant="orange"
            className="p-6 bg-black/70 border-yellow-600 shadow-[0_0_16px_rgba(255,204,0,0.25)]"
          >
            <h2 className="text-2xl font-bold mb-6 text-center text-yellow-300">
              📊 Your Progress Dashboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <div
                  key={subject.name}
                  className="bg-black/60 p-4 rounded-none border-2 border-yellow-700"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{subject.icon}</span>
                    <span className="font-bold text-yellow-100">{subject.name}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-200/80">Level {subject.level}</span>
                      <span className="text-yellow-200/80">{subject.pct}%</span>
                    </div>
                    <div className="w-full bg-neutral-900 border border-yellow-800 h-2">
                      <div
                        className={`h-2 ${subject.color}`}
                        style={{ width: `${subject.pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PixelCard>

          {/* Today's Goals */}
          <PixelCard
            variant="orange"
            className="p-6 bg-black/70 border-yellow-600 shadow-[0_0_16px_rgba(255,204,0,0.25)]"
          >
            <h2 className="text-2xl font-bold mb-4 text-center text-yellow-300">🎯 Today's Goals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-black/60 border-2 border-yellow-700"
                >
                  <span className="text-2xl">{goal.achieved ? "✔" : "✖"}</span>
                  <span
                    className={`font-medium ${
                      goal.achieved ? "text-green-400" : "text-yellow-200/80"
                    }`}
                  >
                    {goal.text}
                  </span>
                </div>
              ))}
            </div>
          </PixelCard>

          {/* Your Courses */}
          <PixelCard
            variant="orange"
            className="p-6 bg-black/70 border-yellow-600 shadow-[0_0_16px_rgba(255,204,0,0.25)]"
          >
            <h2 className="text-2xl font-bold mb-6 text-center text-yellow-300">📚 Your Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentCourses === undefined ? (
                // Loading skeletons for student courses
                <>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="bg-black/60 p-4 rounded-none border-2 border-yellow-700 space-y-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-14 ml-auto" />
                      </div>
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-10" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                      </div>
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ))}
                </>
              ) : (
                studentCourses?.map((course) => (
                  <div
                    key={course._id}
                    className="bg-black/60 p-4 rounded-none border-2 border-yellow-700"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {course.title === "Mathematics"
                          ? "📐"
                          : course.title === "Chemistry"
                          ? "🧪"
                          : course.title === "Biology"
                          ? "🌱"
                          : course.title === "Computer Science"
                          ? "💻"
                          : course.title === "Robotics"
                          ? "🤖"
                          : course.title === "Astronomy"
                          ? "🌟"
                          : "📖"}
                      </span>
                      <span className="font-bold text-yellow-100">{course.title}</span>
                      {course.isNew && (
                        <Badge className="bg-red-500 text-white text-xs">★ NEW ★</Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="mb-2 border-yellow-700 text-yellow-200">
                      {course.subjectType || "default"}
                    </Badge>
                    <p className="text-yellow-100/80 text-sm mb-3">{course.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-200/80">Progress</span>
                        <span className="text-yellow-200/80">
                          {Math.round(course.progress)}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-900 border border-yellow-800 h-2">
                        <div
                          className="h-2 bg-green-500"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                    <PixelButton
                      onClick={() => handleOpenCourse(course._id, course.title)}
                      className="w-full mt-3 bg-blue-500 hover:bg-blue-600"
                    >
                      {course.progress > 0 ? "Continue" : "Play"}
                    </PixelButton>
                  </div>
                ))
              )}
            </div>
          </PixelCard>

          {/* Achievements */}
          <PixelCard
            variant="orange"
            className="p-6 bg-black/70 border-yellow-600 shadow-[0_0_16px_rgba(255,204,0,0.25)]"
          >
            <h2 className="text-2xl font-bold mb-6 text-center text-yellow-300">🏆 Achievements</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.name}
                  className={`p-4 text-center border-2 rounded-none ${
                    achievement.earned
                      ? "border-yellow-600 bg-black/60 shadow-[0_0_10px_rgba(255,204,0,0.2)]"
                      : "border-yellow-900 bg-black/40 opacity-70"
                  }`}
                >
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <div className="text-sm font-medium text-yellow-100">{achievement.name}</div>
                </div>
              ))}
            </div>
          </PixelCard>

          {/* Course Levels & Games */}
          <PixelCard
            variant="orange"
            className="p-6 bg-black/70 border-yellow-600 shadow-[0_0_16px_rgba(255,204,0,0.25)]"
          >
            <h2 className="text-2xl font-bold mb-6 text-center text-yellow-300">
              🎮 Course Levels & Retro Mini-Games
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gameSubjects.map((subject) => (
                <div
                  key={subject.name}
                  className="bg-black/60 p-6 rounded-none border-2 border-yellow-700 text-center"
                >
                  <div className="text-6xl mb-4">{subject.icon}</div>
                  <h3 className="text-xl font-bold text-yellow-100 mb-2">{subject.name}</h3>
                  <p className="text-yellow-100/80 text-sm mb-3">
                    {subject.name === "Mathematics"
                      ? "Solve equations to defeat enemies!"
                      : subject.name === "Chemistry"
                      ? "Mix elements and catch compounds!"
                      : subject.name === "Biology"
                      ? "Defend cells from pathogens!"
                      : "Interactive challenges await!"}
                  </p>
                  <Badge className="mb-4 bg-blue-500">Level 1</Badge>
                  <PixelButton
                    onClick={() => {
                      if (subject.name === "Mathematics") navigate("/tests?game=math");
                      else if (subject.name === "Biology") navigate("/tests?game=biocell");
                      else navigate("/tests");
                    }}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    PLAY
                  </PixelButton>
                </div>
              ))}
            </div>
          </PixelCard>

          {/* Footer */}
          <div className="text-center">
            <PixelButton
              onClick={() => navigate("/")}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2"
            >
              🕹 Back to Arcade Lobby
            </PixelButton>
          </div>
        </div>
      </div>
    );
  }

  if (isTeacher) {
    // Teacher Control Center
    const filteredCourses = allCourses?.filter(course => 
      (!classFilter || course.targetClass === classFilter) &&
      (!searchTerm || course.title.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    const filteredTests = allTests?.filter(test => 
      (!classFilter || test.targetClass === classFilter) &&
      (!difficultyFilter || test.difficulty === difficultyFilter) &&
      (!searchTerm || test.title.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    const filteredStudents = allStudents?.filter(student => 
      (!classFilter || student.userClass === classFilter) &&
      (!searchTerm || student.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    // Announcements filtered list will be implemented when the "News" tab is expanded.

    // Analytics data
    const analyticsData = {
      activeStudents: filteredStudents.filter(s => s.lastLoginAt && (Date.now() - s.lastLoginAt) < 7 * 24 * 60 * 60 * 1000).length,
      totalStudents: filteredStudents.length,
      avgScore: filteredStudents.reduce((sum, s) => sum + (s.credits || 0), 0) / (filteredStudents.length || 1),
      testParticipation: Math.round((filteredStudents.filter(s => (s.totalTestsCompleted || 0) > 0).length / (filteredStudents.length || 1)) * 100),
    };

    // Chart data removed for now (using textual summary instead).

    return (
      <div className="min-h-screen bg-transparent">
        <GlobalHeader />
        <div className="container mx-auto px-4 py-8">
          {renderErrorBanner()}
          {/* Teacher Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white pixel-text-shadow mb-4">
              🎛️ Teacher Control Center
            </h1>
            <div className="text-lg text-yellow-400">
              Managing Class {user.userClass?.split(" ")[1] || "-"}
            </div>
          </motion.div>

          {/* Teacher Portal - Pixel Retro Hub */}
          {user?.role === "teacher" && (
            <div className="space-y-6">
              <TeacherHub
                teacherName={user?.name ?? null}
                teacherClass={user?.userClass ?? null}
                totalCoursesCreated={(user as any)?.totalCoursesCreated ?? null}
                totalStudentsEnrolled={(user as any)?.totalStudentsEnrolled ?? null}
                xp={null /* pass xp if tracked for teachers */}
              />

              {/* ... keep existing code (you may keep prior teacher analytics/lists below to avoid breaking functionality) */}
            </div>
          )}

          {/* Control Center Tabs */}
          <PixelCard variant="orange" className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="courses" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Courses</span>
                </TabsTrigger>
                <TabsTrigger value="tests" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Tests</span>
                </TabsTrigger>
                <TabsTrigger value="students" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Students</span>
                </TabsTrigger>
                <TabsTrigger value="announcements" className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4" />
                  <span className="hidden sm:inline">News</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
              </TabsList>

              {/* Courses Tab */}
              <TabsContent value="courses" className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <h2 className="text-2xl font-bold">📘 Course Management</h2>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48"
                    />
                    <Select value={classFilter || undefined} onValueChange={(v) => setClassFilter(v === "ALL_CLASSES" ? "" : v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_CLASSES">All Classes</SelectItem>
                        <SelectItem value="Class 6">Class 6</SelectItem>
                        <SelectItem value="Class 7">Class 7</SelectItem>
                        <SelectItem value="Class 8">Class 8</SelectItem>
                        <SelectItem value="Class 9">Class 9</SelectItem>
                        <SelectItem value="Class 10">Class 10</SelectItem>
                        <SelectItem value="Class 11">Class 11</SelectItem>
                        <SelectItem value="Class 12">Class 12</SelectItem>
                      </SelectContent>
                    </Select>
                    <Dialog open={courseDialog.open} onOpenChange={(open) => setCourseDialog({ open, course: null })}>
                      <DialogTrigger asChild>
                        <Button className="bg-green-500 hover:bg-green-600">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Course
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{courseDialog.course ? "Edit Course" : "Create New Course"}</DialogTitle>
                        </DialogHeader>
                        <CourseForm
                          course={courseDialog.course}
                          onSubmit={courseDialog.course ? 
                            (data: any) => handleUpdateCourse(courseDialog.course._id, data) :
                            handleCreateCourse
                          }
                          onCancel={() => setCourseDialog({ open: false, course: null })}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg border-2 border-yellow-400 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Chapters</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isCoursesLoading ? (
                        // Skeleton rows while courses load
                        <>
                          {[0, 1, 2].map((i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Skeleton className="h-8 w-8" />
                                  <Skeleton className="h-8 w-8" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ) : (
                        filteredCourses.map((course) => (
                          <TableRow key={course._id}>
                            <TableCell className="font-medium">{course.title}</TableCell>
                            <TableCell>{course.targetClass}</TableCell>
                            <TableCell>
                              <Badge variant={course.subjectType === "default" ? "secondary" : "default"}>
                                {course.subjectType || "custom"}
                              </Badge>
                            </TableCell>
                            <TableCell>{course.chaptersCount}</TableCell>
                            <TableCell>
                              <Badge variant={course.isPublished ? "default" : "secondary"}>
                                {course.isPublished ? "Published" : "Draft"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCourseDialog({ open: true, course })}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteCourse(course._id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Tests Tab */}
              <TabsContent value="tests" className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <h2 className="text-2xl font-bold">📝 Test Management</h2>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search tests..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48"
                    />
                    <Select value={difficultyFilter || undefined} onValueChange={(v) => setDifficultyFilter(v === "ALL_LEVELS" ? "" : v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_LEVELS">All Levels</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button className="bg-green-500 hover:bg-green-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Test
                    </Button>
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg border-2 border-yellow-400 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isTestsLoading ? (
                        <>
                          {[0, 1, 2].map((i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Skeleton className="h-8 w-8" />
                                  <Skeleton className="h-8 w-8" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ) : (
                        filteredTests.map((test) => (
                          <TableRow key={test._id}>
                            <TableCell className="font-medium">{test.title}</TableCell>
                            <TableCell>{test.courseName}</TableCell>
                            <TableCell>{test.targetClass}</TableCell>
                            <TableCell>
                              <Badge variant={
                                test.difficulty === "easy" ? "secondary" :
                                test.difficulty === "medium" ? "default" : "destructive"
                              }>
                                {test.difficulty || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>{test.questions.length}/10</TableCell>
                            <TableCell>
                              <Badge variant={test.isPublished ? "default" : "secondary"}>
                                {test.isPublished ? "Published" : "Draft"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setTestDialog({ open: true, test })}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteTest(test._id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Students Tab */}
              <TabsContent value="students" className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <h2 className="text-2xl font-bold">🎓 Student Management</h2>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48"
                    />
                    <Select value={classFilter || undefined} onValueChange={(v) => setClassFilter(v === "ALL_CLASSES" ? "" : v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_CLASSES">All Classes</SelectItem>
                        <SelectItem value="Class 6">Class 6</SelectItem>
                        <SelectItem value="Class 7">Class 7</SelectItem>
                        <SelectItem value="Class 8">Class 8</SelectItem>
                        <SelectItem value="Class 9">Class 9</SelectItem>
                        <SelectItem value="Class 10">Class 10</SelectItem>
                        <SelectItem value="Class 11">Class 11</SelectItem>
                        <SelectItem value="Class 12">Class 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg border-2 border-yellow-400 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Tests</TableHead>
                        <TableHead>Rank</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isStudentsLoading ? (
                        <>
                          {[0, 1, 2, 3].map((i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Skeleton className="h-8 w-8" />
                                  <Skeleton className="h-8 w-8" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ) : (
                        filteredStudents.map((student) => (
                          <TableRow key={student._id}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.userClass}</TableCell>
                            <TableCell>{student.credits}</TableCell>
                            <TableCell>{student.totalTestsCompleted}</TableCell>
                            <TableCell>
                              <Badge>{student.rank}</Badge>
                            </TableCell>
                            <TableCell>
                              {student.lastLoginAt ?
                                new Date(student.lastLoginAt).toLocaleDateString() :
                                "Never"
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setStudentDialog({ open: true, student })}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteStudent(student._id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <h2 className="text-2xl font-bold">📊 Analytics Dashboard</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.totalStudents}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{analyticsData.activeStudents}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Credits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{Math.round(analyticsData.avgScore)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Test Participation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.testParticipation}%</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Student Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px] w-full flex items-center justify-center text-sm text-muted-foreground">
                        Activity chart unavailable. Data summary: {analyticsData.activeStudents} active / {analyticsData.totalStudents - analyticsData.activeStudents} inactive.
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Class Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center text-gray-500">
                          Performance metrics will be displayed here based on test results and course completion rates.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <h2 className="text-2xl font-bold">⚙️ Settings</h2>
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Teacher Profile</CardTitle>
                      <CardDescription>Manage your teacher account settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Name</label>
                        <Input value={user.name || ""} readOnly />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input value={user.email || ""} readOnly />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Class</label>
                        <Input value={user.userClass || ""} readOnly />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </PixelCard>
        </div>

        {/* Dialogs */}
        <Dialog open={studentDialog.open} onOpenChange={(open) => setStudentDialog({ open, student: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            <StudentForm
              student={studentDialog.student}
              onSubmit={(data: any) => handleUpdateStudent(studentDialog.student._id, data)}
              onCancel={() => setStudentDialog({ open: false, student: null })}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}