import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Trophy, Layers, List, Table2, GitBranch, ArrowLeft, Circle } from "lucide-react";

const STATUS_STEPS = ["setup", "draw", "league", "playoffs", "knockout", "complete"];

export function GCCTournament() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["gcc-tournament", id],
    queryFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}`);
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    refetchInterval: 10_000,
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

  const { tournament, entries, standings } = data;
  const stepIdx = STATUS_STEPS.indexOf(tournament.status);
  const leagueFixtures = data.fixtures?.filter((f: any) => f.stage === "league") ?? [];
  const playedCount = leagueFixtures.filter((f: any) => f.played).length;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #030712 0%, #0a0f1e 50%, #030712 100%)" }}>
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
        {/* Back */}
        <Link href="/gcc">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            All Tournaments
          </button>
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 0 30px rgba(59,130,246,0.2)" }}>
              {tournament.logoUrl
                ? <img src={tournament.logoUrl} alt="" className="w-10 h-10 object-contain" />
                : <Trophy className="w-8 h-8 text-blue-400" />}
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">{tournament.name}</h1>
              <p className="text-gray-400">Season {tournament.season} · {standings.length || entries.length} teams</p>
            </div>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-0 mt-6 overflow-x-auto pb-2">
            {STATUS_STEPS.map((step, i) => {
              const isActive = i === stepIdx;
              const isDone = i < stepIdx;
              return (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive ? "text-blue-400 bg-blue-500/20 border border-blue-500/50" :
                    isDone ? "text-green-400" : "text-gray-600"
                  }`}>
                    <Circle className={`w-2 h-2 fill-current ${isActive ? "text-blue-400" : isDone ? "text-green-400" : "text-gray-700"}`} />
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`w-6 h-px mx-1 ${isDone ? "bg-green-400/50" : "bg-gray-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Nav tabs for sub-pages */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { href: `/gcc/${id}/draw`,      icon: Layers,    label: "Live Draw",  color: "text-yellow-400", bg: "rgba(234,179,8,0.1)" },
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

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Teams", value: standings.length || entries.length },
            { label: "Pots", value: tournament.numPots },
            { label: "Fixtures Played", value: `${playedCount}/${leagueFixtures.length}` },
            { label: "Direct Qualifiers", value: tournament.directQualifiers },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-3xl font-black text-white mb-1">{value}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        {/* Top 5 standings preview */}
        {standings && standings.length > 0 && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="text-white font-bold text-lg">Current Standings</h2>
              <Link href={`/gcc/${id}/standings`}>
                <span className="text-blue-400 text-sm hover:text-blue-300 transition-colors">View all →</span>
              </Link>
            </div>
            <div className="p-4">
              {standings.slice(0, 5).map((s: any) => (
                <div key={s.teamId} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                  <span className={`text-sm font-bold w-6 text-center ${
                    s.zone === "direct" ? "text-blue-400" :
                    s.zone === "playoff" ? "text-orange-400" : "text-gray-500"
                  }`}>{s.rank}</span>
                  {s.team?.logoUrl
                    ? <img src={s.team.logoUrl} alt="" className="w-7 h-7 object-contain rounded-full" />
                    : <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400">
                        {s.team?.name?.[0] ?? "?"}
                      </div>}
                  <span className="text-white text-sm font-medium flex-1">{s.team?.name ?? `Team ${s.teamId}`}</span>
                  <span className="text-gray-400 text-xs">{s.played}G</span>
                  <span className="text-white font-bold text-sm ml-2">{s.pts}pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
