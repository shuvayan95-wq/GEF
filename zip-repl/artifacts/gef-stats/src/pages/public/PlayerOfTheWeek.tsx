import { Navbar } from "@/components/layout/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Star, Trophy, CheckCircle2, Vote, Clock, Crown, Medal,
  Target, Zap, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── localStorage browser token ──────────────────────────────────────────────
const TOKEN_KEY = "gef_potw_voter_token";

function getOrCreateToken(): string {
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const token = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Player {
  id: number; name: string; position?: string; imageUrl?: string; teamId?: number;
}

interface Round {
  id: number; weekLabel: string; nomineeIds: number[]; isActive: boolean;
  winnerId?: number; closedAt?: string; createdAt: string;
}

interface PlayerStats { goals: number; mvps: number; wins: number; matches: number; }

interface PotwData {
  round: Round | null;
  nominees: Player[];
  voteCounts: Record<number, number>;
  hasVoted: boolean;
  myVote: number | null;
  totalVotes: number;
  nomineeStats: Record<number, PlayerStats>;
}

interface HistoryItem {
  id: number; weekLabel: string; winner: Player | null; closedAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  CF: "text-red-400", LW: "text-orange-400", RW: "text-orange-400",
  SS: "text-yellow-400", CMF: "text-sky-400", DMF: "text-blue-400",
  CB: "text-emerald-400", LB: "text-teal-400", RB: "text-teal-400",
  GK: "text-purple-400",
};

function PlayerAvatar({ player, size = "md" }: { player: Player; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-20 h-20" : size === "md" ? "w-14 h-14" : "w-10 h-10";
  const txt = size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-sm";
  return (
    <div className={cn("rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0", sz)}>
      {player.imageUrl ? (
        <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
      ) : (
        <span className={cn("font-black text-primary", txt)}>{player.name[0]}</span>
      )}
    </div>
  );
}

function StatPill({ icon, value, label, highlight }: { icon: React.ReactNode; value: number; label: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold",
      highlight && value > 0
        ? "bg-primary/10 border-primary/30 text-primary"
        : "bg-secondary/40 border-border/50 text-muted-foreground"
    )}>
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="font-normal opacity-70">{label}</span>
    </div>
  );
}

// ─── Nominee Card ─────────────────────────────────────────────────────────────
function NomineeCard({
  player, stats, votes, total, hasVoted, isMyVote, isWinner, isActive, onVote, disabled,
}: {
  player: Player;
  stats: PlayerStats;
  votes: number;
  total: number;
  hasVoted: boolean;
  isMyVote: boolean;
  isWinner: boolean;
  isActive: boolean;
  onVote: () => void;
  disabled: boolean;
}) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
  const posColor = TIER_COLORS[player.position ?? ""] ?? "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border bg-card overflow-hidden transition-all duration-300 flex flex-col",
        isMyVote ? "border-primary shadow-lg shadow-primary/20"
          : isWinner ? "border-yellow-500/50 shadow-lg shadow-yellow-500/10"
          : "border-border hover:border-border/60",
      )}
    >
      {isWinner && (
        <div className="absolute top-3 right-3 z-10">
          <Crown className="w-5 h-5 text-yellow-400" style={{ filter: "drop-shadow(0 0 6px rgba(234,179,8,0.6))" }} />
        </div>
      )}
      {isMyVote && !isWinner && (
        <div className="absolute top-3 right-3 z-10">
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>
      )}

      <div className="p-5 space-y-4 flex-1">
        {/* Player identity */}
        <div className="flex items-center gap-3">
          <PlayerAvatar player={player} size="md" />
          <div className="min-w-0 flex-1">
            <div className="font-black text-base text-foreground truncate">{player.name}</div>
            <div className={cn("text-xs font-bold uppercase tracking-widest", posColor)}>
              {player.position ?? "Player"}
            </div>
          </div>
        </div>

        {/* Last 3 match stats */}
        {stats.matches > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Last {stats.matches} {stats.matches === 1 ? "game" : "games"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <StatPill
                icon={<Target className="w-3 h-3" />}
                value={stats.goals}
                label="goals"
                highlight={stats.goals >= 3}
              />
              <StatPill
                icon={<Zap className="w-3 h-3" />}
                value={stats.mvps}
                label="MVPs"
                highlight={stats.mvps >= 2}
              />
              <StatPill
                icon={<Shield className="w-3 h-3" />}
                value={stats.wins}
                label="wins"
                highlight={stats.wins >= 2}
              />
            </div>
          </div>
        )}

        {/* Vote bar — shown after voting or when closed */}
        {hasVoted && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{votes} vote{votes !== 1 ? "s" : ""}</span>
              <span className={cn("font-bold", isMyVote ? "text-primary" : "text-foreground")}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", isMyVote ? "bg-primary" : isWinner ? "bg-yellow-500" : "bg-white/20")}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Vote button */}
      <div className="px-5 pb-5">
        {isActive && !hasVoted && (
          <Button
            className="w-full gap-2"
            variant="outline"
            size="sm"
            onClick={onVote}
            disabled={disabled}
          >
            <Vote className="w-3.5 h-3.5" />
            Vote for {player.name.split(" ")[0]}
          </Button>
        )}

        {isActive && hasVoted && isMyVote && (
          <div className="text-center text-xs text-primary font-semibold py-1">
            ✓ Your vote
          </div>
        )}

        {isActive && hasVoted && !isMyVote && (
          <div className="text-center text-xs text-muted-foreground py-1">
            {votes} vote{votes !== 1 ? "s" : ""}
          </div>
        )}

        {!isActive && isWinner && (
          <div className="text-center text-xs text-yellow-400 font-bold py-1 flex items-center justify-center gap-1">
            <Crown className="w-3 h-3" /> Player of the Week
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function PlayerOfTheWeek() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [voterToken] = useState(() => getOrCreateToken());

  const { data, isLoading } = useQuery<PotwData>({
    queryKey: ["potw", voterToken],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/potw?token=${encodeURIComponent(voterToken)}`));
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const { data: history, isLoading: histLoading } = useQuery<HistoryItem[]>({
    queryKey: ["potw-history"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/potw/history"));
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const voteMutation = useMutation({
    mutationFn: async (playerId: number) => {
      const res = await fetch(getApiUrl("/api/potw/vote"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, voterToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Vote failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["potw", voterToken] });
      toast({ title: "Vote cast!", description: "Thanks for voting — results update live." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Vote failed", description: err?.message });
    },
  });

  const round = data?.round ?? null;
  const nominees = data?.nominees ?? [];
  const voteCounts = data?.voteCounts ?? {};
  const hasVoted = data?.hasVoted ?? false;
  const myVote = data?.myVote ?? null;
  const totalVotes = data?.totalVotes ?? 0;
  const nomineeStats = data?.nomineeStats ?? {};

  const sortedNominees = [...nominees].sort((a, b) => {
    if (!round?.isActive && round?.winnerId) {
      if (a.id === round.winnerId) return -1;
      if (b.id === round.winnerId) return 1;
    }
    return (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0);
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Masthead */}
      <div className="border-b border-border bg-card/40">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-[10px] font-black uppercase tracking-widest text-yellow-400">
                  <Star className="w-3 h-3" /> Community Vote
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-2">
                Player of the Week
              </h1>
              <p className="text-muted-foreground text-base max-w-xl">
                Vote for the standout performer of the week. One vote per person — make it count.
              </p>
            </div>
            {round && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 bg-card border border-border rounded-xl px-4 py-2.5">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-semibold">{round.weekLabel}</span>
                <span className={cn(
                  "ml-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  round.isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/15 text-red-400 border border-red-500/30"
                )}>
                  {round.isActive ? "VOTING OPEN" : "CLOSED"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 space-y-12">

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-card animate-pulse border border-border" />
            ))}
          </div>
        )}

        {/* No active round */}
        {!isLoading && !round && (
          <div className="text-center py-20 space-y-3">
            <Vote className="w-14 h-14 mx-auto text-primary opacity-30" />
            <h2 className="text-2xl font-bold">No Active Voting Round</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Check back soon — the admin will open the next round.
            </p>
          </div>
        )}

        {/* Active or most-recent round */}
        {!isLoading && round && (
          <div className="space-y-4">
            {/* Already voted banner */}
            {hasVoted && round.isActive && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-5 py-3"
              >
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Your vote is in!</p>
                  <p className="text-xs text-muted-foreground">{totalVotes} total vote{totalVotes !== 1 ? "s" : ""} cast so far.</p>
                </div>
              </motion.div>
            )}

            {/* Closed banner */}
            {!round.isActive && (
              <div className="flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-5 py-3">
                <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Voting Closed</p>
                  <p className="text-xs text-muted-foreground">
                    {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast.
                    {round.closedAt && ` Closed ${format(new Date(round.closedAt), "d MMM yyyy")}.`}
                  </p>
                </div>
              </div>
            )}

            {/* Nominee cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence>
                {sortedNominees.map((player, i) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <NomineeCard
                      player={player}
                      stats={nomineeStats[player.id] ?? { goals: 0, mvps: 0, wins: 0, matches: 0 }}
                      votes={voteCounts[player.id] ?? 0}
                      total={totalVotes}
                      hasVoted={hasVoted}
                      isMyVote={myVote === player.id}
                      isWinner={round.winnerId === player.id}
                      isActive={round.isActive}
                      onVote={() => voteMutation.mutate(player.id)}
                      disabled={voteMutation.isPending}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Hall of Champions */}
        {!histLoading && (history ?? []).filter(h => h.winner).length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-black uppercase tracking-wide">Hall of Champions</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(history ?? []).filter(h => h.winner).map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
                >
                  {i === 0 && <Crown className="w-4 h-4 text-yellow-400 shrink-0" />}
                  {i === 1 && <Medal className="w-4 h-4 text-slate-400 shrink-0" />}
                  {i >= 2 && <Star className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <PlayerAvatar player={h.winner!} size="sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">{h.winner!.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{h.weekLabel}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
