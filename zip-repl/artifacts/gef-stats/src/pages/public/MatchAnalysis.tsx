import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useRoute } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import {
  Loader2, Trophy, Star, ChevronDown, ChevronUp, Zap, Swords, Target,
  BarChart2, AlertTriangle, TrendingUp, MessageSquare, CheckCircle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisReport {
  title?: string;
  headline?: string;
  tone?: string;
  openingStatement?: string;
  team1Report?: TeamReport;
  team2Report?: TeamReport;
  matchupBreakdowns?: MatchupBreakdown[];
  keyTurningPoints?: string[];
  verdict?: string;
  roast?: string;
  mvpOfTheMatch?: string;
  finalCall?: string;
  nextMatchAdvice?: { team1: string[]; team2: string[] };
  chartData?: ChartData;
}

interface TeamReport {
  name?: string;
  overallRating?: number;
  verdict?: string;
  highlights?: string[];
  concerns?: string[];
}

interface MatchupBreakdown {
  game?: number;
  player1Name?: string;
  player2Name?: string;
  score?: string;
  winnerName?: string;
  analysis?: string;
  keyInsight?: string;
  player1Rating?: number;
  player2Rating?: number;
  possessionTeam1?: number;
  possessionTeam2?: number;
  shotsTeam1?: number;
  shotsTeam2?: number;
}

interface ChartData {
  goalsPerGame?: { game: string; player1: string; player2: string; team1Goals: number; team2Goals: number }[];
  playerRatings?: { name: string; rating: number; goals: number; side: string }[];
}

function RatingBadge({ rating }: { rating?: number }) {
  if (!rating) return null;
  const color = rating >= 8 ? "text-green-400 bg-green-500/10 border-green-500/30"
    : rating >= 6 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
    : "text-red-400 bg-red-500/10 border-red-500/30";
  return (
    <span className={cn("inline-flex items-center justify-center w-8 h-8 rounded-full border font-display font-black text-sm", color)}>
      {rating}
    </span>
  );
}

function ToneChip({ tone }: { tone?: string }) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    DOMINANT_WIN:  { label: "DOMINANT WIN",  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
    TIGHT_BATTLE:  { label: "TIGHT BATTLE",  color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
    SHOCK_UPSET:   { label: "SHOCK UPSET",   color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
    ROUTINE:       { label: "ROUTINE",        color: "text-sky-400",    bg: "bg-sky-500/10 border-sky-500/20" },
  };
  const cfg = configs[tone ?? ""] ?? { label: tone ?? "ANALYSIS", color: "text-primary", bg: "bg-primary/10 border-primary/20" };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border", cfg.color, cfg.bg)}>
      {cfg.label}
    </span>
  );
}

function PossessionBar({ t1, t2, label1, label2 }: { t1?: number; t2?: number; label1: string; label2: string }) {
  const p1 = t1 ?? 50, p2 = t2 ?? 50;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide">
        <span className="text-primary">{label1} {p1}%</span>
        <span className="text-muted-foreground">Possession</span>
        <span className="text-accent">{label2} {p2}%</span>
      </div>
      <div className="flex rounded-full overflow-hidden h-2">
        <div className="bg-primary transition-all duration-700" style={{ width: `${p1}%` }} />
        <div className="bg-accent/60 flex-1" />
      </div>
    </div>
  );
}

function MatchupCard({ mu, index, team1Name, team2Name }: {
  mu: MatchupBreakdown; index: number;
  team1Name?: string; team2Name?: string;
}) {
  const [open, setOpen] = useState(false);
  const p1Win = (mu.player1Rating ?? 0) > (mu.player2Rating ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/10 transition-colors text-left"
      >
        <span className="shrink-0 text-[10px] font-black text-primary uppercase border border-primary/30 px-2 py-0.5 rounded">
          G{mu.game ?? index + 1}
        </span>
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="font-bold text-sm truncate">{mu.player1Name}</span>
          <RatingBadge rating={mu.player1Rating} />
        </div>
        <div className="shrink-0 font-display font-black text-xl text-primary px-2">{mu.score}</div>
        <div className="flex-1 flex items-center gap-3 justify-end min-w-0">
          <RatingBadge rating={mu.player2Rating} />
          <span className="font-bold text-sm truncate">{mu.player2Name}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
               : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3 bg-secondary/5">
              {(mu.possessionTeam1 || mu.possessionTeam2) && (
                <PossessionBar t1={mu.possessionTeam1} t2={mu.possessionTeam2}
                  label1={mu.player1Name ?? "P1"} label2={mu.player2Name ?? "P2"} />
              )}

              {(mu.shotsTeam1 || mu.shotsTeam2) && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-primary">{mu.shotsTeam1}</span>
                  <span className="flex-1 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Shots</span>
                  <span className="font-bold text-accent">{mu.shotsTeam2}</span>
                </div>
              )}

              {mu.analysis && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Analysis</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{mu.analysis}</p>
                </div>
              )}

              {mu.keyInsight && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> Key Insight
                  </p>
                  <p className="text-sm italic text-foreground/80">{mu.keyInsight}</p>
                </div>
              )}

              {mu.winnerName && mu.winnerName !== "DRAW" && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Trophy className="w-3 h-3" />
                  <span className="font-bold">{mu.winnerName}</span> wins this game
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GoalsBarChart({ data, team1Name, team2Name }: {
  data: ChartData["goalsPerGame"]; team1Name?: string; team2Name?: string;
}) {
  if (!data?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
        <BarChart2 className="w-3 h-3" /> Goals Per Game
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="game" tick={{ fill: "#888", fontSize: 11 }} />
          <YAxis tick={{ fill: "#888", fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "#aaa" }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="team1Goals" name={team1Name ?? "Team 1"} fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="team2Goals" name={team2Name ?? "Team 2"} fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlayerRatingsChart({ data }: { data: ChartData["playerRatings"] }) {
  if (!data?.length) return null;
  const sorted = [...data].sort((a, b) => b.rating - a.rating);
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
        <Star className="w-3 h-3" /> Player Ratings
      </p>
      <div className="space-y-2">
        {sorted.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
            <span className="text-sm font-bold flex-1 truncate">{p.name}</span>
            <span className="text-[10px] text-muted-foreground">{p.goals}⚽</span>
            <div className="w-32 h-2 bg-secondary/30 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", p.side === "team1" ? "bg-green-500" : "bg-indigo-500")}
                style={{ width: `${(p.rating / 10) * 100}%` }}
              />
            </div>
            <RatingBadge rating={p.rating} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchAnalysis() {
  const [, params] = useRoute("/match-analysis/:matchId");
  const matchId = params?.matchId ? parseInt(params.matchId) : null;

  const { data: matchData } = useQuery<any>({
    queryKey: ["/api/matches", matchId],
    queryFn: () => fetch(getApiUrl(`/api/matches`), { credentials: "include" }).then(r => r.json()),
    enabled: matchId !== null,
  });

  const { data: analysisData, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/ai/match-analysis", matchId],
    queryFn: () => fetch(getApiUrl(`/api/ai/match-analysis/${matchId}`), { credentials: "include" }).then(async r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    enabled: matchId !== null,
    retry: false,
  });

  const report: AnalysisReport = analysisData?.report ?? {};

  // Find the match from the matches list
  const match = Array.isArray(matchData) ? matchData.find((m: any) => m.id === matchId) : null;
  const team1Name = match?.team1Name ?? report.team1Report?.name;
  const team2Name = match?.team2Name ?? report.team2Report?.name;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {isError && !isLoading && (
          <div className="text-center py-32 text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-display uppercase">No analysis found</p>
            <p className="text-sm mt-1">This match hasn't been analysed yet.</p>
          </div>
        )}

        {analysisData && report.headline && (
          <div className="space-y-8">
            {/* Hero */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center space-y-3 mb-6">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <ToneChip tone={report.tone} />
                  {analysisData.generatedAt && (
                    <span className="text-[10px] text-muted-foreground">
                      Generated {format(new Date(analysisData.generatedAt), "MMM d, yyyy · h:mm a")}
                    </span>
                  )}
                </div>
                <h1 className="font-display font-black uppercase text-2xl sm:text-3xl leading-tight tracking-wide">
                  {report.headline}
                </h1>
                {match && (
                  <div className="flex items-center justify-center gap-4 text-lg">
                    <span className="font-display font-bold uppercase">{match.team1Name}</span>
                    <span className="font-display font-black text-3xl text-primary">{match.team1Score} — {match.team2Score}</span>
                    <span className="font-display font-bold uppercase">{match.team2Name}</span>
                  </div>
                )}
              </div>

              {report.openingStatement && (
                <div className="bg-card border border-border rounded-xl px-6 py-5">
                  <p className="text-base leading-relaxed text-foreground/90 font-medium italic">
                    "{report.openingStatement}"
                  </p>
                </div>
              )}
            </motion.div>

            {/* MVP badge */}
            {report.mvpOfTheMatch && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-6 py-4 flex items-center gap-4">
                <Star className="w-7 h-7 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500">MVP of the Match</p>
                  <p className="font-display font-black uppercase text-xl text-yellow-400">{report.mvpOfTheMatch}</p>
                </div>
              </motion.div>
            )}

            {/* Charts */}
            {report.chartData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GoalsBarChart data={report.chartData.goalsPerGame} team1Name={team1Name} team2Name={team2Name} />
                <PlayerRatingsChart data={report.chartData.playerRatings} />
              </motion.div>
            )}

            {/* Team Reports */}
            {(report.team1Report || report.team2Report) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[report.team1Report, report.team2Report].map((team, i) => team && (
                  <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-display font-bold uppercase text-lg">{team.name}</p>
                      <RatingBadge rating={team.overallRating} />
                    </div>
                    {team.verdict && <p className="text-sm text-foreground/80 leading-relaxed">{team.verdict}</p>}
                    {team.highlights && team.highlights.length > 0 && (
                      <div>
                        {team.highlights.map((h, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm text-green-400 mt-1">
                            <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            {h}
                          </div>
                        ))}
                      </div>
                    )}
                    {team.concerns && team.concerns.length > 0 && (
                      <div>
                        {team.concerns.map((c, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm text-red-400 mt-1">
                            <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* Individual Matchups */}
            {report.matchupBreakdowns && report.matchupBreakdowns.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <Swords className="w-3 h-3" /> Individual Game Breakdowns
                </p>
                <div className="space-y-3">
                  {report.matchupBreakdowns.map((mu, i) => (
                    <MatchupCard key={i} mu={mu} index={i} team1Name={team1Name} team2Name={team2Name} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Key Turning Points */}
            {report.keyTurningPoints && report.keyTurningPoints.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                className="bg-card border border-border rounded-xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" /> Key Turning Points
                </p>
                <ul className="space-y-2">
                  {report.keyTurningPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-foreground/80">{pt}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Verdict */}
            {report.verdict && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="bg-card border border-primary/20 rounded-xl p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                  <Target className="w-3 h-3" /> Match Verdict
                </p>
                <p className="text-base leading-relaxed text-foreground/90">{report.verdict}</p>
              </motion.div>
            )}

            {/* Roast */}
            {report.roast && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
                className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                  🔥 The Roast
                </p>
                <p className="text-base leading-relaxed text-foreground/90 italic">"{report.roast}"</p>
              </motion.div>
            )}

            {/* Next Match Advice */}
            {report.nextMatchAdvice && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([["team1", team1Name], ["team2", team2Name]] as const).map(([key, name]) => {
                  const advice = report.nextMatchAdvice?.[key];
                  if (!advice?.length) return null;
                  return (
                    <div key={key} className="bg-card border border-border rounded-xl p-5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" /> Next Steps — {name}
                      </p>
                      <ul className="space-y-2">
                        {advice.map((a: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-primary font-bold shrink-0">→</span>
                            <span className="text-foreground/80">{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Final Call */}
            {report.finalCall && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                className="text-center py-6">
                <div className="inline-block bg-primary/5 border border-primary/20 rounded-2xl px-8 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Final Call</p>
                  <p className="font-display font-bold uppercase text-xl leading-tight">{report.finalCall}</p>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
