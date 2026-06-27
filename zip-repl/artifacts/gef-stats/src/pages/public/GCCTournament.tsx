import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Trophy, Layers, List, Table2, GitBranch, ArrowLeft, Circle, CheckCircle, Clock, CalendarDays, Star, Crosshair } from "lucide-react";
import { useState } from "react";

const STATUS_STEPS = ["setup", "draw", "league", "playoffs", "knockout", "complete"];

const ZONE_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  direct:    { bar: "bg-blue-500",   text: "text-blue-400",   bg: "rgba(59,130,246,0.05)" },
  playoff:   { bar: "bg-orange-500", text: "text-orange-400", bg: "rgba(249,115,22,0.05)" },
  eliminated:{ bar: "bg-transparent",text: "text-gray-600",   bg: "transparent" },
};

export function GCCTournament() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<"overview" | "standings" | "matchdays">("overview");

  const { data, isLoading, error } = useQuery({
    queryKey: ["gcc-tournament", id],
    queryFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}`);
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  const standingsQuery = useQuery({
    queryKey: ["gcc-standings", id],
    queryFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}/standings`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  const topScorersQuery = useQuery({
    queryKey: ["gcc-top-scorers", id],
    queryFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}/top-scorers`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#030712" }}>
      <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#030712" }}>
      <p className="text-red-400">Tournament not found.</p>
    </div>
  );

  const { tournament, entries } = data;
  const standings: any[] = standingsQuery.data?.standings ?? [];
  const topScorers: any[] = topScorersQuery.data?.scorers ?? [];
  const stepIdx = STATUS_STEPS.indexOf(tournament.status);
  const leagueFixtures: any[] = data.fixtures?.filter((f: any) => f.stage === "league") ?? [];
  const playedCount = leagueFixtures.filter((f: any) => f.played).length;

  // Group league fixtures by matchday (round)
  const matchdayGroups = leagueFixtures.reduce((acc: Record<number, any[]>, f: any) => {
    const r = f.round ?? 0;
    if (!acc[r]) acc[r] = [];
    acc[r].push(f);
    return acc;
  }, {});
  const sortedMatchdays = Object.keys(matchdayGroups).map(Number).sort((a, b) => a - b);
  const playedFixtures = leagueFixtures.filter((f: any) => f.played);
  const recentPlayed = [...playedFixtures].reverse().slice(0, 5);

  const tabs = [
    { key: "overview",  label: "Overview",  icon: Trophy },
    { key: "standings", label: "Standings", icon: Table2 },
    { key: "matchdays", label: "Matchdays", icon: CalendarDays },
    { key: "scorers",   label: "Top Scorers", icon: Crosshair },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #030712 0%, #0a0f1e 50%, #030712 100%)" }}>
      {/* Stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(60)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
              top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.4 + 0.1,
              animationDuration: `${Math.random() * 4 + 2}s`,
              animationDelay: `${Math.random() * 2}s`,
            }} />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">
        {/* Back */}
        <Link href="/gcc">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            All Tournaments
          </button>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 0 30px rgba(59,130,246,0.2)" }}>
            {tournament.logoUrl
              ? <img src={tournament.logoUrl} alt="" className="w-10 h-10 object-contain" />
              : <Trophy className="w-8 h-8 text-blue-400" />}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white">{tournament.name}</h1>
            <p className="text-gray-400 text-sm mt-1">Season {tournament.season} · {standings.length || entries.length} teams</p>
          </div>
        </div>

        {/* Status progress */}
        <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
          {STATUS_STEPS.map((step, i) => {
            const isActive = i === stepIdx;
            const isDone = i < stepIdx;
            return (
              <div key={step} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive ? "text-blue-400 bg-blue-500/20 border border-blue-500/50" :
                  isDone ? "text-green-400" : "text-gray-700"
                }`}>
                  <Circle className={`w-2 h-2 fill-current ${isActive ? "text-blue-400" : isDone ? "text-green-400" : "text-gray-800"}`} />
                  {step.charAt(0).toUpperCase() + step.slice(1)}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${isDone ? "bg-green-400/40" : "bg-gray-800"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", width: "fit-content" }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === key ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div className="space-y-8">
            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Teams",            value: standings.length || entries.length },
                { label: "Matchdays Played", value: sortedMatchdays.filter(md => matchdayGroups[md].some((f: any) => f.played)).length },
                { label: "Fixtures Played",  value: `${playedCount}/${leagueFixtures.length}` },
                { label: "Direct Qualifiers",value: tournament.directQualifiers },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-3xl font-black text-white mb-1">{value}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>

            {/* Sub-page nav */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: `/gcc/${id}/draw`,     icon: Layers,    label: "Live Draw",  color: "text-yellow-400", bg: "rgba(234,179,8,0.1)" },
                { href: `/gcc/${id}/standings`, icon: Table2,    label: "Standings",  color: "text-blue-400",   bg: "rgba(59,130,246,0.1)" },
                { href: `/gcc/${id}/fixtures`,  icon: List,      label: "Fixtures",   color: "text-green-400",  bg: "rgba(34,197,94,0.1)" },
                { href: `/gcc/${id}/bracket`,   icon: GitBranch, label: "Bracket",    color: "text-purple-400", bg: "rgba(168,85,247,0.1)" },
              ].map(({ href, icon: Icon, label, color, bg }) => (
                <Link key={href} href={href}>
                  <div className="group rounded-xl p-4 text-center cursor-pointer transition-all hover:scale-105"
                    style={{ background: bg, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                    <span className={`text-sm font-semibold ${color}`}>{label}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Top 5 standings preview */}
            {standings.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <h2 className="text-white font-bold flex items-center gap-2"><Table2 className="w-4 h-4 text-blue-400" /> Standings</h2>
                  <button onClick={() => setTab("standings")} className="text-blue-400 text-sm hover:text-blue-300 transition-colors">View all →</button>
                </div>
                <div className="divide-y divide-white/5">
                  {standings.slice(0, 5).map((s: any) => {
                    const zone = s.zone ?? "eliminated";
                    const zc = ZONE_COLORS[zone] ?? ZONE_COLORS.eliminated;
                    return (
                      <div key={s.teamId} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors"
                        style={{ borderLeft: `3px solid ${zone === "direct" ? "#3b82f6" : zone === "playoff" ? "#f97316" : "transparent"}` }}>
                        <span className={`text-sm font-black w-5 text-center ${zc.text}`}>{s.rank}</span>
                        {s.team?.logoUrl
                          ? <img src={s.team.logoUrl} alt="" className="w-7 h-7 object-contain rounded-full" />
                          : <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400">{s.team?.name?.[0] ?? "?"}</div>}
                        <span className="text-white text-sm font-medium flex-1">{s.team?.name ?? `Team ${s.teamId}`}</span>
                        <span className="text-gray-500 text-xs tabular-nums">{s.played}P</span>
                        <span className="text-gray-500 text-xs tabular-nums ml-1">{s.gf}:{s.ga}</span>
                        <span className="text-white font-black text-sm ml-3 tabular-nums w-8 text-right">{s.pts}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent results */}
            {recentPlayed.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <h2 className="text-white font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Recent Results</h2>
                  <button onClick={() => setTab("matchdays")} className="text-green-400 text-sm hover:text-green-300 transition-colors">All matchdays →</button>
                </div>
                <div className="divide-y divide-white/5">
                  {recentPlayed.map((f: any) => (
                    <FixtureRow key={f.id} fixture={f} showMatchday />
                  ))}
                </div>
              </div>
            )}

            {/* Top Scorers preview */}
            {topScorers.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <h2 className="text-white font-bold flex items-center gap-2"><Crosshair className="w-4 h-4 text-orange-400" /> Top Scorers</h2>
                  <button onClick={() => setTab("scorers")} className="text-orange-400 text-sm hover:text-orange-300 transition-colors">Full list →</button>
                </div>
                <div className="divide-y divide-white/5">
                  {topScorers.slice(0, 5).map((s: any, i: number) => (
                    <ScorerRow key={s.player_id} scorer={s} rank={i + 1} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STANDINGS TAB ── */}
        {tab === "standings" && (
          <div>
            {/* Zone legend */}
            <div className="flex items-center gap-4 mb-5 flex-wrap">
              {[
                { zone: "direct",     color: "bg-blue-500",   text: "text-blue-400",   label: "Direct Qualifier" },
                { zone: "playoff",    color: "bg-orange-500", text: "text-orange-400", label: "Playoff" },
                { zone: "eliminated", color: "bg-gray-700",   text: "text-gray-500",   label: "Eliminated" },
              ].map(({ color, text, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${color}`} />
                  <span className={`text-xs ${text}`}>{label}</span>
                </div>
              ))}
            </div>

            {standingsQuery.isLoading ? (
              <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : standings.length === 0 ? (
              <div className="text-center py-20 text-gray-600">No standings yet. League phase hasn't started.</div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Header */}
                <div className="grid px-4 py-3 text-xs uppercase tracking-widest text-gray-600"
                  style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", gridTemplateColumns: "36px 2fr repeat(7, 1fr)" }}>
                  <span>#</span><span>Club</span>
                  <span className="text-center">P</span><span className="text-center">W</span>
                  <span className="text-center">D</span><span className="text-center">L</span>
                  <span className="text-center">GD</span><span className="text-center">GF</span>
                  <span className="text-center font-bold text-gray-400">Pts</span>
                </div>
                {(() => {
                  let lastZone = "";
                  return standings.map((s: any, idx: number) => {
                    const zone = s.zone ?? "eliminated";
                    const zc = ZONE_COLORS[zone] ?? ZONE_COLORS.eliminated;
                    const showBorder = zone !== lastZone && idx > 0;
                    lastZone = zone;
                    return (
                      <div key={s.teamId}>
                        {showBorder && (
                          <div className="h-px opacity-30" style={{ background: `linear-gradient(90deg, transparent, ${zone === "playoff" ? "#f97316" : "#ef4444"}, transparent)` }} />
                        )}
                        <div className="grid items-center px-4 py-3 hover:bg-white/5 transition-colors"
                          style={{
                            gridTemplateColumns: "36px 2fr repeat(7, 1fr)",
                            borderLeft: `3px solid ${zone === "direct" ? "#3b82f6" : zone === "playoff" ? "#f97316" : "transparent"}`,
                          }}>
                          <span className={`text-sm font-black ${zc.text}`}>{s.rank}</span>
                          <div className="flex items-center gap-2">
                            {s.team?.logoUrl
                              ? <img src={s.team.logoUrl} alt="" className="w-7 h-7 rounded-full object-contain" />
                              : <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400">{s.team?.name?.[0] ?? "?"}</div>}
                            <span className="text-white font-semibold text-sm truncate">{s.team?.name ?? `Team ${s.teamId}`}</span>
                          </div>
                          {[s.played, s.wins, s.draws, s.losses].map((v: number, i: number) => (
                            <span key={i} className="text-center text-gray-400 text-sm tabular-nums">{v}</span>
                          ))}
                          <span className={`text-center text-sm font-semibold tabular-nums ${s.gd > 0 ? "text-green-400" : s.gd < 0 ? "text-red-400" : "text-gray-400"}`}>
                            {s.gd > 0 ? "+" : ""}{s.gd}
                          </span>
                          <span className="text-center text-gray-400 text-sm tabular-nums">{s.gf}</span>
                          <span className="text-center text-white font-black text-sm tabular-nums">{s.pts}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── SCORERS TAB ── */}
        {tab === "scorers" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 mb-4">Goals scored in GCC matches for this tournament only.</p>
            {topScorersQuery.isLoading ? (
              <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : topScorers.length === 0 ? (
              <div className="text-center py-20 text-gray-600">
                <Crosshair className="w-12 h-12 mx-auto mb-3 text-gray-800" />
                <p>No goals recorded yet.</p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Header */}
                <div className="grid px-5 py-3 text-xs uppercase tracking-widest text-gray-600"
                  style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", gridTemplateColumns: "44px 1fr auto auto" }}>
                  <span>#</span>
                  <span>Player</span>
                  <span className="text-center w-16">Goals</span>
                  <span className="text-center w-14">MVP</span>
                </div>
                {topScorers.map((s: any, i: number) => (
                  <ScorerRow key={s.player_id} scorer={s} rank={i + 1} full />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MATCHDAYS TAB ── */}
        {tab === "matchdays" && (
          <div className="space-y-6">
            {leagueFixtures.length === 0 ? (
              <div className="text-center py-20 text-gray-600">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-800" />
                <p>No matchdays yet.</p>
              </div>
            ) : (
              sortedMatchdays.map(md => {
                const mdFixtures = matchdayGroups[md];
                const played = mdFixtures.filter((f: any) => f.played).length;
                return (
                  <div key={md} className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                    {/* Matchday header */}
                    <div className="flex items-center justify-between px-5 py-3"
                      style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-4 h-4 text-blue-400" />
                        <span className="text-white font-bold text-sm">Matchday {md}</span>
                        <span className="text-gray-600 text-xs">{mdFixtures.length} matches</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">{played}/{mdFixtures.length} played</span>
                        <div className="flex gap-1">
                          {mdFixtures.map((_: any, i: number) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < played ? "bg-green-500" : "bg-gray-700"}`} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Fixtures */}
                    <div className="divide-y divide-white/5">
                      {mdFixtures.map((f: any) => (
                        <FixtureRow key={f.id} fixture={f} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScorerRow({ scorer: s, rank, full }: { scorer: any; rank: number; full?: boolean }) {
  const goals = Number(s.total_goals);
  const mvps  = Number(s.total_mvps);
  return (
    <div
      className="grid items-center px-5 py-3 hover:bg-white/5 transition-colors divide-white/5 border-t border-white/5"
      style={{ gridTemplateColumns: "44px 1fr auto auto" }}>
      {/* Rank */}
      <span className={`text-sm font-black tabular-nums ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-orange-400" : "text-gray-600"}`}>
        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
      </span>

      {/* Player info */}
      <div className="flex items-center gap-3 min-w-0">
        {s.image_url
          ? <img src={s.image_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          : <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center text-xs text-orange-400 font-bold flex-shrink-0">
              {s.player_name?.[0] ?? "?"}
            </div>}
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{s.player_name}</p>
          {s.team_name && (
            <div className="flex items-center gap-1 mt-0.5">
              {s.team_logo && <img src={s.team_logo} alt="" className="w-3.5 h-3.5 rounded-full object-contain" />}
              <span className="text-gray-600 text-xs truncate">{s.team_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Goals */}
      <div className="flex items-center justify-center w-16 gap-1">
        <span className="text-white font-black text-lg tabular-nums">{goals}</span>
        <span className="text-gray-600 text-xs">⚽</span>
      </div>

      {/* MVPs */}
      <div className="flex items-center justify-center w-14 gap-1">
        {mvps > 0
          ? <><span className="text-yellow-400 font-bold text-sm tabular-nums">{mvps}</span><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /></>
          : <span className="text-gray-700 text-sm">—</span>}
      </div>
    </div>
  );
}

function FixtureRow({ fixture: f, showMatchday }: { fixture: any; showMatchday?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3"
      style={{ background: f.played ? "rgba(34,197,94,0.03)" : "transparent" }}>
      {/* Home */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <span className={`text-sm font-semibold text-right ${f.played && f.homeScore > f.awayScore ? "text-white" : "text-gray-300"}`}>
          {f.homeTeam?.name ?? `Team ${f.homeTeamId}`}
        </span>
        {f.homeTeam?.logoUrl
          ? <img src={f.homeTeam.logoUrl} alt="" className="w-7 h-7 rounded-full object-contain flex-shrink-0" />
          : <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center text-xs text-blue-400 flex-shrink-0 font-bold">
              {f.homeTeam?.name?.[0] ?? "H"}
            </div>}
      </div>

      {/* Score / status */}
      <div className="flex flex-col items-center min-w-[72px]">
        {showMatchday && f.round != null && (
          <span className="text-[10px] text-gray-700 mb-0.5">MD {f.round}</span>
        )}
        {f.played ? (
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-black tabular-nums ${f.homeScore > f.awayScore ? "text-white" : "text-gray-500"}`}>{f.homeScore}</span>
            <span className="text-gray-600 text-xs">–</span>
            <span className={`text-lg font-black tabular-nums ${f.awayScore > f.homeScore ? "text-white" : "text-gray-500"}`}>{f.awayScore}</span>
          </div>
        ) : (
          <span className="text-gray-600 text-xs font-semibold uppercase tracking-wider">vs</span>
        )}
        {f.played
          ? <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
          : <Clock className="w-3 h-3 text-gray-700 mt-0.5" />}
      </div>

      {/* Away */}
      <div className="flex items-center gap-2 flex-1">
        {f.awayTeam?.logoUrl
          ? <img src={f.awayTeam.logoUrl} alt="" className="w-7 h-7 rounded-full object-contain flex-shrink-0" />
          : <div className="w-7 h-7 rounded-full bg-purple-500/15 flex items-center justify-center text-xs text-purple-400 flex-shrink-0 font-bold">
              {f.awayTeam?.name?.[0] ?? "A"}
            </div>}
        <span className={`text-sm font-semibold ${f.played && f.awayScore > f.homeScore ? "text-white" : "text-gray-300"}`}>
          {f.awayTeam?.name ?? `Team ${f.awayTeamId}`}
        </span>
      </div>
    </div>
  );
}
