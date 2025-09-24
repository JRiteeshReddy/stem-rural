import { GlobalHeader } from "@/components/GlobalHeader";
import { PixelCard } from "@/components/PixelCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function Leaderboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const leaderboard = useQuery(api.leaderboard.getLeaderboard);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) navigate("/auth");
      else if (user && !user.role) navigate("/role-selection");
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-orange-200 to-yellow-300">
      <GlobalHeader />
      <main className="max-w-4xl mx-auto p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-4xl font-bold text-black flex items-center gap-2" style={{ fontFamily: "monospace" }}>
            <Trophy size={32} /> Leaderboard
          </h1>
          <p className="text-gray-700" style={{ fontFamily: "monospace" }}>
            Top students by total credits. Updates live as students earn points.
          </p>
        </motion.div>

        <PixelCard variant="orange" className="p-4">
          <div className="space-y-2">
            {!leaderboard ? (
              <div className="text-black" style={{ fontFamily: "monospace" }}>
                Loading...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-black" style={{ fontFamily: "monospace" }}>
                No students yet.
              </div>
            ) : (
              leaderboard.map((s: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between bg-orange-200 border-2 border-orange-400 p-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🍌"}
                    </span>
                    <Avatar className="h-9 w-9 border border-orange-600 rounded-none">
                      <AvatarImage src={s.image || undefined} alt={s.name} />
                      <AvatarFallback className="rounded-none bg-orange-300 text-black">
                        {s.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-black" style={{ fontFamily: "monospace" }}>
                        {s.name}
                      </div>
                      <div className="text-xs text-black/80" style={{ fontFamily: "monospace" }}>
                        Tests: {s.testsCompleted}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-black" style={{ fontFamily: "monospace" }}>
                      {s.credits} 💰
                    </span>
                    <span className="text-xs bg-orange-300 border border-orange-500 px-2 py-0.5 text-black" style={{ fontFamily: "monospace" }}>
                      {s.badge}
                    </span>
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
