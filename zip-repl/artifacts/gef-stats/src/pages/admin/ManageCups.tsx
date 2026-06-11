import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import {
  Loader2, Plus, Trash2, Edit, ChevronDown, ChevronUp,
  Trophy, Swords, X, Check, Star, Shield,
} from "lucide-react";

const ROUND_PRESETS = [
  { key: "R32", label: "Round of 32", defaultTwoLegged: false },
  { key: "R16", label: "Round of 16", defaultTwoLegged: false },
  { key: "QF", label: "Quarterfinal", defaultTwoLegged: false },
  { key: "SF", label: "Semifinal", defaultTwoLegged: false },
  { key: "3RD", label: "Third Place Play-off", defaultTwoLegged: false },
  { key: "FINAL", label: "Final", defaultTwoLegged: false },
];

interface Round { key: string; label: string; order: number; twoLegged: boolean }
interface Cup {
  id: number; name: string; season: string | null; logoUrl: string | null;
  description: string | null; status: string; rounds: Round[]; createdAt: string;
}
interface TeamRef { id: number; name: string; logoUrl: string | null }
interface PlayerRef { id: number; name: string; imageUrl: string | null; position: string | null; teamId?: number | null }
interface MatchupItem {
  player1Id: number; player2Id: number;
  player1Goals: number; player2Goals: number;
  mvpPlayerId: number | null;
  player1Name?: string; player2Name?: string;
}
interface Fixture {
  id: number; cupId: number; roundKey: string; leg: number;
  team1Id: number | null; team2Id: number | null;
  team1Score: number | null; team2Score: number | null;
  matchups: MatchupItem[];
  notes: string | null; matchDate: string | null;
  team1?: TeamRef | null; team2?: TeamRef | null;
}
interface CupDetailType extends Cup { fixtures: Fixture[] }

function TeamLogo({ team }: { team: TeamRef | null | undefined }) {
  if (!team) return <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-muted-foreground" /></div>;
  if (team.logoUrl) return <img src={team.logoUrl} className="w-7 h-7 rounded-full object-cover border border-border" />;
  return <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-black text-primary">{team.name.slice(0, 2).toUpperCase()}</div>;
}

export function ManageCups() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cupDialogOpen, setCupDialogOpen] = useState(false);
  const [editingCup, setEditingCup] = useState<Cup | null>(null);
  const [expandedCupId, setExpandedCupId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: cups = [], isLoading } = useQuery<Cup[]>({
    queryKey: ["/api/cups"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/cups"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: cupDetail } = useQuery<CupDetailType>({
    queryKey: [`/api/cups/${expandedCupId}`],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/cups/${expandedCupId}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: expandedCupId !== null,
  });

  const { data: teams = [] } = useQuery<TeamRef[]>({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/teams"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: players = [] } = useQuery<PlayerRef[]>({
    queryKey: ["/api/players-dropdown"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/players-dropdown"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const handleDeleteCup = async (id: number) => {
    if (!confirm("Delete this cup and all its fixtures?")) return;
    setDeletingId(id);
    try {
      await fetch(getApiUrl(`/api/admin/cups/${id}`), { method: "DELETE", credentials: "include" });
      toast({ title: "Cup deleted" });
      qc.invalidateQueries({ queryKey: ["/api/cups"] });
      if (expandedCupId === id) setExpandedCupId(null);
    } catch { toast({ variant: "destructive", title: "Failed to delete" }); }
    finally { setDeletingId(null); }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase">Knockout Cups</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage knockout cup competitions with team matchups and individual player games.</p>
        </div>
        <Button variant="gaming" size="sm" className="gap-2" onClick={() => { setEditingCup(null); setCupDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Create Cup
        </Button>
      </div>

      {isLoading && <div className="py-16 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}

      {!isLoading && cups.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-16 text-center text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold uppercase">No cups yet</p>
          <p className="text-sm mt-1">Create your first knockout cup above.</p>
        </div>
      )}

      <div className="space-y-4">
        {cups.map(cup => {
          const isExpanded = expandedCupId === cup.id;
          const rounds = (cup.rounds as Round[]).sort((a, b) => a.order - b.order);
          return (
            <div key={cup.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border border-border flex-shrink-0">
                  {cup.logoUrl ? <img src={cup.logoUrl} className="w-full h-full object-cover rounded-lg" /> : <Trophy className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold">{cup.name}</h3>
                    {cup.season && <span className="text-xs text-muted-foreground">{cup.season}</span>}
                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      cup.status === "completed" ? "text-gray-400 bg-gray-500/10 border-gray-500/30" : "text-green-400 bg-green-500/10 border-green-500/30"
                    }`}>{cup.status}</span>
                  </div>
                  {rounds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">{rounds.map(r => r.label || r.key).join(" → ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { setEditingCup(cup); setCupDialogOpen(true); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDeleteCup(cup.id)} disabled={deletingId === cup.id}>
                    {deletingId === cup.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setExpandedCupId(isExpanded ? null : cup.id)}>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-background/50 p-6 space-y-8">
                  {rounds.length === 0 && <p className="text-muted-foreground text-sm">No rounds configured. Edit the cup to add rounds.</p>}
                  {rounds.map(round => {
                    const roundFixtures = (cupDetail?.fixtures ?? []).filter(f => f.roundKey === round.key);
                    return (
                      <RoundSection
                        key={round.key}
                        cup={cup}
                        round={round}
                        fixtures={roundFixtures}
                        teams={teams}
                        players={players}
                        onRefresh={() => qc.invalidateQueries({ queryKey: [`/api/cups/${cup.id}`] })}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CupFormDialog
        open={cupDialogOpen}
        onOpenChange={setCupDialogOpen}
        editingCup={editingCup}
        onSuccess={() => {
          setCupDialogOpen(false);
          qc.invalidateQueries({ queryKey: ["/api/cups"] });
        }}
      />
    </AdminLayout>
  );
}

// ─── Round Section ─────────────────────────────────────────────────────────────
function RoundSection({ cup, round, fixtures, teams, players, onRefresh }: {
  cup: Cup; round: Round; fixtures: Fixture[];
  teams: TeamRef[]; players: PlayerRef[]; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [editingFix, setEditingFix] = useState<Fixture | null>(null);

  const handleDeleteFixture = async (fid: number) => {
    if (!confirm("Remove this fixture?")) return;
    try {
      await fetch(getApiUrl(`/api/admin/cups/${cup.id}/fixtures/${fid}`), { method: "DELETE", credentials: "include" });
      toast({ title: "Fixture removed" });
      onRefresh();
    } catch { toast({ variant: "destructive", title: "Failed" }); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Swords className="w-4 h-4 text-primary" />
        <h3 className="font-bold uppercase text-sm">{round.label || round.key}</h3>
        {round.twoLegged && <span className="text-[9px] text-primary font-bold uppercase tracking-widest border border-primary/30 px-1.5 py-0.5 rounded">2 Legs</span>}
        <Button variant="ghost" size="sm" className="ml-auto gap-1 h-7 text-xs" onClick={() => { setAdding(true); setEditingFix(null); }}>
          <Plus className="w-3 h-3" /> Add Fixture
        </Button>
      </div>

      {fixtures.length === 0 && !adding && (
        <p className="text-muted-foreground text-xs italic pl-2">No fixtures yet.</p>
      )}

      <div className="space-y-3">
        {fixtures.map(fix => (
          <div key={fix.id} className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest shrink-0">Leg {fix.leg}</span>

              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                <TeamLogo team={fix.team1} />
                <span className="font-bold text-sm truncate text-right">{fix.team1?.name ?? "TBD"}</span>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className="font-display font-black text-lg text-primary tabular-nums w-6 text-right">{fix.team1Score ?? "—"}</span>
                <span className="text-muted-foreground/50 text-sm">:</span>
                <span className="font-display font-black text-lg text-primary tabular-nums w-6 text-left">{fix.team2Score ?? "—"}</span>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-bold text-sm truncate">{fix.team2?.name ?? "TBD"}</span>
                <TeamLogo team={fix.team2} />
              </div>

              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditingFix(fix); setAdding(false); }}>
                  <Edit className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDeleteFixture(fix.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {fix.matchups && fix.matchups.length > 0 && (
              <div className="mt-2 pl-2 space-y-1 border-t border-border/40 pt-2">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Player Matchups ({fix.matchups.length})</p>
                {fix.matchups.map((mu, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 text-right text-muted-foreground truncate">{mu.player1Name ?? `Player ${mu.player1Id}`}</span>
                    <span className="font-bold text-primary tabular-nums">{mu.player1Goals} – {mu.player2Goals}</span>
                    <span className="flex-1 text-muted-foreground truncate">{mu.player2Name ?? `Player ${mu.player2Id}`}</span>
                    {mu.mvpPlayerId && <Star className="w-3 h-3 text-yellow-400 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {(adding || editingFix) && (
        <FixtureForm
          cup={cup}
          round={round}
          teams={teams}
          players={players}
          editingFixture={editingFix}
          onClose={() => { setAdding(false); setEditingFix(null); }}
          onSuccess={() => { setAdding(false); setEditingFix(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Fixture Form (Team + 5 Player Matchups) ──────────────────────────────────
function FixtureForm({ cup, round, teams, players, editingFixture, onClose, onSuccess }: {
  cup: Cup; round: Round; teams: TeamRef[]; players: PlayerRef[];
  editingFixture: Fixture | null; onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [leg, setLeg] = useState(String(editingFixture?.leg ?? 1));
  const [t1Id, setT1Id] = useState(String(editingFixture?.team1Id ?? ""));
  const [t2Id, setT2Id] = useState(String(editingFixture?.team2Id ?? ""));
  const [matchDate, setMatchDate] = useState(editingFixture?.matchDate ?? "");
  const [notes, setNotes] = useState(editingFixture?.notes ?? "");
  const [matchups, setMatchups] = useState<any[]>(
    editingFixture?.matchups?.map(mu => ({
      p1: String(mu.player1Id),
      p2: String(mu.player2Id),
      s1: mu.player1Goals,
      s2: mu.player2Goals,
      mvp: mu.mvpPlayerId ? String(mu.mvpPlayerId) : "",
    })) ?? []
  );

  const teamOptions = [
    { label: "— Select team —", value: "" },
    ...teams.map(t => ({ label: t.name, value: t.id })),
  ];

  const t1Players = players.filter(p => t1Id && p.teamId === Number(t1Id));
  const t2Players = players.filter(p => t2Id && p.teamId === Number(t2Id));

  const t1PlayerOptions = [{ label: "— Select player —", value: "" }, ...t1Players.map(p => ({ label: p.name, value: p.id }))];
  const t2PlayerOptions = [{ label: "— Select player —", value: "" }, ...t2Players.map(p => ({ label: p.name, value: p.id }))];

  const team1Name = teams.find(t => t.id === Number(t1Id))?.name ?? "Team 1";
  const team2Name = teams.find(t => t.id === Number(t2Id))?.name ?? "Team 2";

  const addMatchup = () => {
    if (matchups.length >= 5) return;
    setMatchups(prev => [...prev, { p1: "", p2: "", s1: 0, s2: 0, mvp: "" }]);
  };

  const updateM = (idx: number, field: string, val: any) => {
    const next = [...matchups];
    next[idx] = { ...next[idx], [field]: val };
    setMatchups(next);
  };

  const removeM = (idx: number) => setMatchups(matchups.filter((_, i) => i !== idx));

  const handleTeamChange = (which: 1 | 2, val: string) => {
    if (which === 1) setT1Id(val);
    else setT2Id(val);
    setMatchups(prev => prev.map(m => ({
      ...m,
      ...(which === 1 ? { p1: "", mvp: "" } : { p2: "", mvp: "" }),
    })));
  };

  const totalT1 = matchups.reduce((s, m) => s + (Number(m.s1) || 0), 0);
  const totalT2 = matchups.reduce((s, m) => s + (Number(m.s2) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!t1Id || !t2Id) {
      toast({ variant: "destructive", title: "Select both teams" });
      return;
    }
    setSaving(true);
    try {
      const formattedMatchups = matchups.map(m => ({
        player1Id: Number(m.p1),
        player2Id: Number(m.p2),
        player1Goals: Number(m.s1),
        player2Goals: Number(m.s2),
        mvpPlayerId: m.mvp ? Number(m.mvp) : null,
      }));
      const body = {
        roundKey: round.key,
        leg: Number(leg) || 1,
        team1Id: Number(t1Id),
        team2Id: Number(t2Id),
        team1Score: matchups.length > 0 ? totalT1 : null,
        team2Score: matchups.length > 0 ? totalT2 : null,
        matchups: formattedMatchups,
        notes: notes || null,
        matchDate: matchDate || null,
      };
      if (editingFixture) {
        const res = await fetch(getApiUrl(`/api/admin/cups/${cup.id}/fixtures/${editingFixture.id}`), {
          method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        toast({ title: "Fixture updated" });
      } else {
        const res = await fetch(getApiUrl(`/api/admin/cups/${cup.id}/fixtures`), {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        toast({ title: "Fixture added" });
      }
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save fixture", description: err?.message });
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 bg-secondary/20 border border-border rounded-xl p-5 space-y-5">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">
        {editingFixture ? "Edit" : "Add"} Fixture · {round.label || round.key}
      </p>

      {/* Leg + Date */}
      <div className="grid grid-cols-2 gap-3">
        {round.twoLegged && (
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Leg</label>
            <Select value={leg} onChange={e => setLeg(e.target.value)}
              options={[{ label: "Leg 1", value: "1" }, { label: "Leg 2", value: "2" }]} />
          </div>
        )}
        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Date (optional)</label>
          <Input value={matchDate} onChange={e => setMatchDate(e.target.value)} placeholder="e.g. 5 Jun 2026" />
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center bg-card p-4 rounded-lg border border-border">
        <div>
          <label className="text-xs font-bold text-primary uppercase mb-1 block">Team 1 (Home)</label>
          <Select required value={t1Id} onChange={e => handleTeamChange(1, e.target.value)} options={teamOptions} />
        </div>
        <div className="font-display font-bold text-muted-foreground px-2">VS</div>
        <div>
          <label className="text-xs font-bold text-accent uppercase mb-1 block">Team 2 (Away)</label>
          <Select required value={t2Id} onChange={e => handleTeamChange(2, e.target.value)} options={teamOptions} />
        </div>
      </div>

      {/* Auto-calculated score preview */}
      {matchups.length > 0 && (
        <div className="flex items-center justify-center gap-3 py-2">
          <span className="text-xs text-muted-foreground uppercase font-bold">Auto Score:</span>
          <span className="font-display font-black text-xl text-primary">{totalT1} – {totalT2}</span>
          <span className="text-xs text-muted-foreground">(from matchups)</span>
        </div>
      )}

      {/* Individual Matchups */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-xs font-bold uppercase text-foreground tracking-wide">
            Individual Matchups ({matchups.length}/5)
          </label>
          <Button type="button" variant="outline" size="sm" onClick={addMatchup}
            disabled={matchups.length >= 5 || !t1Id || !t2Id}>
            + Add Game
          </Button>
        </div>

        {(!t1Id || !t2Id) && (
          <p className="text-sm text-amber-500 italic text-center p-3 bg-amber-500/10 rounded border border-amber-500/20">
            Select both teams above to add player matchups.
          </p>
        )}

        <div className="space-y-3">
          {matchups.map((m, i) => (
            <div key={i} className="flex flex-col md:flex-row gap-2 items-center bg-secondary/30 p-3 rounded border border-border">
              <div className="flex-1 w-full">
                <label className="text-[10px] text-primary font-bold uppercase mb-1 block">{team1Name}</label>
                <Select required value={m.p1} onChange={e => updateM(i, "p1", e.target.value)} options={t1PlayerOptions} />
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <Input type="number" required min={0} value={m.s1}
                  onChange={e => updateM(i, "s1", e.target.value)} className="w-16 text-center" />
                <span className="text-muted-foreground text-xs">—</span>
                <Input type="number" required min={0} value={m.s2}
                  onChange={e => updateM(i, "s2", e.target.value)} className="w-16 text-center" />
              </div>
              <div className="flex-1 w-full">
                <label className="text-[10px] text-accent font-bold uppercase mb-1 block">{team2Name}</label>
                <Select required value={m.p2} onChange={e => updateM(i, "p2", e.target.value)} options={t2PlayerOptions} />
              </div>
              <div className="w-full md:w-28 shrink-0">
                <label className="text-[10px] text-muted-foreground font-bold uppercase mb-1 block">MVP</label>
                <Select value={m.mvp} onChange={e => updateM(i, "mvp", e.target.value)}
                  options={[
                    { label: "No MVP", value: "" },
                    { label: m.p1 ? (players.find(p => p.id === Number(m.p1))?.name ?? "P1") : "P1", value: m.p1 || "" },
                    { label: m.p2 ? (players.find(p => p.id === Number(m.p2))?.name ?? "P2") : "P2", value: m.p2 || "" },
                  ]} />
              </div>
              <button type="button" onClick={() => removeM(i)}
                className="text-destructive p-2 hover:bg-destructive/10 rounded shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {matchups.length === 0 && t1Id && t2Id && (
            <p className="text-sm text-muted-foreground italic text-center p-4">Add up to 5 individual player matchups.</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Notes (optional)</label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Extra time, penalties…" />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="gap-1">
          <X className="w-4 h-4" /> Cancel
        </Button>
        <Button type="submit" variant="gaming" size="sm" className="gap-1 flex-1" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {editingFixture ? "Save Changes" : "Add Fixture"}
        </Button>
      </div>
    </form>
  );
}

// ─── Cup Form Dialog ────────────────────────────────────────────────────────────
function CupFormDialog({ open, onOpenChange, editingCup, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void; editingCup: Cup | null; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(editingCup?.name ?? "");
  const [season, setSeason] = useState(editingCup?.season ?? "");
  const [description, setDescription] = useState(editingCup?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(editingCup?.logoUrl ?? "");
  const [status, setStatus] = useState(editingCup?.status ?? "active");
  const [rounds, setRounds] = useState<Round[]>(editingCup ? (editingCup.rounds as Round[]) : []);

  const handleOpen = (v: boolean) => {
    if (v) {
      setName(editingCup?.name ?? "");
      setSeason(editingCup?.season ?? "");
      setDescription(editingCup?.description ?? "");
      setLogoUrl(editingCup?.logoUrl ?? "");
      setStatus(editingCup?.status ?? "active");
      setRounds(editingCup ? (editingCup.rounds as Round[]) : []);
    }
    onOpenChange(v);
  };

  const toggleRound = (preset: typeof ROUND_PRESETS[0]) => {
    const exists = rounds.find(r => r.key === preset.key);
    if (exists) {
      setRounds(r => r.filter(x => x.key !== preset.key).map((x, i) => ({ ...x, order: i + 1 })));
    } else {
      const ORDER = ["R32", "R16", "QF", "SF", "3RD", "FINAL"];
      const newRound: Round = { key: preset.key, label: preset.label, order: rounds.length + 1, twoLegged: preset.defaultTwoLegged };
      setRounds(r => [...r, newRound].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key)).map((x, i) => ({ ...x, order: i + 1 })));
    }
  };

  const toggleTwoLegged = (key: string) => {
    setRounds(r => r.map(x => x.key === key ? { ...x, twoLegged: !x.twoLegged } : x));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast({ variant: "destructive", title: "Cup name is required" }); return; }
    setSaving(true);
    try {
      const body = { name: name.trim(), season: season || null, logoUrl: logoUrl || null, description: description || null, status, rounds };
      if (editingCup) {
        await fetch(getApiUrl(`/api/admin/cups/${editingCup.id}`), {
          method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body),
        });
        toast({ title: "Cup updated" });
      } else {
        await fetch(getApiUrl("/api/admin/cups"), {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body),
        });
        toast({ title: "Cup created" });
      }
      onSuccess();
    } catch { toast({ variant: "destructive", title: "Failed to save cup" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingCup ? "Edit Cup" : "Create Knockout Cup"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Cup Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Super Cup, Winter Cup…" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Season</label>
              <Input value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. 2025/26" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Status</label>
              <Select value={status} onChange={e => setStatus(e.target.value)}
                options={[{ label: "Active", value: "active" }, { label: "Completed", value: "completed" }]} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional short description" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Logo URL (optional)</label>
            <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-bold uppercase text-primary tracking-widest mb-3">Rounds</p>
            <p className="text-xs text-muted-foreground mb-3">Select which rounds this cup has. Toggle "2L" to make a round two-legged.</p>
            <div className="space-y-2">
              {ROUND_PRESETS.map(preset => {
                const active = rounds.find(r => r.key === preset.key);
                return (
                  <div key={preset.key}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${active ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"}`}
                    onClick={() => toggleRound(preset)}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${active ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                      {active && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="flex-1 font-medium text-sm">{preset.label}</span>
                    {active && (
                      <button type="button"
                        onClick={e => { e.stopPropagation(); toggleTwoLegged(preset.key); }}
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-colors ${active.twoLegged ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                        2L
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {rounds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                Format: <span className="text-primary font-bold">{rounds.sort((a, b) => a.order - b.order).map(r => r.label + (r.twoLegged ? " (2L)" : "")).join(" → ")}</span>
              </p>
            )}
          </div>

          <Button type="submit" variant="gaming" className="w-full" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editingCup ? "Save Changes" : "Create Cup"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
