import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, TrendingUp, TrendingDown, PlusCircle, Trash2,
  AlertTriangle, CheckCircle2, ShieldAlert, Loader2, RefreshCw,
  ArrowDownLeft, ArrowUpRight, Gavel, ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function fmt(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(0)}K`;
  return `${sign}€${Math.round(abs)}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  transfer_in:  "Transfer Fee Received",
  transfer_out: "Transfer Fee Paid",
  prize_money:  "Prize Money",
  sponsorship:  "Sponsorship",
  grant:        "Grant / Allocation",
  wages:        "Player Wages",
  penalty:      "Financial Penalty",
  operational:  "Operational Cost",
  other:        "Other",
};

const CATEGORY_ICON: Record<string, any> = {
  transfer_in:  ArrowDownLeft,
  transfer_out: ArrowUpRight,
  penalty:      Gavel,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  compliant: { label: "Compliant",  color: "text-green-400 border-green-400/30 bg-green-400/10",   icon: CheckCircle2 },
  at_risk:   { label: "At Risk",    color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", icon: AlertTriangle },
  high_risk: { label: "High Risk",  color: "text-orange-400 border-orange-400/30 bg-orange-400/10", icon: AlertTriangle },
  breach:    { label: "FFP Breach", color: "text-red-400 border-red-400/30 bg-red-400/10",          icon: ShieldAlert },
};

const INCOME_CATEGORIES  = ["transfer_in",  "prize_money", "sponsorship", "grant", "other"];
const EXPENSE_CATEGORIES = ["transfer_out", "wages",       "penalty",     "operational", "other"];

const TYPE_OPTIONS = [
  { label: "Expense", value: "expense" },
  { label: "Income",  value: "income"  },
];

const SEASON_OPTIONS = ["2024-25", "2025-26", "2026-27"].map(s => ({ label: s, value: s }));

export function ManageBudget() {
  const { toast } = useToast();
  const [teams, setTeams]               = useState<any[]>([]);
  const [ffpData, setFfpData]           = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamDetail, setTeamDetail]     = useState<any>(null);
  const [loading, setLoading]           = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [startingBudget, setStartingBudget] = useState("");
  const [savingStarting, setSavingStarting] = useState(false);

  const [txnType,     setTxnType]     = useState<"income" | "expense">("expense");
  const [txnCategory, setTxnCategory] = useState("penalty");
  const [txnAmount,   setTxnAmount]   = useState("");
  const [txnDesc,     setTxnDesc]     = useState("");
  const [txnSeason,   setTxnSeason]   = useState("2025-26");
  const [savingTxn,   setSavingTxn]   = useState(false);
  const [syncingTransfers, setSyncingTransfers] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [budgetRes, ffpRes] = await Promise.all([
        fetch("/api/budget"),
        fetch("/api/ffp/teams"),
      ]);
      const budgetData = await budgetRes.json();
      const ffp        = await ffpRes.json();
      setTeams(budgetData);
      setFfpData(ffp);
      if (!selectedTeamId && budgetData.length > 0) setSelectedTeamId(budgetData[0].teamId);
    } catch {
      toast({ title: "Failed to load budget data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (selectedTeamId) loadTeamDetail(selectedTeamId); }, [selectedTeamId]);

  async function loadTeamDetail(teamId: number) {
    setDetailLoading(true);
    try {
      const res  = await fetch(`/api/budget/${teamId}`);
      const data = await res.json();
      setTeamDetail(data);
      setStartingBudget(String(data.startingBudget ?? 0));
    } catch {
      toast({ title: "Failed to load team detail", variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveStartingBudget() {
    if (!selectedTeamId) return;
    setSavingStarting(true);
    try {
      await fetch(`/api/budget/${selectedTeamId}/starting`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(startingBudget), season: txnSeason }),
      });
      toast({ title: "Starting budget saved" });
      await Promise.all([loadAll(), loadTeamDetail(selectedTeamId)]);
    } catch {
      toast({ title: "Failed to save starting budget", variant: "destructive" });
    } finally {
      setSavingStarting(false);
    }
  }

  async function addTransaction() {
    if (!selectedTeamId || !txnAmount || Number(txnAmount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSavingTxn(true);
    try {
      const res = await fetch(`/api/budget/${selectedTeamId}/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: txnType, category: txnCategory,
          amount: Number(txnAmount), description: txnDesc, season: txnSeason,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: `${txnType === "income" ? "Income" : "Expense"} added` });
      setTxnAmount(""); setTxnDesc("");
      await Promise.all([loadAll(), loadTeamDetail(selectedTeamId)]);
    } catch {
      toast({ title: "Failed to add transaction", variant: "destructive" });
    } finally {
      setSavingTxn(false);
    }
  }

  async function syncTransfers() {
    setSyncingTransfers(true);
    try {
      const res = await fetch("/api/budget/sync-transfers", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({
        title: `Transfers synced`,
        description: `${data.created} new transaction${data.created !== 1 ? "s" : ""} created across ${data.syncedTeams} club${data.syncedTeams !== 1 ? "s" : ""}`,
      });
      await loadAll();
      if (selectedTeamId) await loadTeamDetail(selectedTeamId);
    } catch (err: any) {
      toast({ title: "Sync failed", description: err?.message, variant: "destructive" });
    } finally {
      setSyncingTransfers(false);
    }
  }

  async function deleteTransaction(id: number) {
    if (!confirm("Delete this transaction?")) return;
    try {
      await fetch(`/api/budget/transaction/${id}`, { method: "DELETE" });
      toast({ title: "Transaction deleted" });
      if (selectedTeamId) await Promise.all([loadAll(), loadTeamDetail(selectedTeamId)]);
    } catch {
      toast({ title: "Failed to delete transaction", variant: "destructive" });
    }
  }

  const selectedTeam = teams.find(t => t.teamId === selectedTeamId);
  const ffpTeam      = ffpData.find(f => f.teamId === selectedTeamId);
  const ffpStatus    = ffpTeam ? (STATUS_CONFIG[ffpTeam.status] ?? STATUS_CONFIG.compliant) : null;

  const categories = (txnType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
    .map(c => ({ label: CATEGORY_LABELS[c], value: c }));

  const teamOptions = teams.map(t => ({ label: t.teamName, value: t.teamId }));

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" /> Club Budget Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track income, expenses, transfers & penalties — all linked to FFP</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={syncTransfers} disabled={syncingTransfers || loading}>
              {syncingTransfers
                ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                : <ArrowRightLeft className="w-3.5 h-3.5 mr-2" />}
              Sync Transfers
            </Button>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* All Teams Overview */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">All Clubs Overview</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.map(team => {
                const ffp  = ffpData.find(f => f.teamId === team.teamId);
                const sc   = ffp ? (STATUS_CONFIG[ffp.status] ?? STATUS_CONFIG.compliant) : null;
                const isSelected = team.teamId === selectedTeamId;
                return (
                  <button
                    key={team.teamId}
                    onClick={() => setSelectedTeamId(team.teamId)}
                    className={`text-left rounded-xl border p-4 transition-all hover:border-primary/50 ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.teamName} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold">{team.teamName[0]}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{team.teamName}</div>
                        {sc && <span className={`text-[10px] font-semibold uppercase tracking-wider ${sc.color.split(" ")[0]}`}>{sc.label}</span>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Balance</span>
                        <span className={`font-black ${team.currentBalance >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(team.currentBalance)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Income</span>
                        <span className="text-green-400 font-semibold">+{fmt(team.totalIncome)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Expenses</span>
                        <span className="text-red-400 font-semibold">-{fmt(team.budgetExpenses)}</span>
                      </div>
                      {team.penalties > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-orange-400/70">Penalties</span>
                          <span className="text-orange-400 font-semibold">-{fmt(team.penalties)}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Detail */}
        {selectedTeamId && (
          <div className="space-y-4 border-t border-border pt-6">
            {/* Team Selector */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {selectedTeam?.logoUrl ? (
                  <img src={selectedTeam.logoUrl} alt={selectedTeam.teamName} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-black text-sm">{selectedTeam?.teamName?.[0]}</div>
                )}
                <div>
                  <h2 className="text-xl font-black">{selectedTeam?.teamName}</h2>
                  {ffpStatus && (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-0.5 ${ffpStatus.color}`}>
                      <ffpStatus.icon className="w-3 h-3" /> FFP: {ffpStatus.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-auto w-52">
                <Select
                  options={teamOptions}
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(Number(e.target.value))}
                />
              </div>
            </div>

            {detailLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading team data...
              </div>
            ) : teamDetail && (
              <>
                {/* Budget Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Starting Budget", value: teamDetail.startingBudget,                            color: "text-blue-400",  icon: Wallet },
                    { label: "Total Income",    value: teamDetail.matchIncome + teamDetail.budgetIncome,     color: "text-green-400", icon: TrendingUp },
                    { label: "Total Expenses",  value: teamDetail.budgetExpenses,                            color: "text-red-400",   icon: TrendingDown },
                    { label: "Current Balance", value: teamDetail.currentBalance, color: teamDetail.currentBalance >= 0 ? "text-green-400" : "text-red-400", icon: Wallet },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
                      </div>
                      <div className={`text-2xl font-black ${color}`}>{fmt(value)}</div>
                    </div>
                  ))}
                </div>

                {/* Income / Expense Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-400" /> Income Breakdown
                    </h3>
                    <div className="space-y-2">
                      {teamDetail.matchIncome > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Match Bonuses</span>
                          <span className="font-semibold text-green-400">+{fmt(teamDetail.matchIncome)}</span>
                        </div>
                      )}
                      {INCOME_CATEGORIES.map(cat => {
                        const amt = teamDetail.byCategory?.[cat]?.income ?? 0;
                        if (!amt) return null;
                        return (
                          <div key={cat} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{CATEGORY_LABELS[cat]}</span>
                            <span className="font-semibold text-green-400">+{fmt(amt)}</span>
                          </div>
                        );
                      })}
                      {!teamDetail.matchIncome && !INCOME_CATEGORIES.some(c => teamDetail.byCategory?.[c]?.income) && (
                        <p className="text-xs text-muted-foreground">No income recorded</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-400" /> Expense Breakdown
                    </h3>
                    <div className="space-y-2">
                      {EXPENSE_CATEGORIES.map(cat => {
                        const amt = teamDetail.byCategory?.[cat]?.expense ?? 0;
                        if (!amt) return null;
                        return (
                          <div key={cat} className="flex justify-between text-sm">
                            <span className={cat === "penalty" ? "text-orange-400" : "text-muted-foreground"}>{CATEGORY_LABELS[cat]}</span>
                            <span className={`font-semibold ${cat === "penalty" ? "text-orange-400" : "text-red-400"}`}>-{fmt(amt)}</span>
                          </div>
                        );
                      })}
                      {!EXPENSE_CATEGORIES.some(c => teamDetail.byCategory?.[c]?.expense) && (
                        <p className="text-xs text-muted-foreground">No expenses recorded</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* FFP Link */}
                {ffpTeam && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" /> FFP Compliance Link
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {[
                        { label: "FFP Income",     value: fmt(ffpTeam.income) },
                        { label: "FFP Expenses",   value: fmt(ffpTeam.expenses) },
                        { label: "Net Position",   value: fmt(ffpTeam.netPosition),                              color: ffpTeam.netPosition >= 0 ? "text-green-400" : "text-red-400" },
                        { label: "Expense Ratio",  value: `${(ffpTeam.expenseRatio ?? 0).toFixed(2)}x` },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                          <div className={`font-black text-base ${color ?? ""}`}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Set Starting Budget */}
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-blue-400" /> Set Starting Budget
                    </h3>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (€)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={startingBudget}
                          onChange={e => setStartingBudget(e.target.value)}
                          placeholder="e.g. 10000000"
                          className="bg-background"
                        />
                        <Button onClick={saveStartingBudget} disabled={savingStarting} size="sm">
                          {savingStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">The initial pot available before income / expenses are applied</p>
                    </div>
                  </div>

                  {/* Add Transaction */}
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-primary" /> Add Transaction
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Type</Label>
                        <Select
                          options={TYPE_OPTIONS}
                          value={txnType}
                          onChange={e => {
                            const v = e.target.value as "income" | "expense";
                            setTxnType(v);
                            setTxnCategory(v === "income" ? "prize_money" : "penalty");
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Category</Label>
                        <Select
                          options={categories}
                          value={txnCategory}
                          onChange={e => setTxnCategory(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Season</Label>
                      <Select options={SEASON_OPTIONS} value={txnSeason} onChange={e => setTxnSeason(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Amount (€)</Label>
                      <Input type="number" value={txnAmount} onChange={e => setTxnAmount(e.target.value)} placeholder="e.g. 500000" className="bg-background" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Description (optional)</Label>
                      <Textarea
                        value={txnDesc}
                        onChange={e => setTxnDesc(e.target.value)}
                        placeholder={txnCategory === "penalty" ? "e.g. FFP breach fine" : "Optional note"}
                        rows={2}
                        className="bg-background resize-none text-sm"
                      />
                    </div>
                    <Button onClick={addTransaction} disabled={savingTxn} className="w-full" size="sm">
                      {savingTxn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                      Add {txnType === "income" ? "Income" : "Expense"}
                    </Button>
                  </div>
                </div>

                {/* Transaction History */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Transaction History</h3>
                    <span className="text-xs text-muted-foreground">{teamDetail.transactions.length} records</span>
                  </div>
                  {teamDetail.transactions.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet — add one above</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {teamDetail.transactions.map((txn: any) => {
                        const CatIcon = CATEGORY_ICON[txn.category];
                        return (
                          <div key={txn.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${txn.type === "income" ? "bg-green-400/15 text-green-400" : txn.category === "penalty" ? "bg-orange-400/15 text-orange-400" : "bg-red-400/15 text-red-400"}`}>
                              {CatIcon ? <CatIcon className="w-4 h-4" /> : txn.type === "income" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold truncate">{txn.description || CATEGORY_LABELS[txn.category]}</span>
                                <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border ${txn.category === "penalty" ? "text-orange-400 border-orange-400/30 bg-orange-400/10" : txn.type === "income" ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-red-400 border-red-400/30 bg-red-400/10"}`}>
                                  {CATEGORY_LABELS[txn.category]}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {txn.season} · {new Date(txn.createdAt).toLocaleDateString()}
                                {txn.referenceId && <span className="ml-1 opacity-50">· ref#{txn.referenceId}</span>}
                              </div>
                            </div>
                            <div className={`font-black text-sm shrink-0 ${txn.type === "income" ? "text-green-400" : txn.category === "penalty" ? "text-orange-400" : "text-red-400"}`}>
                              {txn.type === "income" ? "+" : "-"}{fmt(txn.amount)}
                            </div>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => deleteTransaction(txn.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Match Income Log */}
                {teamDetail.matchIncomeLogs?.length > 0 && (
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-border flex justify-between items-center">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Match Income Log</h3>
                      <span className="text-xs text-muted-foreground">{teamDetail.matchIncomeLogs.length} entries · {fmt(teamDetail.matchIncome)} total</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-border">
                      {teamDetail.matchIncomeLogs.map((log: any) => (
                        <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                          <TrendingUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          <div className="flex-1 min-w-0 text-xs text-muted-foreground truncate">{log.description}</div>
                          <div className="text-xs font-bold text-green-400 shrink-0">+{fmt(log.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
