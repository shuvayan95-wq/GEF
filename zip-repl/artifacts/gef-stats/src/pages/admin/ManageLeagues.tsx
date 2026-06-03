import { useMemo, useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Edit, Trash2, Plus, Loader2, Trophy, Users,
  Lock, Unlock, EyeOff, ChevronRight, Calendar, PlusCircle,
  Shield, CheckSquare, Square, UserX,
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

export function ManageLeagues() {
  const { data: leagues, isLoading } = useLeagues();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
    </AdminLayout>
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
