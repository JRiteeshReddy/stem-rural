import { GlobalHeader } from "@/components/GlobalHeader";
import { PixelButton } from "@/components/PixelButton";
import { PixelCard } from "@/components/PixelCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { useMutation as useConvexMutation } from "convex/react";
import { motion } from "framer-motion";
import { ClipboardList, Loader2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useLocation } from "react-router";
import { toast } from "sonner";

type TestDoc = ReturnType<typeof useQuery<typeof api.tests.getPublishedTests>> extends (infer T)[] | undefined ? T : any;

export default function Tests() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tests = useQuery(api.tests.getPublishedTests);
  const submitTest = useMutation(api.tests.submitTest);
  const addCredits = useConvexMutation(api.users.addCredits);

  const [openId, setOpenId] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; totalPoints: number; creditsEarned: number } | null>(null);

  // Add: Math game UI state
  const [gameOpen, setGameOpen] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [answer, setAnswer] = useState("");
  const [tick, setTick] = useState(0);
  type Zombie = { id: string; x: number; y: number; eq: string; ans: number };
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [gameOver, setGameOver] = useState(false);

  // Add: helpers to generate equations with rising difficulty
  const genEquation = (level: number): { eq: string; ans: number } => {
    const ops = ["+", "-", "*", "/"] as const;
    const op = ops[Math.min(ops.length - 1, Math.floor(Math.random() * (2 + Math.floor(level / 4))))]; // unlock ops gradually
    const a = Math.max(1, Math.floor(Math.random() * (5 + level * 2)));
    const b = Math.max(1, Math.floor(Math.random() * (5 + level * 2)));
    if (op === "+") return { eq: `${a} + ${b}`, ans: a + b };
    if (op === "-") return { eq: `${a} - ${b}`, ans: a - b };
    if (op === "*") return { eq: `${a} × ${b}`, ans: a * b };
    // division -> ensure divisible
    const prod = a * b;
    return { eq: `${prod} ÷ ${a}`, ans: b };
  };

  // Add: start/reset game
  const startGame = () => {
    setGameOpen(true);
    setGameOver(false);
    setGameScore(0);
    setAnswer("");
    setZombies([]);
    setTick(0);
  };

  // Add: main loop
  useEffect(() => {
    if (!gameOpen || gameOver) return;
    const speedBase = 0.6; // px per tick (% of width)
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setZombies((prev) => {
        // move zombies
        const moved = prev.map((z) => ({ ...z, x: z.x - (speedBase + Math.min(0.6, gameScore * 0.02)) }));
        return moved;
      });
      // spawn based on time and score
      setZombies((prev) => {
        const shouldSpawn = Math.random() < Math.min(0.25 + gameScore * 0.01, 0.6);
        if (!shouldSpawn || prev.length > 6) return prev;
        const { eq, ans } = genEquation(Math.max(1, Math.floor(gameScore / 3) + 1));
        const ySlots = [10, 25, 40, 55, 70, 85];
        const y = ySlots[Math.floor(Math.random() * ySlots.length)];
        const z: Zombie = { id: crypto.randomUUID(), x: 96, y, eq, ans };
        return [...prev, z];
      });
    }, 250);
    return () => clearInterval(interval);
  }, [gameOpen, gameOver, gameScore]);

  // Add: loss detection
  useEffect(() => {
    if (!gameOpen || gameOver) return;
    const hit = zombies.some((z) => z.x <= 6); // reaches player side
    if (hit) {
      setGameOver(true);
      (async () => {
        try {
          const res = await addCredits({ amount: gameScore });
          toast.success(`Game Over! +${gameScore} XP. Rank: ${res.rank}`);
        } catch (e) {
          console.error(e);
          toast.error("Failed to save score");
        }
      })();
    }
  }, [zombies, gameOpen, gameOver, gameScore, addCredits]);

  // Add: answer submit
  const submitAnswer = () => {
    if (!answer.trim()) return;
    const val = Number(answer);
    if (!Number.isFinite(val)) {
      setAnswer("");
      return;
    }
    setZombies((prev) => {
      const idx = prev.findIndex((z) => z.ans === val);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      setGameScore((s) => s + 1);
      toast.message("Zombie defeated! +1 XP");
      return next;
    });
    setAnswer("");
  };

  // Auto-start math game when arriving with ?game=math
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("game") === "math") {
      // Defer to ensure component is mounted
      setTimeout(() => startGame(), 0);
    }
  }, [location.search]);

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

        {/* Add: Math Game launcher */}
        <div className="mb-4">
          <PixelButton size="sm" onClick={startGame}>Play Math Game</PixelButton>
        </div>

        {!tests ? (
          <div className="flex items-center gap-2 text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            <Loader2 className="animate-spin" size={18} /> Loading tests...
          </div>
        ) : tests.length === 0 ? (
          <PixelCard variant="orange" className="p-6 text-center">
            <div className="text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>No tests available yet.</div>
          </PixelCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tests.map((t: any) => (
              <PixelCard key={String(t._id)} variant="orange" className="p-5">
                <div className="flex flex-col h-full">
                  <h3 className="text-2xl font-bold text-black mb-1" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    {t.title}
                  </h3>
                  <p className="text-sm text-gray-800 mb-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    by {t.teacherName}
                  </p>
                  <p className="text-black/80 mb-4" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    {t.description}
                  </p>
                  <span className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
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
                              <img
                                src="https://harmless-tapir-303.convex.cloud/api/storage/857cf0b8-f2da-411e-9ca6-f8f41d5ba695"
                                alt="Logo"
                                className="mx-auto mb-2"
                                style={{ height: 56, imageRendering: "pixelated" }}
                              />
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

        {/* Fullscreen Retro Math Game Overlay */}
        {gameOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-sm border-4 border-yellow-600">
            <div className="absolute inset-0 bg-[linear-gradient(transparent_23px,rgba(255,255,255,0.06)_24px),linear-gradient(90deg,transparent_23px,rgba(255,255,255,0.06)_24px)] bg-[length:24px_24px]"></div>

            <div className="relative h-full w-full flex flex-col">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b-4 border-yellow-700">
                <div className="flex items-center gap-3">
                  <img src="/assets/edufun.png" alt="Logo" className="h-8" style={{ imageRendering: "pixelated" }} />
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000,-1px 0 #000,0 1px #000,0 -1px #000" }}>
                    Mathematics — Equation Defense
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    XP: {gameScore}
                  </span>
                  <PixelButton size="sm" variant="secondary" onClick={() => { setGameOpen(false); setGameOver(false); }}>
                    Exit
                  </PixelButton>
                </div>
              </div>

              {/* Game field */}
              <div className="relative flex-1 overflow-hidden">
                {/* Player (left) */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-2 bottom-16 w-12 h-16 bg-yellow-300 border-4 border-yellow-700 shadow-[0_0_16px_rgba(255,255,0,0.6)]"
                  style={{ imageRendering: "pixelated" }}
                  title="Player"
                />

                {/* Zombies */}
                {zombies.map((z) => (
                  <motion.div
                    key={z.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute"
                    style={{ left: `${z.x}%`, top: `${z.y}%` }}
                  >
                    <div
                      className="text-xs px-2 py-0.5 bg-yellow-300 border-2 border-yellow-700 text-black font-bold inline-block mb-1"
                      style={{ fontFamily: "'Pixelify Sans', monospace" }}
                    >
                      {z.eq}
                    </div>
                    <div className="w-10 h-10 bg-emerald-300 border-4 border-emerald-700 shadow-[0_0_10px_rgba(0,255,120,0.6)]" style={{ imageRendering: "pixelated" }} />
                  </motion.div>
                ))}

                {/* Game Over */}
                {gameOver && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/80 border-4 border-yellow-700 p-6 text-center">
                      <div className="text-3xl font-bold text-yellow-300 mb-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                        Game Over!
                      </div>
                      <div className="text-yellow-200 mb-4" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                        You earned {gameScore} XP this run.
                      </div>
                      <PixelButton onClick={() => { startGame(); }}>Play Again</PixelButton>
                      <PixelButton variant="secondary" className="ml-2" onClick={() => { setGameOpen(false); setGameOver(false); }}>
                        Close
                      </PixelButton>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom input */}
              <div className="px-4 py-3 bg-black/60 border-t-4 border-yellow-700 flex items-center gap-3">
                <div className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                  Type answer and press Enter:
                </div>
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitAnswer(); }}
                  className="rounded-none border-2 border-yellow-600 bg-yellow-100 text-black max-w-xs"
                  placeholder="Answer"
                />
                <PixelButton size="sm" onClick={submitAnswer}>Solve</PixelButton>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}