import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Star, Plus, X, Lock, Eye, Trash2, Crown, Clock, RefreshCw, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Player { id: number; name: string; teamId?: number; imageUrl?: string; position?: string; }
interface Round { id: number; weekLabel: string; nomineeIds: number[]; isActive: boolean; winnerId?: number; closedAt?: string; createdAt: string; }

export function ManagePotw() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekLabel, setWeekLabel] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [closing, setClosing] = useState(false);

  const { data, isLoading } = useQuery<{ rounds: Round[]; players: Player[] }>({
    queryKey: ["admin-potw"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/admin/potw"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const players = data?.players ?? [];
  const rounds = data?.rounds ?? [];
  const activeRound = rounds.find(r => r.isActive);
  const playerMap = new Map(players.map(p => [p.id, p]));

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/admin/potw/round"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekLabel, nomineeIds: selectedIds }),
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/admin/potw/round/${id}`), { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-potw"] }); toast({ title: "Round deleted" }); },
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
          <p className="text-muted-foreground text-sm mt-1">Create weekly voting rounds, nominate players, and close votes to crown a winner.</p>
        </div>
        <a href="/player-of-the-week" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2 border-border"><Eye className="w-4 h-4" /> Preview</Button>
        </a>
      </div>

      {/* Active round */}
      {activeRound && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Active: {activeRound.weekLabel}</div>
              <div className="text-xs text-muted-foreground">{(activeRound.nomineeIds as number[]).length} nominees · {format(new Date(activeRound.createdAt), "d MMM yyyy")}</div>
            </div>
          </div>
          <Button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending} variant="outline" className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
            {closeMutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Closing…</> : <><Lock className="w-4 h-4" /> Close Voting</>}
          </Button>
        </div>
      )}

      {/* Create new round */}
      <div className="bg-card border border-border rounded-xl p-5 mb-8 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Create New Voting Round</h2>

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
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
            Select Nominees ({selectedIds.length} selected)
          </label>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-secondary animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
              {players.map(p => {
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

        <Button
          className="gap-2"
          onClick={() => createMutation.mutate()}
          disabled={!weekLabel.trim() || selectedIds.length < 2 || createMutation.isPending}
        >
          {createMutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create Round</>}
        </Button>
        {selectedIds.length < 2 && <p className="text-xs text-muted-foreground">Select at least 2 nominees.</p>}
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
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{(r.nomineeIds as number[]).length} nominees</span>
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
