import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Contract {
  id: number;
  playerId: number;
  teamId: number;
  playerName: string;
  teamName: string;
  startDate: string;
  endDate: string;
  salaryAmount: string | null;
  bonusAmount: string | null;
  clauses: string | null;
  promisedMatches: number | null;
  penaltyAmount: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface Player { id: number; name: string; teamId: number | null; teamName: string | null; }
interface Team { id: number; name: string; }

function fmt(n: string | null) {
  if (!n) return "—";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active:      { label: "Active",      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30" },
  expired:     { label: "Expired",     color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
  terminated:  { label: "Terminated",  color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30" },
};

export function ManageContracts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/contracts"), { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const { data: meta } = useQuery<{ players: Player[]; teams: Team[] }>({
    queryKey: ["/api/contracts/players"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/contracts/players"), { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(getApiUrl(`/api/contracts/${id}`), { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/contracts"] }); toast({ title: "Contract deleted" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
  });

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (c: Contract) => { setEditing(c); setDialogOpen(true); };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase">Player Contracts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage player-team agreements, salaries, match promises & penalties</p>
        </div>
        <Button onClick={openCreate} variant="gaming" size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> New Contract
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && contracts.length === 0 && (
        <div className="text-center py-24 bg-card border border-dashed border-border rounded-2xl">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="font-display uppercase text-lg text-muted-foreground">No contracts yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create the first player contract to get started.</p>
        </div>
      )}

      {!isLoading && contracts.length > 0 && (
        <div className="space-y-3">
          {contracts.map(c => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.active;
            const fulfilled = c.promisedMatches != null;
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="font-display font-bold uppercase text-base">{c.playerName}</span>
                      <span className="text-muted-foreground text-sm">→</span>
                      <span className="font-bold text-sm text-primary">{c.teamName}</span>
                      <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border", cfg.color, cfg.bg, cfg.border)}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span><span className="font-bold text-foreground/60">Period:</span> {c.startDate} → {c.endDate}</span>
                      {c.salaryAmount && <span><span className="font-bold text-foreground/60">Salary:</span> <span className="text-green-400 font-mono">GEF$ {fmt(c.salaryAmount)}</span></span>}
                      {c.bonusAmount && <span><span className="font-bold text-foreground/60">Bonus:</span> <span className="text-yellow-400 font-mono">GEF$ {fmt(c.bonusAmount)}</span></span>}
                      {fulfilled && (
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-foreground/60">Promised Matches:</span>
                          <span className="text-sky-400">{c.promisedMatches}</span>
                          {c.penaltyAmount && <span className="text-muted-foreground">| Penalty: <span className="text-red-400 font-mono">GEF$ {fmt(c.penaltyAmount)}</span>/match</span>}
                        </span>
                      )}
                    </div>
                    {c.clauses && <p className="text-xs text-muted-foreground/70 mt-1.5 italic border-l-2 border-border pl-2">{c.clauses}</p>}
                    {c.notes && <p className="text-xs text-muted-foreground/50 mt-1 pl-2">{c.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this contract?")) deleteMutation.mutate(c.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Contract" : "New Contract"}</DialogTitle>
          </DialogHeader>
          {meta && (
            <ContractForm
              key={editing?.id ?? "new"}
              initialData={editing}
              players={meta.players}
              teams={meta.teams}
              onSuccess={() => {
                setDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function ContractForm({ initialData, players, teams, onSuccess }: {
  initialData: Contract | null;
  players: Player[];
  teams: Team[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    playerId: String(initialData?.playerId ?? ""),
    teamId: String(initialData?.teamId ?? ""),
    startDate: initialData?.startDate ?? "",
    endDate: initialData?.endDate ?? "",
    salaryAmount: initialData?.salaryAmount ?? "",
    bonusAmount: initialData?.bonusAmount ?? "",
    clauses: initialData?.clauses ?? "",
    promisedMatches: initialData?.promisedMatches != null ? String(initialData.promisedMatches) : "",
    penaltyAmount: initialData?.penaltyAmount ?? "",
    status: initialData?.status ?? "active",
    notes: initialData?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handlePlayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = Number(e.target.value);
    const player = players.find(p => p.id === pid);
    setForm(p => ({ ...p, playerId: e.target.value, teamId: player?.teamId ? String(player.teamId) : p.teamId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.playerId || !form.teamId || !form.startDate || !form.endDate) {
      toast({ variant: "destructive", title: "Player, team, start and end date are required" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        playerId: Number(form.playerId),
        teamId: Number(form.teamId),
        startDate: form.startDate,
        endDate: form.endDate,
        salaryAmount: form.salaryAmount || null,
        bonusAmount: form.bonusAmount || null,
        clauses: form.clauses || null,
        promisedMatches: form.promisedMatches ? Number(form.promisedMatches) : null,
        penaltyAmount: form.penaltyAmount || null,
        status: form.status,
        notes: form.notes || null,
      };
      const url = initialData ? getApiUrl(`/api/contracts/${initialData.id}`) : getApiUrl("/api/contracts");
      const r = await fetch(url, {
        method: initialData ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error ?? "Save failed"); }
      toast({ title: initialData ? "Contract updated" : "Contract created" });
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors";
  const labelCls = "text-xs font-bold text-muted-foreground uppercase";

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelCls}>Player *</label>
          <select value={form.playerId} onChange={handlePlayerChange} className={inputCls} required>
            <option value="">Select player…</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Team *</label>
          <select value={form.teamId} onChange={e => setForm(p => ({ ...p, teamId: e.target.value }))} className={inputCls} required>
            <option value="">Select team…</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelCls}>Start Date *</label>
          <Input type="text" value={form.startDate} onChange={set("startDate")} placeholder="e.g. Season 5 Week 1" required />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>End Date *</label>
          <Input type="text" value={form.endDate} onChange={set("endDate")} placeholder="e.g. Season 6 Week 8" required />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Financial Terms</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Salary (GEF$)</label>
            <Input type="number" min="0" value={form.salaryAmount} onChange={set("salaryAmount")} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Signing Bonus (GEF$)</label>
            <Input type="number" min="0" value={form.bonusAmount} onChange={set("bonusAmount")} placeholder="0" />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-3">Match Promise & Penalty</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Promised Matches</label>
            <Input type="number" min="0" value={form.promisedMatches} onChange={set("promisedMatches")} placeholder="e.g. 10" />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Penalty / Unfulfilled Match (GEF$)</label>
            <Input type="number" min="0" value={form.penaltyAmount} onChange={set("penaltyAmount")} placeholder="0" />
          </div>
        </div>
        {form.promisedMatches && form.penaltyAmount && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            If fewer than {form.promisedMatches} matches are played, the team owes GEF$ {fmt(form.penaltyAmount)} per unfulfilled match.
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Bonus Clauses</label>
        <textarea
          value={form.clauses}
          onChange={set("clauses")}
          rows={2}
          placeholder="e.g. +GEF$5000 if player scores 10+ goals, +GEF$2000 per MVP award…"
          className={inputCls + " resize-none"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputCls}>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Notes</label>
          <Input value={form.notes} onChange={set("notes")} placeholder="Internal notes…" />
        </div>
      </div>

      <Button type="submit" variant="gaming" className="w-full mt-2" disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {initialData ? "Update Contract" : "Create Contract"}
      </Button>
    </form>
  );
}
