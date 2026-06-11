import { useMemo, useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Edit, Trash2, Plus, Loader2, Trophy, Users,
  Lock, Unlock, EyeOff, ChevronRight, Calendar, PlusCircle,
  Shield, CheckSquare, Square, UserX, Star, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamItem {
  id: number;
  name: string;
  logoUrl: string | null;
  status?: string;
}

interface LeagueItem {
  id: number;
  name: string;
  description: string | null;
  season: string | null;
  logoUrl: string | null;
  leagueType: string;
  teamCount: number;
  isLocked: boolean;
}

interface LeagueGroup {
  name: string;
  leagueType: string;
  logoUrl: string | null;
  seasons: LeagueItem[];
}

function groupLeagues(leagues: LeagueItem[]): LeagueGroup[] {
  const map = new Map<string, LeagueGroup>();
  for (const l of leagues) {
    if (!map.has(l.name)) {
      map.set(l.name, { name: l.name, leagueType: l.leagueType, logoUrl: l.logoUrl, seasons: [] });
    }
    map.get(l.name)!.seasons.push(l);
  }
  return Array.from(map.values()).map(g => ({
    ...g,
    seasons: g.seasons.sort((a, b) => b.id - a.id),
  }));
}

function useLeagues() {
  return useQuery({
    queryKey: ["/api/leagues"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/leagues"), { credentials: "include" });
      return r.json() as Promise<LeagueItem[]>;
    },
  });
}

function useAllTeams() {
  return useQuery<TeamItem[]>({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/teams"), { credentials: "include" });
      return r.json();
    },
  });
}

interface DialogState {
  mode: "create" | "edit" | "new-season";
  editing?: LeagueItem;
  prefill?: { name: string; leagueType: string; logoUrl: string | null };
}

interface SuperCupMatch {
  id: number; date: string; superCupLeg: number | null;
  team1Id: number; team2Id: number;
  team1Name: string; team1LogoUrl: string | null;
  team2Name: string; team2LogoUrl: string | null;
  team1Score: number; team2Score: number;
  playerMatchups: any[];
}

export function ManageLeagues() {
  const { data: leagues, isLoading } = useLeagues();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [superCupSeason, setSuperCupSeason] = useState<LeagueItem | null>(null);

  const groups = useMemo(() => groupLeagues(leagues ?? []), [leagues]);

  useEffect(() => {
    if (groups.length > 0) {
      setExpandedGroups(new Set(groups.map(g => g.name)));
    }
  }, [groups.length]);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(getApiUrl(`/api/leagues/${id}`), { method: "DELETE", credentials: "include" });
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/leagues"] }); toast({ title: "Season deleted" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
  });

  const lockMutation = useMutation({
    mutationFn: async ({ id, isLocked }: { id: number; isLocked: boolean }) => {
      const r = await fetch(getApiUrl(`/api/leagues/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isLocked }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (_, { isLocked }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      toast({ title: isLocked ? "Season locked — hidden from public" : "Season unlocked — now visible" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update lock status" }),
  });

  const getDialogTitle = () => {
    if (!dialogState) return "";
    if (dialogState.mode === "edit") return `Edit — ${dialogState.editing?.name} ${dialogState.editing?.season ?? ""}`;
    if (dialogState.mode === "new-season") return `New Season — ${dialogState.prefill?.name}`;
    return "Create New Competition";
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase">Manage Leagues</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create competitions and add new seasons. Choose which teams participate in each season.
          </p>
        </div>
        <Button
          onClick={() => setDialogState({ mode: "create" })}
          variant="gaming"
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> New Competition
        </Button>
      </div>

      {/* Info bar */}
      <div className="mb-6 p-3 rounded-lg bg-secondary/30 border border-border/60 flex items-start gap-3 text-sm text-muted-foreground">
        <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span>
          Each season has its own <strong className="text-foreground">team roster</strong> — teams that left the GEF can be excluded from new seasons without losing their history.
          Use <strong className="text-foreground">"New Season"</strong> to add another season and pick only the active teams.
        </span>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse border border-border" />)}
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-dashed border-border">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-display uppercase text-lg">No competitions yet</p>
          <p className="text-sm mt-1">Click "New Competition" to get started.</p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map(group => {
          const isOpen = expandedGroups.has(group.name);
          return (
            <div key={group.name} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Competition header */}
              <div className="flex items-center justify-between px-5 py-4 gap-3">
                <button
                  className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                  onClick={() => toggleGroup(group.name)}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold uppercase text-sm group-hover:text-primary transition-colors truncate">
                      {group.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{group.seasons.length} season{group.seasons.length !== 1 ? "s" : ""}</span>
                      {group.leagueType === "cup" && <span className="text-primary font-bold">Cup</span>}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200",
                    isOpen && "rotate-90"
                  )} />
                </button>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/60 shrink-0"
                  onClick={() => setDialogState({
                    mode: "new-season",
                    prefill: { name: group.name, leagueType: group.leagueType, logoUrl: group.logoUrl },
                  })}
                >
                  <PlusCircle className="w-3.5 h-3.5" /> New Season
                </Button>
              </div>

              {/* Seasons list */}
              {isOpen && (
                <div className="border-t border-border/60 divide-y divide-border/40">
                  {group.seasons.map(season => (
                    <div
                      key={season.id}
                      className={cn(
                        "flex items-center justify-between px-5 py-3 gap-3 hover:bg-secondary/10 transition-colors",
                        season.isLocked && "bg-orange-500/5"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Calendar className={cn("w-4 h-4 shrink-0", season.isLocked ? "text-orange-400" : "text-muted-foreground")} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">
                              {season.season ?? `Season #${season.id}`}
                            </span>
                            {season.isLocked && (
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full shrink-0">
                                <EyeOff className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {season.teamCount > 0 ? `${season.teamCount} teams` : <span className="text-orange-400/80">No teams set</span>}
                            </span>
                            {season.description && (
                              <span className="truncate max-w-[200px]">{season.description}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSuperCupSeason(season)}
                          title="Manage Super Cup for this season"
                          className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDialogState({ mode: "edit", editing: season })}
                          title="Edit season & teams"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            season.isLocked
                              ? "text-orange-400 hover:text-green-400"
                              : "text-muted-foreground hover:text-orange-400"
                          )}
                          onClick={() => lockMutation.mutate({ id: season.id, isLocked: !season.isLocked })}
                          title={season.isLocked ? "Unlock — make public" : "Lock — hide from public"}
                          disabled={lockMutation.isPending}
                        >
                          {lockMutation.isPending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : season.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete "${season.season ?? "this season"}"? All its matches and stats will be lost.`)) {
                              deleteMutation.mutate(season.id);
                            }
                          }}
                          title="Delete season"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={dialogState !== null} onOpenChange={open => { if (!open) setDialogState(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          {dialogState && (
            <LeagueForm
              key={dialogState.mode + (dialogState.editing?.id ?? "new")}
              mode={dialogState.mode}
              initialData={dialogState.editing}
              prefill={dialogState.prefill}
              onSuccess={() => {
                setDialogState(null);
                queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <SuperCupDialog
        season={superCupSeason}
        onClose={() => setSuperCupSeason(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/matches"] })}
      />
    </AdminLayout>
  );
}

// ─── SuperCupDialog ────────────────────────────────────────────────────────────
function SuperCupDialog({ season, onClose, onSaved }: {
  season: LeagueItem | null; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: allTeams = [] } = useAllTeams();
  const { data: allPlayers = [] } = useQuery<any[]>({
    queryKey: ["/api/players-dropdown"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/players-dropdown"), { credentials: "include" });
      return r.json();
    },
  });

  const { data: detail } = useQuery<any>({
    queryKey: ["/api/leagues", season?.id],
    queryFn: async () => {
      const r = await fetch(getApiUrl(`/api/leagues/${season!.id}`), { credentials: "include" });
      return r.json();
    },
    enabled: season !== null,
  });

  const { data: supercupMatches = [], refetch } = useQuery<SuperCupMatch[]>({
    queryKey: ["/api/leagues", season?.id, "supercup"],
    queryFn: async () => {
      const r = await fetch(getApiUrl(`/api/leagues/${season!.id}/supercup`), { credentials: "include" });
      return r.json();
    },
    enabled: season !== null,
  });

  const [showForm, setShowForm] = useState<number | null>(null); // leg number being created/edited
  const [editingMatch, setEditingMatch] = useState<SuperCupMatch | null>(null);

  const standings = detail?.standings ?? [];
  const top1 = standings[0] ?? null;
  const top2 = standings[1] ?? null;

  const handleDeleteMatch = async (id: number) => {
    if (!confirm("Delete this Super Cup match?")) return;
    try {
      const res = await fetch(getApiUrl(`/api/matches/${id}`), { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      toast({ title: "Match deleted" });
      refetch();
      onSaved();
    } catch {
      toast({ variant: "destructive", title: "Failed to delete" });
    }
  };

  if (!season) return null;

  return (
    <Dialog open={season !== null} onOpenChange={open => { if (!open) { onClose(); setShowForm(null); setEditingMatch(null); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Super Cup — {season.name} {season.season ?? ""}
          </DialogTitle>
        </DialogHeader>

        {/* Top 2 info */}
        <div className="bg-secondary/30 rounded-lg p-3 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Top 2 from Standings</p>
          <div className="flex gap-3">
            {[top1, top2].map((t, i) => t ? (
              <div key={t.teamId} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                <span className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center ${i === 0 ? "bg-yellow-500 text-black" : "bg-slate-400 text-black"}`}>{i + 1}</span>
                {t.teamLogoUrl && <img src={t.teamLogoUrl} className="w-5 h-5 rounded object-contain" />}
                <span className="font-bold text-sm">{t.teamName}</span>
              </div>
            ) : (
              <div key={i} className="text-xs text-muted-foreground italic px-3 py-2">No team {i + 1} yet</div>
            ))}
          </div>
        </div>

        {/* Existing super cup matches */}
        <div className="space-y-3">
          {[1, 2].map(leg => {
            const match = supercupMatches.find(m => m.superCupLeg === leg);
            return (
              <div key={leg} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30 px-2 py-0.5 rounded shrink-0">Leg {leg}</span>
                  {match ? (
                    <>
                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        {match.team1LogoUrl && <img src={match.team1LogoUrl} className="w-5 h-5 rounded object-contain" />}
                        <span className="font-bold text-sm truncate">{match.team1Name}</span>
                      </div>
                      <span className="font-display font-black text-lg text-primary shrink-0">{match.team1Score} – {match.team2Score}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-bold text-sm truncate">{match.team2Name}</span>
                        {match.team2LogoUrl && <img src={match.team2LogoUrl} className="w-5 h-5 rounded object-contain" />}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="w-7 h-7"
                          onClick={() => { setEditingMatch(match); setShowForm(leg); }}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive"
                          onClick={() => handleDeleteMatch(match.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-muted-foreground italic flex-1">No result yet</span>
                      <Button variant="outline" size="sm" className="gap-1 h-7 text-xs shrink-0"
                        onClick={() => { setEditingMatch(null); setShowForm(leg); }}>
                        <Plus className="w-3 h-3" /> Add Leg {leg}
                      </Button>
                    </>
                  )}
                </div>

                {showForm === leg && (
                  <div className="border-t border-border bg-background/50">
                    <SuperCupMatchForm
                      leagueId={season.id}
                      leg={leg}
                      teams={allTeams}
                      players={allPlayers}
                      defaultTeam1Id={top1?.teamId ? String(top1.teamId) : ""}
                      defaultTeam2Id={top2?.teamId ? String(top2.teamId) : ""}
                      editingMatch={editingMatch?.superCupLeg === leg ? editingMatch : null}
                      onClose={() => { setShowForm(null); setEditingMatch(null); }}
                      onSuccess={() => { setShowForm(null); setEditingMatch(null); refetch(); onSaved(); }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Aggregate */}
        {supercupMatches.length === 2 && (() => {
          const leg1 = supercupMatches.find(m => m.superCupLeg === 1);
          const leg2 = supercupMatches.find(m => m.superCupLeg === 2);
          if (!leg1 || !leg2) return null;
          const agg1 = leg1.team1Score + (leg2.team1Id === leg1.team1Id ? leg2.team1Score : leg2.team2Score);
          const agg2 = leg1.team2Score + (leg2.team2Id === leg1.team2Id ? leg2.team2Score : leg2.team1Score);
          return (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-2">Super Cup Aggregate</p>
              <div className="flex items-center justify-center gap-4">
                <span className="font-display font-bold uppercase text-sm">{leg1.team1Name}</span>
                <span className="font-display font-black text-2xl text-yellow-400">{agg1} – {agg2}</span>
                <span className="font-display font-bold uppercase text-sm">{leg1.team2Name}</span>
              </div>
              {agg1 !== agg2 && (
                <p className="text-green-400 text-xs font-bold mt-1">
                  🏆 {agg1 > agg2 ? leg1.team1Name : leg1.team2Name} wins the Super Cup
                </p>
              )}
              {agg1 === agg2 && <p className="text-yellow-400 text-xs font-bold mt-1">Draw on aggregate</p>}
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}

// ─── Super Cup Match Form ───────────────────────────────────────────────────────
function SuperCupMatchForm({ leagueId, leg, teams, players, defaultTeam1Id, defaultTeam2Id, editingMatch, onClose, onSuccess }: {
  leagueId: number; leg: number;
  teams: TeamItem[]; players: any[];
  defaultTeam1Id: string; defaultTeam2Id: string;
  editingMatch: SuperCupMatch | null;
  onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(editingMatch ? new Date(editingMatch.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
  const [t1Id, setT1Id] = useState(editingMatch ? String(editingMatch.team1Id) : defaultTeam1Id);
  const [t2Id, setT2Id] = useState(editingMatch ? String(editingMatch.team2Id) : defaultTeam2Id);
  const [matchups, setMatchups] = useState<any[]>(
    editingMatch?.playerMatchups?.map((mu: any) => ({
      p1: String(mu.player1Id), p2: String(mu.player2Id),
      s1: mu.player1Goals, s2: mu.player2Goals,
      mvp: mu.mvpPlayerId ? String(mu.mvpPlayerId) : "",
    })) ?? []
  );

  const teamOptions = [{ label: "— Select team —", value: "" }, ...teams.map(t => ({ label: t.name, value: t.id }))];
  const t1Players = players.filter((p: any) => t1Id && p.teamId === Number(t1Id));
  const t2Players = players.filter((p: any) => t2Id && p.teamId === Number(t2Id));
  const t1POpts = [{ label: "— Select player —", value: "" }, ...t1Players.map((p: any) => ({ label: p.name, value: p.id }))];
  const t2POpts = [{ label: "— Select player —", value: "" }, ...t2Players.map((p: any) => ({ label: p.name, value: p.id }))];
  const team1Name = teams.find(t => t.id === Number(t1Id))?.name ?? "Team 1";
  const team2Name = teams.find(t => t.id === Number(t2Id))?.name ?? "Team 2";

  const totalT1 = matchups.reduce((s, m) => s + (Number(m.s1) || 0), 0);
  const totalT2 = matchups.reduce((s, m) => s + (Number(m.s2) || 0), 0);

  const addMatchup = () => {
    if (matchups.length >= 5) return;
    setMatchups(p => [...p, { p1: "", p2: "", s1: 0, s2: 0, mvp: "" }]);
  };

  const updateM = (idx: number, field: string, val: any) => {
    setMatchups(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n; });
  };

  const handleTeamChange = (which: 1 | 2, val: string) => {
    if (which === 1) setT1Id(val);
    else setT2Id(val);
    setMatchups(prev => prev.map(m => ({
      ...m, ...(which === 1 ? { p1: "", mvp: "" } : { p2: "", mvp: "" }),
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!t1Id || !t2Id) { toast({ variant: "destructive", title: "Select both teams" }); return; }
    setSaving(true);
    try {
      const payload = {
        date: new Date(date).toISOString(),
        team1Id: Number(t1Id), team2Id: Number(t2Id),
        team1Score: totalT1, team2Score: totalT2,
        leagueId, matchType: "supercup", superCupLeg: leg,
        playerMatchups: matchups.map(m => ({
          player1Id: Number(m.p1), player2Id: Number(m.p2),
          player1Goals: Number(m.s1), player2Goals: Number(m.s2),
          mvpPlayerId: m.mvp ? Number(m.mvp) : null,
        })),
      };

      if (editingMatch) {
        const res = await fetch(getApiUrl(`/api/matches/${editingMatch.id}`), {
          method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ date: new Date(date).toISOString(), team1Score: totalT1, team2Score: totalT2, playerMatchups: payload.playerMatchups }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast({ title: "Super Cup leg updated" });
      } else {
        const res = await fetch(getApiUrl("/api/matches"), {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        toast({ title: `Super Cup Leg ${leg} recorded` });
      }
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error saving", description: err?.message });
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-yellow-500">
        {editingMatch ? "Edit" : "Add"} Super Cup Leg {leg}
      </p>

      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Date</label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center bg-secondary/30 p-3 rounded-lg border border-border">
        <div>
          <label className="text-xs font-bold text-primary uppercase mb-1 block">Team 1</label>
          <Select required value={t1Id} onChange={e => handleTeamChange(1, e.target.value)} options={teamOptions} />
        </div>
        <div className="font-display font-bold text-muted-foreground px-2">VS</div>
        <div>
          <label className="text-xs font-bold text-accent uppercase mb-1 block">Team 2</label>
          <Select required value={t2Id} onChange={e => handleTeamChange(2, e.target.value)} options={teamOptions} />
        </div>
      </div>

      {matchups.length > 0 && (
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Auto Score: </span>
          <span className="font-display font-black text-primary">{totalT1} – {totalT2}</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase text-foreground">Player Matchups ({matchups.length}/5)</label>
          <Button type="button" variant="outline" size="sm" onClick={addMatchup}
            disabled={matchups.length >= 5 || !t1Id || !t2Id}>
            + Add Game
          </Button>
        </div>
        {(!t1Id || !t2Id) && (
          <p className="text-xs text-amber-500 italic p-2 bg-amber-500/10 rounded border border-amber-500/20">Select both teams first.</p>
        )}
        <div className="space-y-2">
          {matchups.map((m, i) => (
            <div key={i} className="flex flex-col md:flex-row gap-2 items-center bg-secondary/30 p-2 rounded border border-border text-sm">
              <div className="flex-1 w-full">
                <label className="text-[10px] text-primary font-bold uppercase mb-0.5 block">{team1Name}</label>
                <Select required value={m.p1} onChange={e => updateM(i, "p1", e.target.value)} options={t1POpts} />
              </div>
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <Input type="number" required min={0} value={m.s1} onChange={e => updateM(i, "s1", e.target.value)} className="w-14 text-center h-8" />
                <span className="text-muted-foreground text-[10px]">—</span>
                <Input type="number" required min={0} value={m.s2} onChange={e => updateM(i, "s2", e.target.value)} className="w-14 text-center h-8" />
              </div>
              <div className="flex-1 w-full">
                <label className="text-[10px] text-accent font-bold uppercase mb-0.5 block">{team2Name}</label>
                <Select required value={m.p2} onChange={e => updateM(i, "p2", e.target.value)} options={t2POpts} />
              </div>
              <div className="w-full md:w-24 shrink-0">
                <label className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5 block">MVP</label>
                <Select value={m.mvp} onChange={e => updateM(i, "mvp", e.target.value)}
                  options={[
                    { label: "None", value: "" },
                    { label: players.find((p: any) => p.id === Number(m.p1))?.name ?? "P1", value: m.p1 || "" },
                    { label: players.find((p: any) => p.id === Number(m.p2))?.name ?? "P2", value: m.p2 || "" },
                  ]} />
              </div>
              <button type="button" onClick={() => setMatchups(prev => prev.filter((_, j) => j !== i))}
                className="text-destructive p-1 hover:bg-destructive/10 rounded shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="gap-1">
          <X className="w-3.5 h-3.5" /> Cancel
        </Button>
        <Button type="submit" variant="gaming" size="sm" className="flex-1 gap-1" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {editingMatch ? "Save Changes" : `Record Leg ${leg}`}
        </Button>
      </div>
    </form>
  );
}

interface LeagueFormProps {
  mode: "create" | "edit" | "new-season";
  initialData?: LeagueItem;
  prefill?: { name: string; leagueType: string; logoUrl: string | null };
  onSuccess: () => void;
}

function LeagueForm({ mode, initialData, prefill, onSuccess }: LeagueFormProps) {
  const [name, setName] = useState(
    mode === "new-season" ? (prefill?.name ?? "") : (initialData?.name ?? "")
  );
  const [season, setSeason] = useState(
    mode === "new-season" ? "" : (initialData?.season ?? "")
  );
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [leagueType, setLeagueType] = useState(
    prefill?.leagueType ?? initialData?.leagueType ?? "league"
  );
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<number>>(new Set());
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  const { toast } = useToast();
  const { data: allTeams = [] } = useAllTeams();

  const isNewSeason = mode === "new-season";
  const isEdit = mode === "edit";

  // Fetch existing participants when editing
  useEffect(() => {
    if (isEdit && initialData?.id && !teamsLoaded) {
      fetch(getApiUrl(`/api/leagues/${initialData.id}/participants`), { credentials: "include" })
        .then(r => r.ok ? r.json() : { teamIds: [] })
        .then(data => {
          setSelectedTeamIds(new Set(data.teamIds ?? []));
          setTeamsLoaded(true);
        })
        .catch(() => setTeamsLoaded(true));
    } else if (!isEdit) {
      // For new/new-season: pre-select all active teams by default
      const activeIds = allTeams
        .filter(t => !t.status || t.status === "active")
        .map(t => t.id);
      setSelectedTeamIds(new Set(activeIds));
      setTeamsLoaded(true);
    }
  }, [isEdit, initialData?.id, allTeams.length]);

  const toggleTeam = (id: number) => {
    setSelectedTeamIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedTeamIds(new Set(allTeams.map(t => t.id)));
  const selectActive = () => setSelectedTeamIds(new Set(allTeams.filter(t => !t.status || t.status === "active").map(t => t.id)));
  const clearAll = () => setSelectedTeamIds(new Set());

  const activeTeams = allTeams.filter(t => !t.status || t.status === "active");
  const leftTeams = allTeams.filter(t => t.status === "left");

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = isEdit
        ? getApiUrl(`/api/leagues/${initialData!.id}`)
        : getApiUrl("/api/leagues");
      const r = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Season updated" : isNewSeason ? "New season created!" : "Competition created",
        description: isNewSeason
          ? `New season "${season}" is ready with ${selectedTeamIds.size} team${selectedTeamIds.size !== 1 ? "s" : ""}. Add fixtures under Manage Matches.`
          : undefined,
      });
      onSuccess();
    },
    onError: () => toast({ variant: "destructive", title: "Error saving" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name,
      season: season || null,
      description: description || null,
      leagueType,
      teamIds: Array.from(selectedTeamIds),
    };
    if (isNewSeason && prefill?.logoUrl) payload.logoUrl = prefill.logoUrl;
    if (isEdit) payload.isLocked = initialData?.isLocked;
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-4">
      {isNewSeason && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
          Creating a new season under <strong className="text-foreground">{prefill?.name}</strong>.
          It will have its own fixtures, standings, and player stats.
        </div>
      )}

      {/* Competition name */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Competition Name *</label>
        {isNewSeason ? (
          <div className="px-3 py-2 rounded-md bg-secondary/50 text-sm font-bold border border-border">{name}</div>
        ) : (
          <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Division A" />
        )}
      </div>

      {/* Season label */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">
          Season Label {isNewSeason && <span className="text-destructive">*</span>}
        </label>
        <Input
          required={isNewSeason}
          value={season}
          onChange={e => setSeason(e.target.value)}
          placeholder="e.g. 2025-26"
          autoFocus={isNewSeason}
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Appears as the season identifier (e.g. "2024-25", "Season 3").
        </p>
      </div>

      {/* Competition type */}
      {!isNewSeason && (
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Competition Type</label>
          <select
            value={leagueType}
            onChange={e => setLeagueType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="league">Regular League</option>
            <option value="cup">GEF Champions Cup</option>
          </select>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Description</label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
      </div>

      {/* ── TEAM SELECTION ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-muted-foreground uppercase">
            Participating Teams
            <span className="ml-2 text-primary font-black">{selectedTeamIds.size}</span>
            <span className="text-muted-foreground font-normal"> / {allTeams.length} selected</span>
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={selectActive}
              className="text-[10px] font-bold uppercase tracking-wide text-green-400 hover:text-green-300 px-2 py-0.5 border border-green-500/30 rounded hover:bg-green-500/5 transition-colors"
            >
              Active only
            </button>
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] font-bold uppercase tracking-wide text-primary hover:text-primary/80 px-2 py-0.5 border border-primary/30 rounded hover:bg-primary/5 transition-colors"
            >
              All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground px-2 py-0.5 border border-border rounded hover:bg-secondary/30 transition-colors"
            >
              None
            </button>
          </div>
        </div>

        {!teamsLoaded ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : allTeams.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No teams found. Add teams first in Manage Teams.
          </div>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border/60 max-h-64 overflow-y-auto">
            {/* Active teams */}
            {activeTeams.length > 0 && (
              <>
                {activeTeams.map(team => {
                  const checked = selectedTeamIds.has(team.id);
                  return (
                    <label
                      key={team.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-secondary/20 transition-colors",
                        checked && "bg-primary/5"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleTeam(team.id)}
                      />
                      {checked
                        ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                        : <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      }
                      {team.logoUrl
                        ? <img src={team.logoUrl} className="w-6 h-6 rounded object-contain shrink-0" alt={team.name} />
                        : <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center shrink-0"><Shield className="w-3 h-3 text-muted-foreground" /></div>
                      }
                      <span className={cn("text-sm font-medium flex-1", checked ? "text-foreground" : "text-muted-foreground")}>
                        {team.name}
                      </span>
                      <span className="text-[10px] text-green-400 font-bold uppercase">Active</span>
                    </label>
                  );
                })}
              </>
            )}

            {/* Left teams — shown separately with visual indicator */}
            {leftTeams.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/20">
                  <UserX className="w-3 h-3 text-muted-foreground/60" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Left GEF — {leftTeams.length} team{leftTeams.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {leftTeams.map(team => {
                  const checked = selectedTeamIds.has(team.id);
                  return (
                    <label
                      key={team.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-secondary/20 transition-colors opacity-60",
                        checked && "opacity-100 bg-orange-500/5"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleTeam(team.id)}
                      />
                      {checked
                        ? <CheckSquare className="w-4 h-4 text-orange-400 shrink-0" />
                        : <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      }
                      {team.logoUrl
                        ? <img src={team.logoUrl} className="w-6 h-6 rounded object-contain shrink-0 grayscale" alt={team.name} />
                        : <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center shrink-0"><Shield className="w-3 h-3 text-muted-foreground" /></div>
                      }
                      <span className={cn("text-sm font-medium flex-1 line-through", checked && "no-underline")}>
                        {team.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase">Left</span>
                    </label>
                  );
                })}
              </>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-1.5">
          Only selected teams appear in the standings table for this season. Their historical data from other seasons is unaffected.
        </p>
      </div>

      <Button type="submit" variant="gaming" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isNewSeason ? `Create Season with ${selectedTeamIds.size} Team${selectedTeamIds.size !== 1 ? "s" : ""}` : isEdit ? "Save Changes" : "Create Competition"}
      </Button>
    </form>
  );
}
