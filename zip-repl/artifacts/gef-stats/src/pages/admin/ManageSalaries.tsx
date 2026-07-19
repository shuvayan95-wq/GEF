import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Loader2, RefreshCw, Pencil, Check, X, TrendingUp } from "lucide-react";

interface SalaryPlayer {
  id: number;
  name: string;
  imageUrl: string | null;
  teamName: string;
  status: string;
  cardOvr: number | null;
  salary: number | null;
  games: number;
  wins: number;
  goals: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function ManageSalaries() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "left">("active");

  const { data: players = [], isLoading } = useQuery<SalaryPlayer[]>({
    queryKey: ["/api/admin/salaries"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/admin/salaries"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const filtered = players.filter(p =>
    filterStatus === "all" ? true : p.status === filterStatus
  );

  const totalBill = filtered.reduce((sum, p) => sum + (p.salary ?? 10000), 0);

  const handleEdit = (player: SalaryPlayer) => {
    setEditingId(player.id);
    setEditValue(String(player.salary ?? 10000));
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSave = async (id: number) => {
    const val = Number(editValue);
    if (isNaN(val) || val < 0) {
      toast({ variant: "destructive", title: "Invalid salary amount" });
      return;
    }
    setSavingId(id);
    try {
      const res = await fetch(getApiUrl(`/api/players/${id}/salary`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ salary: val }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Salary updated" });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/salaries"] });
    } catch {
      toast({ variant: "destructive", title: "Failed to update salary" });
    } finally {
      setSavingId(null);
    }
  };

  const handleRecalculate = async (all: boolean, id?: number) => {
    setRecalculating(true);
    try {
      const body: any = {};
      if (!all && id) body.playerIds = [id];
      const res = await fetch(getApiUrl("/api/admin/salaries/recalculate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast({ title: `${data.count} salary${data.count !== 1 ? "ies" : ""} recalculated from performance` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/salaries"] });
    } catch {
      toast({ variant: "destructive", title: "Failed to recalculate salaries" });
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase">Salary Management</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Base salary: <span className="text-primary font-bold">$10,000</span> · Auto-calculated from performance or set manually
            </p>
          </div>
          <Button
            variant="gaming"
            size="sm"
            className="gap-2"
            onClick={() => handleRecalculate(true)}
            disabled={recalculating}
          >
            {recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Recalculate All
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Total Players</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Total Wage Bill</p>
            <p className="text-2xl font-bold text-primary">{fmt(totalBill)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Avg Salary</p>
            <p className="text-2xl font-bold">{filtered.length ? fmt(Math.round(totalBill / filtered.length)) : "$0"}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Unset Salaries</p>
            <p className="text-2xl font-bold text-yellow-400">{filtered.filter(p => p.salary === null).length}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["active", "left", "all"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
          <table className="w-full text-left">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Player</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase hidden sm:table-cell">Team</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase hidden md:table-cell">Stats</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">Current Salary</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No players found</td></tr>
              )}
              {filtered.map(player => {
                const isEditing = editingId === player.id;
                const isSaving = savingId === player.id;
                const displaySalary = player.salary ?? 10000;
                const isDefault = player.salary === null;

                return (
                  <tr key={player.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={player.imageUrl || `${import.meta.env.BASE_URL}images/default-avatar.png`}
                          className="w-9 h-9 rounded border border-border object-cover flex-shrink-0"
                        />
                        <div>
                          <p className="font-bold text-sm">{player.name}</p>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                            player.status === "left"
                              ? "text-red-400 bg-red-500/10 border-red-500/30"
                              : "text-green-400 bg-green-500/10 border-green-500/30"
                          }`}>
                            {player.status}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground hidden sm:table-cell">{player.teamName}</td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span><span className="text-foreground font-bold">{player.wins}</span>W</span>
                        <span><span className="text-foreground font-bold">{player.games}</span>G</span>
                        <span><span className="text-green-400 font-bold">{player.goals}</span> goals</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-32 ml-auto text-right font-mono"
                          min={0}
                          step={500}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter") handleSave(player.id);
                            if (e.key === "Escape") handleCancel();
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="font-bold font-mono text-primary">
                            {fmt(displaySalary)}
                          </span>
                          {displaySalary === 10000 && (
                            <span className="text-[9px] text-muted-foreground font-bold uppercase">Base</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={handleCancel} className="w-8 h-8">
                            <X className="w-4 h-4" />
                          </Button>
                          <Button variant="gaming" size="icon" onClick={() => handleSave(player.id)} disabled={isSaving} className="w-8 h-8">
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4" />}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Auto-calculate from performance"
                            onClick={() => handleRecalculate(false, player.id)}
                            disabled={recalculating}
                            className="w-8 h-8 text-muted-foreground hover:text-primary"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit manually"
                            onClick={() => handleEdit(player)}
                            className="w-8 h-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Auto-calculate formula: Base $10,000 + win rate bonus + goals bonus + MVP bonus + OVR bonus · Rounded to nearest $500
        </p>
      </div>
    </AdminLayout>
  );
}
