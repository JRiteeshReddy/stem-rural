import { GlobalHeader } from "@/components/GlobalHeader";
import { PixelButton } from "@/components/PixelButton";
import { PixelCard } from "@/components/PixelCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Bell, Edit3, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type AnnouncementDoc = ReturnType<typeof useQuery<typeof api.announcements.getAnnouncements>> extends (infer T)[] | undefined ? T : any;

export default function Announcements() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const announcements = useQuery(api.announcements.getAnnouncements);
  const coursesForTeacher = useQuery(api.courses.getCoursesByTeacher);
  const createAnnouncement = useMutation(api.announcements.createAnnouncement);
  const updateAnnouncement = useMutation(api.announcements.updateAnnouncement);
  const deleteAnnouncement = useMutation(api.announcements.deleteAnnouncement);

  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  // Form state (create)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("low");
  const [isGlobal, setIsGlobal] = useState(true);
  const [courseId, setCourseId] = useState<string>("none"); // "none" means undefined

  // Edit dialog state
  const [editOpenId, setEditOpenId] = useState<string | null>(null);
  const editingAnnouncement: AnnouncementDoc | null = useMemo(() => {
    if (!announcements || !editOpenId) return null;
    return (announcements as any[]).find((a) => String(a._id) === editOpenId) ?? null;
  }, [announcements, editOpenId]);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("low");
  const [editIsGlobal, setEditIsGlobal] = useState(true);
  const [editCourseId, setEditCourseId] = useState<string>("none");

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) navigate("/auth");
      else if (user && !user.role) navigate("/role-selection");
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  useEffect(() => {
    if (editingAnnouncement) {
      setEditTitle(editingAnnouncement.title);
      setEditContent(editingAnnouncement.content);
      setEditPriority(editingAnnouncement.priority);
      const hasCourse = !!editingAnnouncement.courseId;
      setEditIsGlobal(!hasCourse && editingAnnouncement.isGlobal);
      setEditCourseId(hasCourse ? String(editingAnnouncement.courseId) : "none");
    }
  }, [editingAnnouncement]);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in title and content");
      return;
    }
    try {
      await createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        isGlobal: isGlobal || courseId === "none",
        courseId: !isGlobal && courseId !== "none" ? (courseId as any) : undefined,
        priority,
      });
      setTitle("");
      setContent("");
      setPriority("low");
      setIsGlobal(true);
      setCourseId("none");
      toast.success("Announcement posted!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to post announcement");
    }
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement) return;
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error("Please fill in title and content");
      return;
    }
    try {
      await updateAnnouncement({
        announcementId: editingAnnouncement._id,
        title: editTitle.trim(),
        content: editContent.trim(),
        isGlobal: editIsGlobal || editCourseId === "none",
        courseId: !editIsGlobal && editCourseId !== "none" ? (editCourseId as any) : undefined,
        priority: editPriority,
      });
      setEditOpenId(null);
      toast.success("Announcement updated!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update announcement");
    }
  };

  const handleDelete = async (id: any) => {
    try {
      await deleteAnnouncement({ announcementId: id });
      toast.success("Announcement deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete announcement");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-orange-200 to-yellow-300">
      <GlobalHeader />
      <main className="max-w-6xl mx-auto p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-4xl font-bold text-black flex items-center gap-2" style={{ fontFamily: "monospace" }}>
            <Bell size={32} /> Announcements
          </h1>
          <p className="text-gray-700" style={{ fontFamily: "monospace" }}>
            Stay updated with the latest news. Teachers can post updates; students can view them below.
          </p>
        </motion.div>

        {isTeacher && (
          <PixelCard variant="banana" className="p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-black font-bold" style={{ fontFamily: "monospace" }}>
                  Title
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-2 border-yellow-600 rounded-none"
                  placeholder="Enter title"
                />
              </div>
              <div>
                <Label className="text-black font-bold" style={{ fontFamily: "monospace" }}>
                  Priority
                </Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger className="rounded-none border-2 border-yellow-600">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-black font-bold" style={{ fontFamily: "monospace" }}>
                  Content
                </Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="border-2 border-yellow-600 rounded-none min-h-32"
                  placeholder="Write your announcement..."
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={isGlobal}
                  onCheckedChange={(v) => {
                    setIsGlobal(v);
                    if (v) setCourseId("none");
                  }}
                />
                <span className="text-black font-bold" style={{ fontFamily: "monospace" }}>
                  Global announcement
                </span>
              </div>

              {!isGlobal && (
                <div>
                  <Label className="text-black font-bold" style={{ fontFamily: "monospace" }}>
                    Course (optional)
                  </Label>
                  <Select value={courseId} onValueChange={(v) => setCourseId(v)}>
                    <SelectTrigger className="rounded-none border-2 border-yellow-600">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No course</SelectItem>
                      {(coursesForTeacher || []).map((c: any) => (
                        <SelectItem key={String(c._id)} value={String(c._id)}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="mt-4">
              <PixelButton onClick={handleCreate}>Post Announcement 🍌</PixelButton>
            </div>
          </PixelCard>
        )}

        <PixelCard variant="orange" className="p-0">
          <div className="p-4 border-b-4 border-orange-400">
            <h2 className="text-2xl font-bold text-black" style={{ fontFamily: "monospace" }}>
              Latest Updates
            </h2>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
            {!announcements ? (
              <div className="text-black" style={{ fontFamily: "monospace" }}>
                Loading...
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-black" style={{ fontFamily: "monospace" }}>
                No announcements yet.
              </div>
            ) : (
              announcements.map((a: any) => (
                <motion.div
                  key={String(a._id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-orange-200 border-2 border-orange-400 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-black text-lg" style={{ fontFamily: "monospace" }}>
                          {a.title}
                        </h3>
                        <span
                          className="text-xs bg-orange-300 border border-orange-500 px-2 py-0.5 text-black"
                          style={{ fontFamily: "monospace" }}
                        >
                          {a.priority.toUpperCase()}
                        </span>
                        <span
                          className="text-xs bg-yellow-200 border border-yellow-500 px-2 py-0.5 text-black"
                          style={{ fontFamily: "monospace" }}
                        >
                          {a.isGlobal ? "Global 🌍" : "Course 📚"}
                        </span>
                      </div>
                      <p className="text-black/90 mt-2" style={{ fontFamily: "monospace" }}>
                        {a.content}
                      </p>
                      <p className="text-xs text-black/70 mt-2" style={{ fontFamily: "monospace" }}>
                        by {a.authorName || "Unknown"}
                      </p>
                    </div>

                    {isTeacher && user?._id === a.authorId && (
                      <div className="flex items-center gap-2">
                        <Dialog open={editOpenId === String(a._id)} onOpenChange={(o) => setEditOpenId(o ? String(a._id) : null)}>
                          <DialogTrigger asChild>
                            <div>
                              <PixelButton size="sm" variant="secondary">
                                <span className="flex items-center gap-1">
                                  <Edit3 size={14} /> Edit
                                </span>
                              </PixelButton>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-xl rounded-none border-4 border-yellow-600">
                            <DialogHeader>
                              <DialogTitle className="text-black" style={{ fontFamily: "monospace" }}>
                                Edit Announcement
                              </DialogTitle>
                            </DialogHeader>

                            {!editingAnnouncement ? null : (
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-black font-bold" style={{ fontFamily: "monospace" }}>
                                    Title
                                  </Label>
                                  <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="border-2 border-yellow-600 rounded-none"
                                  />
                                </div>
                                <div>
                                  <Label className="text-black font-bold" style={{ fontFamily: "monospace" }}>
                                    Priority
                                  </Label>
                                  <Select value={editPriority} onValueChange={(v) => setEditPriority(v as any)}>
                                    <SelectTrigger className="rounded-none border-2 border-yellow-600">
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-black font-bold" style={{ fontFamily: "monospace" }}>
                                    Content
                                  </Label>
                                  <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="border-2 border-yellow-600 rounded-none min-h-32"
                                  />
                                </div>
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={editIsGlobal}
                                    onCheckedChange={(v) => {
                                      setEditIsGlobal(v);
                                      if (v) setEditCourseId("none");
                                    }}
                                  />
                                  <span className="text-black font-bold" style={{ fontFamily: "monospace" }}>
                                    Global announcement
                                  </span>
                                </div>
                                {!editIsGlobal && (
                                  <div>
                                    <Label className="text-black font-bold" style={{ fontFamily: "monospace" }}>
                                      Course (optional)
                                    </Label>
                                    <Select value={editCourseId} onValueChange={(v) => setEditCourseId(v)}>
                                      <SelectTrigger className="rounded-none border-2 border-yellow-600">
                                        <SelectValue placeholder="Select a course" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No course</SelectItem>
                                        {(coursesForTeacher || []).map((c: any) => (
                                          <SelectItem key={String(c._id)} value={String(c._id)}>
                                            {c.title}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                <div className="flex justify-end gap-2">
                                  <PixelButton variant="secondary" size="sm" onClick={() => setEditOpenId(null)}>
                                    Cancel
                                  </PixelButton>
                                  <PixelButton size="sm" onClick={handleUpdate}>
                                    Save
                                  </PixelButton>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <PixelButton
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(a._id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </PixelButton>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </PixelCard>
      </main>
    </div>
  );
}
