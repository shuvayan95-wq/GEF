import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart2, RefreshCw, Eye, Clock, TrendingUp, TrendingDown, Minus,
  Crown, ChevronUp, ChevronDown, Sparkles, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface RankedPlayer {
  rank: number; playerId: number; name: string; team: string; position: string;
  tier: string; blurb: string;
  keyStats: { winRate: number; goals: number; mvps: number; games: number; goalsPerGame: number };
  recentForm: string[]; imageUrl: string | null;
  movement: "UP" | "DOWN" | "SAME" | "NEW"; movementDelta: number;
}

const TIER_COLORS: Record<string, string> = {
  ELITE: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  CONTENDER: "text-sky-400 bg-sky-500/10 border-sky-500/30",
  RISING: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  STEADY: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  FALLING: "text-red-400 bg-red-500/10 border-red-500/30",
};

function MovementBadge({ movement, delta }: { movement: string; delta: number }) {
  if (movement === "NEW") return <span className="text-[10px] font-black text-primary">NEW</span>;
  if (movement === "UP") return <span className="text-[10px] font-black text-emerald-400 flex items-center"><ChevronUp className="w-3 h-3" />{Math.abs(delta)}</span>;
  if (movement === "DOWN") return <span className="text-[10px] font-black text-red-400 flex items-center"><ChevronDown className="w-3 h-3" />{Math.abs(delta)}</span>;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

export function ManagePowerRankings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekLabel, setWeekLabel] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data, isLoading } = useQuery<{ rankings: RankedPlayer[]; weekLabel: string | null; generatedAt: string | null }>({
    queryKey: ["power-rankings"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/power-rankings"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const rankings = data?.rankings ?? [];
  const generatedAt = data?.generatedAt ?? null;
  const currentWeek = data?.weekLabel ?? null;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(getApiUrl("/api/ai/power-rankings/generate"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekLabel: weekLabel.trim() || undefined }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Failed"); }
      await queryClient.invalidateQueries({ queryKey: ["power-rankings"] });
      toast({ title: "Power Rankings published!", description: "Rankings are now live for all users." });
      setWeekLabel("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Generation failed", description: err?.message });
    } finally { setGenerating(false); }
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase">Power Rankings</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate AI-powered weekly player rankings with movement indicators. Published rankings are live immediately.</p>
          {generatedAt && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" /> Current: {currentWeek} · Generated {format(new Date(generatedAt), "PPpp")}
            </div>
          )}
        </div>
        <a href="/power-rankings" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2 border-border shrink-0"><Eye className="w-4 h-4" /> Preview</Button>
        </a>
      </div>

      {/* Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-sm text-muted-foreground flex items-start gap-3">
        <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div>
          Rankings are computed from win rate, goals per game, and MVPs across all recorded matches, then the AI adds commentary and tier labels (ELITE / CONTENDER / RISING / STEADY / FALLING). Movement arrows ↑↓ compare against the previous batch. Generation takes ~15 seconds.
        </div>
      </div>

      {/* Generate form */}
      <div className="bg-card border border-border rounded-xl p-5 mb-8 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Generate New Rankings</h2>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Week Label (optional)</label>
          <input
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            placeholder="Auto-generated if left blank (e.g. 'Week 8 Power Rankings')"
            value={weekLabel}
            onChange={e => setWeekLabel(e.target.value)}
          />
        </div>
        <Button className="gap-2" onClick={handleGenerate} disabled={generating}>
          {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Rankings</>}
        </Button>
      </div>

      {/* Generating overlay */}
      {generating && (
        <div className="bg-card border border-primary/30 rounded-xl p-8 text-center mb-6">
          <BarChart2 className="w-8 h-8 text-primary animate-pulse mx-auto mb-3" />
          <p className="font-semibold">Calculating rankings…</p>
          <p className="text-sm text-muted-foreground mt-1">Reading all player stats and generating AI commentary. ~15 seconds.</p>
        </div>
      )}

      {/* Current rankings */}
      {!isLoading && !generating && rankings.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <BarChart2 className="w-4 h-4" />
            <span>Current Rankings</span>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{rankings.length} players</span>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {rankings.map((p, i) => {
                const tierCls = TIER_COLORS[p.tier] ?? TIER_COLORS.STEADY;
                return (
                  <motion.div
                    key={p.playerId ?? i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
                  >
                    <div className="w-7 text-center">
                      {p.rank === 1 ? <Crown className="w-4 h-4 text-yellow-400 mx-auto" /> : <span className="text-sm font-black text-muted-foreground">{p.rank}</span>}
                    </div>
                    <div className="w-7 text-center shrink-0">
                      <MovementBadge movement={p.movement} delta={p.movementDelta} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{p.name}</span>
                        <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest", tierCls)}>{p.tier}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{p.team} · {p.position}</div>
                      <p className="text-xs text-muted-foreground/70 line-clamp-1">{p.blurb}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 shrink-0 text-center text-xs">
                      <div><div className="font-black text-foreground">{p.keyStats.winRate}%</div><div className="text-muted-foreground">WR</div></div>
                      <div><div className="font-black text-foreground">{p.keyStats.goals}</div><div className="text-muted-foreground">Goals</div></div>
                      <div><div className="font-black text-foreground">{p.keyStats.mvps}</div><div className="text-muted-foreground">MVPs</div></div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {!isLoading && !generating && rankings.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BarChart2 className="w-10 h-10 text-primary/30 mx-auto mb-3" />
          <p className="font-bold text-lg mb-1 uppercase">No Rankings Yet</p>
          <p className="text-sm text-muted-foreground mb-5">Generate the first weekly power rankings to publish them live.</p>
          <Button className="gap-2" onClick={handleGenerate} disabled={generating}>
            <Sparkles className="w-4 h-4" /> Generate First Rankings
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
