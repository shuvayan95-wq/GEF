import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Star, Plus, Lock, Eye, Trash2, Crown, Clock, RefreshCw, CheckCircle2,
  Target, Zap, Trophy, TrendingUp, Users, ChevronDown, ChevronRight, Radio, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PlayerStats { goals: number; mvps: number; wins: number; matches: number; }
interface Candidate { id: number; name: string; position?: string; imageUrl?: string; teamId?: number; stats: PlayerStats; }
interface Player { id: number; name: string; teamId?: number; imageUrl?: string; position?: string; }
interface Round { id: number; weekLabel: string; nomineeIds: number[]; isActive: boolean; winnerId?: number; closedAt?: string; createdAt: string; season?: string; votesRevealed?: boolean; }

const TIER_COLORS: Record<string, string> = {
  CF: "text-red-400", LW: "text-orange-400", RW: "text-orange-400",
  SS: "text-yellow-400", CMF: "text-sky-400", DMF: "text-blue-400",
  CB: "text-emerald-400", LB: "text-teal-400", RB: "text-teal-400",
  GK: "text-purple-400",
};

const SEASON_OPTIONS = ["2024-25", "2025-26", "2026-27"];

function StatBadge({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-secondary/40 border border-border/50 min-w-[44px]", value > 0 && color)}>
      <div className="text-[10px] opacity-70">{icon}</div>
      <div className="text-sm font-black tabular-nums leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-wide opacity-60 leading-none">{label}</div>
    </div>
  );
}

function CandidateCard({ candidate, selected, onToggle }: { candidate: Candidate; selected: boolean; onToggle: () => void }) {
  const posColor = TIER_COLORS[candidate.position ?? ""] ?? "text-muted-foreground";
  return (
    <motion.button
      onClick={onToggle}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all",
        selected
          ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
          : "border-border bg-card hover:border-primary/40 hover:bg-secondary/20",
      )}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
        {candidate.imageUrl
          ? <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-cover" />
          : <span className="font-black text-primary text-sm">{candidate.name[0]}</span>
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-foreground truncate">{candidate.name}</div>
        <div className={cn("text-[10px] font-bold uppercase tracking-wider", posColor)}>
          {candidate.position ?? "Player"}
          {candidate.stats.matches > 0 && (
            <span className="ml-1 text-muted-foreground">· last {candidate.stats.matches} {candidate.stats.matches === 1 ? "game" : "games"}</span>
          )}
        </div>
      </div>

      <div className="flex gap-1 shrink-0">
        <StatBadge icon={<Target className="w-2.5 h-2.5" />} value={candidate.stats.goals} label="gls" color="text-green-400" />
        <StatBadge icon={<Zap className="w-2.5 h-2.5" />} value={candidate.stats.mvps} label="mvp" color="text-yellow-400" />
        <StatBadge icon={<Trophy className="w-2.5 h-2.5" />} value={candidate.stats.wins} label="win" color="text-blue-400" />
      </div>

      {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
    </motion.button>
  );
}

export function ManagePotw() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekLabel, setWeekLabel] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [candidateSeason, setCandidateSeason] = useState("2025-26");
  const [roundSeason, setRoundSeason] = useState("2025-26");
  const [overrideWinnerId, setOverrideWinnerId] = useState<number | "">("");
  const [showOverride, setShowOverride] = useState(false);

  const { data, isLoading } = useQuery<{ rounds: Round[]; players: Player[] }>({
    queryKey: ["admin-potw"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/admin/potw"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: candidatesData, isLoading: candidatesLoading, refetch: refetchCandidates } = useQuery<{ players: Candidate[] }>({
    queryKey: ["admin-potw-candidates", candidateSeason],
    queryFn: async () => {
      const url = getApiUrl(`/api/admin/potw/candidates?season=${encodeURIComponent(candidateSeason)}`);
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load candidates");
      return res.json();
    },
  });

  const players = data?.players ?? [];
  const rounds = data?.rounds ?? [];
  const activeRound = rounds.find(r => r.isActive);
  const playerMap = new Map(players.map(p => [p.id, p]));
  const candidates = candidatesData?.players ?? [];

  const candidateIds = new Set(candidates.map(c => c.id));
  const otherPlayers = players.filter(p => !candidateIds.has(p.id));

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/admin/potw/round"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekLabel, nomineeIds: selectedIds, season: roundSeason }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-potw"] });
      toast({ title: "Voting round created!", description: "Nominees are live — users can now vote." });
      setWeekLabel(""); setSelectedIds([]);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Failed", description: err?.message }),
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/admin/potw/close"), { method: "POST", credentials: "include" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-potw"] });
      const winner = data.winnerId ? playerMap.get(data.winnerId) : null;
      toast({ title: "Voting closed!", description: winner ? `Winner: ${winner.name}` : "No votes cast." });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Failed", description: err?.message }),
  });

  const revealMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/admin/potw/reveal-votes"), { method: "POST", credentials: "include" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-potw"] });
      toast({ title: "Votes revealed!", description: "The public can now see vote tallies." });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Failed", description: err?.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/admin/potw/round/${id}`), { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-potw"] }); toast({ title: "Round deleted" }); },
    onError: (err: any) => toast({ variant: "destructive", title: "Failed", description: err?.message }),
  });

  const overrideMutation = useMutation({
    mutationFn: async (winnerId: number) => {
      const res = await fetch(getApiUrl("/api/admin/potw/override-winner"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-potw"] });
      const winner = playerMap.get(data.winnerId);
      toast({ title: "Winner declared!", description: winner ? `${winner.name} crowned as admin override.` : "Round closed." });
      setOverrideWinnerId(""); setShowOverride(false);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Failed", description: err?.message }),
  });

  const togglePlayer = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase">Player of the Week</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pick nominees from top performers, launch the poll, and close votes to crown a winner.
          </p>
        </div>
        <a href="/player-of-the-week" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2 border-border"><Eye className="w-4 h-4" /> Preview</Button>
        </a>
      </div>

      {/* Active round banner */}
      {activeRound && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Active: {activeRound.weekLabel}</div>
                <div className="text-xs text-muted-foreground">
                  {(activeRound.nomineeIds as number[]).length} nominees
                  {activeRound.season && <span> · Season {activeRound.season}</span>}
                  · started {format(new Date(activeRound.createdAt), "d MMM yyyy")}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!activeRound.votesRevealed && (
                <Button
                  onClick={() => revealMutation.mutate()}
                  disabled={revealMutation.isPending}
                  variant="outline"
                  className="gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  {revealMutation.isPending
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Revealing…</>
                    : <><Radio className="w-4 h-4" /> Reveal Votes</>}
                </Button>
              )}
              {activeRound.votesRevealed && (
                <span className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded-lg px-3 py-2 font-semibold">
                  <Eye className="w-3.5 h-3.5" /> Votes visible to public
                </span>
              )}
              <Button
                onClick={() => { setShowOverride(v => !v); setOverrideWinnerId(""); }}
                variant="outline"
                className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                <ShieldCheck className="w-4 h-4" /> Admin Override
              </Button>
              <Button
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
                variant="outline"
                className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                {closeMutation.isPending
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Closing…</>
                  : <><Lock className="w-4 h-4" /> Close Voting</>}
              </Button>
            </div>
          </div>

          {/* Admin override panel */}
          <AnimatePresence>
            {showOverride && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Declare Winner — Admin Override
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Bypasses vote count and closes the round immediately.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      className="flex-1 bg-background border border-amber-500/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-400"
                      value={overrideWinnerId}
                      onChange={e => setOverrideWinnerId(e.target.value === "" ? "" : parseInt(e.target.value))}
                    >
                      <option value="">— Select a nominee —</option>
                      {(activeRound.nomineeIds as number[]).map(nid => {
                        const p = playerMap.get(nid);
                        return p ? <option key={nid} value={nid}>{p.name}</option> : null;
                      })}
                    </select>
                    <Button
                      onClick={() => overrideWinnerId !== "" && overrideMutation.mutate(overrideWinnerId as number)}
                      disabled={overrideWinnerId === "" || overrideMutation.isPending}
                      className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold shrink-0"
                    >
                      {overrideMutation.isPending
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Declaring…</>
                        : <><Crown className="w-4 h-4" /> Declare Winner</>}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Create new round */}
      <div className="bg-card border border-border rounded-xl p-5 mb-8 space-y-5">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Create New Voting Round</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Week Label</label>
            <input
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
              placeholder="e.g. Week 12 · Season 3"
              value={weekLabel}
              onChange={e => setWeekLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Season</label>
            <select
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
              value={roundSeason}
              onChange={e => setRoundSeason(e.target.value)}
            >
              {SEASON_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Season filter for candidates */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <label className="text-xs font-black uppercase tracking-wider text-foreground">
              Top Performers — Last 3 Matchdays
            </label>
            <div className="ml-auto flex items-center gap-2">
              <select
                className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                value={candidateSeason}
                onChange={e => { setCandidateSeason(e.target.value); setRoundSeason(e.target.value); }}
              >
                {SEASON_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
            </div>
          </div>

          {candidatesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
              No match data for season {candidateSeason}. Try a different season or record matches first.
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {candidates.map(c => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  selected={selectedIds.includes(c.id)}
                  onToggle={() => togglePlayer(c.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Other players (no recent games) — collapsed by default */}
        {otherPlayers.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowAllPlayers(v => !v)}
              className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAllPlayers ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <Users className="w-3.5 h-3.5" />
              Other Players (no recent games)
              <span className="bg-secondary text-muted-foreground rounded px-1.5 py-0.5">{otherPlayers.length}</span>
            </button>

            {showAllPlayers && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {otherPlayers.map(p => {
                  const selected = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlayer(p.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-all",
                        selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-border/80 text-foreground"
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-[10px] font-black">
                        {p.name[0]}
                      </div>
                      <span className="truncate text-xs font-semibold">{p.name}</span>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Button
          className="gap-2 w-full"
          onClick={() => createMutation.mutate()}
          disabled={!weekLabel.trim() || selectedIds.length < 2 || createMutation.isPending}
        >
          {createMutation.isPending
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating…</>
            : <><Plus className="w-4 h-4" /> Launch Voting Round ({selectedIds.length} nominees)</>}
        </Button>
        {selectedIds.length < 2 && (
          <p className="text-xs text-muted-foreground -mt-2">Select at least 2 nominees from the list above.</p>
        )}
      </div>

      {/* Past rounds */}
      {rounds.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">All Rounds</h2>
          <div className="space-y-2">
            <AnimatePresence>
              {rounds.map(r => {
                const winner = r.winnerId ? playerMap.get(r.winnerId) : null;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={cn(
                      "flex items-center gap-3 border rounded-xl px-4 py-3 bg-card",
                      r.isActive ? "border-primary/30" : "border-border"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">{r.weekLabel}</span>
                        <span className={cn(
                          "text-[10px] font-black uppercase px-1.5 py-0.5 rounded border",
                          r.isActive ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : "text-muted-foreground bg-secondary border-border"
                        )}>{r.isActive ? "OPEN" : "CLOSED"}</span>
                        {r.isActive && r.votesRevealed && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded border text-blue-400 bg-blue-500/10 border-blue-500/30">
                            VOTES LIVE
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{(r.nomineeIds as number[]).length} nominees</span>
                        {r.season && <span>Season {r.season}</span>}
                        {winner && <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-yellow-400" /> Winner: {winner.name}</span>}
                        {r.closedAt && <span><Clock className="w-3 h-3 inline mr-0.5" />{format(new Date(r.closedAt), "d MMM yyyy")}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => deleteMutation.mutate(r.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
