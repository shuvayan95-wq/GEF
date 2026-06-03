import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, XCircle, ShieldAlert, TrendingUp, TrendingDown, Scale, Info } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";

function fmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${Math.round(v)}`;
}

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

type Status = "compliant" | "at_risk" | "high_risk" | "breach";

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string; icon: any }> = {
  compliant: { label: "Compliant", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: CheckCircle },
  at_risk: { label: "At Risk", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: AlertTriangle },
  high_risk: { label: "High Risk", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: ShieldAlert },
  breach: { label: "FFP Breach", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: XCircle },
};

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      <Icon className="w-3.5 h-3.5" /> {cfg.label}
    </span>
  );
}

function RiskBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pctFill = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pctFill}%` }} />
    </div>
  );
}

export function FFP() {
  const [settings, setSettings] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/ffp/settings").then(r => r.json()),
      fetch("/api/ffp/teams").then(r => r.json()),
    ]).then(([s, t]) => { setSettings(s); setTeams(t); setLoading(false); });
  }, []);

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="p-20 text-center animate-pulse">Loading FFP data...</div></div>;

  const byStatus = {
    breach: teams.filter(t => t.status === "breach"),
    high_risk: teams.filter(t => t.status === "high_risk"),
    at_risk: teams.filter(t => t.status === "at_risk"),
    compliant: teams.filter(t => t.status === "compliant"),
  };

  const sortedTeams = [
    ...byStatus.breach,
    ...byStatus.high_risk,
    ...byStatus.at_risk,
    ...byStatus.compliant,
  ];

  const chartData = sortedTeams.map(t => ({
    name: t.teamName,
    Income: t.income,
    Expenses: t.expenses,
    status: t.status,
  }));

  const netData = sortedTeams.map(t => ({
    name: t.teamName,
    "Net Position": t.netPosition,
    fill: t.netPosition >= 0 ? "#22c55e" : "#ef4444",
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1 text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">
            <Scale className="w-3 h-3" /> Financial Compliance
          </div>
          <h1 className="text-5xl font-display font-black uppercase">Financial Fair Play</h1>
          <p className="text-muted-foreground">
            Season <span className="text-foreground font-bold">{settings.seasonLabel}</span> compliance monitoring
          </p>
        </div>

        {/* FFP Rules Summary */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-display font-bold uppercase mb-5 flex items-center gap-2">
            <Info className="text-blue-400 w-5 h-5" /> Current FFP Regulations
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <RuleCard label="Max Allowed Loss" value={fmt(settings.maxLossAmount)} sub="per season" color="text-red-400" />
            <RuleCard label="Max Expense Ratio" value={pct(settings.maxExpenseRatio - 1)} sub="over income" color="text-orange-400" />
            <RuleCard label="Wage Cap" value={`${settings.wageCapPercent}%`} sub="of income" color="text-yellow-400" />
            <RuleCard label="At Risk From" value={`${Math.round(settings.atRiskThreshold * 100)}% of limit`} sub="warning zone" color="text-blue-400" />
          </div>
          {settings.notes && (
            <div className="mt-4 p-3 bg-secondary/40 rounded-lg text-sm text-muted-foreground border border-border italic">
              {settings.notes}
            </div>
          )}
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["compliant", "at_risk", "high_risk", "breach"] as Status[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            const count = byStatus[s].length;
            return (
              <motion.div
                key={s}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-5 text-center ${cfg.bg} ${cfg.border}`}
              >
                <Icon className={`w-8 h-8 mx-auto mb-2 ${cfg.color}`} />
                <div className={`text-4xl font-display font-black ${cfg.color}`}>{count}</div>
                <div className="text-xs font-bold uppercase text-muted-foreground tracking-widest mt-1">{cfg.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-display font-bold uppercase mb-5">Income vs Expenses</h3>
            {chartData.every(d => d.Income === 0 && d.Expenses === 0) ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No financial data entered yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [fmt(Number(v))]}
                  />
                  <Legend />
                  <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-display font-bold uppercase mb-5">Net Position</h3>
            {netData.every(d => d["Net Position"] === 0) ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No financial data entered yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={netData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [fmt(Number(v)), "Net"]}
                  />
                  <Bar dataKey="Net Position" radius={[4, 4, 0, 0]}>
                    {netData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* High Risk / Breach Alert */}
        {(byStatus.breach.length > 0 || byStatus.high_risk.length > 0) && (
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2 border-b border-border pb-3 text-red-400">
              <XCircle className="w-6 h-6" /> Clubs Requiring Attention
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...byStatus.breach, ...byStatus.high_risk].map((team, i) => (
                <motion.div
                  key={team.teamId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-xl border p-5 ${team.status === "breach" ? "bg-red-500/10 border-red-500/40" : "bg-orange-500/10 border-orange-500/30"}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {team.logoUrl && <img src={team.logoUrl} className="w-9 h-9 rounded-lg object-cover" />}
                      <div>
                        <div className="font-bold font-display uppercase">{team.teamName}</div>
                        <div className="text-xs text-muted-foreground">{team.season}</div>
                      </div>
                    </div>
                    <StatusBadge status={team.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div>
                      <div className="text-muted-foreground mb-0.5">Income</div>
                      <div className="font-bold text-green-400">{fmt(team.income)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5">Expenses</div>
                      <div className="font-bold text-red-400">{fmt(team.expenses)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5">Net</div>
                      <div className={`font-bold ${team.netPosition >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {team.netPosition >= 0 ? "+" : ""}{fmt(team.netPosition)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Loss vs Limit</span>
                      <span className={team.lossAmount > settings.maxLossAmount ? "text-red-400 font-bold" : ""}>{fmt(team.lossAmount)} / {fmt(settings.maxLossAmount)}</span>
                    </div>
                    <RiskBar value={team.lossAmount} max={settings.maxLossAmount} color={team.lossAmount > settings.maxLossAmount ? "bg-red-500" : "bg-orange-500"} />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Expense Ratio</span>
                      <span className={team.expenseRatio > settings.maxExpenseRatio ? "text-red-400 font-bold" : ""}>{pct(team.expenseRatio - 1)} / {pct(settings.maxExpenseRatio - 1)}</span>
                    </div>
                    <RiskBar value={team.expenseRatio} max={settings.maxExpenseRatio} color={team.expenseRatio > settings.maxExpenseRatio ? "bg-red-500" : "bg-orange-500"} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Full Club Table */}
        <div>
          <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2 border-b border-border pb-3 mb-5">
            <Scale className="text-blue-400 w-6 h-6" /> All Clubs — FFP Standing
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            <div className="grid grid-cols-[1fr_100px_100px_100px_100px_130px] text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-3 border-b border-border bg-secondary/20">
              <div>Club</div>
              <div className="text-right">Income</div>
              <div className="text-right">Expenses</div>
              <div className="text-right">Net</div>
              <div className="text-right">Exp. Ratio</div>
              <div className="text-right">Status</div>
            </div>
            {sortedTeams.map((team, i) => (
              <motion.div
                key={team.teamId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[1fr_100px_100px_100px_100px_130px] items-center px-4 py-3 border-b border-border/40 last:border-0 hover:bg-secondary/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {team.logoUrl
                    ? <img src={team.logoUrl} className="w-8 h-8 rounded object-cover border border-border" />
                    : <div className="w-8 h-8 rounded bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">{team.teamName[0]}</div>
                  }
                  <div>
                    <div className="font-bold text-sm uppercase">{team.teamName}</div>
                    <div className="text-[10px] text-muted-foreground">{team.season}</div>
                  </div>
                </div>
                <div className="text-right text-sm font-bold text-green-400">{fmt(team.income)}</div>
                <div className="text-right text-sm font-bold text-red-400">{fmt(team.expenses)}</div>
                <div className={`text-right text-sm font-bold ${team.netPosition >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {team.netPosition >= 0 ? "+" : ""}{fmt(team.netPosition)}
                </div>
                <div className={`text-right text-sm font-bold ${team.expenseRatio > settings.maxExpenseRatio ? "text-red-400" : "text-muted-foreground"}`}>
                  {team.income > 0 ? pct(team.expenseRatio - 1) : "—"}
                </div>
                <div className="text-right"><StatusBadge status={team.status} /></div>
              </motion.div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

function RuleCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-secondary/30 border border-border rounded-xl p-4 text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className={`text-2xl font-display font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
