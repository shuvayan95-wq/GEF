import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListTeams } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Scale, Save, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function fmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${Math.round(v)}`;
}

function NumInput({ label, value, onChange, prefix = "€", suffix = "", hint = "" }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
        <Input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`bg-background ${prefix ? "pl-8" : ""} ${suffix ? "pr-10" : ""}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  league_win: "League Win Bonus",
  league_draw: "League Draw Bonus",
  league_loss: "League Loss Bonus",
  cup_win: "Cup Win Bonus",
  cup_draw: "Cup Draw Bonus",
  cup_loss: "Cup Loss Bonus",
  goals_bonus: "Goals Performance Bonus",
  mvp_bonus: "MVP Performance Bonus",
};

const SOURCE_COLOR: Record<string, string> = {
  league_win: "text-green-400",
  league_draw: "text-yellow-400",
  league_loss: "text-orange-400",
  cup_win: "text-emerald-400",
  cup_draw: "text-cyan-400",
  cup_loss: "text-amber-400",
  goals_bonus: "text-blue-400",
  mvp_bonus: "text-purple-400",
};

export function ManageFFP() {
  const { toast } = useToast();
  const { data: teams } = useListTeams();
  const [settings, setSettings] = useState<any>(null);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [incomeLog, setIncomeLog] = useState<Record<number, any>>({});
  const [loadingIncomeLog, setLoadingIncomeLog] = useState<number | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTeamId, setSavingTeamId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/ffp/settings", { credentials: "include" }).then(r => r.json()).then(setSettings);
    fetch("/api/ffp/teams", { credentials: "include" }).then(r => r.json()).then(setTeamData);
  }, []);

  async function loadIncomeLog(teamId: number) {
    setLoadingIncomeLog(teamId);
    try {
      const data = await fetch(`/api/ffp/income-log/${teamId}`, { credentials: "include" }).then(r => r.json());
      setIncomeLog(prev => ({ ...prev, [teamId]: data }));
    } finally {
      setLoadingIncomeLog(null);
    }
  }

  async function handleExpand(teamId: number) {
    const isOpen = expandedTeam === teamId;
    setExpandedTeam(isOpen ? null : teamId);
    if (!isOpen && !incomeLog[teamId]) {
      await loadIncomeLog(teamId);
    }
  }

  function settingVal(key: string) { return settings?.[key] ?? ""; }
  function setSetting(key: string, val: any) { setSettings((s: any) => ({ ...s, [key]: val })); }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/ffp/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          seasonLabel: settings.seasonLabel,
          maxLossAmount: Number(settings.maxLossAmount),
          maxExpenseRatio: Number(settings.maxExpenseRatio),
          wageCapPercent: Number(settings.wageCapPercent),
          atRiskThreshold: Number(settings.atRiskThreshold),
          highRiskThreshold: Number(settings.highRiskThreshold),
          notes: settings.notes,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSettings(updated);
      toast({ title: "FFP rules saved", description: "Regulations updated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to save FFP rules.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  }

  function getTeamFinancials(teamId: number) {
    return teamData.find(t => t.teamId === teamId) ?? {
      teamId,
      season: settings?.seasonLabel ?? "2025-26",
      income: 0, expenses: 0, budget: 0, wagesExpense: 0, transferExpense: 0, operationalExpense: 0, notes: "",
    };
  }

  function setTeamField(teamId: number, field: string, val: any) {
    setTeamData(prev => {
      const existing = prev.find(t => t.teamId === teamId);
      if (existing) return prev.map(t => t.teamId === teamId ? { ...t, [field]: val } : t);
      return [...prev, { ...getTeamFinancials(teamId), [field]: val }];
    });
  }

  async function saveTeam(teamId: number) {
    setSavingTeamId(teamId);
    try {
      const fin = getTeamFinancials(teamId);
      const res = await fetch("/api/ffp/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          teamId,
          season: fin.season || settings?.seasonLabel,
          expenses: Number(fin.expenses) || 0,
          budget: Number(fin.budget) || 0,
          wagesExpense: Number(fin.wagesExpense) || 0,
          transferExpense: Number(fin.transferExpense) || 0,
          operationalExpense: Number(fin.operationalExpense) || 0,
          notes: fin.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await fetch("/api/ffp/teams", { credentials: "include" }).then(r => r.json());
      setTeamData(updated);
      toast({ title: "Financials saved", description: `${teams?.find(t => t.id === teamId)?.name} updated.` });
    } catch {
      toast({ title: "Error", description: "Failed to save financials.", variant: "destructive" });
    } finally {
      setSavingTeamId(null);
    }
  }

  const STATUS_COLOR: Record<string, string> = {
    compliant: "text-green-400", at_risk: "text-yellow-400", high_risk: "text-orange-400", breach: "text-red-400",
  };

  function WageCapBar({ wages, capLimit, income }: { wages: number; capLimit: number; income: number }) {
    if (income <= 0) {
      return (
        <div className="text-[10px] text-muted-foreground">
          Wage cap check requires match income — no income recorded yet.
        </div>
      );
    }
    const pct = capLimit > 0 ? Math.min((wages / capLimit) * 100, 200) : 0;
    const breach = wages > capLimit;
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="font-bold text-muted-foreground uppercase tracking-wider">Wage Cap Usage</span>
          <span className={`font-bold font-mono ${breach ? "text-red-400" : "text-green-400"}`}>
            {fmt(wages)} / {fmt(capLimit)}
            {breach && <span className="ml-2 text-[10px] bg-red-500/20 border border-red-500/40 text-red-400 px-1.5 py-0.5 rounded font-black uppercase">BREACH</span>}
          </span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${breach ? "bg-red-500" : pct > 85 ? "bg-orange-500" : pct > 70 ? "bg-yellow-500" : "bg-green-500"}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground">
          {pct.toFixed(0)}% of wage cap used
          {breach && ` · Over by ${fmt(wages - capLimit)}`}
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl space-y-10">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase mb-1 flex items-center gap-3">
            <Scale className="text-blue-400 w-7 h-7" /> Financial Fair Play
          </h1>
          <p className="text-muted-foreground text-sm">Set the FFP rules, limits, and manage each club's financial data.</p>
        </div>

        {/* ─── Income Rules Info ─── */}
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-blue-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Auto-Calculated Income Rules
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-2 font-bold">League Matches</div>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-green-400">Win</span><span className="font-mono">€500,000</span></div>
                <div className="flex justify-between"><span className="text-yellow-400">Draw</span><span className="font-mono">€250,000</span></div>
                <div className="flex justify-between"><span className="text-red-400">Loss</span><span className="font-mono">€100,000</span></div>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-2 font-bold">GEF Champions Cup</div>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-green-400">Win</span><span className="font-mono">€1,000,000</span></div>
                <div className="flex justify-between"><span className="text-yellow-400">Draw</span><span className="font-mono">€500,000</span></div>
                <div className="flex justify-between"><span className="text-red-400">Loss</span><span className="font-mono">€250,000</span></div>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-2 font-bold">Player Performance</div>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-blue-400">Per Goal Scored</span><span className="font-mono">€10,000</span></div>
                <div className="flex justify-between"><span className="text-purple-400">Per MVP Award</span><span className="font-mono">€50,000</span></div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Income is auto-calculated from match results and player performance. Set a league as "GEF Champions Cup" type in Manage Leagues to apply cup rates.</p>
        </div>

        {/* ─── FFP Rules ─── */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-6">
          <h2 className="text-xl font-display font-bold uppercase border-b border-border pb-3">FFP Regulations</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Season Label</Label>
              <Input
                value={settingVal("seasonLabel")}
                onChange={e => setSetting("seasonLabel", e.target.value)}
                placeholder="e.g. 2025-26"
                className="bg-background"
              />
            </div>
            <NumInput
              label="Maximum Allowed Loss"
              value={settingVal("maxLossAmount")}
              onChange={(v: any) => setSetting("maxLossAmount", v)}
              hint="Maximum money a club can lose per season (e.g. 5000000 = €5M)"
            />
            <NumInput
              label="Max Expense/Income Ratio"
              value={settingVal("maxExpenseRatio")}
              onChange={(v: any) => setSetting("maxExpenseRatio", v)}
              prefix=""
              hint="Max ratio of expenses to income (e.g. 1.7 means expenses can be 170% of income)"
            />
            <NumInput
              label="Wage Cap (% of Income)"
              value={settingVal("wageCapPercent")}
              onChange={(v: any) => setSetting("wageCapPercent", v)}
              prefix=""
              suffix="%"
              hint="Maximum wages as a % of total income (e.g. 70)"
            />
            <NumInput
              label="At Risk Threshold"
              value={settingVal("atRiskThreshold")}
              onChange={(v: any) => setSetting("atRiskThreshold", v)}
              prefix=""
              hint="Fraction of limit at which club turns 'At Risk' (e.g. 0.70 = 70% of limit)"
            />
            <NumInput
              label="High Risk Threshold"
              value={settingVal("highRiskThreshold")}
              onChange={(v: any) => setSetting("highRiskThreshold", v)}
              prefix=""
              hint="Fraction of limit at which club turns 'High Risk' (e.g. 0.85 = 85% of limit)"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Commissioner Notes (optional)</Label>
            <textarea
              value={settingVal("notes") ?? ""}
              onChange={e => setSetting("notes", e.target.value)}
              rows={3}
              placeholder="Any notes about this season's FFP rules..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end">
            <Button variant="gaming" onClick={saveSettings} disabled={savingSettings}>
              <Save className="w-4 h-4 mr-2" />
              {savingSettings ? "Saving…" : "Save FFP Rules"}
            </Button>
          </div>
        </div>

        {/* ─── Per-Team Financials ─── */}
        <div>
          <h2 className="text-xl font-display font-bold uppercase border-b border-border pb-3 mb-5">Club Financials</h2>
          <div className="space-y-3">
            {(teams ?? []).map(team => {
              const fin = getTeamFinancials(team.id);
              const isOpen = expandedTeam === team.id;
              const statusColor = STATUS_COLOR[fin.status ?? "compliant"];
              const netPos = Number(fin.income) - Number(fin.expenses);
              const log = incomeLog[team.id];

              return (
                <div key={team.id} className="bg-card border border-border rounded-xl overflow-hidden shadow">
                  <button
                    onClick={() => handleExpand(team.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      {team.logoUrl
                        ? <img src={team.logoUrl} className="w-9 h-9 rounded-lg object-cover border border-border" />
                        : <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center font-bold text-sm">{team.name[0]}</div>
                      }
                      <div>
                        <div className="font-bold uppercase font-display">{team.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Income: <span className="text-green-400">{fmt(Number(fin.income))}</span> · Expenses: <span className="text-red-400">{fmt(Number(fin.expenses))}</span> ·
                          Net: <span className={netPos >= 0 ? "text-green-400" : "text-red-400"}>{netPos >= 0 ? "+" : ""}{fmt(netPos)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {fin.status && fin.status !== "compliant" && (
                        <span className={`text-xs font-bold uppercase ${statusColor}`}>
                          <AlertTriangle className="w-4 h-4 inline mr-1" />{fin.status.replace("_", " ")}
                        </span>
                      )}
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-5 py-5 space-y-5 bg-background/30">

                      {/* Wage Cap Status — live from player salaries */}
                      <div className={`rounded-xl p-4 space-y-3 border ${fin.wageBreach ? "bg-red-950/30 border-red-800/40" : "bg-secondary/30 border-border"}`}>
                        <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                          <Scale className={`w-3.5 h-3.5 ${fin.wageBreach ? "text-red-400" : "text-blue-400"}`} />
                          <span className={fin.wageBreach ? "text-red-400" : "text-blue-400"}>Wage Cap (Live)</span>
                          <span className="text-muted-foreground font-normal normal-case tracking-normal">· auto-synced from player salaries</span>
                        </div>
                        <WageCapBar
                          wages={fin.liveWageBill ?? fin.wagesExpense ?? 0}
                          capLimit={fin.wageCapLimit ?? 0}
                          income={Number(fin.income)}
                        />
                        {fin.wageBreachReason && (
                          <p className="text-[11px] text-red-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {fin.wageBreachReason}
                          </p>
                        )}
                      </div>

                      {/* Auto-Income Display */}
                      <div className="bg-green-950/30 border border-green-800/40 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold uppercase text-green-400 tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5" /> Auto-Calculated Income
                          </div>
                          <button
                            onClick={() => loadIncomeLog(team.id)}
                            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                          >
                            {loadingIncomeLog === team.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <RefreshCw className="w-3 h-3" />
                            } Refresh
                          </button>
                        </div>
                        <div className="text-2xl font-bold text-green-400">{fmt(Number(fin.income))}</div>
                        <p className="text-[10px] text-muted-foreground">Automatically calculated from match results, goals, and MVP awards. Not manually editable.</p>

                        {log && (
                          <div className="space-y-2 mt-2">
                            <div className="text-[10px] uppercase text-muted-foreground font-bold border-t border-border pt-2">Income Breakdown</div>
                            {Object.entries(log.categorySummary as Record<string, number>)
                              .sort(([, a], [, b]) => b - a)
                              .map(([source, total]) => (
                                <div key={source} className="flex justify-between items-center text-xs">
                                  <span className={SOURCE_COLOR[source] ?? "text-muted-foreground"}>
                                    {SOURCE_LABELS[source] ?? source}
                                  </span>
                                  <span className="font-mono font-bold">{fmt(total as number)}</span>
                                </div>
                              ))
                            }
                            <div className="flex justify-between items-center text-xs font-bold border-t border-border pt-2">
                              <span>Total</span>
                              <span className="font-mono text-green-400">{fmt(log.total)}</span>
                            </div>
                          </div>
                        )}
                        {!log && loadingIncomeLog !== team.id && (
                          <p className="text-[10px] text-muted-foreground">Click Refresh to load income breakdown</p>
                        )}
                      </div>

                      {/* Season */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Season</Label>
                          <Input
                            value={fin.season ?? settings?.seasonLabel ?? ""}
                            onChange={e => setTeamField(team.id, "season", e.target.value)}
                            className="bg-background"
                          />
                        </div>
                        <NumInput label="Budget" value={fin.budget ?? 0} onChange={(v: any) => setTeamField(team.id, "budget", v)} />
                      </div>

                      {/* Expenditure */}
                      <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider border-b border-border pb-2">Expenditure Breakdown</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <NumInput
                          label="Wages"
                          value={fin.wagesExpense ?? 0}
                          onChange={(v: any) => setTeamField(team.id, "wagesExpense", v)}
                          hint="Total player wages"
                        />
                        <NumInput
                          label="Transfer Spending"
                          value={fin.transferExpense ?? 0}
                          onChange={(v: any) => setTeamField(team.id, "transferExpense", v)}
                          hint="Net transfer fees paid"
                        />
                        <NumInput
                          label="Operational Costs"
                          value={fin.operationalExpense ?? 0}
                          onChange={(v: any) => setTeamField(team.id, "operationalExpense", v)}
                          hint="Staff, facilities, admin"
                        />
                      </div>

                      <div className="bg-secondary/40 border border-border rounded-lg p-4 grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground mb-1">Total Expenses</div>
                          <div className="font-bold text-red-400 text-lg">
                            {fmt((Number(fin.wagesExpense) || 0) + (Number(fin.transferExpense) || 0) + (Number(fin.operationalExpense) || 0))}
                          </div>
                          <div className="text-[10px] text-muted-foreground">wages + transfers + ops</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground mb-1">Net Position</div>
                          <div className={`font-bold text-lg ${netPos >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {netPos >= 0 ? "+" : ""}{fmt(netPos)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">income − expenses</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground mb-1">Expense Ratio</div>
                          <div className={`font-bold text-lg ${Number(fin.income) > 0 && Number(fin.expenses) / Number(fin.income) > Number(settings?.maxExpenseRatio) ? "text-red-400" : "text-foreground"}`}>
                            {Number(fin.income) > 0 ? `${((Number(fin.expenses) / Number(fin.income)) * 100).toFixed(0)}%` : "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">of income</div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Internal Notes</Label>
                        <textarea
                          value={fin.notes ?? ""}
                          onChange={e => setTeamField(team.id, "notes", e.target.value)}
                          rows={2}
                          placeholder="Any notes for this club..."
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const total = (Number(fin.wagesExpense) || 0) + (Number(fin.transferExpense) || 0) + (Number(fin.operationalExpense) || 0);
                            setTeamField(team.id, "expenses", total);
                          }}
                          size="sm"
                        >
                          Auto-sum Expenses
                        </Button>
                        <Button
                          variant="gaming"
                          onClick={() => saveTeam(team.id)}
                          disabled={savingTeamId === team.id}
                          size="sm"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {savingTeamId === team.id ? "Saving…" : "Save Club"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
