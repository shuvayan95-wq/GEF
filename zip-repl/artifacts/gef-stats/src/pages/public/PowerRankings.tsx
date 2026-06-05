import { Navbar } from "@/components/layout/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { format } from "date-fns";
import {
  TrendingUp, TrendingDown, Minus, Sparkles, Crown, Star, Zap,
  BarChart2, Clock, AlertCircle, ChevronUp, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RankedPlayer {
  rank: number; playerId: number; name: string; team: string;
  position: string; tier: "ELITE" | "CONTENDER" | "RISING" | "STEADY" | "FALLING";
  blurb: string;
  keyStats: { winRate: number; goals: number; mvps: number; games: number; goalsPerGame: number };
  recentForm: string[];
  imageUrl: string | null;
  movement: "UP" | "DOWN" | "SAME" | "NEW";
  movementDelta: number;
  prevRank: number | null;
}

const TIER_CONFIG = {
  ELITE:     { label: "ELITE",     color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", glow: "shadow-yellow-500/15" },
  CONTENDER: { label: "CONTENDER", color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/30",    glow: "shadow-sky-500/10" },
  RISING:    { label: "RISING",    color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/30",glow: "shadow-emerald-500/10" },
  STEADY:    { label: "STEADY",    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   glow: "shadow-blue-500/10" },
  FALLING:   { label: "FALLING",   color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    glow: "shadow-red-500/10" },
};

function MovementBadge({ movement, delta }: { movement: string; delta: number }) {
  if (movement === "NEW") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
      NEW
    </span>
  );
  if (movement === "UP") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-400">
      <ChevronUp className="w-3 h-3" />{Math.abs(delta)}
    </span>
  );
  if (movement === "DOWN") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-red-400">
      <ChevronDown className="w-3 h-3" />{Math.abs(delta)}
    </span>
  );
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function FormDot({ result }: { result: string }) {
  return (
    <span className={cn(
      "inline-flex w-5 h-5 rounded-full items-center justify-center text-[9px] font-black",
      result === "W" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
      result === "L" ? "bg-red-500/20 text-red-400 border border-red-500/40" :
                       "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
    )}>
      {result}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center shrink-0">
      <Crown className="w-4 h-4 text-yellow-400" />
    </div>
  );
  if (rank === 2) return (
    <div className="w-8 h-8 rounded-full bg-slate-500/20 border border-slate-500/40 flex items-center justify-center shrink-0">
      <span className="text-xs font-black text-slate-300">2</span>
    </div>
  );
  if (rank === 3) return (
    <div className="w-8 h-8 rounded-full bg-orange-700/20 border border-orange-700/40 flex items-center justify-center shrink-0">
      <span className="text-xs font-black text-orange-400">3</span>
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-full bg-white/5 border border-border flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-muted-foreground">{rank}</span>
    </div>
  );
}

function PlayerRow({ player, index }: { player: RankedPlayer; index: number }) {
  const tier = TIER_CONFIG[player.tier] ?? TIER_CONFIG.STEADY;
  const isTop3 = player.rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className={cn(
        "relative flex items-center gap-4 rounded-xl border bg-card px-4 py-4 transition-all hover:bg-card/80",
        isTop3 ? `${tier.border} shadow-md ${tier.glow}` : "border-border",
      )}
    >
      {/* Rank */}
      <RankBadge rank={player.rank} />

      {/* Movement */}
      <div className="w-8 text-center shrink-0">
        <MovementBadge movement={player.movement} delta={player.movementDelta} />
      </div>

      {/* Avatar */}
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2",
        isTop3 ? tier.border : "border-border"
      )}>
        {player.imageUrl ? (
          <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
        ) : (
          <span className={cn("font-black text-sm", isTop3 ? tier.color : "text-muted-foreground")}>{player.name[0]}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-sm text-foreground">{player.name}</span>
          <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest", tier.color, tier.bg, tier.border)}>
            {tier.label}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">{player.team} · {player.position}</div>
        <p className="text-xs text-muted-foreground/80 leading-snug hidden sm:block">{player.blurb}</p>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-4 shrink-0 text-center">
        {[
          { label: "WR%", value: `${player.keyStats.winRate}%` },
          { label: "Goals", value: player.keyStats.goals },
          { label: "MVPs", value: player.keyStats.mvps },
          { label: "GPG", value: player.keyStats.goalsPerGame.toFixed(1) },
        ].map(s => (
          <div key={s.label} className="min-w-[40px]">
            <div className="text-sm font-black text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent form */}
      <div className="hidden lg:flex items-center gap-1 shrink-0">
        {(player.recentForm ?? []).slice(-5).map((r, i) => (
          <FormDot key={i} result={r} />
        ))}
      </div>
    </motion.div>
  );
}

export function PowerRankings() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["power-rankings"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/power-rankings"));
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<{ rankings: RankedPlayer[]; weekLabel: string | null; generatedAt: string | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rankings = data?.rankings ?? [];
  const weekLabel = data?.weekLabel ?? null;
  const generatedAt = data?.generatedAt ?? null;

  const eliteCount = rankings.filter(r => r.tier === "ELITE").length;
  const risingCount = rankings.filter(r => r.movement === "UP").length;
  const fallingCount = rankings.filter(r => r.movement === "DOWN").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Masthead */}
      <div className="border-b border-border bg-card/40">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-[10px] font-black uppercase tracking-widest text-primary">
                  <BarChart2 className="w-3 h-3" /> AI-Powered
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-2">Power Rankings</h1>
              <p className="text-muted-foreground text-base max-w-xl">
                Weekly player rankings driven by real performance data — win rates, goals per game, MVPs, and recent form. AI-written commentary for every player.
              </p>
            </div>
            <div className="shrink-0 space-y-1 text-right">
              {weekLabel && <div className="text-sm font-black text-foreground">{weekLabel}</div>}
              {generatedAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
                  <Clock className="w-3 h-3" /> {format(new Date(generatedAt), "d MMM yyyy, HH:mm")}
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          {rankings.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-6">
              {[
                { label: "Ranked", value: rankings.length, icon: BarChart2, color: "text-primary" },
                { label: "Elite Tier", value: eliteCount, icon: Crown, color: "text-yellow-400" },
                { label: "Rising", value: risingCount, icon: TrendingUp, color: "text-emerald-400" },
                { label: "Falling", value: fallingCount, icon: TrendingDown, color: "text-red-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
                  <s.icon className={cn("w-3.5 h-3.5", s.color)} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-black text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-card animate-pulse border border-border" />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-muted-foreground">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400 opacity-60" />
            <p className="text-lg font-semibold">Could not load rankings</p>
          </div>
        )}

        {!isLoading && !isError && rankings.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <BarChart2 className="w-14 h-14 mx-auto text-primary opacity-30" />
            <h2 className="text-2xl font-bold">No Rankings Yet</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Ask an admin to generate the first weekly power rankings.
            </p>
          </div>
        )}

        {rankings.length > 0 && (
          <AnimatePresence>
            <div className="space-y-2">
              {rankings.map((player, i) => (
                <PlayerRow key={player.playerId ?? i} player={player} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
