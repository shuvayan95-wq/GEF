import { useGetPlayerStats } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { formatOvr, getOvrColorClass } from "@/lib/utils";
import { Trophy, Activity, Target, ShieldAlert, Award as AwardIcon, TrendingUp, TrendingDown, Repeat2, DollarSign, Layers, Cpu, Loader2, Crown, Star, Zap, AlertTriangle, Eye, BarChart2, Swords, CheckCircle2, RefreshCw } from "lucide-react"; // eslint-disable-line
import { PlayerCard } from "@/components/PlayerCard";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface TeamStats {
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  matches: number;
  goals: number;
  conceded: number;
  wins: number;
  draws: number;
  losses: number;
  mvps: number;
  winRate: number;
  goalsPerMatch: number;
  seasons: string[];
  isCurrent: boolean;
}

interface StatsByTeamData {
  playerId: number;
  playerName: string;
  currentTeamId: number | null;
  transfers: Array<{
    id: number;
    transferDate: string;
    season: string | null;
    fee: string | null;
    fromTeamName: string | null;
    toTeamName: string;
    fromTeamLogo: string | null;
    toTeamLogo: string | null;
  }>;
  statsByTeam: TeamStats[];
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}

interface MVHistory {
  id: number;
  value: number;
  reason: string | null;
  recordedAt: string;
}

interface MVData {
  playerId: number;
  currentValue: number | null;
  history: MVHistory[];
}

export function PlayerProfile() {
  const params = useParams();
  const id = parseInt(params.id || "0");

  const { data: stats, isLoading, error } = useGetPlayerStats(id, { query: { enabled: id > 0 } });
  const [mvData, setMvData] = useState<MVData | null>(null);
  const [statsView, setStatsView] = useState<"total" | "by-team">("total");

  const { data: statsByTeamData } = useQuery<StatsByTeamData>({
    queryKey: ["stats-by-team", id],
    queryFn: () => fetch(`/api/players/${id}/stats-by-team`).then(r => r.json()),
    enabled: id > 0,
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/players/${id}/market-value-history`)
      .then(r => r.json())
      .then(setMvData)
      .catch(() => {});
  }, [id]);

  if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="p-20 text-center animate-pulse text-xl">Loading dossier...</div></div>;
  if (error || !stats) return <div className="min-h-screen bg-background"><Navbar /><div className="p-20 text-center text-destructive">Player not found.</div></div>;

  const currentMV = (stats as any).marketValue as number | null;
  const history = mvData?.history ?? [];
  const chartData = history.map(h => ({
    date: format(new Date(h.recordedAt), "MMM d"),
    value: h.value,
    fullDate: format(new Date(h.recordedAt), "MMM d, yyyy HH:mm"),
    reason: h.reason,
  }));

  const firstVal = history.length > 0 ? history[0].value : null;
  const lastVal = history.length > 0 ? history[history.length - 1].value : null;
  const prevVal = history.length > 1 ? history[history.length - 2].value : null;
  const change = lastVal && firstVal ? lastVal - firstVal : null;
  const changePct = change && firstVal ? (change / firstVal) * 100 : null;
  const lastChange = lastVal && prevVal ? lastVal - prevVal : null;
  const trend = lastChange === null ? "flat" : lastChange > 0 ? "up" : lastChange < 0 ? "down" : "flat";

  const minVal = history.length > 0 ? Math.min(...history.map(h => h.value)) : 0;
  const maxVal = history.length > 0 ? Math.max(...history.map(h => h.value)) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl mb-8 relative">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/20 to-accent/20 z-0" />

          <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-end mt-12">
            <div className="w-40 h-40 rounded-xl border-4 border-card bg-secondary shadow-xl overflow-hidden flex-shrink-0 bg-gradient-to-b from-secondary to-background p-1">
              <img
                src={(stats as any).imageUrl || `${import.meta.env.BASE_URL}images/default-avatar.png`}
                alt={stats.name}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2 flex-wrap">
                <h1 className="text-5xl font-display font-black uppercase text-foreground tracking-tight">{stats.name}</h1>
                {(stats as any).teamRole === "captain" && (
                  <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                    <Crown className="w-3.5 h-3.5" /> Captain
                  </span>
                )}
                {(stats as any).teamRole === "vice_captain" && (
                  <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40">
                    <Star className="w-3.5 h-3.5" /> Vice Captain
                  </span>
                )}
                {(stats as any).status === "left" && (
                  <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                    Left
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {(stats as any).position && (
                  <span className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full">
                    <Activity className="w-4 h-4 text-primary" /> {(stats as any).position}
                  </span>
                )}
                {(stats as any).teamName && (
                  <span className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full">
                    <ShieldAlert className="w-4 h-4" /> {(stats as any).teamName}
                  </span>
                )}
                {(stats as any).nationality && (
                  <span className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full">
                    {(stats as any).nationality}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-4 items-stretch">
              {/* Market Value Card */}
              {currentMV && (
                <div className="bg-background border border-emerald-500/30 rounded-xl p-4 text-center min-w-[140px] shadow-lg shadow-emerald-500/10">
                  <div className="text-xs uppercase text-muted-foreground font-bold mb-1 tracking-widest flex items-center justify-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-400" /> Market Value
                  </div>
                  <div className="text-2xl font-display font-black text-emerald-400 leading-tight">
                    {formatValue(currentMV)}
                  </div>
                  {lastChange !== null && lastChange !== 0 && (
                    <div className={`text-xs font-bold mt-1 flex items-center justify-center gap-1 ${lastChange > 0 ? "text-green-400" : "text-red-400"}`}>
                      {lastChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {lastChange > 0 ? "+" : ""}{formatValue(Math.abs(lastChange))}
                    </div>
                  )}
                </div>
              )}

              {/* OVR Card */}
              <div className="bg-background border border-border rounded-xl p-4 text-center min-w-[120px] shadow-lg shadow-primary/5">
                <div className="text-xs uppercase text-muted-foreground font-bold mb-1 tracking-widest">OVR Rating</div>
                <div className={`text-6xl font-display font-black leading-none ${getOvrColorClass(stats.overallRating)} neon-text`}>
                  {formatOvr(stats.overallRating)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Performance Metrics */}
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
                <Target className="text-primary w-6 h-6" /> Performance Metrics
              </h2>
              {statsByTeamData && statsByTeamData.statsByTeam.length > 1 && (
                <div className="flex bg-secondary rounded-lg p-1 gap-1">
                  <button
                    onClick={() => setStatsView("total")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${statsView === "total" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => setStatsView("by-team")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${statsView === "by-team" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    By Team
                  </button>
                </div>
              )}
            </div>

            {statsView === "total" || !statsByTeamData || statsByTeamData.statsByTeam.length <= 1 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Matches" value={stats.matchesPlayed} />
                <StatBox label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} highlight />
                <StatBox label="Goals" value={stats.goalsScored} color="text-green-400" />
                <StatBox label="Goals/Match" value={stats.goalsPerMatch.toFixed(2)} />
                <StatBox label="Wins" value={stats.wins} color="text-green-500" />
                <StatBox label="Draws" value={stats.draws} color="text-yellow-500" />
                <StatBox label="Losses" value={stats.losses} color="text-red-500" />
                <StatBox label="Goal Diff" value={(stats.goalDiff > 0 ? "+" : "") + stats.goalDiff} />
              </div>
            ) : (
              <div className="space-y-4">
                {statsByTeamData.statsByTeam.map((ts, i) => (
                  <div
                    key={ts.teamId}
                    className={`rounded-xl border p-5 ${ts.isCurrent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {ts.teamLogo ? (
                        <img src={ts.teamLogo} alt={ts.teamName} className="w-9 h-9 rounded-full object-cover border border-border bg-secondary" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold">{ts.teamName.slice(0, 2)}</div>
                      )}
                      <div className="flex-1">
                        <div className="font-display font-black uppercase text-sm">{ts.teamName}</div>
                        <div className="text-[10px] text-muted-foreground">{ts.seasons.join(", ") || "—"}</div>
                      </div>
                      {ts.isCurrent && (
                        <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase">Current</span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                      <MiniStatBox label="Matches" value={ts.matches} />
                      <MiniStatBox label="Win %" value={`${ts.winRate}%`} color="text-primary" />
                      <MiniStatBox label="Goals" value={ts.goals} color="text-green-400" />
                      <MiniStatBox label="G/Match" value={ts.goalsPerMatch.toFixed(1)} />
                      <MiniStatBox label="Wins" value={ts.wins} color="text-green-500" />
                      <MiniStatBox label="Draws" value={ts.draws} color="text-yellow-500" />
                      <MiniStatBox label="Losses" value={ts.losses} color="text-red-500" />
                      <MiniStatBox label="MVPs" value={ts.mvps} color="text-amber-400" />
                    </div>
                  </div>
                ))}
                {/* All Time Total */}
                <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-secondary/20 p-5">
                  <div className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-widest">All Time Total</div>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    <MiniStatBox label="Matches" value={stats.matchesPlayed} />
                    <MiniStatBox label="Win %" value={`${stats.winRate.toFixed(1)}%`} color="text-primary" />
                    <MiniStatBox label="Goals" value={stats.goalsScored} color="text-green-400" />
                    <MiniStatBox label="G/Match" value={stats.goalsPerMatch.toFixed(1)} />
                    <MiniStatBox label="Wins" value={stats.wins} color="text-green-500" />
                    <MiniStatBox label="Draws" value={stats.draws} color="text-yellow-500" />
                    <MiniStatBox label="Losses" value={stats.losses} color="text-red-500" />
                    <MiniStatBox label="MVPs" value={stats.mvpCount} color="text-amber-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Market Value Chart */}
            <div>
              <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2 border-b border-border pb-2">
                <TrendingUp className="text-emerald-400 w-6 h-6" /> Market Valuation
              </h2>

              {history.length < 2 ? (
                <div className="mt-4 p-6 text-center text-muted-foreground bg-card rounded-lg border border-border">
                  {currentMV
                    ? `Current valuation: ${formatValue(currentMV)}. More data points will appear as matches are played.`
                    : "Market value data will appear after the first match is recorded."}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniCard
                      label="Current Value"
                      value={currentMV ? formatValue(currentMV) : "—"}
                      color="text-emerald-400"
                    />
                    <MiniCard
                      label="Season Change"
                      value={change !== null ? `${change >= 0 ? "+" : ""}${formatValue(Math.abs(change))}` : "—"}
                      color={change === null ? undefined : change >= 0 ? "text-green-400" : "text-red-400"}
                    />
                    <MiniCard
                      label="Change %"
                      value={changePct !== null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%` : "—"}
                      color={changePct === null ? undefined : changePct >= 0 ? "text-green-400" : "text-red-400"}
                    />
                    <MiniCard
                      label="Trend"
                      value={trend === "up" ? "Rising ↑" : trend === "down" ? "Falling ↓" : "Stable →"}
                      color={trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-yellow-400"}
                    />
                  </div>

                  {/* Line Chart */}
                  <div className="bg-card border border-border rounded-xl p-4">
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#6b7280", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#6b7280", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => formatValue(v)}
                          width={70}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1a1a2e",
                            border: "1px solid #ffffff20",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""}
                          formatter={(v: any, _, payload) => [
                            formatValue(Number(v)),
                            payload?.payload?.reason ?? "Valuation",
                          ]}
                        />
                        {maxVal > 0 && <ReferenceLine y={maxVal} stroke="#22c55e30" strokeDasharray="4 4" />}
                        {minVal > 0 && minVal !== maxVal && <ReferenceLine y={minVal} stroke="#ef444430" strokeDasharray="4 4" />}
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
                          activeDot={{ fill: "#34d399", r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Value History Log */}
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">Valuation History</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {[...history].reverse().map((h, i) => {
                        const prev = history[history.length - 2 - i];
                        const diff = prev ? h.value - prev.value : 0;
                        return (
                          <div key={h.id} className="flex items-center justify-between text-sm">
                            <div className="text-muted-foreground w-32 shrink-0">{format(new Date(h.recordedAt), "MMM d, yyyy")}</div>
                            <div className="flex-1 text-xs text-muted-foreground px-2 truncate">{h.reason ?? "—"}</div>
                            <div className="font-bold text-emerald-400 w-20 text-right">{formatValue(h.value)}</div>
                            {diff !== 0 && (
                              <div className={`w-16 text-right text-xs font-bold ${diff > 0 ? "text-green-400" : "text-red-400"}`}>
                                {diff > 0 ? "+" : ""}{formatValue(Math.abs(diff))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Form */}
            <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2 border-b border-border pb-2">
              <Activity className="text-accent w-6 h-6" /> Recent Form
            </h2>

            <div className="space-y-3">
              {stats.recentMatches && stats.recentMatches.length > 0 ? (
                stats.recentMatches.map((m) => (
                  <div key={m.matchId} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <span className="text-sm text-muted-foreground w-24">{format(new Date(m.date), "MMM d, yy")}</span>
                    <span className="font-bold uppercase flex-1">{m.opponentName}</span>
                    <div className="font-mono text-lg font-bold flex items-center gap-3 w-24 justify-center bg-background py-1 rounded border border-border">
                      <span className={m.playerGoals > m.opponentGoals ? "text-green-400" : ""}>{m.playerGoals}</span>
                      <span className="text-muted-foreground text-xs">-</span>
                      <span className={m.opponentGoals > m.playerGoals ? "text-green-400" : ""}>{m.opponentGoals}</span>
                    </div>
                    <span className={`w-12 text-center font-bold text-sm ${m.result === "W" ? "text-green-500" : m.result === "L" ? "text-red-500" : "text-yellow-500"}`}>
                      {m.result}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground bg-card rounded-lg border border-border">No recent matches recorded.</div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">

            {/* eFootball Card */}
            {(stats as any).cardOvr && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
                <h3 className="font-display text-lg font-bold uppercase mb-4 flex items-center gap-2">
                  <Layers className="text-primary w-4 h-4" /> eFootball Card
                </h3>
                <div className="flex justify-center">
                  <PlayerCard
                    player={{
                      name: stats.name,
                      imageUrl: (stats as any).imageUrl,
                      position: (stats as any).position,
                      nationality: (stats as any).nationality,
                      cardOvr: (stats as any).cardOvr,
                      cardPace: (stats as any).cardPace,
                      cardShooting: (stats as any).cardShooting,
                      cardPassing: (stats as any).cardPassing,
                      cardDribbling: (stats as any).cardDribbling,
                      cardDefending: (stats as any).cardDefending,
                      cardPhysical: (stats as any).cardPhysical,
                      cardPlayingStyle: (stats as any).cardPlayingStyle,
                      cardType: (stats as any).cardType,
                    }}
                    size="lg"
                  />
                </div>
              </div>
            )}

            {/* Valuation Analysis */}
            {currentMV && (
              <div className="bg-card border border-emerald-500/20 rounded-xl p-6 shadow-lg">
                <h3 className="font-display text-xl font-bold uppercase mb-4 flex items-center gap-2">
                  <DollarSign className="text-emerald-400 w-5 h-5" /> Valuation Analysis
                </h3>
                <div className="space-y-3 text-sm">
                  <AnalysisRow label="Current Value" value={formatValue(currentMV)} color="text-emerald-400" />
                  {minVal > 0 && <AnalysisRow label="Season Low" value={formatValue(minVal)} color="text-red-400" />}
                  {maxVal > 0 && <AnalysisRow label="Season High" value={formatValue(maxVal)} color="text-green-400" />}
                  {changePct !== null && (
                    <AnalysisRow
                      label="Season Growth"
                      value={`${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`}
                      color={changePct >= 0 ? "text-green-400" : "text-red-400"}
                    />
                  )}
                  <div className="pt-3 border-t border-border text-xs text-muted-foreground leading-relaxed">
                    {trend === "up"
                      ? "Market value is on the rise. Strong form and consistent goal-scoring are driving the valuation upward."
                      : trend === "down"
                      ? "Market value has dipped recently. Recovery is possible with improved match performance."
                      : "Market value is holding steady. Consistent performances keep valuation stable."}
                  </div>
                </div>
              </div>
            )}

            {/* Career / Transfer History */}
            {statsByTeamData && statsByTeamData.transfers.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <h3 className="font-display text-xl font-bold uppercase mb-4 flex items-center gap-2">
                  <Repeat2 className="text-blue-400 w-5 h-5" /> Career History
                </h3>
                <div className="space-y-3">
                  {[...statsByTeamData.transfers].reverse().map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {t.fromTeamLogo ? (
                          <img src={t.fromTeamLogo} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px]">{(t.fromTeamName ?? "FA").slice(0, 2)}</div>
                        )}
                        <span className="text-[11px] text-muted-foreground truncate">{t.fromTeamName ?? "Free Agent"}</span>
                      </div>
                      <span className="text-muted-foreground text-xs shrink-0">→</span>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <span className="text-[11px] font-bold truncate">{t.toTeamName}</span>
                        {t.toTeamLogo ? (
                          <img src={t.toTeamLogo} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px]">{t.toTeamName.slice(0, 2)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <PlayerAIAnalysis
              playerId={id}
              playerRole={(stats as any).teamRole}
              playerPosition={(stats as any).position}
              teamName={(stats as any).teamName}
              playerName={stats.name}
            />

            {/* Trophy Cabinet */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              <h3 className="font-display text-xl font-bold uppercase mb-6 flex items-center gap-2">
                <Trophy className="text-yellow-400 w-5 h-5" /> Trophy Cabinet
              </h3>

              <div className="flex items-center gap-4 mb-8 bg-secondary/50 p-4 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-500 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-bold uppercase">Total MVPs</div>
                  <div className="text-2xl font-bold text-foreground">{stats.mvpCount}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-bold uppercase text-muted-foreground border-b border-border pb-2">Individual Awards</div>
                {stats.awards && stats.awards.length > 0 ? (
                  stats.awards.map(award => (
                    <div key={award.id} className="flex gap-3 items-start">
                      <AwardIcon className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-sm">{award.title}</div>
                        {award.description && <div className="text-xs text-muted-foreground mt-1">{award.description}</div>}
                        <div className="text-[10px] text-muted-foreground mt-1 uppercase">{format(new Date(award.awardedAt), "MMMM yyyy")}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground italic">No individual awards yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── AI Analysis Helpers ────────────────────────────────────────────────────

const SECTION_CONFIGS: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  "overview":            { icon: Eye,           color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/30", label: "Overview" },
  "attacking output":    { icon: Swords,        color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Attacking Output" },
  "consistency & form":  { icon: BarChart2,     color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/30",    label: "Consistency & Form" },
  "strengths":           { icon: Zap,           color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",  label: "Strengths" },
  "areas to watch":      { icon: AlertTriangle, color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30", label: "Areas to Watch" },
  "verdict":             { icon: Trophy,        color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30", label: "Verdict" },
};

const ROLE_THEME = {
  captain: {
    accent: "text-yellow-400",
    border: "border-yellow-500/40",
    headerBg: "bg-gradient-to-r from-yellow-500/15 to-amber-500/10",
    headerBorder: "border-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    icon: Crown,
    label: "CAPTAIN",
    glow: "shadow-yellow-500/10",
  },
  vice_captain: {
    accent: "text-blue-400",
    border: "border-blue-500/40",
    headerBg: "bg-gradient-to-r from-blue-500/15 to-cyan-500/10",
    headerBorder: "border-blue-500/30",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    icon: Star,
    label: "VICE CAPTAIN",
    glow: "shadow-blue-500/10",
  },
  default: {
    accent: "text-primary",
    border: "border-primary/25",
    headerBg: "bg-gradient-to-r from-primary/10 to-primary/5",
    headerBorder: "border-primary/20",
    badge: "bg-primary/20 text-primary border-primary/30",
    icon: Activity,
    label: "PLAYER",
    glow: "shadow-primary/10",
  },
};

const TEAM_ACCENTS: Record<string, { primary: string; muted: string; border: string }> = {
  "PALTAN FC":         { primary: "text-orange-400",  muted: "text-orange-300/70",  border: "border-orange-500/30" },
  "MONEYBALL FC":      { primary: "text-emerald-400", muted: "text-emerald-300/70", border: "border-emerald-500/30" },
  "NEXUS FC":          { primary: "text-cyan-400",    muted: "text-cyan-300/70",    border: "border-cyan-500/30" },
  "RED DRAGONS FC":    { primary: "text-red-400",     muted: "text-red-300/70",     border: "border-red-500/30" },
  "INVICTUS FC":       { primary: "text-violet-400",  muted: "text-violet-300/70",  border: "border-violet-500/30" },
  "EXPENDABLES FC":    { primary: "text-amber-400",   muted: "text-amber-300/70",   border: "border-amber-500/30" },
  "STORM FC":          { primary: "text-sky-400",     muted: "text-sky-300/70",     border: "border-sky-500/30" },
  "DARK REIGN FC":     { primary: "text-rose-400",    muted: "text-rose-300/70",    border: "border-rose-500/30" },
  "APEX FC":           { primary: "text-yellow-400",  muted: "text-yellow-300/70",  border: "border-yellow-500/30" },
  "ROMA AQUILAE FC":   { primary: "text-lime-400",    muted: "text-lime-300/70",    border: "border-lime-500/30" },
  "DHURANDHAR WARRIORS": { primary: "text-fuchsia-400", muted: "text-fuchsia-300/70", border: "border-fuchsia-500/30" },
};

function getTeamAccent(name?: string) {
  if (!name) return { primary: "text-primary", muted: "text-muted-foreground", border: "border-primary/20" };
  const upper = name.toUpperCase();
  for (const key of Object.keys(TEAM_ACCENTS)) {
    if (upper.includes(key)) return TEAM_ACCENTS[key];
  }
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 5;
  return Object.values(TEAM_ACCENTS)[hash];
}

function parseAnalysisSections(text: string): Array<{ key: string; content: string }> {
  const sections: Array<{ key: string; content: string }> = [];
  const regex = /\*\*([^*]+?):\*\*\s*/g;
  const parts = text.split(regex);
  for (let i = 1; i < parts.length; i += 2) {
    const label = parts[i].trim().toLowerCase();
    const content = (parts[i + 1] || "").trim();
    if (content) sections.push({ key: label, content });
  }
  if (sections.length === 0) {
    text.split("\n\n").forEach((para, idx) => {
      if (para.trim()) sections.push({ key: `section-${idx}`, content: para.trim() });
    });
  }
  return sections;
}

// ─── Player AI Analysis Component ───────────────────────────────────────────

function PlayerAIAnalysis({
  playerId, playerRole, playerPosition, teamName, playerName,
}: {
  playerId: number;
  playerRole?: string;
  playerPosition?: string;
  teamName?: string;
  playerName?: string;
}) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/ai/player-analysis/${playerId}`);
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      setAnalysis(data.analysis);
      setGenerated(true);
    } catch {
      setError("Failed to generate analysis.");
    } finally {
      setLoading(false);
    }
  };

  const role = playerRole === "captain" ? "captain" : playerRole === "vice_captain" ? "vice_captain" : "default";
  const theme = ROLE_THEME[role];
  const teamAccent = getTeamAccent(teamName);
  const RoleIcon = theme.icon;

  if (!generated && !loading) {
    return (
      <div className={`bg-card border ${theme.border} rounded-xl overflow-hidden shadow-lg ${theme.glow}`}>
        <div className={`px-5 py-4 ${theme.headerBg} border-b ${theme.headerBorder}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${role === "captain" ? "bg-yellow-500/20" : role === "vice_captain" ? "bg-blue-500/20" : "bg-primary/10"} flex items-center justify-center`}>
              <Cpu className={`w-4.5 h-4.5 ${theme.accent}`} />
            </div>
            <div>
              <div className="font-display font-black uppercase text-sm tracking-widest">AI Scouting Report</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {teamName && <span className={`${teamAccent.primary} font-bold`}>{teamName}</span>}
                {teamName && playerPosition && <span className="text-muted-foreground"> · </span>}
                {playerPosition && <span>{playerPosition}</span>}
              </div>
            </div>
            {role !== "default" && (
              <span className={`ml-auto inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${theme.badge}`}>
                <RoleIcon className="w-2.5 h-2.5" /> {theme.label}
              </span>
            )}
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-xs text-muted-foreground mb-4">Generate an AI-powered scouting report for <span className={`font-bold ${theme.accent}`}>{playerName ?? "this player"}</span> based on their match statistics.</p>
          <button
            onClick={generate}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
              role === "captain"
                ? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40"
                : role === "vice_captain"
                ? "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40"
                : "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> Generate Report
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-card border ${theme.border} rounded-xl p-8 text-center shadow-lg`}>
        <div className={`w-12 h-12 rounded-xl ${role === "captain" ? "bg-yellow-500/10" : role === "vice_captain" ? "bg-blue-500/10" : "bg-primary/10"} flex items-center justify-center mx-auto mb-3`}>
          <Loader2 className={`w-6 h-6 animate-spin ${theme.accent}`} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Analysing player data</p>
        <p className="text-[10px] text-muted-foreground mt-1">Building scouting report for {playerName ?? "player"}…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-destructive/30 rounded-xl p-5 text-center shadow-lg">
        <p className="text-destructive text-xs mb-3">{error}</p>
        <button onClick={generate} className="text-xs text-muted-foreground hover:text-foreground underline">Try Again</button>
      </div>
    );
  }

  const sections = analysis ? parseAnalysisSections(analysis) : [];

  return (
    <div className={`bg-card border ${theme.border} rounded-xl overflow-hidden shadow-xl ${theme.glow}`}>
      {/* Header */}
      <div className={`px-5 py-4 ${theme.headerBg} border-b ${theme.headerBorder}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${role === "captain" ? "bg-yellow-500/20" : role === "vice_captain" ? "bg-blue-500/20" : "bg-primary/10"} flex items-center justify-center`}>
              <Cpu className={`w-4.5 h-4.5 ${theme.accent}`} />
            </div>
            <div>
              <div className="font-display font-black uppercase text-sm tracking-widest flex items-center gap-2">
                AI Scouting Report
                {role !== "default" && (
                  <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${theme.badge}`}>
                    <RoleIcon className="w-2.5 h-2.5" /> {theme.label}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
                {playerName && <span className={`font-bold ${theme.accent}`}>{playerName}</span>}
                {teamName && <span className="text-muted-foreground/50">·</span>}
                {teamName && <span className={`${teamAccent.primary} font-semibold`}>{teamName}</span>}
                {playerPosition && <span className="text-muted-foreground/50">·</span>}
                {playerPosition && <span className="text-muted-foreground">{playerPosition}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded hover:bg-white/5"
          >
            <RefreshCw className="w-3 h-3" /> Regenerate
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="p-4 grid gap-3">
        {sections.map(({ key, content }) => {
          const cfg = Object.entries(SECTION_CONFIGS).find(([k]) => key.includes(k))?.[1];
          if (!cfg) {
            return (
              <div key={key} className="text-sm text-muted-foreground leading-relaxed px-1">
                {content}
              </div>
            );
          }
          const SectionIcon = cfg.icon;
          const isVerdict = key.includes("verdict");
          return (
            <div
              key={key}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden ${isVerdict ? "ring-1 ring-inset " + cfg.border : ""}`}
            >
              <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${cfg.border}`}>
                <div className={`w-6 h-6 rounded-md ${cfg.bg} flex items-center justify-center`}>
                  <SectionIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <span className={`font-display font-black uppercase text-[11px] tracking-widest ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-foreground/80 leading-relaxed">{content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer badge */}
      <div className={`px-5 py-2.5 border-t ${theme.headerBorder} ${theme.headerBg} flex items-center gap-2`}>
        <CheckCircle2 className={`w-3 h-3 ${theme.accent}`} />
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Powered by Groq · llama-3.3-70b · GEF AI Engine
        </span>
      </div>
    </div>
  );
}

function MiniStatBox({ label, value, color = "text-foreground" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-background/60 border border-border/50 rounded-lg p-2 text-center">
      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-base font-display font-bold ${color}`}>{value}</div>
    </div>
  );
}

function StatBox({ label, value, color = "text-foreground", highlight = false }: { label: string; value: string | number; color?: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? "bg-primary/5 border-primary/20" : "bg-card border-border"} flex flex-col justify-center items-center text-center shadow-sm hover:border-primary/50 transition-colors`}>
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{label}</span>
      <span className={`text-3xl font-display font-bold ${color}`}>{value}</span>
    </div>
  );
}

function MiniCard({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-background border border-border rounded-lg p-3 text-center">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}

function AnalysisRow({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
