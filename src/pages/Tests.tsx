import { GlobalHeader } from "@/components/GlobalHeader";
import { PixelButton } from "@/components/PixelButton";
import { PixelCard } from "@/components/PixelCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ClipboardList, Loader2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type TestDoc = ReturnType<typeof useQuery<typeof api.tests.getPublishedTests>> extends (infer T)[] | undefined ? T : any;

export default function Tests() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const tests = useQuery(api.tests.getPublishedTests);
  const submitTest = useMutation(api.tests.submitTest);

  const [openId, setOpenId] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; totalPoints: number; creditsEarned: number } | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) navigate("/auth");
      else if (user && !user.role) navigate("/role-selection");
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  const activeTest: TestDoc | null = useMemo(() => {
    if (!tests || !openId) return null;
    return (tests as any[]).find((t) => String(t._id) === openId) ?? null;
  }, [tests, openId]);

  useEffect(() => {
    if (activeTest) {
      setQuestionIndex(0);
      setResult(null);
      setAnswers(new Array(activeTest.questions.length).fill(-1));
    }
  }, [activeTest]);

  const selectOption = (qIdx: number, optIdx: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!activeTest) return;
    if (answers.some((a) => a < 0)) {
      toast.error("Please answer all questions before submitting.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await submitTest({ testId: activeTest._id, answers });
      setResult(res);
      toast.success(`Submitted! Score: ${res.score}/${res.totalPoints}, +${res.creditsEarned} credits`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <GlobalHeader />
      <main className="max-w-6xl mx-auto p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-4xl font-bold text-black flex items-center gap-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            <ClipboardList size={32} /> Tests
          </h1>
          <p className="text-gray-700" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            Choose a test below. Questions are presented one at a time. Earn 1 credit per correct answer!
          </p>
        </motion.div>

        {!tests ? (
          <div className="flex items-center gap-2 text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            <Loader2 className="animate-spin" size={18} /> Loading tests...
          </div>
        ) : tests.length === 0 ? (
          <PixelCard variant="banana" className="p-6 text-center">
            <div className="text-black" style={{ fontFamily: "monospace" }}>No tests available yet.</div>
          </PixelCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tests.map((t: any) => (
              <PixelCard key={String(t._id)} variant="banana" className="p-5">
                <div className="flex flex-col h-full">
                  <h3 className="text-2xl font-bold text-black mb-1" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                    {t.title}
                  </h3>
                  <p className="text-sm text-gray-800 mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                    by {t.teacherName}
                  </p>
                  <p className="text-black/80 mb-4" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                    {t.description}
                  </p>
                  <span className="text-black font-bold" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                    Questions: {t.questions?.length ?? 0}
                  </span>
                  <div className="mt-auto flex items-center justify-between">
                    <Dialog
                      open={openId === String(t._id)}
                      onOpenChange={(o) => setOpenId(o ? String(t._id) : null)}
                    >
                      <DialogTrigger asChild>
                        <div>
                          <PixelButton size="sm">Start Test</PixelButton>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-xl rounded-none border-4 border-yellow-600">
                        <DialogHeader>
                          <DialogTitle className="text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                            {t.title}
                          </DialogTitle>
                        </DialogHeader>

                        {!activeTest ? null : result ? (
                          <div className="space-y-4">
                            <div className="text-center">
                              <div className="text-6xl mb-2">📘</div>
                              <h3 className="text-2xl font-bold text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                                Test Complete!
                              </h3>
                              <p className="text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                                Score: <b>{result.score}</b> / {result.totalPoints}
                              </p>
                              <p className="text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                                Credits earned: <b>{result.creditsEarned}</b>
                              </p>
                            </div>
                            <div className="flex justify-center">
                              <PixelButton onClick={() => setOpenId(null)}>Close</PixelButton>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                                Question {questionIndex + 1} / {activeTest.questions.length}
                              </span>
                              <span className="text-sm text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                                Total points: {activeTest.totalPoints}
                              </span>
                            </div>

                            <PixelCard variant="orange" className="p-4">
                              <div className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                                {activeTest.questions[questionIndex].question}
                              </div>
                            </PixelCard>

                            <RadioGroup
                              value={String(answers[questionIndex])}
                              onValueChange={(v) => selectOption(questionIndex, Number(v))}
                            >
                              <div className="grid gap-3">
                                {activeTest.questions[questionIndex].options.map((opt: string, idx: number) => (
                                  <label
                                    key={idx}
                                    className="flex items-center gap-3 bg-yellow-200 border-2 border-yellow-500 px-3 py-2 cursor-pointer"
                                    style={{ imageRendering: "pixelated" }}
                                  >
                                    <RadioGroupItem value={String(idx)} id={`q${questionIndex}-o${idx}`} />
                                    <Label
                                      htmlFor={`q${questionIndex}-o${idx}`}
                                      className="text-black font-bold cursor-pointer"
                                      style={{ fontFamily: "'Pixelify Sans', monospace" }}
                                    >
                                      {opt}
                                    </Label>
                                  </label>
                                ))}
                              </div>
                            </RadioGroup>

                            <div className="flex items-center justify-between">
                              <PixelButton
                                variant="secondary"
                                size="sm"
                                onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
                                className="disabled:opacity-50"
                                disabled={questionIndex === 0 || submitting}
                              >
                                Prev
                              </PixelButton>
                              {questionIndex < activeTest.questions.length - 1 ? (
                                <PixelButton
                                  size="sm"
                                  onClick={() => setQuestionIndex((i) => Math.min(activeTest.questions.length - 1, i + 1))}
                                  disabled={answers[questionIndex] < 0 || submitting}
                                >
                                  Next
                                </PixelButton>
                              ) : (
                                <PixelButton
                                  size="sm"
                                  onClick={handleSubmit}
                                  disabled={answers.some((a) => a < 0) || submitting}
                                >
                                  {submitting ? (
                                    <span className="flex items-center gap-2">
                                      <Loader2 className="animate-spin" size={16} /> Submitting...
                                    </span>
                                  ) : (
                                    "Submit"
                                  )}
                                </PixelButton>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </PixelCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}