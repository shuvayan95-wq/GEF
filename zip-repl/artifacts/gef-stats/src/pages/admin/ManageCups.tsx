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
  Trophy, Swords, X, Check, GripVertical
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
interface PlayerRef { id: number; name: string; imageUrl: string | null; position: string | null }
interface Fixture {
  id: number; cupId: number; roundKey: string; leg: number;
  player1Id: number | null; player2Id: number | null;
  player1Goals: number | null; player2Goals: number | null;
  notes: string | null; matchDate: string | null;
  player1?: PlayerRef | null; player2?: PlayerRef | null;
}

interface CupDetail extends Cup { fixtures: Fixture[] }

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

  const { data: cupDetail } = useQuery<CupDetail>({
    queryKey: [`/api/cups/${expandedCupId}`],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/cups/${expandedCupId}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: expandedCupId !== null,
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
        <h1 className="text-3xl font-display font-bold uppercase">Knockout Cups</h1>
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
              {/* Cup row */}
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

              {/* Expanded: rounds + fixtures */}
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

      {/* Cup create/edit dialog */}
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
function RoundSection({ cup, round, fixtures, players, onRefresh }: {
  cup: Cup; round: Round; fixtures: Fixture[]; players: PlayerRef[]; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [editingFix, setEditingFix] = useState<Fixture | null>(null);

  const handleDeleteFixture = async (fid: number) => {
    try {
      await fetch(getApiUrl(`/api/admin/cups/${cup.id}/fixtures/${fid}`), { method: "DELETE", credentials: "include" });
      toast({ title: "Fixture removed" });
      onRefresh();
    } catch { toast({ variant: "destructive", title: "Failed" }); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Swords className="w-4 h-4 text-primary" />
        <h3 className="font-bold uppercase text-sm">{round.label || round.key}</h3>
        {round.twoLegged && <span className="text-[9px] text-primary font-bold uppercase tracking-widest border border-primary/30 px-1.5 py-0.5 rounded">2 Legs</span>}
        <Button variant="ghost" size="sm" className="ml-auto gap-1 h-7 text-xs" onClick={() => setAdding(true)}>
          <Plus className="w-3 h-3" /> Add Fixture
        </Button>
      </div>

      {fixtures.length === 0 && !adding && (
        <p className="text-muted-foreground text-xs italic pl-2">No fixtures yet.</p>
      )}

      <div className="space-y-2">
        {fixtures.map(fix => (
          <div key={fix.id} className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2 text-sm">
            <span className="text-xs text-muted-foreground w-10 flex-shrink-0">Leg {fix.leg}</span>
            <span className="flex-1 truncate font-medium">{fix.player1?.name ?? "TBD"}</span>
            <span className="font-mono font-bold text-primary mx-1">
              {fix.player1Goals ?? "—"} : {fix.player2Goals ?? "—"}
            </span>
            <span className="flex-1 truncate font-medium text-right">{fix.player2?.name ?? "TBD"}</span>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditingFix(fix)}><Edit className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDeleteFixture(fix.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>

      {(adding || editingFix) && (
        <FixtureForm
          cup={cup}
          round={round}
          players={players}
          editingFixture={editingFix}
          onClose={() => { setAdding(false); setEditingFix(null); }}
          onSuccess={() => { setAdding(false); setEditingFix(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Fixture Form ──────────────────────────────────────────────────────────────
function FixtureForm({ cup, round, players, editingFixture, onClose, onSuccess }: {
  cup: Cup; round: Round; players: PlayerRef[]; editingFixture: Fixture | null;
  onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    leg: String(editingFixture?.leg ?? 1),
    player1Id: String(editingFixture?.player1Id ?? ""),
    player2Id: String(editingFixture?.player2Id ?? ""),
    player1Goals: editingFixture?.player1Goals != null ? String(editingFixture.player1Goals) : "",
    player2Goals: editingFixture?.player2Goals != null ? String(editingFixture.player2Goals) : "",
    notes: editingFixture?.notes ?? "",
    matchDate: editingFixture?.matchDate ?? "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        roundKey: round.key,
        leg: Number(form.leg) || 1,
        player1Id: form.player1Id ? Number(form.player1Id) : null,
        player2Id: form.player2Id ? Number(form.player2Id) : null,
        player1Goals: form.player1Goals !== "" ? Number(form.player1Goals) : null,
        player2Goals: form.player2Goals !== "" ? Number(form.player2Goals) : null,
        notes: form.notes || null,
        matchDate: form.matchDate || null,
      };
      if (editingFixture) {
        await fetch(getApiUrl(`/api/admin/cups/${cup.id}/fixtures/${editingFixture.id}`), {
          method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body),
        });
        toast({ title: "Fixture updated" });
      } else {
        await fetch(getApiUrl(`/api/admin/cups/${cup.id}/fixtures`), {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body),
        });
        toast({ title: "Fixture added" });
      }
      onSuccess();
    } catch { toast({ variant: "destructive", title: "Failed to save fixture" }); }
    finally { setSaving(false); }
  };

  const pOpts = [{ label: "— Select player —", value: "" }, ...players.map(p => ({ label: p.name, value: p.id }))];

  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-secondary/30 border border-border rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">{editingFixture ? "Edit Fixture" : "Add Fixture"} · {round.label}</p>
      <div className="grid grid-cols-2 gap-3">
        {round.twoLegged && (
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Leg</label>
            <Select value={form.leg} onChange={e => setForm(p => ({ ...p, leg: e.target.value }))}
              options={[{ label: "Leg 1 (First Leg)", value: "1" }, { label: "Leg 2 (Second Leg)", value: "2" }]} />
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Player 1</label>
          <Select value={form.player1Id} onChange={e => setForm(p => ({ ...p, player1Id: e.target.value }))} options={pOpts} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Player 2</label>
          <Select value={form.player2Id} onChange={e => setForm(p => ({ ...p, player2Id: e.target.value }))} options={pOpts} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Player 1 Goals</label>
          <Input type="number" min={0} value={form.player1Goals} onChange={set("player1Goals")} placeholder="—" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Player 2 Goals</label>
          <Input type="number" min={0} value={form.player2Goals} onChange={set("player2Goals")} placeholder="—" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Date (optional)</label>
          <Input value={form.matchDate} onChange={set("matchDate")} placeholder="e.g. 5 Jun 2026" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Notes (optional)</label>
          <Input value={form.notes} onChange={set("notes")} placeholder="e.g. Extra time" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="gap-1"><X className="w-4 h-4" /> Cancel</Button>
        <Button type="submit" variant="gaming" size="sm" className="gap-1" disabled={saving}>
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
  const [rounds, setRounds] = useState<Round[]>(
    editingCup ? (editingCup.rounds as Round[]) : []
  );

  // reset when dialog opens
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
      const newRound: Round = { key: preset.key, label: preset.label, order: rounds.length + 1, twoLegged: preset.defaultTwoLegged };
      setRounds(r => [...r, newRound].sort((a, b) => {
        const ORDER = ["R32","R16","QF","SF","3RD","FINAL"];
        return ORDER.indexOf(a.key) - ORDER.indexOf(b.key);
      }).map((x, i) => ({ ...x, order: i + 1 })));
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

          {/* Round selector */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-bold uppercase text-primary tracking-widest mb-3">Rounds</p>
            <p className="text-xs text-muted-foreground mb-3">Select which rounds this cup has. Toggle "2L" to make a round two-legged.</p>
            <div className="space-y-2">
              {ROUND_PRESETS.map(preset => {
                const active = rounds.find(r => r.key === preset.key);
                return (
                  <div key={preset.key} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${active ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"}`}
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
                Format: <span className="text-primary font-bold">{rounds.sort((a,b)=>a.order-b.order).map(r=>r.label+(r.twoLegged?" (2L)":"")).join(" → ")}</span>
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
