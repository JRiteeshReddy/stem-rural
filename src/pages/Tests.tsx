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

  // ========================
  // Chemistry Game: Element Mixer (NEW - drag & drop)
  // ========================
  // Level definitions (reuse targets; keep simple & scalable)
  const mixerLevelTargets: Record<number, Array<string>> = {
    1: ["H2O", "NaCl", "CO2"],
    2: ["MgO", "H2SO4", "NH3"],
    3: ["CH4", "CaCO3", "C6H12O6"],
  };

  // Available element tiles (include required + distractors)
  const mixerAvailableSymbols: Array<string> = [
    "H", "O", "Na", "Cl", "C", "N", "S", "Ca", "Mg",
  ];

  // Reuse helpers from above: parseFormulaToCounts, formatFormula
  // Element Mixer state
  const [elementMixerOpen, setElementMixerOpen] = useState(false);
  const [mixerOver, setMixerOver] = useState(false);
  const [mixerScore, setMixerScore] = useState(0);
  const [mixerLevel, setMixerLevel] = useState(1);
  const [mixerLives, setMixerLives] = useState(3);
  const [mixerTargetKey, setMixerTargetKey] = useState<string>("H2O");
  const mixerTargetCounts = useMemo(() => parseChemFormulaCounts(mixerTargetKey), [mixerTargetKey]);
  const [mixerCollected, setMixerCollected] = useState<Record<string, number>>({});
  const [mixerStartAt, setMixerStartAt] = useState<number>(Date.now());

  // Start/reset Element Mixer
  const startElementMixerGame = () => {
    setElementMixerOpen(true);
    setMixerOver(false);
    setMixerScore(0);
    setMixerLevel(1);
    setMixerLives(3);
    setMixerCollected({});
    const pool = mixerLevelTargets[1];
    setMixerTargetKey(pool[Math.floor(Math.random() * pool.length)]);
    setMixerStartAt(Date.now());
  };

  // Drag handlers
  const onDragStartTile = (e: React.DragEvent<HTMLDivElement>, symbol: string) => {
    e.dataTransfer.setData("text/plain", symbol);
  };

  const onDropIntoChamber = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const symbol = e.dataTransfer.getData("text/plain");
    if (!symbol) return;

    const need = mixerTargetCounts[symbol] || 0;
    const have = mixerCollected[symbol] || 0;
    if (need === 0 || have + 1 > need) {
      // Wrong or over-collection
      setMixerLives((l) => {
        const next = Math.max(0, l - 1);
        if (next === 0) setMixerOver(true);
        return next;
      });
      toast.error("Wrong element! -1 life");
      return;
    }

    // Accept
    const nextCollected = { ...mixerCollected, [symbol]: have + 1 };
    setMixerCollected(nextCollected);

    // Check success
    const success = Object.keys(mixerTargetCounts).every(
      (k) => (nextCollected[k] || 0) === mixerTargetCounts[k]
    );

    if (success) {
      // Time bonus (faster is better)
      const elapsedSec = Math.floor((Date.now() - mixerStartAt) / 1000);
      const timeBonus = Math.max(0, 5 - Math.floor(elapsedSec / 10)); // up to +5 → decays every 10s
      const gain = 2 * mixerLevel + timeBonus;
      setMixerScore((s) => s + gain);
      toast.success(`Compound crafted! +${gain} XP`);
      // Next level
      const nextLevel = Math.min(3, mixerLevel + 1);
      setMixerLevel(nextLevel);
      setMixerCollected({});
      const pool = mixerLevelTargets[nextLevel] || mixerLevelTargets[3];
      setMixerTargetKey(pool[Math.floor(Math.random() * pool.length)]);
      setMixerStartAt(Date.now());
    }
  };

  const onDragOverChamber = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // End session: award XP on close after game over
  useEffect(() => {
    if (!elementMixerOpen || !mixerOver) return;
    (async () => {
      try {
        const res = await addCredits({ amount: mixerScore });
        toast.success(`Game Over! +${mixerScore} XP. Rank: ${res.rank}`);
      } catch (e) {
        console.error(e);
        toast.error("Failed to save score");
      }
    })();
  }, [elementMixerOpen, mixerOver, mixerScore, addCredits]);

  // Auto-start Element Mixer via query ?game=chem
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("game") === "chem") {
      setTimeout(() => startElementMixerGame(), 0);
    }
  }, [location.search]);

  // ========================
  // Chemistry Game: Periodic Pixel Quest
  // ========================
  // State
  const [chemOpen, setChemOpen] = useState(false);
  const [chemOver, setChemOver] = useState(false);
  const [chemScore, setChemScore] = useState(0);
  const [chemLevel, setChemLevel] = useState(1);
  const [chemLives, setChemLives] = useState(3);
  const [containerX, setContainerX] = useState(50); // 0-100%
  type Falling = { id: string; symbol: string; x: number; y: number; vx: number };
  const [falling, setFalling] = useState<Falling[]>([]);
  const [targetKey, setTargetKey] = useState<string>("H2O");
  const [collected, setCollected] = useState<Record<string, number>>({});
  const [chemTick, setChemTick] = useState(0);

  // Level → target pool
  const levelTargets: Record<number, Array<string>> = {
    1: ["H2O", "NaCl", "CO2"],
    2: ["NH3", "H2SO4"],
    3: ["CH4", "CaCO3"],
    4: ["C6H12O6"],
  };

  // Formula map
  function parseFormulaToCounts(formula: string): Record<string, number> {
    // e.g. "H2SO4" -> { H: 2, S: 1, O: 4 }
    const counts: Record<string, number> = {};
    const regex = /([A-Z][a-z]?)(\d*)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(formula)) !== null) {
      const sym = m[1];
      const num = m[2] ? Number(m[2]) : 1;
      counts[sym] = (counts[sym] || 0) + num;
    }
    return counts;
  }

  const targetCounts = useMemo(() => parseChemFormulaCounts(targetKey), [targetKey]);

  function formatFormula(formula: string) {
    const parts = [...formula.matchAll(/([A-Z][a-z]?)(\d*)/g)];
    return (
      <span>
        {parts.map(([_, sym, num], idx) => (
          <span key={idx}>
            {sym}
            {num ? <sub className="align-baseline">{num}</sub> : null}
          </span>
        ))}
      </span>
    );
  }

  const startChemGame = () => {
    setChemOpen(true);
    setChemOver(false);
    setChemScore(0);
    setChemLevel(1);
    setChemLives(3);
    setFalling([]);
    setCollected({});
    setChemTick(0);
    const pool = levelTargets[1];
    setTargetKey(pool[Math.floor(Math.random() * pool.length)]);
  };

  // Keyboard controls for container
  useEffect(() => {
    if (!chemOpen || chemOver) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setContainerX((x) => Math.max(2, x - 6));
      } else if (e.key === "ArrowRight") {
        setContainerX((x) => Math.min(98, x + 6));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chemOpen, chemOver]);

  // Spawning + falling loop
  useEffect(() => {
    if (!chemOpen || chemOver) return;
    const speed = 0.8 + Math.min(1.4, chemLevel * 0.2); // falling speed factor
    const spawnChance = Math.min(0.25 + chemLevel * 0.05, 0.6);
    const possibleSymbols = Array.from(
      new Set([
        ...Object.keys(targetCounts),
        "H", "O", "C", "N", "Na", "Cl", "S", "Ca" // distractors and basics
      ])
    );

    const interval = setInterval(() => {
      setChemTick((t) => t + 1);
      // move
      setFalling((prev) =>
        prev
          .map((f) => ({ ...f, y: f.y + speed, x: f.x + f.vx }))
          .filter((f) => f.y <= 96) // beyond this, it hits bottom (handled below)
      );

      // spawn
      setFalling((prev) => {
        if (prev.length > 7) return prev;
        if (Math.random() < spawnChance) {
          const symbol = possibleSymbols[Math.floor(Math.random() * possibleSymbols.length)];
          const x = Math.max(8, Math.min(92, Math.random() * 100));
          const vx = (Math.random() - 0.5) * 0.4; // slight drift
          const drop: Falling = { id: crypto.randomUUID(), symbol, x, y: 0, vx };
          return [...prev, drop];
        }
        return prev;
      });
    }, 180);
    return () => clearInterval(interval);
  }, [chemOpen, chemOver, chemLevel, targetCounts]);

  // Collision with container at bottom
  useEffect(() => {
    if (!chemOpen || chemOver) return;
    const containerWidthPct = 18; // catch zone width
    const left = containerX - containerWidthPct / 2;
    const right = containerX + containerWidthPct / 2;
    const catchY = 92;

    setFalling((prev) => {
      const survivors: Falling[] = [];
      let caught: Falling[] = [];
      for (const f of prev) {
        if (f.y >= catchY && f.x >= left && f.x <= right) {
          caught.push(f);
        } else {
          survivors.push(f);
        }
      }
      if (caught.length) {
        // handle catches
        const nextCollected = { ...collected };
        let penalty = 0;
        for (const c of caught) {
          const need = targetCounts[c.symbol] || 0;
          const have = nextCollected[c.symbol] || 0;
          if (need === 0 || have + 1 > need) {
            // wrong or over-collected -> penalty
            penalty += 1;
          } else {
            nextCollected[c.symbol] = have + 1;
          }
        }
        if (penalty > 0) {
          setChemLives((l) => Math.max(0, l - penalty));
          // small feedback
          toast.error(`Wrong catch! -${penalty} life${penalty > 1 ? "s" : ""}`);
        }
        setCollected(nextCollected);

        // Check success
        const success = Object.keys(targetCounts).every(
          (k) => (nextCollected[k] || 0) === targetCounts[k]
        );
        if (success) {
          // Award based on level and a small time bonus
          const bonus = Math.max(0, 3 - Math.floor(chemTick / 30));
          const gain = 2 * chemLevel + bonus;
          setChemScore((s) => s + gain);
          toast.success(`Compound crafted! +${gain} XP`);

          // advance level and new target
          const nextLevel = Math.min(4, chemLevel + 1);
          setChemLevel(nextLevel);
          setCollected({});
          const pool = levelTargets[nextLevel] || levelTargets[4];
          setTargetKey(pool[Math.floor(Math.random() * pool.length)]);
          // small celebratory shake via container move
          setContainerX((x) => Math.max(6, Math.min(94, x + (Math.random() < 0.5 ? -4 : 4))));
        }
      }
      return survivors;
    });
  }, [chemOpen, chemOver, containerX, chemTick, collected, targetCounts, chemLevel]);

  // Bottom misses reduce life
  useEffect(() => {
    if (!chemOpen || chemOver) return;
    // Any falling pieces that reach beyond catch Y but not caught are filtered out in the movement loop.
    // We also penalize when y passes 96 without being caught (simulate clutter/life loss lightly).
    // Implement light periodic penalty if too many bypass:
    const check = setInterval(() => {
      // Random small chance penalty to simulate clutter buildup
      if (Math.random() < 0.15) {
        setChemLives((l) => Math.max(0, l - 1));
        toast.message("Clutter overflow! -1 life");
      }
    }, 2000);
    return () => clearInterval(check);
  }, [chemOpen, chemOver]);

  // Game over when lives depleted
  useEffect(() => {
    if (!chemOpen || chemOver) return;
    if (chemLives <= 0) {
      setChemOver(true);
      (async () => {
        try {
          const res = await addCredits({ amount: chemScore });
          toast.success(`Game Over! +${chemScore} XP. Rank: ${res.rank}`);
        } catch (e) {
          console.error(e);
          toast.error("Failed to save score");
        }
      })();
    }
  }, [chemLives, chemOpen, chemOver, chemScore, addCredits]);

  // Auto-start chemistry falling game now moved to ?game=chemfall (Element Mixer uses ?game=chem)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("game") === "chemfall") {
      setTimeout(() => startChemGame(), 0);
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
        <div className="mb-4 flex gap-3">
          <PixelButton size="sm" onClick={startGame}>Play Math Game</PixelButton>
          <PixelButton size="sm" onClick={startElementMixerGame}>Play Chemistry Game</PixelButton>
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
  className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-16"
  title="Player"
>
  <img
    src="https://harmless-tapir-303.convex.cloud/api/storage/7e1c7ca6-36e4-4752-865f-da24c22d7af5"
    alt="Hero"
    className="w-full h-full object-contain"
    style={{ imageRendering: "pixelated" }}
  />
</motion.div>

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
                    <img
                      src="https://harmless-tapir-303.convex.cloud/api/storage/1d3f35cb-b4cf-47e9-a170-bb1d29a26e46"
                      alt="Enemy"
                      className="w-10 h-10 object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
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

        {/* Chemistry Game Overlay */}
        {chemOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-sm border-4 border-yellow-600">
            {/* retro grid */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_23px,rgba(255,255,255,0.06)_24px),linear-gradient(90deg,transparent_23px,rgba(255,255,255,0.06)_24px)] bg-[length:24px_24px]"></div>

            <div className="relative h-full w-full flex flex-col">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b-4 border-yellow-700">
                <div className="flex items-center gap-3">
                  <img src="/assets/edufun.png" alt="Logo" className="h-8" style={{ imageRendering: "pixelated" }} />
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000,-1px 0 #000,0 1px #000,0 -1px #000" }}>
                    Chemistry — Periodic Pixel Quest
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    XP: {chemScore}
                  </span>
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    ❤ {chemLives}
                  </span>
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    Lv {chemLevel}
                  </span>
                  <PixelButton size="sm" variant="secondary" onClick={() => { setChemOpen(false); setChemOver(false); }}>
                    Exit
                  </PixelButton>
                </div>
              </div>

              {/* Target compound banner */}
              <div className="px-4 py-2 bg-black/40 border-b-4 border-yellow-700 flex items-center justify-center">
                <div className="text-yellow-300 font-bold text-xl" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000,-1px 0 #000,0 1px #000,0 -1px #000" }}>
                  Craft {formatChemFormulaJSX(targetKey)}
                </div>
              </div>

              {/* Game field */}
              <div className="relative flex-1 overflow-hidden">
                {/* Falling elements */}
                {falling.map((f) => (
                  <motion.div
                    key={f.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute"
                    style={{ left: `${f.x}%`, top: `${f.y}%` }}
                  >
                    <div
                      className="w-10 h-10 flex items-center justify-center bg-cyan-300 border-4 border-cyan-700 text-black font-bold shadow-[0_0_10px_rgba(0,255,255,0.5)]"
                      style={{ imageRendering: "pixelated", fontFamily: "'Pixelify Sans', monospace" }}
                    >
                      {f.symbol}
                    </div>
                  </motion.div>
                ))}

                {/* Container (catcher) */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-6"
                  style={{ left: `calc(${containerX}% - 9rem/2)` }}
                >
                  <div
                    className="w-36 h-10 bg-yellow-300 border-4 border-yellow-700 shadow-[0_0_16px_rgba(255,255,0,0.6)] flex items-center justify-center"
                    style={{ imageRendering: "pixelated" }}
                    title="Mixer"
                  >
                    MIX
                  </div>
                </motion.div>

                {/* Success/Overlays */}
                {chemOver && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/80 border-4 border-yellow-700 p-6 text-center">
                      <div className="text-3xl font-bold text-yellow-300 mb-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                        Game Over!
                      </div>
                      <div className="text-yellow-200 mb-4" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                        You earned {chemScore} XP this run.
                      </div>
                      <PixelButton onClick={() => { startChemGame(); }}>Play Again</PixelButton>
                      <PixelButton variant="secondary" className="ml-2" onClick={() => { setChemOpen(false); setChemOver(false); }}>
                        Close
                      </PixelButton>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom HUD: collected */}
              <div className="px-4 py-3 bg-black/60 border-t-4 border-yellow-700 flex items-center gap-4 overflow-x-auto">
                <div className="text-yellow-300 font-bold shrink-0" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                  Collected:
                </div>
                <div className="flex items-center gap-3">
                  {Object.keys(targetCounts).map((sym) => (
                    <div key={sym} className="text-yellow-200 font-bold px-2 py-1 bg-black/50 border-2 border-yellow-700" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                      {sym}: {(collected[sym] || 0)} / {targetCounts[sym]}
                    </div>
                  ))}
                </div>
                <div className="ml-auto text-yellow-200 text-xs" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                  Use ← → to move the mixer
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Element Mixer Overlay (NEW) */}
        {elementMixerOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-sm border-4 border-yellow-600">
            {/* retro grid */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_23px,rgba(255,255,255,0.06)_24px),linear-gradient(90deg,transparent_23px,rgba(255,255,255,0.06)_24px)] bg-[length:24px_24px]"></div>

            <div className="relative h-full w-full flex flex-col">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b-4 border-yellow-700">
                <div className="flex items-center gap-3">
                  <img src="/assets/edufun.png" alt="Logo" className="h-8" style={{ imageRendering: "pixelated" }} />
                  <span
                    className="text-yellow-300 font-bold"
                    style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000,-1px 0 #000,0 1px #000,0 -1px #000" }}
                  >
                    Chemistry — Element Mixer
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    XP: {mixerScore}
                  </span>
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    ❤ {mixerLives}
                  </span>
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    Lv {mixerLevel}
                  </span>
                  <PixelButton size="sm" variant="secondary" onClick={() => { setElementMixerOpen(false); setMixerOver(false); }}>
                    Exit
                  </PixelButton>
                </div>
              </div>

              {/* Target compound banner */}
              <div className="px-4 py-2 bg-black/40 border-b-4 border-yellow-700 flex items-center justify-center">
                <div
                  className="text-yellow-300 font-bold text-xl"
                  style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000,-1px 0 #000,0 1px #000,0 -1px #000" }}
                >
                  Create {formatChemFormulaJSX(mixerTargetKey)}
                </div>
              </div>

              {/* Game field */}
              <div className="relative flex-1 overflow-hidden">
                <div className="h-full w-full grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
                  {/* Tiles palette */}
                  <div className="bg-black/50 border-4 border-yellow-700 p-4">
                    <div className="text-yellow-300 font-bold mb-3" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                      Elements
                    </div>
                    <div className="grid grid-cols-6 gap-3">
                      {mixerAvailableSymbols.map((sym) => (
                        <div
                          key={sym}
                          draggable
                          onDragStart={(e) => onDragStartTile(e, sym)}
                          className="w-12 h-12 flex items-center justify-center bg-cyan-300 border-4 border-cyan-700 text-black font-bold shadow-[0_0_10px_rgba(0,255,255,0.5)] cursor-grab active:cursor-grabbing select-none"
                          style={{ imageRendering: "pixelated", fontFamily: "'Pixelify Sans', monospace" }}
                          title={`Drag ${sym}`}
                        >
                          {sym}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mixing chamber (drop zone) */}
                  <div className="bg-black/50 border-4 border-yellow-700 p-4 flex flex-col items-center justify-center">
                    <div className="text-yellow-200 mb-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                      Drag elements here to mix
                    </div>
                    <div
                      onDrop={onDropIntoChamber}
                      onDragOver={onDragOverChamber}
                      className="w-64 h-40 bg-yellow-300 border-4 border-yellow-700 shadow-[0_0_16px_rgba(255,255,0,0.6)] flex items-center justify-center"
                      style={{ imageRendering: "pixelated" }}
                      title="Mixing Chamber"
                    >
                      MIX
                    </div>
                    {/* Success / Game Over overlay */}
                    {mixerOver && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/80 border-4 border-yellow-700 p-6 text-center">
                          <div className="text-3xl font-bold text-yellow-300 mb-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                            Game Over!
                          </div>
                          <div className="text-yellow-200 mb-4" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                            You earned {mixerScore} XP this run.
                          </div>
                          <PixelButton onClick={() => { startElementMixerGame(); }}>Play Again</PixelButton>
                          <PixelButton variant="secondary" className="ml-2" onClick={() => { setElementMixerOpen(false); setMixerOver(false); }}>
                            Close
                          </PixelButton>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Collected HUD */}
                  <div className="bg-black/50 border-4 border-yellow-700 p-4">
                    <div className="text-yellow-300 font-bold mb-3" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                      Collected
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {Object.keys(mixerTargetCounts).map((sym) => (
                        <div
                          key={sym}
                          className="text-yellow-200 font-bold px-2 py-1 bg-black/50 border-2 border-yellow-700"
                          style={{ fontFamily: "'Pixelify Sans', monospace" }}
                        >
                          {sym}: {(mixerCollected[sym] || 0)} / {mixerTargetCounts[sym]}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-yellow-200 text-xs" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                      Tip: Don't over-collect a required element — it costs a life.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function parseChemFormulaCounts(formula: string) {
  const counts: Record<string, number> = {};
  const regex = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(formula)) !== null) {
    const sym = m[1];
    const num = m[2] ? Number(m[2]) : 1;
    counts[sym] = (counts[sym] || 0) + num;
  }
  return counts;
}

function formatChemFormulaJSX(formula: string) {
  const parts = [...formula.matchAll(/([A-Z][a-z]?)(\d*)/g)];
  return (
    <span>
      {parts.map(([_, sym, num], idx) => (
        <span key={idx}>
          {sym}
          {num ? <sub className="align-baseline">{num}</sub> : null}
        </span>
      ))}
    </span>
  );
}