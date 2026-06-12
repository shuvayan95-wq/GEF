import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import {
  Calendar, ChevronDown, ChevronRight, Loader2, Plus, RefreshCw,
  Trash2, Edit, Check, X, Zap, Settings, Trophy, AlertTriangle,
  Shield, RotateCcw, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeagueItem {
  id: number;
  name: string;
  season: string | null;
  fixtureRounds?: number;
  leagueRules?: string | null;
}

interface ScheduleFixture {
  id: number;
  leagueId: number;
  matchday: number;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamLogoUrl: string | null;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamLogoUrl: string | null;
  scheduledDate: string | null;
  matchId: number | null;
  status: "pending" | "played";
  homeScore: number | null;
  awayScore: number | null;
}

interface TeamItem {
  id: number;
  name: string;
  logoUrl: string | null;
}

interface LeagueRule {
  posFrom: number;
  posTo: number;
  label: string;
  color: string;
}

const RULE_COLORS = [
  { value: "gold", label: "Gold", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
  { value: "green", label: "Green", cls: "bg-green-500/20 text-green-300 border-green-500/40" },
  { value: "blue", label: "Blue", cls: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { value: "purple", label: "Purple", cls: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  { value: "orange", label: "Orange", cls: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  { value: "red", label: "Red", cls: "bg-red-500/20 text-red-300 border-red-500/40" },
  { value: "cyan", label: "Cyan", cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
];

function getRuleColorCls(color: string) {
  return RULE_COLORS.find(c => c.value === color)?.cls ?? "bg-secondary/50 text-muted-foreground border-border";
}

export function FixtureManager({ league, onClose }: { league: LeagueItem | null; onClose: () => void }) {
  const [tab, setTab] = useState<"fixtures" | "rules">("fixtures");

  if (!league) return null;

  return (
    <Dialog open={!!league} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-5 h-5 text-primary" />
            {league.name} — {league.season ?? `League #${league.id}`}
          </DialogTitle>
          <div className="flex gap-1 mt-3 border-b border-border pb-0">
            <TabBtn active={tab === "fixtures"} onClick={() => setTab("fixtures")}>
              <Calendar className="w-3.5 h-3.5" /> Fixtures
            </TabBtn>
            <TabBtn active={tab === "rules"} onClick={() => setTab("rules")}>
              <Settings className="w-3.5 h-3.5" /> League Rules
            </TabBtn>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {tab === "fixtures" ? (
            <FixturesTab league={league} />
          ) : (
            <RulesTab league={league} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors -mb-px",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ─── Fixtures Tab ──────────────────────────────────────────────────────────────

function FixturesTab({ league }: { league: LeagueItem }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fixtures = [], isLoading, refetch } = useQuery<ScheduleFixture[]>({
    queryKey: ["/api/leagues", league.id, "fixture-schedule"],
    queryFn: async () => {
      const r = await fetch(getApiUrl(`/api/leagues/${league.id}/fixture-schedule`), { credentials: "include" });
      return r.json();
    },
  });

  const { data: allTeams = [] } = useQuery<TeamItem[]>({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/teams"), { credentials: "include" });
      return r.json();
    },
  });

  const { data: allPlayers = [] } = useQuery<any[]>({
    queryKey: ["/api/players-dropdown"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/players-dropdown"), { credentials: "include" });
      return r.json();
    },
  });

  const [rounds, setRounds] = useState(league.fixtureRounds ?? 1);
  const [showGenConfirm, setShowGenConfirm] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [enteringResult, setEnteringResult] = useState<number | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<number, ScheduleFixture[]>();
    for (const f of fixtures) {
      if (!map.has(f.matchday)) map.set(f.matchday, []);
      map.get(f.matchday)!.push(f);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [fixtures]);

  const playedCount = fixtures.filter(f => f.status === "played").length;
  const pendingCount = fixtures.filter(f => f.status === "pending").length;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(getApiUrl(`/api/leagues/${league.id}/fixture-schedule/generate`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rounds, clearExisting: true }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    },
    onSuccess: (data) => {
      toast({ title: `Generated ${data.generated} fixtures across ${data.matchdays} matchdays` });
      setShowGenConfirm(false);
      setExpandedDays(new Set([1]));
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Failed to generate", description: e.message }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(getApiUrl(`/api/leagues/${league.id}/fixture-schedule`), { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { toast({ title: "All fixtures cleared" }); refetch(); },
    onError: () => toast({ variant: "destructive", title: "Failed to clear fixtures" }),
  });

  const deleteFixtureMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(getApiUrl(`/api/fixture-schedule/${id}`), { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { toast({ title: "Fixture deleted" }); refetch(); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete fixture" }),
  });

  const toggleDay = (day: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Generate bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <label className="text-xs font-bold uppercase text-muted-foreground shrink-0">Rounds</label>
          <select
            value={rounds}
            onChange={e => setRounds(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value={1}>1× — Single round-robin</option>
            <option value={2}>2× — Home & away</option>
            <option value={3}>3× — Triple round-robin</option>
            <option value={4}>4× — Quadruple</option>
          </select>
        </div>

        <div className="flex gap-2 shrink-0">
          {fixtures.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive gap-1.5"
              onClick={() => { if (confirm("Clear all fixtures? Played results will also be deleted.")) clearMutation.mutate(); }}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Clear
            </Button>
          )}
          {fixtures.length > 0 && !showGenConfirm ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowGenConfirm(true)}>
              <RotateCcw className="w-3.5 h-3.5" /> Regenerate
            </Button>
          ) : showGenConfirm ? (
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="text-xs text-orange-300">This will clear existing fixtures.</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowGenConfirm(false)}>Cancel</Button>
              <Button variant="gaming" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} Confirm
              </Button>
            </div>
          ) : (
            <Button variant="gaming" size="sm" className="gap-1.5" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Generate Fixtures
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      {fixtures.length > 0 && (
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <ClipboardList className="w-3.5 h-3.5" />
            <strong className="text-foreground">{fixtures.length}</strong> total
          </span>
          <span className="flex items-center gap-1 text-green-400">
            <Check className="w-3.5 h-3.5" />
            <strong>{playedCount}</strong> played
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <strong>{pendingCount}</strong> pending
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && fixtures.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-display uppercase font-bold">No fixtures generated</p>
          <p className="text-sm mt-1">Choose your rounds and click Generate Fixtures.</p>
        </div>
      )}

      {/* Matchday groups */}
      <div className="space-y-2">
        {grouped.map(([day, dayFixtures]) => {
          const isOpen = expandedDays.has(day);
          const allPlayed = dayFixtures.every(f => f.status === "played");
          const anyPlayed = dayFixtures.some(f => f.status === "played");
          return (
            <div key={day} className="border border-border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/10 transition-colors"
                onClick={() => toggleDay(day)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-widest text-primary border border-primary/30 px-2 py-0.5 rounded">
                    Matchday {day}
                  </span>
                  <span className="text-xs text-muted-foreground">{dayFixtures.length} match{dayFixtures.length !== 1 ? "es" : ""}</span>
                  {allPlayed && <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Complete</span>}
                  {!allPlayed && anyPlayed && <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">In Progress</span>}
                </div>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>

              {isOpen && (
                <div className="border-t border-border divide-y divide-border/50">
                  {dayFixtures.map(fixture => (
                    <FixtureRow
                      key={fixture.id}
                      fixture={fixture}
                      allTeams={allTeams}
                      allPlayers={allPlayers}
                      isEntering={enteringResult === fixture.id}
                      onEnter={() => setEnteringResult(fixture.id)}
                      onCancelEnter={() => setEnteringResult(null)}
                      onDelete={() => {
                        if (confirm("Delete this fixture?")) deleteFixtureMutation.mutate(fixture.id);
                      }}
                      onSaved={() => { setEnteringResult(null); refetch(); queryClient.invalidateQueries({ queryKey: ["/api/leagues", league.id] }); }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fixture Row ───────────────────────────────────────────────────────────────

function FixtureRow({
  fixture, allTeams, allPlayers, isEntering, onEnter, onCancelEnter, onDelete, onSaved,
}: {
  fixture: ScheduleFixture;
  allTeams: TeamItem[];
  allPlayers: any[];
  isEntering: boolean;
  onEnter: () => void;
  onCancelEnter: () => void;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const isPlayed = fixture.status === "played";

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <span className="font-bold text-sm truncate">{fixture.homeTeamName}</span>
          {fixture.homeTeamLogoUrl
            ? <img src={fixture.homeTeamLogoUrl} className="w-6 h-6 rounded object-contain shrink-0" />
            : <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center shrink-0"><Shield className="w-3 h-3 text-muted-foreground" /></div>
          }
        </div>

        {/* Score / VS */}
        <div className="text-center shrink-0 w-20">
          {isPlayed ? (
            <span className="font-display font-black text-lg text-primary">
              {fixture.homeScore ?? 0} – {fixture.awayScore ?? 0}
            </span>
          ) : (
            <span className="font-display font-bold text-muted-foreground text-sm">
              {fixture.scheduledDate ? fixture.scheduledDate.slice(0, 10) : "vs"}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
          {fixture.awayTeamLogoUrl
            ? <img src={fixture.awayTeamLogoUrl} className="w-6 h-6 rounded object-contain shrink-0" />
            : <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center shrink-0"><Shield className="w-3 h-3 text-muted-foreground" /></div>
          }
          <span className="font-bold text-sm truncate">{fixture.awayTeamName}</span>
        </div>

        {/* Status badge */}
        <div className="shrink-0">
          {isPlayed
            ? <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Played</span>
            : <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full border border-border">Pending</span>
          }
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={onEnter}>
            {isPlayed ? <Edit className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {isPlayed ? "Edit" : "Result"}
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Result entry form */}
      {isEntering && (
        <div className="border-t border-border bg-secondary/10">
          <ResultForm
            fixture={fixture}
            allTeams={allTeams}
            allPlayers={allPlayers}
            onCancel={onCancelEnter}
            onSuccess={onSaved}
          />
        </div>
      )}
    </div>
  );
}

// ─── Result Form ───────────────────────────────────────────────────────────────

function ResultForm({
  fixture, allPlayers, onCancel, onSuccess,
}: {
  fixture: ScheduleFixture;
  allTeams: TeamItem[];
  allPlayers: any[];
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [matchups, setMatchups] = useState<any[]>([]);

  const homePlayers = allPlayers.filter((p: any) => p.teamId === fixture.homeTeamId);
  const awayPlayers = allPlayers.filter((p: any) => p.teamId === fixture.awayTeamId);
  const homeOpts = [{ label: "— Player —", value: "" }, ...homePlayers.map((p: any) => ({ label: p.name, value: p.id }))];
  const awayOpts = [{ label: "— Player —", value: "" }, ...awayPlayers.map((p: any) => ({ label: p.name, value: p.id }))];

  const totalHome = matchups.reduce((s, m) => s + (Number(m.s1) || 0), 0);
  const totalAway = matchups.reduce((s, m) => s + (Number(m.s2) || 0), 0);

  const addMatchup = () => {
    if (matchups.length >= 5) return;
    setMatchups(p => [...p, { p1: "", p2: "", s1: 0, s2: 0, mvp: "" }]);
  };

  const updateM = (idx: number, field: string, val: any) => {
    setMatchups(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date: new Date(date).toISOString(),
        homeScore: totalHome,
        awayScore: totalAway,
        playerMatchups: matchups.map(m => ({
          player1Id: Number(m.p1),
          player2Id: Number(m.p2),
          player1Goals: Number(m.s1),
          player2Goals: Number(m.s2),
          mvpPlayerId: m.mvp ? Number(m.mvp) : null,
        })).filter(m => m.player1Id && m.player2Id),
      };
      const r = await fetch(getApiUrl(`/api/fixture-schedule/${fixture.id}/result`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      toast({ title: "Result saved!" });
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error saving result", description: err?.message });
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Enter Result</p>
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-primary text-lg">{totalHome} – {totalAway}</span>
          <label className="text-xs text-muted-foreground">Auto-sum from matchups</label>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Date</label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="max-w-[180px]" />
      </div>

      {/* Matchups */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase">Player Matchups ({matchups.length}/5)</label>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addMatchup} disabled={matchups.length >= 5}>
            <Plus className="w-3 h-3" /> Add Game
          </Button>
        </div>

        {matchups.length === 0 && (
          <p className="text-xs text-muted-foreground italic bg-secondary/20 rounded-lg p-3 border border-border">
            No matchups added — score will be 0–0. Add player games above.
          </p>
        )}

        <div className="space-y-2">
          {matchups.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-2 items-center bg-secondary/30 p-2 rounded border border-border text-sm">
              <Select
                required value={m.p1}
                onChange={e => updateM(i, "p1", e.target.value)}
                options={homeOpts}
              />
              <div className="flex items-center gap-1 shrink-0">
                <Input type="number" min={0} value={m.s1} onChange={e => updateM(i, "s1", e.target.value)} className="w-12 text-center h-8 p-1" />
                <span className="text-muted-foreground text-xs">–</span>
                <Input type="number" min={0} value={m.s2} onChange={e => updateM(i, "s2", e.target.value)} className="w-12 text-center h-8 p-1" />
              </div>
              <Select
                required value={m.p2}
                onChange={e => updateM(i, "p2", e.target.value)}
                options={awayOpts}
              />
              <Select
                value={m.mvp}
                onChange={e => updateM(i, "mvp", e.target.value)}
                options={[
                  { label: "MVP?", value: "" },
                  ...(m.p1 ? [{ label: allPlayers.find((p: any) => p.id === Number(m.p1))?.name ?? "P1 MVP", value: m.p1 }] : []),
                  ...(m.p2 ? [{ label: allPlayers.find((p: any) => p.id === Number(m.p2))?.name ?? "P2 MVP", value: m.p2 }] : []),
                ]}
                className="w-24"
              />
              <button type="button" onClick={() => setMatchups(prev => prev.filter((_, j) => j !== i))} className="text-destructive hover:bg-destructive/10 p-1 rounded shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="gap-1">
          <X className="w-3.5 h-3.5" /> Cancel
        </Button>
        <Button type="submit" variant="gaming" size="sm" className="flex-1 gap-1" disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save Result
        </Button>
      </div>
    </form>
  );
}

// ─── Rules Tab ─────────────────────────────────────────────────────────────────

function RulesTab({ league }: { league: LeagueItem }) {
  const { toast } = useToast();
  const [rules, setRules] = useState<LeagueRule[]>(() => {
    try { return league.leagueRules ? JSON.parse(league.leagueRules) : []; }
    catch { return []; }
  });
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const saveRules = async (newRules: LeagueRule[]) => {
    setSaving(true);
    try {
      const r = await fetch(getApiUrl(`/api/leagues/${league.id}/rules`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rules: newRules }),
      });
      if (!r.ok) throw new Error("Failed");
      setRules(newRules);
      toast({ title: "League rules saved" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save rules" });
    } finally { setSaving(false); }
  };

  const deleteRule = (idx: number) => {
    const next = rules.filter((_, i) => i !== idx);
    saveRules(next);
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="p-3 bg-secondary/30 rounded-xl border border-border text-sm text-muted-foreground">
        <p>Define what each finishing position means — e.g. <strong className="text-foreground">"Top 4 → Community Shield"</strong>, <strong className="text-foreground">"Bottom 2 → Relegation"</strong>. These rules are shown on the league standings page.</p>
      </div>

      {rules.length === 0 && !addForm && (
        <div className="text-center py-8 border border-dashed border-border rounded-xl text-muted-foreground">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No rules defined yet.</p>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-2">
        {rules.map((rule, idx) => (
          <div key={idx}>
            {editIdx === idx ? (
              <RuleForm
                initial={rule}
                onSave={updated => {
                  const next = rules.map((r, i) => i === idx ? updated : r);
                  saveRules(next);
                  setEditIdx(null);
                }}
                onCancel={() => setEditIdx(null)}
              />
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl">
                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border shrink-0", getRuleColorCls(rule.color))}>
                  {rule.posFrom === rule.posTo ? `#${rule.posFrom}` : `Top ${rule.posTo}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{rule.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Position{rule.posFrom === rule.posTo ? ` ${rule.posFrom}` : `s ${rule.posFrom}–${rule.posTo}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditIdx(idx)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => deleteRule(idx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add form */}
      {addForm ? (
        <RuleForm
          onSave={newRule => {
            const next = [...rules, newRule].sort((a, b) => a.posFrom - b.posFrom);
            saveRules(next);
            setAddForm(false);
          }}
          onCancel={() => setAddForm(false)}
        />
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setAddForm(true)} disabled={saving}>
          <Plus className="w-3.5 h-3.5" /> Add Rule
        </Button>
      )}

      {/* Quick presets */}
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Quick Presets</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Top 4 → Community Shield", posFrom: 1, posTo: 4, color: "gold" },
            { label: "Top 2 → Champions Cup", posFrom: 1, posTo: 2, color: "purple" },
            { label: "Relegation Zone", posFrom: 99, posTo: 99, color: "red" },
            { label: "Playoff", posFrom: 5, posTo: 6, color: "blue" },
          ].map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                const exists = rules.some(r => r.label === preset.label);
                if (!exists) {
                  const next = [...rules, preset].sort((a, b) => a.posFrom - b.posFrom);
                  saveRules(next);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              + {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RuleForm({
  initial, onSave, onCancel,
}: {
  initial?: LeagueRule;
  onSave: (rule: LeagueRule) => void;
  onCancel: () => void;
}) {
  const [posFrom, setPosFrom] = useState(initial?.posFrom ?? 1);
  const [posTo, setPosTo] = useState(initial?.posTo ?? 4);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [color, setColor] = useState(initial?.color ?? "gold");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({ posFrom: Number(posFrom), posTo: Number(posTo), label: label.trim(), color });
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border border-primary/30 rounded-xl bg-primary/5 space-y-3">
      <p className="text-xs font-bold uppercase text-primary">{initial ? "Edit Rule" : "New Rule"}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">From Position</label>
          <Input type="number" min={1} max={50} value={posFrom} onChange={e => setPosFrom(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">To Position</label>
          <Input type="number" min={1} max={50} value={posTo} onChange={e => setPosTo(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Label *</label>
        <Input
          required
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Community Shield, Champions Cup, Relegation..."
        />
      </div>
      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Color</label>
        <div className="flex flex-wrap gap-2">
          {RULE_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border font-bold transition-all",
                c.cls,
                color === c.value ? "ring-2 ring-white/30 scale-105" : "opacity-60 hover:opacity-100"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="gap-1">
          <X className="w-3 h-3" /> Cancel
        </Button>
        <Button type="submit" variant="gaming" size="sm" className="flex-1 gap-1">
          <Check className="w-3 h-3" /> Save Rule
        </Button>
      </div>
    </form>
  );
}
