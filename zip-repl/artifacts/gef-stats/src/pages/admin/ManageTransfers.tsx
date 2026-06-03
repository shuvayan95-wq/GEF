import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Trash2, Plus, Loader2, RefreshCw } from "lucide-react";

interface Transfer {
  id: number;
  playerId: number;
  playerName: string;
  playerImage: string | null;
  fromTeamId: number | null;
  fromTeamName: string | null;
  fromTeamLogo: string | null;
  toTeamId: number;
  toTeamName: string;
  toTeamLogo: string | null;
  transferDate: string;
  season: string | null;
  fee: string | null;
  notes: string | null;
}

interface Player { id: number; name: string; imageUrl: string | null; teamId: number | null; }
interface Team { id: number; name: string; logoUrl: string | null; }

export function ManageTransfers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    playerId: "",
    fromTeamId: "",
    toTeamId: "",
    transferDate: new Date().toISOString().split("T")[0],
    season: "",
    fee: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, pRes, tmRes] = await Promise.all([
        fetch("/api/transfers"),
        fetch("/api/players"),
        fetch("/api/teams"),
      ]);
      setTransfers(await tRes.json());
      const playersData = await pRes.json();
      setPlayers(playersData.players ?? playersData);
      setTeams(await tmRes.json());
    } catch {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Auto-fill fromTeam when player is selected
  const handlePlayerChange = (playerId: string) => {
    const player = players.find(p => p.id === Number(playerId));
    setForm(f => ({
      ...f,
      playerId,
      fromTeamId: player?.teamId ? String(player.teamId) : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.playerId || !form.toTeamId || !form.transferDate) {
      toast({ title: "Missing fields", description: "Player, destination team, and date are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: Number(form.playerId),
          fromTeamId: form.fromTeamId ? Number(form.fromTeamId) : null,
          toTeamId: Number(form.toTeamId),
          transferDate: form.transferDate,
          season: form.season || null,
          fee: form.fee || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Transfer recorded!" });
      queryClient.invalidateQueries({ queryKey: ['/api/taglist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      setForm({ playerId: "", fromTeamId: "", toTeamId: "", transferDate: new Date().toISOString().split("T")[0], season: "", fee: "", notes: "" });
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this transfer record?")) return;
    try {
      await fetch(`/api/transfers/${id}`, { method: "DELETE" });
      toast({ title: "Transfer deleted" });
      queryClient.invalidateQueries({ queryKey: ['/api/taglist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      await load();
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const teamMap = new Map(teams.map(t => [t.id, t]));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-display font-bold">Transfer Market</h1>
              <p className="text-sm text-muted-foreground">Record and manage player transfers between teams</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowForm(f => !f)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Transfer
            </button>
          </div>
        </div>

        {/* New Transfer Form */}
        {showForm && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4">Record Transfer</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Player *</label>
                <select
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  value={form.playerId}
                  onChange={e => handlePlayerChange(e.target.value)}
                  required
                >
                  <option value="">Select player...</option>
                  {players.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.teamId ? `(${teamMap.get(p.teamId)?.name ?? "?"})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">From Team</label>
                <select
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  value={form.fromTeamId}
                  onChange={e => setForm(f => ({ ...f, fromTeamId: e.target.value }))}
                >
                  <option value="">Unknown / Initial</option>
                  {teams.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">To Team *</label>
                <select
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  value={form.toTeamId}
                  onChange={e => setForm(f => ({ ...f, toTeamId: e.target.value }))}
                  required
                >
                  <option value="">Select team...</option>
                  {teams.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Transfer Date *</label>
                <input
                  type="date"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  value={form.transferDate}
                  onChange={e => setForm(f => ({ ...f, transferDate: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Season</label>
                <input
                  type="text"
                  placeholder="e.g. 2024/25"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  value={form.season}
                  onChange={e => setForm(f => ({ ...f, season: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Fee (optional)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  value={form.fee}
                  onChange={e => setForm(f => ({ ...f, fee: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium mb-1.5">Notes</label>
                <textarea
                  placeholder="Optional notes about this transfer..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm h-20 resize-none"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  {saving ? "Recording..." : "Record Transfer"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transfer History */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">Transfer History</h2>
            <p className="text-sm text-muted-foreground">{transfers.length} transfers recorded</p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No transfers recorded yet</p>
              <p className="text-sm mt-1">Click "New Transfer" to record the first transfer</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transfers.slice().reverse().map(t => (
                <div key={t.id} className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                  {/* Player */}
                  <div className="flex items-center gap-3 w-40 flex-shrink-0">
                    {t.playerImage ? (
                      <img src={t.playerImage} alt={t.playerName} className="w-9 h-9 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">{t.playerName.charAt(0)}</div>
                    )}
                    <span className="text-sm font-semibold truncate">{t.playerName}</span>
                  </div>

                  {/* Transfer arrow */}
                  <div className="flex items-center gap-3 flex-1">
                    {/* From */}
                    <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg text-sm font-medium min-w-[100px]">
                      {t.fromTeamLogo && (
                        <img src={t.fromTeamLogo} alt={t.fromTeamName ?? ""} className="w-4 h-4 object-contain rounded" />
                      )}
                      <span className="truncate">{t.fromTeamName ?? "—"}</span>
                    </div>

                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                    {/* To */}
                    <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg text-sm font-medium min-w-[100px]">
                      {t.toTeamLogo && (
                        <img src={t.toTeamLogo} alt={t.toTeamName} className="w-4 h-4 object-contain rounded" />
                      )}
                      <span className="truncate">{t.toTeamName}</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="text-right text-sm text-muted-foreground flex-shrink-0 space-y-0.5">
                    <div className="font-medium text-foreground">{t.transferDate}</div>
                    {t.season && <div className="text-xs">{t.season}</div>}
                    {t.fee && <div className="text-xs text-green-400">€{Number(t.fee).toLocaleString()}</div>}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="ml-2 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
