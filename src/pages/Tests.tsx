// @ts-nocheck

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
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useLocation } from "react-router";
import { toast } from "sonner";
import { useRef } from "react";

// Keep existing type declaration and constants
type TestDoc = ReturnType<typeof useQuery<typeof api.tests.getPublishedTests>> extends (infer T)[] | undefined ? T : any;

const ENABLE_PHYSICS = false; // Disable Gravity Dash entirely

export default function Tests() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tests = useQuery(api.tests.getPublishedTests);
  const submitTest = useMutation(api.tests.submitTest);
  const addCredits = useConvexMutation(api.users.addCredits);
  const addCreditsBiocell = useMutation(api.users.addCredits);

  const [openId, setOpenId] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; totalPoints: number; creditsEarned: number } | null>(null);

  // Add: derive the active test from openId
  const activeTest = useMemo(() => {
    if (!tests || !openId) return null;
    return (tests as any[]).find((t: any) => String(t._id) === openId) ?? null;
  }, [tests, openId]);

  // Add: initialize per-test state when a test is opened
  useEffect(() => {
    if (!activeTest) return;
    setQuestionIndex(0);
    setAnswers(Array(activeTest.questions?.length ?? 0).fill(-1));
    setResult(null);
    setSubmitting(false);
  }, [activeTest]);

  // Add: select option helper
  function selectOption(qIdx: number, choice: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = choice;
      return next;
    });
  }

  // Add: submit handler
  async function handleSubmit() {
    if (!activeTest || submitting) return;
    setSubmitting(true);
    try {
      const resp = await submitTest({
        testId: (activeTest as any)._id,
        answers,
      } as any);
      setResult(resp as any);
      toast.success("Test submitted!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  }

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

        // ensure unique answer and no vertical overlap (lane-based)
        const level = Math.max(1, Math.floor(gameScore / 3) + 1);
        const ySlots = [10, 25, 40, 55, 70, 85];

        // block lanes already in use (avoid vertical overlap)
        const occupied = new Set<number>();
        for (const z of prev) {
          // snap to nearest slot
          const nearest = ySlots.reduce((a, b) => (Math.abs(z.y - a) < Math.abs(z.y - b) ? a : b));
          occupied.add(nearest);
        }
        const freeSlots = ySlots.filter((s) => !occupied.has(s));
        if (freeSlots.length === 0) return prev;

        // generate equation ensuring unique answer among active zombies
        let tries = 0;
        let eq = "";
        let ans = 0;
        do {
          const g = genEquation(level);
          eq = g.eq;
          ans = g.ans;
          tries++;
          if (tries > 6) break;
        } while (prev.some((z) => z.ans === ans));

        if (prev.some((z) => z.ans === ans)) return prev; // give up this tick if still dup

        const y = freeSlots[Math.floor(Math.random() * freeSlots.length)];
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

  // Add: Math game intro modal state
  const [showMathIntro, setShowMathIntro] = useState(false);

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
  // Element sprite mappings for chemistry games (custom icons)
  const ELEMENT_SPRITES: Record<string, string> = {
    H: "https://harmless-tapir-303.convex.cloud/api/storage/b15803ea-472a-48d9-bd14-f8d113926db5",
    O: "https://harmless-tapir-303.convex.cloud/api/storage/899e9313-b9ba-42f9-ad9b-49c071bb4aa7",
    Cl: "https://harmless-tapir-303.convex.cloud/api/storage/ca9c41f2-062d-4470-af11-ea98cbdd84c0",
    Na: "https://harmless-tapir-303.convex.cloud/api/storage/450fca0e-9236-4d07-a1bc-f482d381babd",
    C: "https://harmless-tapir-303.convex.cloud/api/storage/5626b986-4793-4bd1-ae35-56e50c57d437",
    N: "https://harmless-tapir-303.convex.cloud/api/storage/f4ade3bd-4a72-440a-adb3-9cf4c0c49112",
    Mg: "https://harmless-tapir-303.convex.cloud/api/storage/79ccb450-a77a-4526-88ba-24c949386bd5",
    S: "https://harmless-tapir-303.convex.cloud/api/storage/ede767a5-a99e-43c0-819a-f8ee21ffa426",
    Ca: "https://harmless-tapir-303.convex.cloud/api/storage/0788f08d-a5ae-4990-bf8c-0c23dff53879",
  };

  // Return sprite URL if available
  function getElementSprite(symbol: string): string | undefined {
    return ELEMENT_SPRITES[symbol];
  }

  // Render element content as sprite image if available; else fallback text
  function renderElementContent(symbol: string) {
    const sprite = getElementSprite(symbol);
    if (sprite) {
      return (
        <img
          src={sprite}
          alt={`${symbol} sprite`}
          className="w-full h-full object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      );
    }
    return (
      <span className="text-yellow-50 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
        {symbol}
      </span>
    );
  }

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
  // ADD: 30s session timer for Element Mixer
  const [mixerTimeLeft, setMixerTimeLeft] = useState(30);

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
    // ADD: reset timer
    setMixerTimeLeft(30);
  };

  // ADD: countdown for Element Mixer timer (30s per level with life loss and advance on timeout)
  useEffect(() => {
    if (!elementMixerOpen || mixerOver) return;
    const id = setInterval(() => {
      setMixerTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          // Time's up: lose a life, advance level (failed), or game over if no lives left
          setMixerLives((l) => {
            const nextLives = Math.max(0, l - 1);
            if (nextLives === 0) {
              setMixerOver(true);
            } else {
              toast.message("Time’s up! You lost a life.");
              // Advance level on timeout (mark failed) and reset timer
              const nextLevel = Math.min(3, (mixerLevel || 1) + 1);
              setMixerLevel(nextLevel);
              setMixerCollected({});
              const pool = mixerLevelTargets[nextLevel] || mixerLevelTargets[3];
              setMixerTargetKey(pool[Math.floor(Math.random() * pool.length)]);
              setMixerStartAt(Date.now());
              setMixerTimeLeft(30);
            }
            return nextLives;
          });
          return 30;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [elementMixerOpen, mixerOver, mixerLevel]);

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
      {
  // Animate beaker (bounce) on wrong/over drop
  const el = document.getElementById("mixer-beaker") as HTMLImageElement | null;
  if (el) {
    el.style.transformOrigin = "50% 0%";
    el.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(-16px)" },
        { transform: "translateY(0)" },
        { transform: "translateY(-10px)" },
        { transform: "translateY(0)" },
      ],
      { duration: 550, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    );
  }
}
toast.error("Wrong element! -1 life");
      return;
    }

    // Accept
    const nextCollected = { ...mixerCollected, [symbol]: have + 1 };
    setMixerCollected(nextCollected);

// Animate beaker (pendulum swing) on correct drop
{
  const el = document.getElementById("mixer-beaker") as HTMLImageElement | null;
  if (el) {
    el.style.transformOrigin = "50% 0%";
    el.animate(
      [
        { transform: "rotate(-10deg)" },
        { transform: "rotate(10deg)" },
        { transform: "rotate(-6deg)" },
        { transform: "rotate(6deg)" },
        { transform: "rotate(0deg)" },
      ],
      { duration: 600, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    );
  }
}

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
      // Next level and reset timer
      const nextLevel = Math.min(3, mixerLevel + 1);
      setMixerLevel(nextLevel);
      setMixerCollected({});
      const pool = mixerLevelTargets[nextLevel] || mixerLevelTargets[3];
      setMixerTargetKey(pool[Math.floor(Math.random() * pool.length)]);
      setMixerStartAt(Date.now());
      setMixerTimeLeft(30);
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
  // ADD: 30s session timer for Periodic Pixel Quest
  const [chemTimeLeft, setChemTimeLeft] = useState(30);

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

  // Helper to parse formula
  function parseChemFormulaCounts(formula: string): Record<string, number> {
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
    // ADD: reset timer
    setChemTimeLeft(30);
  };

  // ADD: countdown for Periodic Pixel Quest timer (also awards on timeout)
  // 30s timer per level for Chemfall: lose life and advance on timeout; game over only when lives reach 0
  useEffect(() => {
    if (!chemOpen || chemOver) return;
    const id = setInterval(() => {
      setChemTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setChemLives((l) => {
            const nextLives = Math.max(0, l - 1);
            if (nextLives === 0) {
              setChemOver(true);
            } else {
              toast.message("Time’s up! You lost a life.");
              // Advance level on timeout (failed) and reset timer
              const nextLevel = Math.min(4, (chemLevel || 1) + 1);
              setChemLevel(nextLevel);
              setCollected({});
              const pool = levelTargets[nextLevel] || levelTargets[4];
              setTargetKey(pool[Math.floor(Math.random() * pool.length)]);
              setChemTimeLeft(30);
            }
            return nextLives;
          });
          return 30;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [chemOpen, chemOver, chemLevel]);

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
          toast.error(`Wrong catch! -${penalty} life`);
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

          // advance level and new target, reset timer
          const nextLevel = Math.min(4, chemLevel + 1);
          setChemLevel(nextLevel);
          setCollected({});
          const pool = levelTargets[nextLevel] || levelTargets[4];
          setTargetKey(pool[Math.floor(Math.random() * pool.length)]);
          setChemTimeLeft(30);
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

  // Add: Physics Game (Gravity Dash) state and helpers
  const [physicsOpen, setPhysicsOpen] = useState(false);
  const [physicsOver, setPhysicsOver] = useState(false);
  const [physicsScore, setPhysicsScore] = useState(0);
  const [physicsLevel, setPhysicsLevel] = useState(1);
  const [physicsLives, setPhysicsLives] = useState(3);
  type GravityDir = "down" | "up" | "left" | "right";
  const [gravity, setGravity] = useState<GravityDir>("down");
  type PxObstacle = { id: string; x: number; y: number; w: number; h: number; vx: number };
  type PxOrb = { id: string; x: number; y: number; r: number; vx: number };
  const [pxObstacles, setPxObstacles] = useState<PxObstacle[]>([]);
  const [pxOrbs, setPxOrbs] = useState<PxOrb[]>([]);
  const [runnerPos, setRunnerPos] = useState<{ x: number; y: number }>({ x: 12, y: 70 }); // percent
  const [pxTick, setPxTick] = useState(0);
  // Start/reset Physics Game
  const startPhysicsGame = () => {
    setPhysicsOpen(true);
    setPhysicsOver(false);
    setPhysicsScore(0);
    setPhysicsLevel(1);
    setPhysicsLives(3);
    setGravity("down");
    setRunnerPos({ x: 12, y: 70 });
    setPxObstacles([]);
    setPxOrbs([]);
    setPxTick(0);
  };
  // Cycle gravity
  const cycleGravity = () => {
    setGravity((g) => (g === "down" ? "up" : g === "up" ? "left" : g === "left" ? "right" : "down"));
    // small flip animation hint by nudging runner slightly toward new surface
    setRunnerPos((p) => {
      if (gravity === "down") return { x: p.x, y: 30 };
      if (gravity === "up") return { x: 20, y: p.y };
      if (gravity === "left") return { x: 80, y: p.y };
      return { x: p.x, y: 70 };
    });
  };

  // Auto-start via query ?game=physics
  useEffect(() => {
    if (!ENABLE_PHYSICS) return;
    const params = new URLSearchParams(location.search);
    if (params.get("game") === "physics") setTimeout(() => startPhysicsGame(), 0);
  }, [location.search]);

  // Controls: arrow keys or space to cycle gravity
  useEffect(() => {
    if (!physicsOpen || physicsOver) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        cycleGravity();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [physicsOpen, physicsOver, gravity]);

  // Main loop: spawn/move obstacles & orbs, collisions, level scaling
  useEffect(() => {
    if (!physicsOpen || physicsOver) return;
    const baseSpeed = 0.7 + physicsLevel * 0.15;
    const interval = setInterval(() => {
      setPxTick((t) => t + 1);
      // Move entities left (side-scroller)
      setPxObstacles((prev) =>
        prev
          .map((o) => ({ ...o, x: o.x - (o.vx || baseSpeed) }))
          .filter((o) => o.x + o.w > -5)
      );
      setPxOrbs((prev) =>
        prev
          .map((o) => ({ ...o, x: o.x - (o.vx || baseSpeed * 0.9) }))
          .filter((o) => o.x + o.r > -5)
      );

      // Spawn logic
      setPxObstacles((prev) => {
        const spawnChance = Math.min(0.18 + physicsLevel * 0.03, 0.45);
        if (prev.length < 6 && Math.random() < spawnChance) {
          const laneY = [30, 50, 70]; // floor/ceiling/walls alignment targets
          const y = laneY[Math.floor(Math.random() * laneY.length)];
          const w = 6 + Math.floor(Math.random() * 6);
          const h = 8 + Math.floor(Math.random() * 10);
          const vx = baseSpeed + Math.random() * 0.3;
          return [...prev, { id: crypto.randomUUID(), x: 102, y, w, h, vx }];
        }
        return prev;
      });
      setPxOrbs((prev) => {
        if (prev.length < 4 && Math.random() < 0.25) {
          const y = 40 + Math.random() * 40;
          const r = 3 + Math.random() * 2;
          const vx = baseSpeed * 0.9;
          return [...prev, { id: crypto.randomUUID(), x: 102, y, r, vx }];
        }
        return prev;
      });

      // Runner auto-adjust towards surface depending on gravity
      setRunnerPos((p) => {
        const step = 2.2;
        if (gravity === "down") return { x: 12, y: Math.min(90, p.y + step) };
        if (gravity === "up") return { x: 12, y: Math.max(10, p.y - step) };
        if (gravity === "left") return { x: Math.max(8, p.x - step), y: 50 };
        return { x: Math.min(20, p.x + step), y: 50 }; // right gravity
      });

      // Collisions
      setPxObstacles((obs) => {
        let hit = false;
        const runnerBox = { x: runnerPos.x, y: runnerPos.y, w: 6, h: 10 };
        for (const o of obs) {
          const overlap =
            Math.abs(o.x - runnerBox.x) < (o.w + runnerBox.w) / 2 &&
            Math.abs(o.y - runnerBox.y) < (o.h + runnerBox.h) / 2;
          if (overlap) {
            hit = true;
            break;
          }
        }
        if (hit) {
          setPhysicsLives((l) => {
            const next = Math.max(0, l - 1);
            if (next === 0) {
              setPhysicsOver(true);
              (async () => {
                try {
                  const res = await addCredits({ amount: physicsScore });
                  toast.success(`Game Over! +${physicsScore} XP. Rank: ${res.rank}`);
                } catch (e) {
                  console.error(e);
                  toast.error("Failed to save score");
                }
              })();
            } else {
              toast.message("Ouch! -1 life");
            }
            return next;
          });
        }
        return obs;
      });

      // Orb collection
      setPxOrbs((orbs) => {
        const runnerBox = { x: runnerPos.x, y: runnerPos.y, r: 7 };
        let collectedIds: Set<string> = new Set();
        for (const o of orbs) {
          const dist = Math.hypot(o.x - runnerBox.x, o.y - runnerBox.y);
          if (dist <= o.r + runnerBox.r) {
            collectedIds.add(o.id);
            setPhysicsScore((s) => s + 2);
          }
        }
        if (collectedIds.size) {
          toast.success("+2 Physics XP (orb)");
        }
        return orbs.filter((o) => !collectedIds.has(o.id));
      });

      // Level up
      setPhysicsScore((s) => {
        const nextLevel =
          s >= 40 ? 4 : s >= 24 ? 3 : s >= 10 ? 2 : 1;
        if (nextLevel !== physicsLevel) setPhysicsLevel(nextLevel);
        return s;
      });
    }, 180);
    return () => clearInterval(interval);
  }, [physicsOpen, physicsOver, physicsLevel, gravity, runnerPos, addCredits, physicsScore]);

  // Removed stray physics launcher block

  // Physics Game Overlay
  {/* Physics game removed */}
  {false && (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-sm border-4 border-yellow-600">
      <div className="relative h-full w-full flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b-4 border-yellow-700">
          <div className="flex items-center gap-3">
            <img src="/assets/edufun.png" alt="Logo" className="h-8" style={{ imageRendering: "pixelated" }} />
            <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace", textShadow: "1px 0 #000,-1px 0 #000,0 1px #000,0 -1px #000" }}>
              Physics — Gravity Dash
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
              XP: {physicsScore}
            </span>
            <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
              ❤ {physicsLives}
            </span>
            <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
              Lv {physicsLevel}
            </span>
            <PixelButton size="sm" onClick={cycleGravity}>
              Flip Gravity
            </PixelButton>
            <PixelButton size="sm" variant="secondary" onClick={() => { setPhysicsOpen(false); setPhysicsOver(false); }}>
              Exit
            </PixelButton>
          </div>
        </div>

        {/* Game field */}
        <div className="relative flex-1 overflow-hidden">
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,10,20,1) 0%, rgba(15,20,40,1) 100%)",
            }}
          />
          {/* Runner (reuse hero sprite) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute"
            style={{ left: `${runnerPos.x}%`, top: `${runnerPos.y}%`, width: 22, height: 30 }}
            title="Runner"
          >
            <img
              src="https://harmless-tapir-303.convex.cloud/api/storage/7e1c7ca6-36e4-4752-865f-da24c22d7af5"
              alt="Runner"
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated", transform: gravity === "up" ? "rotate(180deg)" : gravity === "left" ? "rotate(-90deg)" : gravity === "right" ? "rotate(90deg)" : "none" }}
            />
          </motion.div>

          {/* Obstacles */}
          {pxObstacles.map((o) => (
            <div
              key={o.id}
              className="absolute bg-rose-400 border-4 border-rose-700"
              style={{
                left: `${o.x}%`,
                top: `${o.y}%`,
                width: `${o.w}px`,
                height: `${o.h}px`,
                imageRendering: "pixelated",
                boxShadow: "0 0 12px rgba(255,80,120,0.5)",
              }}
              title="Lab Obstacle"
            />
          ))}

          {/* Orbs (collectibles) */}
          {pxOrbs.map((c) => (
            <div
              key={c.id}
              className="absolute rounded-full bg-cyan-300 border-4 border-cyan-600 shadow-[0_0_12px_rgba(0,255,255,0.55)]"
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                width: `${c.r * 2}px`,
                height: `${c.r * 2}px`,
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 12px rgba(0,255,255,0.55)",
                imageRendering: "pixelated",
              }}
              title="Physics Orb (F=ma)"
            />
          ))}

          {/* Game Over */}
          {physicsOver && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/80 border-4 border-yellow-700 p-6 text-center">
                <div className="text-3xl font-bold text-yellow-300 mb-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                  Game Over!
                </div>
                <div className="text-yellow-200 mb-4" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                  You earned {physicsScore} XP this run.
                </div>
                <PixelButton onClick={() => { startPhysicsGame(); }}>Play Again</PixelButton>
                <PixelButton variant="secondary" className="ml-2" onClick={() => { setPhysicsOpen(false); setPhysicsOver(false); }}>
                  Close
                </PixelButton>
              </div>
            </div>
          )}
        </div>
        {/* Bottom HUD */}
        <div className="px-4 py-3 bg-black/60 border-t-4 border-yellow-700 flex items-center gap-4">
          <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            Tip: Press Space or Arrow keys to flip gravity
          </span>
        </div>
      </div>
    </div>
  )}

  // Add Cell Defender (Biology) game state
  const [biocellOverlay, setBiocellOverlay] = useState(false);
  const [biocellScore, setBiocellScore] = useState(0);
  const [biocellLevel, setBiocellLevel] = useState(1);
  const [biocellBaseHealth, setBiocellBaseHealth] = useState(100);
  const [biocellFireRate, setBiocellFireRate] = useState(1);
  const [biocellBuffActive, setBiocellBuffActive] = useState(false);
  const [biocellDefeated, setBiocellDefeated] = useState(0);

  // Add: URL params handler
  // Only auto-open Biology mini-game from URL; do not reference other overlays here
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const game = params.get("game");
    if (game === "biocell") {
      setBiocellOverlay(true);
    }
  }, []);

  // Cell Defender Game Component
  const CellDefenderGame = () => {
    const gameRef = useRef<HTMLDivElement>(null);
    const [gameState, setGameState] = useState<{
      player: { x: number; y: number };
      enemies: Array<{
        id: number;
        x: number;
        y: number;
        type: 'virus' | 'bacteria' | 'toxin';
        label: string;
        hp: number;
        maxHp: number;
        speed: number;
      }>;
      projectiles: Array<{ id: number; x: number; y: number }>;
      facts: Array<{ id: number; x: number; y: number; text: string; opacity: number }>;
      powerups: Array<{ id: number; x: number; y: number; type: 'vaccine' }>;
      paused: boolean;
    }>({ player: { x: 50, y: 250 }, enemies: [], projectiles: [], facts: [], powerups: [], paused: false });
    const keysRef = useRef<Set<string>>(new Set());
    const gameLoopRef = useRef<number | null>(null);
    const lastSpawnRef = useRef(0);
    const nextEnemyIdRef = useRef(1);
    const nextProjectileIdRef = useRef(1);
    const nextFactIdRef = useRef(1);
    const nextPowerupIdRef = useRef(1);
    const buffTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const enemyTypes: {
      virus: { hp: number; speed: number; labels: string[] };
      bacteria: { hp: number; speed: number; labels: string[] };
      toxin: { hp: number; speed: number; labels: string[] };
    } = {
      virus: { hp: 2, speed: 3, labels: ['Influenza', 'Rhinovirus', 'COVID-19'] },
      bacteria: { hp: 4, speed: 2, labels: ['E. coli', 'Salmonella', 'Streptococcus'] },
      toxin: { hp: 6, speed: 1, labels: ['Toxin', 'Poison', 'Venom'] },
    };

    const facts = [
      "WBCs engulf bacteria by phagocytosis!",
      "Antibodies neutralize viruses!",
      "T-cells remember past infections!",
      "Macrophages are cellular vacuum cleaners!",
      "Vaccines train your immune system!",
      "Fever helps fight infections!",
    ];

    const spawnEnemy = () => {
      const types = Object.keys(enemyTypes) as Array<keyof typeof enemyTypes>;
      const availableTypes: Array<keyof typeof enemyTypes> =
        biocellLevel === 1 ? (['virus', 'bacteria'] as Array<keyof typeof enemyTypes>) : types;
      const type: keyof typeof enemyTypes =
        availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const config = enemyTypes[type];
      const label = config.labels[Math.floor(Math.random() * config.labels.length)];
      
      // Use lanes to prevent overlap
      const lanes = [100, 150, 200, 250, 300, 350, 400];
      const y = lanes[Math.floor(Math.random() * lanes.length)];

      const enemy = {
        id: nextEnemyIdRef.current++,
        x: 800,
        y,
        type,
        label,
        hp: config.hp,
        maxHp: config.hp,
        speed: config.speed * (1 + biocellLevel * 0.2),
      };

      setGameState(prev => ({
        ...prev,
        enemies: [...prev.enemies, enemy],
      }));
    };

    const spawnPowerup = () => {
      if (Math.random() < 0.1) { // 10% chance
        const powerup = {
          id: nextPowerupIdRef.current++,
          x: 700,
          y: 100 + Math.random() * 400,
          type: 'vaccine' as const,
        };
        setGameState(prev => ({
          ...prev,
          powerups: [...prev.powerups, powerup],
        }));
      }
    };

    const fireProjectile = () => {
      const projectile = {
        id: nextProjectileIdRef.current++,
        x: gameState.player.x + 20,
        y: gameState.player.y + 10,
      };
      setGameState(prev => ({
        ...prev,
        projectiles: [...prev.projectiles, projectile],
      }));
    };

    const addFact = (x: number, y: number) => {
      const fact = {
        id: nextFactIdRef.current++,
        x,
        y,
        text: facts[Math.floor(Math.random() * facts.length)],
        opacity: 1,
      };
      setGameState(prev => ({
        ...prev,
        facts: [...prev.facts, fact],
      }));
    };

    const gameLoop = () => {
      if (gameState.paused) return;

      const now = Date.now();
      const spawnInterval = Math.max(1000, 3000 - biocellLevel * 200);

      // Spawn enemies
      if (now - lastSpawnRef.current > spawnInterval && gameState.enemies.length < 20) {
        spawnEnemy();
        if (Math.random() < 0.3) spawnPowerup();
        lastSpawnRef.current = now;
      }

      setGameState(prev => {
        let newState = { ...prev };

        // Move player
        const moveSpeed = 4;
        if (keysRef.current.has('ArrowUp') || keysRef.current.has('KeyW')) {
          newState.player.y = Math.max(50, newState.player.y - moveSpeed);
        }
        if (keysRef.current.has('ArrowDown') || keysRef.current.has('KeyS')) {
          newState.player.y = Math.min(450, newState.player.y + moveSpeed);
        }
        if (keysRef.current.has('ArrowLeft') || keysRef.current.has('KeyA')) {
          newState.player.x = Math.max(20, newState.player.x - moveSpeed);
        }
        if (keysRef.current.has('ArrowRight') || keysRef.current.has('KeyD')) {
          newState.player.x = Math.min(750, newState.player.x + moveSpeed);
        }

        // Move enemies
        newState.enemies = newState.enemies.map(enemy => ({
          ...enemy,
          x: enemy.x - enemy.speed,
        }));

        // Check enemies reaching base
        const reachedBase = newState.enemies.filter(e => e.x <= 0);
        if (reachedBase.length > 0) {
          setBiocellBaseHealth(prev => Math.max(0, prev - reachedBase.length * 10));
          newState.enemies = newState.enemies.filter(e => e.x > 0);
        }

        // Move projectiles
        newState.projectiles = newState.projectiles.map(proj => ({
          ...proj,
          x: proj.x + 8,
        })).filter(proj => proj.x < 850);

        // Move powerups
        newState.powerups = newState.powerups.map(powerup => ({
          ...powerup,
          x: powerup.x - 2,
        })).filter(powerup => powerup.x > -50);

        // Collision detection - projectiles vs enemies
        newState.projectiles.forEach(proj => {
          newState.enemies.forEach(enemy => {
            if (
              proj.x < enemy.x + 30 &&
              proj.x + 10 > enemy.x &&
              proj.y < enemy.y + 30 &&
              proj.y + 5 > enemy.y
            ) {
              enemy.hp -= 1;
              newState.projectiles = newState.projectiles.filter(p => p.id !== proj.id);
            }
          });
        });

        // Remove dead enemies and add facts
        const deadEnemies = newState.enemies.filter(e => e.hp <= 0);
        deadEnemies.forEach(enemy => {
          addFact(enemy.x, enemy.y);
          setBiocellScore(prev => prev + 10);
          setBiocellDefeated(prev => prev + 1);
        });
        newState.enemies = newState.enemies.filter(e => e.hp > 0);

        // Player collision with powerups
        newState.powerups.forEach(powerup => {
          if (
            newState.player.x < powerup.x + 20 &&
            newState.player.x + 20 > powerup.x &&
            newState.player.y < powerup.y + 20 &&
            newState.player.y + 20 > powerup.y
          ) {
            setBiocellFireRate(2);
            setBiocellBuffActive(true);
            if (buffTimeoutRef.current) clearTimeout(buffTimeoutRef.current);
            buffTimeoutRef.current = setTimeout(() => {
              setBiocellFireRate(1);
              setBiocellBuffActive(false);
            }, 10000);
            newState.powerups = newState.powerups.filter(p => p.id !== powerup.id);
          }
        });

        // Fade facts
        newState.facts = newState.facts.map(fact => ({
          ...fact,
          opacity: fact.opacity - 0.02,
          y: fact.y - 1,
        })).filter(fact => fact.opacity > 0);

        return newState;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        fireProjectile();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      gameLoopRef.current = requestAnimationFrame(gameLoop);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        if (buffTimeoutRef.current) clearTimeout(buffTimeoutRef.current);
      };
    }, [gameState.paused]);

    // Level progression
    useEffect(() => {
      if (biocellDefeated > 0 && biocellDefeated % 15 === 0) {
        setBiocellLevel(prev => prev + 1);
      }
    }, [biocellDefeated]);

    // Game over check
    useEffect(() => {
      if (biocellBaseHealth <= 0) {
        setGameState(prev => ({ ...prev, paused: true }));
        toast.error("Game Over! The infection spread!");
        setTimeout(() => closeBiocellGame(), 2000);
      }
    }, [biocellBaseHealth]);

    const togglePause = () => {
      setGameState(prev => ({ ...prev, paused: !prev.paused }));
    };

    return (
      <div
        ref={gameRef}
        className="relative w-full h-full overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, #8B0000 0%, #DC143C 50%, #8B0000 100%)',
          backgroundSize: '20px 20px',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      >
        {/* HUD */}
        <div className="absolute top-4 left-4 text-white font-bold z-10" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
          <div>Level: {biocellLevel}</div>
          <div>Score: {biocellScore}</div>
          <div>Base Health: {biocellBaseHealth}%</div>
          <div>Defeated: {biocellDefeated}</div>
          {biocellBuffActive && <div className="text-yellow-300">🚀 VACCINE BOOST!</div>}
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <PixelButton size="sm" onClick={togglePause}>
            {gameState.paused ? "Resume" : "Pause"}
          </PixelButton>
          <PixelButton size="sm" onClick={closeBiocellGame}>
            Exit
          </PixelButton>
        </div>

        {/* Player (WBC) */}
        <div
          className="absolute w-5 h-5 bg-white rounded-full border-2 border-blue-300 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          style={{
            left: gameState.player.x,
            top: gameState.player.y,
            transition: 'none',
          }}
        />

        {/* Enemies */}
        {gameState.enemies.map(enemy => (
          <div key={enemy.id} className="absolute" style={{ left: enemy.x, top: enemy.y }}>
            <div
              className={`w-7 h-7 border-2 ${
                enemy.type === 'virus' ? 'bg-green-500 border-green-700' :
                enemy.type === 'bacteria' ? 'bg-purple-500 border-purple-700' :
                'bg-red-500 border-red-700'
              }`}
              style={{ borderRadius: enemy.type === 'virus' ? '50%' : '0' }}
            />
            <div className="text-xs text-white font-bold mt-1" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
              {enemy.label}
            </div>
            <div className="w-7 h-1 bg-gray-700 mt-1">
              <div
                className="h-full bg-red-500"
                style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
              />
            </div>
          </div>
        ))}

        {/* Projectiles */}
        {gameState.projectiles.map(proj => (
          <div
            key={proj.id}
            className="absolute w-2 h-1 bg-yellow-400 border border-yellow-600"
            style={{ left: proj.x, top: proj.y }}
          />
        ))}

        {/* Powerups */}
        {gameState.powerups.map(powerup => (
          <div
            key={powerup.id}
            className="absolute w-4 h-4 bg-cyan-400 border-2 border-cyan-600 shadow-[0_0_8px_rgba(0,255,255,0.6)]"
            style={{ left: powerup.x, top: powerup.y }}
          >
            💉
          </div>
        ))}

        {/* Facts */}
        {gameState.facts.map(fact => (
          <div
            key={fact.id}
            className="absolute text-xs text-yellow-300 font-bold pointer-events-none"
            style={{
              left: fact.x,
              top: fact.y,
              opacity: fact.opacity,
              fontFamily: "'Pixelify Sans', monospace",
            }}
          >
            {fact.text}
          </div>
        ))}

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 text-white text-xs" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
          <div>WASD/Arrows: Move | Space: Shoot | Collect vaccines for boost!</div>
        </div>

        {/* Pause overlay */}
        {gameState.paused && biocellBaseHealth > 0 && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
            <div className="text-white text-2xl font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
              PAUSED
            </div>
          </div>
        )}
      </div>
    );
  };

  const closeBiocellGame = async () => {
    setBiocellOverlay(false);
    if (biocellScore > 0) {
      try {
        const creditsEarned = Math.floor(biocellDefeated / 3);
        if (creditsEarned > 0) {
          await addCreditsBiocell({ amount: creditsEarned });
          toast.success(`Cell Defender complete! +${creditsEarned} XP earned!`);
        }
      } catch (e) {
        toast.error("Failed to save progress");
      }
    }
    // Reset game state
    setBiocellScore(0);
    setBiocellLevel(1);
    setBiocellBaseHealth(100);
    setBiocellFireRate(1);
    setBiocellBuffActive(false);
    setBiocellDefeated(0);
  };

  // Add: History Game state and URL param handling
  const [showHistoryInfo, setShowHistoryInfo] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);

  // Add: URL params handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get("game");
    if (gameParam === "history") {
      setShowHistoryInfo(true);
    }
  }, []);

  // Add: History Game Component
  function HistoryGame({ onClose }: { onClose: () => void }) {
    const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver'>('playing');
    const [level, setLevel] = useState(1);
    const [lives, setLives] = useState(3);
    const [xp, setXp] = useState(0);
    const [timer, setTimer] = useState(60);
    const [enemies, setEnemies] = useState<Array<{
      id: string;
      x: number;
      y: number;
      speed: number;
      question: string;
      options: string[];
      correctIndex: number;
    }>>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [activeEnemy, setActiveEnemy] = useState<string | null>(null);
    const [powerUps, setPowerUps] = useState({
      timeFreeze: { cooldown: 0, active: false },
      knowledgeBomb: { cooldown: 0 }
    });
    const [showSummary, setShowSummary] = useState(false);
    const [maxLevelReached, setMaxLevelReached] = useState(1);

    const addCredits = useMutation(api.users.addCredits);

    // History questions by level
    const historyQuestions = {
      1: [
        { q: "Who was the first Emperor of Rome?", options: ["Julius Caesar", "Augustus", "Nero", "Trajan"], correct: 1 },
        { q: "Which civilization built the pyramids?", options: ["Greeks", "Romans", "Egyptians", "Babylonians"], correct: 2 },
        { q: "What year did Alexander the Great die?", options: ["336 BC", "323 BC", "356 BC", "300 BC"], correct: 1 },
        { q: "Which river was crucial to ancient Egyptian civilization?", options: ["Euphrates", "Nile", "Tigris", "Indus"], correct: 1 },
        { q: "Who wrote the Iliad and the Odyssey?", options: ["Sophocles", "Aristotle", "Homer", "Plato"], correct: 2 }
      ],
      2: [
        { q: "In what year did the Battle of Hastings occur?", options: ["1066", "1086", "1056", "1076"], correct: 0 },
        { q: "Who was the first Holy Roman Emperor?", options: ["Otto I", "Charlemagne", "Frederick I", "Henry IV"], correct: 1 },
        { q: "Which plague devastated Europe in the 14th century?", options: ["Cholera", "Black Death", "Smallpox", "Typhus"], correct: 1 },
        { q: "What were the Crusades primarily about?", options: ["Trade routes", "Religious wars", "Territorial expansion", "Cultural exchange"], correct: 1 },
        { q: "Who wrote the Divine Comedy?", options: ["Chaucer", "Dante", "Petrarch", "Boccaccio"], correct: 1 }
      ],
      3: [
        { q: "When did World War I begin?", options: ["1912", "1914", "1916", "1918"], correct: 1 },
        { q: "Who was the first President of the United States?", options: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"], correct: 2 },
        { q: "In what year did the Berlin Wall fall?", options: ["1987", "1989", "1991", "1993"], correct: 1 },
        { q: "Which country was the first to land on the moon?", options: ["Soviet Union", "United States", "China", "United Kingdom"], correct: 1 },
        { q: "When did India gain independence?", options: ["1945", "1947", "1949", "1950"], correct: 1 }
      ]
    };

    // Spawn enemy
    const spawnEnemy = useCallback(() => {
      if (gameState !== 'playing') return;
      
      const levelQuestions = historyQuestions[level as keyof typeof historyQuestions] || historyQuestions[1];
      const questionData = levelQuestions[Math.floor(Math.random() * levelQuestions.length)];
      
      // Shuffle options
      const shuffledOptions = [...questionData.options];
      const rightOption = shuffledOptions[questionData.correct];
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }
      const newCorrectIndex = shuffledOptions.indexOf(rightOption);
      
      // Find available lane
      const lanes = [100, 200, 300, 400];
      const occupiedLanes = enemies.map(e => e.y);
      const availableLanes = lanes.filter(l => !occupiedLanes.includes(l));
      
      if (availableLanes.length === 0) return;
      
      const newEnemy = {
        id: Math.random().toString(36).substr(2, 9),
        x: 800,
        y: availableLanes[Math.floor(Math.random() * availableLanes.length)],
        speed: level * 0.5 + 1,
        question: questionData.q,
        options: shuffledOptions,
        correctIndex: newCorrectIndex
      };
      setEnemies(prev => [...prev, newEnemy]);
    }, [enemies, gameState, level]);

    // Game loop
    useEffect(() => {
      if (gameState !== 'playing') return;
      const interval = setInterval(() => {
        setEnemies(prev => prev.map(enemy => ({
          ...enemy,
          x: enemy.x - (enemy.speed)
        })).filter(e => {
          if (e.x <= 50) {
            setLives(l => Math.max(0, l - 1));
            return false;
          }
          return true;
        }));
        
        // Update timer
        setTimer(prev => Math.max(0, prev - 1));
        
        // Update power-up cooldowns
        setPowerUps(prev => ({
          timeFreeze: { ...prev.timeFreeze, cooldown: Math.max(0, prev.timeFreeze.cooldown - 1), active: prev.timeFreeze.active && prev.timeFreeze.cooldown > 55 },
          knowledgeBomb: { ...prev.knowledgeBomb, cooldown: Math.max(0, prev.knowledgeBomb.cooldown - 1) }
        }));
      }, 100);
      return () => clearInterval(interval);
    }, [gameState, powerUps.timeFreeze]);

    // Spawn enemies periodically
    useEffect(() => {
      if (gameState !== 'playing') return;
      const spawnInterval = setInterval(() => {
        if (enemies.length < 3) {
          spawnEnemy();
        }
      }, 3000 - (level * 500));
      return () => clearInterval(spawnInterval);
    }, [spawnEnemy, enemies.length, gameState, level]);

    // Check game over conditions
    useEffect(() => {
      if (lives <= 0 || (timer <= 0 && enemies.length === 0)) {
        setGameState('gameOver');
        setShowSummary(true);
        setMaxLevelReached(Math.max(maxLevelReached, level));
        if (xp > 0) {
          addCredits({ amount: xp }).catch(console.error);
        }
      }
    }, [lives, timer, enemies.length, xp, level, maxLevelReached, addCredits]);

    const handleAnswer = (answerIndex: number, enemyId: string) => {
      const enemy = enemies.find(e => e.id === enemyId);
      if (!enemy) return;
      if (answerIndex === enemy.correctIndex) {
        setXp(prev => prev + 1);
        setEnemies(prev => prev.filter(e => e.id !== enemyId));
        toast.success("Correct! +1 XP");
      } else {
        toast.error("Wrong answer!");
      }
      setSelectedAnswer(null);
      setActiveEnemy(null);
    };

    const useTimeFreeze = () => {
      if (powerUps.timeFreeze.cooldown > 0) return;
      setPowerUps(prev => ({
        ...prev,
        timeFreeze: { cooldown: 60, active: true }
      }));
      toast.success("Time Freeze activated!");
    };

    const useKnowledgeBomb = () => {
      if (powerUps.knowledgeBomb.cooldown > 0) return;
      const clearedCount = enemies.length;
      setEnemies([]);
      setXp(prev => prev + clearedCount);
      setPowerUps(prev => ({
        ...prev,
        knowledgeBomb: { cooldown: 90 }
      }));
      toast.success(`Knowledge Bomb! +${clearedCount} XP`);
    };

    const nextLevel = () => {
      if (level < 3) {
        setLevel(prev => prev + 1);
        setTimer(60);
        setEnemies([]);
        toast.success(`Level ${level + 1} unlocked!`);
      }
    };

    const getBadgeName = (lvl: number) => {
      switch(lvl) {
        case 1: return "Ancient Explorer";
        case 2: return "Freedom Fighter";  
        case 3: return "World Historian";
        default: return "Time Traveler";
      }
    };

    if (showSummary) {
      return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <PixelCard variant="orange" className="p-6 max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Timeline Fixed!</h2>
            <div className="space-y-2 text-center">
              <p>XP Earned: {xp}</p>
              <p>Max Level: {maxLevelReached}</p>
              <p>Badge Unlocked: {getBadgeName(maxLevelReached)}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <PixelButton onClick={() => window.location.reload()} className="flex-1">
                Play Again
              </PixelButton>
              <PixelButton onClick={onClose} variant="secondary" className="flex-1">
                Exit
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/20 flex flex-col z-50">
        {/* Top Bar */}
        <div className="bg-black/80 text-white p-4 flex justify-between items-center">
          <div className="flex gap-4">
            <span>XP: {xp}</span>
            <span>Lives: {"❤️".repeat(lives)}</span>
            <span>Level: {level}</span>
            <span>Time: {timer}s</span>
          </div>
          <div className="flex gap-2">
            <PixelButton 
              size="sm" 
              onClick={useTimeFreeze}
              disabled={powerUps.timeFreeze.cooldown > 0}
            >
              ⏸️ Freeze {powerUps.timeFreeze.cooldown > 0 && `(${powerUps.timeFreeze.cooldown}s)`}
            </PixelButton>
            <PixelButton 
              size="sm" 
              onClick={useKnowledgeBomb}
              disabled={powerUps.knowledgeBomb.cooldown > 0}
            >
              💣 Bomb {powerUps.knowledgeBomb.cooldown > 0 && `(${powerUps.knowledgeBomb.cooldown}s)`}
            </PixelButton>
            <PixelButton size="sm" onClick={() => setGameState(gameState === 'paused' ? 'playing' : 'paused')}>
              {gameState === 'paused' ? '▶️' : '⏸️'}
            </PixelButton>
            <PixelButton size="sm" variant="danger" onClick={onClose}>
              ❌
            </PixelButton>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Time Traveler */}
          <div className="absolute left-8 top-1/2 transform -translate-y-1/2 text-6xl">
            🧭
          </div>

          {/* Enemies */}
          {enemies.map(enemy => (
            <div
              key={enemy.id}
              className="absolute transition-all duration-100"
              style={{ left: `${enemy.x}px`, top: `${enemy.y}px` }}
            >
              <div className="text-4xl">👻</div>
              <div className="bg-black/80 text-white p-2 rounded mt-2 max-w-xs">
                <p className="text-sm mb-2">{enemy.question}</p>
                {activeEnemy === enemy.id ? (
                  <div className="grid grid-cols-1 gap-1">
                    {enemy.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx, enemy.id)}
                        className="text-xs bg-yellow-400 text-black px-2 py-1 rounded hover:bg-yellow-300"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <PixelButton 
                    size="sm" 
                    onClick={() => setActiveEnemy(enemy.id)}
                  >
                    Answer
                  </PixelButton>
                )}
              </div>
            </div>
          ))}

          {/* Level Complete */}
          {timer <= 0 && enemies.length === 0 && lives > 0 && level < 3 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <PixelCard variant="orange" className="p-4">
                <h3 className="text-xl font-bold mb-2">Level {level} Complete!</h3>
                <PixelButton onClick={nextLevel}>Next Level</PixelButton>
              </PixelCard>
            </div>
          )}

          {gameState === 'paused' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <PixelCard variant="orange" className="p-4">
                <h3 className="text-xl font-bold">Game Paused</h3>
              </PixelCard>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <GlobalHeader />
      <main className="max-w-7xl mx-auto p-6">
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
          <PixelButton size="sm" onClick={() => setShowMathIntro(true)}>Enter</PixelButton>
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
            {/* Math game background image */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'url("https://harmless-tapir-303.convex.cloud/api/storage/7e293679-1e76-4aff-ac04-fef5ef1d75dd")',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "contain",
                imageRendering: "pixelated",
              }}
            ></div>

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
                  className="absolute left-6 top-1/2 -translate-y-1/2"
                  style={{ width: 53, height: 69 }}
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
                      className="object-contain"
                      style={{ imageRendering: "pixelated", transform: "scaleX(-1)", width: 61, height: 61 }}
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

        {/* Math Game Intro Dialog */}
        <Dialog open={showMathIntro} onOpenChange={setShowMathIntro}>
          <DialogContent className="sm:max-w-md rounded-none border-4 border-yellow-600">
            <DialogHeader>
              <DialogTitle className="text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                Mathematics — Equation Defense
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <PixelCard variant="orange" className="p-4">
                <p className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                  Help the hero defeat the Shadows by solving and entering the solutions for the math problems
                </p>
              </PixelCard>
              <div className="flex justify-end gap-2">
                <PixelButton
                  variant="secondary"
                  onClick={() => setShowMathIntro(false)}
                >
                  Exit
                </PixelButton>
                <PixelButton
                  onClick={() => {
                    setShowMathIntro(false);
                    startGame();
                  }}
                >
                  Play
                </PixelButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                  {/* ADD: Timer */}
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    ⏱ {chemTimeLeft}s
                  </span>
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
                    className="absolute"
                    style={{ left: `${f.x}%`, top: `${f.y}%` }}
                  >
                    <div
                      className="w-12 h-12 flex items-center justify-center"
                      style={{ imageRendering: "pixelated", fontFamily: "'Pixelify Sans', monospace" }}
                    >
                      {renderElementContent(f.symbol)}
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
                    <img
  id="mixer-beaker"
  src="https://harmless-tapir-303.convex.cloud/api/storage/3acb5efd-f6c5-4652-961a-5a28583dc16f"
  alt="Mixer"
  className="w-[95%] h-[95%] md:w-[98%] md:h-[98%] object-contain"
  style={{ imageRendering: "pixelated" }}
/>
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
                  {/* ADD: Timer */}
                  <span className="text-yellow-300 font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                    ⏱ {mixerTimeLeft}s
                  </span>
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
                          className="w-14 h-14 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
                          style={{ imageRendering: "pixelated", fontFamily: "'Pixelify Sans', monospace" }}
                          title={`Drag ${sym}`}
                        >
                          {renderElementContent(sym)}
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
                      onDrop={onDropIntoChamber} style={{ background: "transparent" }}
                      onDragOver={onDropIntoChamber}
                      className="w-96 h-72 bg-transparent flex items-center justify-center"
                      style={{ imageRendering: "pixelated" }}
                      title="Mixing Chamber"
                    >
                      <img src="https://harmless-tapir-303.convex.cloud/api/storage/3acb5efd-f6c5-4652-961a-5a28583dc16f" alt="Mixer" className="w-full h-full object-contain" style={{ imageRendering: "pixelated" }} />
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

        {/* Cell Defender (Biology) Game Overlay */}
        {biocellOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          >
            <div className="w-full h-full max-w-6xl max-h-[90vh] bg-black border-4 border-green-600 shadow-[0_0_20px_rgba(0,255,0,0.5)] overflow-hidden">
              <CellDefenderGame />
            </div>
          </motion.div>
        )}

        {/* History Game Tile */}
        <PixelCard variant="orange" className="p-6 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h3 className="text-xl font-bold mb-2">History Timeline</h3>
          <p className="text-sm mb-4">Fix historical anomalies by answering questions quickly!</p>
          <PixelButton 
            onClick={() => setActiveGame('history')}
            className="w-full"
          >
            Enter Timeline
          </PixelButton>
        </PixelCard>

        {/* History Game Overlay */}
        {activeGame === 'history' && (
          <HistoryGame onClose={() => setActiveGame(null)} />
        )}

        {/* History Game Info Popup */}
        {showHistoryInfo && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <PixelCard variant="orange" className="p-6 max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-center">History Timeline Defender</h2>
              <p className="mb-4 text-center">
                Fix the timeline! Answer quickly to dispel anomalies.
              </p>
              <div className="flex gap-2">
                <PixelButton 
                  onClick={() => {
                    setShowHistoryInfo(false);
                    setActiveGame('history');
                  }}
                  className="flex-1"
                >
                  Play
                </PixelButton>
                <PixelButton 
                  onClick={() => {
                    setShowHistoryInfo(false);
                    navigate('/tests');
                  }}
                  variant="secondary" 
                  className="flex-1"
                >
                  Exit
                </PixelButton>
              </div>
            </PixelCard>
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

// Add History Game Component after existing games
function HistoryGame({ onClose }: { onClose: () => void }) {
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver'>('playing');
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [xp, setXp] = useState(0);
  const [timer, setTimer] = useState(60);
  const [enemies, setEnemies] = useState<Array<{
    id: string;
    x: number;
    y: number;
    speed: number;
    question: string;
    options: string[];
    correctIndex: number;
  }>>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [activeEnemy, setActiveEnemy] = useState<string | null>(null);
  const [powerUps, setPowerUps] = useState({
    timeFreeze: { cooldown: 0, active: false },
    knowledgeBomb: { cooldown: 0 }
  });
  const [showSummary, setShowSummary] = useState(false);
  const [maxLevelReached, setMaxLevelReached] = useState(1);

  const addCredits = useMutation(api.users.addCredits);

  // History questions by level
  const historyQuestions = {
    1: [
      { q: "Who was the first Emperor of Rome?", options: ["Julius Caesar", "Augustus", "Nero", "Trajan"], correct: 1 },
      { q: "Which civilization built the pyramids?", options: ["Greeks", "Romans", "Egyptians", "Babylonians"], correct: 2 },
      { q: "What year did Alexander the Great die?", options: ["336 BC", "323 BC", "356 BC", "300 BC"], correct: 1 },
      { q: "Which river was crucial to ancient Egyptian civilization?", options: ["Euphrates", "Nile", "Tigris", "Indus"], correct: 1 },
      { q: "Who wrote the Iliad and the Odyssey?", options: ["Sophocles", "Aristotle", "Homer", "Plato"], correct: 2 }
    ],
    2: [
      { q: "In what year did the Battle of Hastings occur?", options: ["1066", "1086", "1056", "1076"], correct: 0 },
      { q: "Who was the first Holy Roman Emperor?", options: ["Otto I", "Charlemagne", "Frederick I", "Henry IV"], correct: 1 },
      { q: "Which plague devastated Europe in the 14th century?", options: ["Cholera", "Black Death", "Smallpox", "Typhus"], correct: 1 },
      { q: "What were the Crusades primarily about?", options: ["Trade routes", "Religious wars", "Territorial expansion", "Cultural exchange"], correct: 1 },
      { q: "Who wrote the Divine Comedy?", options: ["Chaucer", "Dante", "Petrarch", "Boccaccio"], correct: 1 }
    ],
    3: [
      { q: "When did World War I begin?", options: ["1912", "1914", "1916", "1918"], correct: 1 },
      { q: "Who was the first President of the United States?", options: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"], correct: 2 },
      { q: "In what year did the Berlin Wall fall?", options: ["1987", "1989", "1991", "1993"], correct: 1 },
      { q: "Which country was the first to land on the moon?", options: ["Soviet Union", "United States", "China", "United Kingdom"], correct: 1 },
      { q: "When did India gain independence?", options: ["1945", "1947", "1949", "1950"], correct: 1 }
    ]
  };

  // Spawn enemy
  const spawnEnemy = useCallback(() => {
    if (gameState !== 'playing') return;
    
    const levelQuestions = historyQuestions[level as keyof typeof historyQuestions] || historyQuestions[1];
    const questionData = levelQuestions[Math.floor(Math.random() * levelQuestions.length)];
    
    // Shuffle options
    const shuffledOptions = [...questionData.options];
    const rightOption = shuffledOptions[questionData.correct];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }
    const newCorrectIndex = shuffledOptions.indexOf(rightOption);
    
    // Find available lane
    const lanes = [100, 200, 300, 400];
    const occupiedLanes = enemies.map(e => e.y);
    const availableLanes = lanes.filter(l => !occupiedLanes.includes(l));
    
    if (availableLanes.length === 0) return;
    
    const newEnemy = {
      id: Math.random().toString(36).substr(2, 9),
      x: 800,
      y: availableLanes[Math.floor(Math.random() * availableLanes.length)],
      speed: level * 0.5 + 1,
      question: questionData.q,
      options: shuffledOptions,
      correctIndex: newCorrectIndex
    };
    setEnemies(prev => [...prev, newEnemy]);
  }, [enemies, gameState, level]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setEnemies(prev => prev.map(enemy => ({
        ...enemy,
        x: enemy.x - (enemy.speed)
      })).filter(e => {
        if (e.x <= 50) {
          setLives(l => Math.max(0, l - 1));
          return false;
        }
        return true;
      }));
      
      // Update timer
      setTimer(prev => Math.max(0, prev - 1));
      
      // Update power-up cooldowns
      setPowerUps(prev => ({
        timeFreeze: { ...prev.timeFreeze, cooldown: Math.max(0, prev.timeFreeze.cooldown - 1), active: prev.timeFreeze.active && prev.timeFreeze.cooldown > 55 },
        knowledgeBomb: { ...prev.knowledgeBomb, cooldown: Math.max(0, prev.knowledgeBomb.cooldown - 1) }
      }));
    }, 100);
    return () => clearInterval(interval);
  }, [gameState, powerUps.timeFreeze]);

  // Spawn enemies periodically
  useEffect(() => {
    if (gameState !== 'playing') return;
    const spawnInterval = setInterval(() => {
      if (enemies.length < 3) {
        spawnEnemy();
      }
    }, 3000 - (level * 500));
    return () => clearInterval(spawnInterval);
  }, [spawnEnemy, enemies.length, gameState, level]);

  // Check game over conditions
  useEffect(() => {
    if (lives <= 0 || (timer <= 0 && enemies.length === 0)) {
      setGameState('gameOver');
      setShowSummary(true);
      setMaxLevelReached(Math.max(maxLevelReached, level));
      if (xp > 0) {
        addCredits({ amount: xp }).catch(console.error);
      }
    }
  }, [lives, timer, enemies.length, xp, level, maxLevelReached, addCredits]);

  const handleAnswer = (answerIndex: number, enemyId: string) => {
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy) return;
    if (answerIndex === enemy.correctIndex) {
      setXp(prev => prev + 1);
      setEnemies(prev => prev.filter(e => e.id !== enemyId));
      toast.success("Correct! +1 XP");
    } else {
      toast.error("Wrong answer!");
    }
    setSelectedAnswer(null);
    setActiveEnemy(null);
  };

  const useTimeFreeze = () => {
    if (powerUps.timeFreeze.cooldown > 0) return;
    setPowerUps(prev => ({
      ...prev,
      timeFreeze: { cooldown: 60, active: true }
    }));
    toast.success("Time Freeze activated!");
  };

  const useKnowledgeBomb = () => {
    if (powerUps.knowledgeBomb.cooldown > 0) return;
    const clearedCount = enemies.length;
    setEnemies([]);
    setXp(prev => prev + clearedCount);
    setPowerUps(prev => ({
      ...prev,
      knowledgeBomb: { cooldown: 90 }
    }));
    toast.success(`Knowledge Bomb! +${clearedCount} XP`);
  };

  const nextLevel = () => {
    if (level < 3) {
      setLevel(prev => prev + 1);
      setTimer(60);
      setEnemies([]);
      toast.success(`Level ${level + 1} unlocked!`);
    }
  };

  const getBadgeName = (lvl: number) => {
    switch(lvl) {
      case 1: return "Ancient Explorer";
      case 2: return "Freedom Fighter";  
      case 3: return "World Historian";
      default: return "Time Traveler";
    }
  };

  if (showSummary) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <PixelCard variant="orange" className="p-6 max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Timeline Fixed!</h2>
          <div className="space-y-2 text-center">
            <p>XP Earned: {xp}</p>
            <p>Max Level: {maxLevelReached}</p>
            <p>Badge Unlocked: {getBadgeName(maxLevelReached)}</p>
          </div>
          <div className="flex gap-2 mt-4">
            <PixelButton onClick={() => window.location.reload()} className="flex-1">
              Play Again
            </PixelButton>
            <PixelButton onClick={onClose} variant="secondary" className="flex-1">
              Exit
            </PixelButton>
          </div>
        </PixelCard>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex flex-col z-50">
      {/* Top Bar */}
      <div className="bg-black/80 text-white p-4 flex justify-between items-center">
        <div className="flex gap-4">
          <span>XP: {xp}</span>
          <span>Lives: {"❤️".repeat(lives)}</span>
          <span>Level: {level}</span>
          <span>Time: {timer}s</span>
        </div>
        <div className="flex gap-2">
          <PixelButton 
            size="sm" 
            onClick={useTimeFreeze}
            disabled={powerUps.timeFreeze.cooldown > 0}
          >
            ⏸️ Freeze {powerUps.timeFreeze.cooldown > 0 && `(${powerUps.timeFreeze.cooldown}s)`}
          </PixelButton>
          <PixelButton 
            size="sm" 
            onClick={useKnowledgeBomb}
            disabled={powerUps.knowledgeBomb.cooldown > 0}
          >
            💣 Bomb {powerUps.knowledgeBomb.cooldown > 0 && `(${powerUps.knowledgeBomb.cooldown}s)`}
          </PixelButton>
          <PixelButton size="sm" onClick={() => setGameState(gameState === 'paused' ? 'playing' : 'paused')}>
            {gameState === 'paused' ? '▶️' : '⏸️'}
          </PixelButton>
          <PixelButton size="sm" variant="danger" onClick={onClose}>
            ❌
          </PixelButton>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Time Traveler */}
        <div className="absolute left-8 top-1/2 transform -translate-y-1/2 text-6xl">
          🧭
        </div>

        {/* Enemies */}
        {enemies.map(enemy => (
          <div
            key={enemy.id}
            className="absolute transition-all duration-100"
            style={{ left: `${enemy.x}px`, top: `${enemy.y}px` }}
          >
            <div className="text-4xl">👻</div>
            <div className="bg-black/80 text-white p-2 rounded mt-2 max-w-xs">
              <p className="text-sm mb-2">{enemy.question}</p>
              {activeEnemy === enemy.id ? (
                <div className="grid grid-cols-1 gap-1">
                  {enemy.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx, enemy.id)}
                      className="text-xs bg-yellow-400 text-black px-2 py-1 rounded hover:bg-yellow-300"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <PixelButton 
                  size="sm" 
                  onClick={() => setActiveEnemy(enemy.id)}
                >
                  Answer
                </PixelButton>
              )}
            </div>
          </div>
        ))}

        {/* Level Complete */}
        {timer <= 0 && enemies.length === 0 && lives > 0 && level < 3 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <PixelCard variant="orange" className="p-4">
              <h3 className="text-xl font-bold mb-2">Level {level} Complete!</h3>
              <PixelButton onClick={nextLevel}>Next Level</PixelButton>
            </PixelCard>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <PixelCard variant="orange" className="p-4">
              <h3 className="text-xl font-bold">Game Paused</h3>
            </PixelCard>
          </div>
        )}
      </div>
    </div>
  );
}