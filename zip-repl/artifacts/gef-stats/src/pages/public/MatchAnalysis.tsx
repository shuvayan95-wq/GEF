import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useRoute } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2, AlertTriangle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchupBreakdown {
  game?: number;
  player1Name?: string;
  player2Name?: string;
  score?: string;
  winnerName?: string;
  verdict?: string;
  player1Rating?: number;
  player2Rating?: number;
  possessionTeam1?: number;
  possessionTeam2?: number;
  shotsTeam1?: number;
  shotsTeam2?: number;
}

interface AnalysisReport {
  headline?: string;
  subheadline?: string;
  tone?: string;
  mvpOfTheMatch?: string;
  team1Rating?: number;
  team2Rating?: number;
  fullArticle?: string;
  pullQuote?: string;
  roast?: string;
  matchupBreakdowns?: MatchupBreakdown[];
  finalCall?: string;
  chartData?: {
    goalsPerGame?: { game: string; player1: string; player2: string; team1Goals: number; team2Goals: number }[];
    playerRatings?: { name: string; rating: number; goals: number; side: string }[];
  };
  openingStatement?: string;
  verdict?: string;
}

function RatingDot({ rating }: { rating?: number }) {
  if (!rating) return null;
  const color = rating >= 8 ? "bg-green-500 text-black" : rating >= 6 ? "bg-yellow-400 text-black" : "bg-red-500 text-white";
  return (
    <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs", color)}>
      {rating}
    </span>
  );
}

function ToneBadge({ tone }: { tone?: string }) {
  const map: Record<string, string> = {
    DOMINANT_WIN: "DOMINANT WIN", TIGHT_BATTLE: "TIGHT BATTLE",
    SHOCK_UPSET: "SHOCK UPSET", ROUTINE: "ROUTINE",
  };
  return (
    <span className="text-[10px] font-black uppercase tracking-[0.2em] border border-primary/40 text-primary px-2 py-0.5">
      {map[tone ?? ""] ?? tone ?? "MATCH REPORT"}
    </span>
  );
}

export function MatchAnalysis() {
  const [, params] = useRoute("/match-analysis/:matchId");
  const matchId = params?.matchId ? parseInt(params.matchId) : null;

  const { data: matchData } = useQuery<any[]>({
    queryKey: ["/api/matches"],
    queryFn: () => fetch(getApiUrl("/api/matches"), { credentials: "include" }).then(r => r.json()),
  });

  const { data: analysisData, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/ai/match-analysis", matchId],
    queryFn: () =>
      fetch(getApiUrl(`/api/ai/match-analysis/${matchId}`), { credentials: "include" }).then(async r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
    enabled: matchId !== null,
    retry: false,
  });

  const report: AnalysisReport = analysisData?.report ?? {};
  const match = Array.isArray(matchData) ? matchData.find((m: any) => m.id === matchId) : null;
  const team1Name = report.chartData?.playerRatings?.find(p => p.side === "team1")
    ? (match?.team1Name ?? "Team 1") : (match?.team1Name ?? "Team 1");
  const t1 = match?.team1Name ?? "Team 1";
  const t2 = match?.team2Name ?? "Team 2";

  const articleParagraphs = (report.fullArticle ?? report.openingStatement ?? report.verdict ?? "")
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  const playerRatingsSorted = [...(report.chartData?.playerRatings ?? [])].sort((a, b) => b.rating - a.rating);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6">
        {isLoading && (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {isError && !isLoading && (
          <div className="text-center py-40 text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-display font-black uppercase tracking-widest text-sm">No analysis found</p>
            <p className="text-sm mt-1 opacity-60">This match hasn't been analysed yet.</p>
          </div>
        )}

        {analysisData && report.headline && (
          <article>
            {/* ── MASTHEAD ── */}
            <div className="border-b-2 border-foreground/80 pt-8 pb-2 mb-4 flex items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-display font-black uppercase tracking-[0.25em] text-xs text-muted-foreground">
                  GEF Match Report
                </span>
                <span className="w-px h-3 bg-border" />
                <ToneBadge tone={report.tone} />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {analysisData.generatedAt
                  ? format(new Date(analysisData.generatedAt), "EEEE d MMMM yyyy")
                  : match?.date
                  ? format(new Date(match.date), "EEEE d MMMM yyyy")
                  : ""}
              </span>
            </div>

            {/* ── HEADLINE ── */}
            <div className="border-b border-border/40 pb-5 mb-5">
              <h1 className="font-display font-black uppercase leading-[0.95] tracking-tight text-3xl sm:text-4xl lg:text-5xl mb-3">
                {report.headline}
              </h1>
              {report.subheadline && (
                <p className="text-base sm:text-lg text-foreground/70 font-medium leading-snug">
                  {report.subheadline}
                </p>
              )}
            </div>

            {/* ── SCORE BLOCK ── */}
            {match && (
              <div className="border-b border-border/40 pb-5 mb-5">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-right">
                    <p className="font-display font-black uppercase text-xl sm:text-2xl tracking-wide">{match.team1Name}</p>
                    {report.team1Rating != null && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Rating: <span className={cn("font-bold", report.team1Rating >= 7 ? "text-green-400" : report.team1Rating >= 5 ? "text-yellow-400" : "text-red-400")}>{report.team1Rating}/10</span>
                      </p>
                    )}
                  </div>
                  <div className="font-display font-black text-4xl sm:text-5xl text-primary tracking-tighter">
                    {match.team1Score}–{match.team2Score}
                  </div>
                  <div className="text-left">
                    <p className="font-display font-black uppercase text-xl sm:text-2xl tracking-wide">{match.team2Name}</p>
                    {report.team2Rating != null && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Rating: <span className={cn("font-bold", report.team2Rating >= 7 ? "text-green-400" : report.team2Rating >= 5 ? "text-yellow-400" : "text-red-400")}>{report.team2Rating}/10</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── BYLINE ── */}
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6 border-b border-border/30 pb-4">
              By GEF Match Analyst
              {report.mvpOfTheMatch && (
                <>
                  <span className="mx-2 opacity-30">|</span>
                  <Star className="inline w-3 h-3 text-yellow-400 mr-1" />
                  <span className="text-yellow-400">MVP: {report.mvpOfTheMatch}</span>
                </>
              )}
            </p>

            {/* ── MAIN BODY: article + sidebar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:divide-x lg:divide-border/40 mb-6">

              {/* LEFT: Full article prose */}
              <div className="lg:col-span-2 lg:pr-8 space-y-0">
                {articleParagraphs.map((para, i) => (
                  <div key={i}>
                    <p className={cn(
                      "leading-relaxed text-foreground/90 mb-4",
                      i === 0 ? "text-lg font-medium" : "text-sm sm:text-base"
                    )}>
                      {i === 0 && (
                        <span className="float-left font-display font-black text-5xl leading-none mr-2 mt-1 text-primary">
                          {para[0]}
                        </span>
                      )}
                      {i === 0 ? para.slice(1) : para}
                    </p>

                    {/* Pull quote after paragraph 2 */}
                    {i === 1 && report.pullQuote && (
                      <blockquote className="border-l-4 border-primary pl-4 my-6">
                        <p className="font-display font-black uppercase text-lg sm:text-xl leading-tight text-primary">
                          "{report.pullQuote}"
                        </p>
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>

              {/* RIGHT: Sidebar */}
              <div className="lg:col-span-1 lg:pl-8 mt-6 lg:mt-0 space-y-6 border-t border-border/40 pt-6 lg:border-t-0 lg:pt-0">

                {/* Game Results */}
                {report.matchupBreakdowns && report.matchupBreakdowns.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 border-b border-border/40 pb-2">
                      Game by Game
                    </p>
                    <div className="space-y-2">
                      {report.matchupBreakdowns.map((mu, i) => (
                        <div key={i}>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[9px] font-black text-primary border border-primary/30 px-1.5 py-0.5 shrink-0">
                              G{mu.game ?? i + 1}
                            </span>
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <RatingDot rating={mu.player1Rating} />
                              <span className="font-bold truncate text-[11px]">{mu.player1Name}</span>
                            </div>
                            <span className="font-display font-black text-sm text-primary shrink-0 px-1">{mu.score}</span>
                            <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
                              <span className="font-bold truncate text-[11px] text-right">{mu.player2Name}</span>
                              <RatingDot rating={mu.player2Rating} />
                            </div>
                          </div>
                          {mu.verdict && (
                            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 pl-7 italic">
                              {mu.verdict}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Player Ratings */}
                {playerRatingsSorted.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 border-b border-border/40 pb-2">
                      Player Ratings
                    </p>
                    <div className="space-y-2">
                      {playerRatingsSorted.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-3 shrink-0 font-bold">{i + 1}</span>
                          <span className="text-xs font-bold flex-1 truncate">{p.name}</span>
                          {p.goals > 0 && <span className="text-[10px] text-muted-foreground shrink-0">{p.goals}⚽</span>}
                          <div className="w-16 h-1.5 bg-secondary/30 rounded-full overflow-hidden shrink-0">
                            <div
                              className={cn("h-full rounded-full", p.side === "team1" ? "bg-green-500" : "bg-indigo-500")}
                              style={{ width: `${(p.rating / 10) * 100}%` }}
                            />
                          </div>
                          <RatingDot rating={p.rating} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Possession for each game */}
                {report.matchupBreakdowns?.some(m => m.possessionTeam1 && m.possessionTeam2) && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 border-b border-border/40 pb-2">
                      Possession
                    </p>
                    <div className="space-y-2">
                      {report.matchupBreakdowns?.filter(m => m.possessionTeam1 || m.possessionTeam2).map((mu, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-[9px] font-bold mb-0.5">
                            <span className="text-primary">{mu.possessionTeam1 ?? 50}%</span>
                            <span className="text-muted-foreground text-[8px] uppercase tracking-widest">G{mu.game}</span>
                            <span className="text-indigo-400">{mu.possessionTeam2 ?? 50}%</span>
                          </div>
                          <div className="flex rounded-full overflow-hidden h-1.5">
                            <div className="bg-primary" style={{ width: `${mu.possessionTeam1 ?? 50}%` }} />
                            <div className="bg-indigo-500 flex-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── ROAST ── full width, high-contrast */}
            {report.roast && (
              <div className="border-t-2 border-b-2 border-red-500/30 bg-red-500/5 py-6 mb-6 px-4 sm:px-0">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400 mb-3">
                  🔥 The Roast
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-foreground/90 font-medium italic">
                  {report.roast}
                </p>
              </div>
            )}

            {/* ── CHARTS ── */}
            {report.chartData?.goalsPerGame && report.chartData.goalsPerGame.length > 0 && (
              <div className="border-t border-border/40 pt-6 mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                  Goals Per Game
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={report.chartData.goalsPerGame} margin={{ top: 4, right: 4, left: -24, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="game" tick={{ fill: "#666", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#666", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 4, fontSize: 11 }}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="team1Goals" name={t1} fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="team2Goals" name={t2} fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── FINAL CALL ── */}
            {report.finalCall && (
              <div className="border-t-2 border-foreground/20 pt-5 pb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  Final Call
                </p>
                <p className="font-display font-black uppercase text-xl sm:text-2xl leading-tight tracking-wide">
                  {report.finalCall}
                </p>
              </div>
            )}
          </article>
        )}
      </main>
    </div>
  );
}
