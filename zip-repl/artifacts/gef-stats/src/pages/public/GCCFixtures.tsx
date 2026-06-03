import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Calendar, CheckCircle, Clock } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  league: "League Phase",
  playoff: "Playoff Round",
  r16: "Round of 16",
  qf: "Quarter-Finals",
  sf: "Semi-Finals",
  final: "Final",
};

export function GCCFixtures() {
  const { id } = useParams<{ id: string }>();
  const [selectedStage, setSelectedStage] = useState<string>("league");

  const { data, isLoading } = useQuery({
    queryKey: ["gcc-fixtures", id],
    queryFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}/fixtures`);
      return r.json();
    },
    refetchInterval: 15_000,
  });

  const tData = useQuery({
    queryKey: ["gcc-tournament", id],
    queryFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}`);
      return r.json();
    },
  });

  const allFixtures: any[] = data?.fixtures ?? [];
  const tournament = tData.data?.tournament;

  // Available stages
  const stages = [...new Set(allFixtures.map((f: any) => f.stage))];

  const filtered = allFixtures.filter((f: any) => f.stage === selectedStage);

  // Group by round
  const byRound = new Map<number, any[]>();
  for (const f of filtered) {
    if (!byRound.has(f.round)) byRound.set(f.round, []);
    byRound.get(f.round)!.push(f);
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b);

  const playedCount = filtered.filter((f: any) => f.played).length;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #030712 0%, #0a0f1e 50%, #030712 100%)" }}>
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <Link href={`/gcc/${id}`}>
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-green-400" />
          <div>
            <h1 className="text-3xl font-black text-white">Fixtures</h1>
            {tournament && <p className="text-gray-500 text-sm">{tournament.name} · Season {tournament.season}</p>}
          </div>
        </div>

        {/* Stage tabs */}
        {stages.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {stages.map((stage: string) => (
              <button
                key={stage}
                onClick={() => setSelectedStage(stage)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedStage === stage ? "text-white" : "text-gray-500 hover:text-gray-300"
                }`}
                style={{
                  background: selectedStage === stage ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
                  border: selectedStage === stage ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                {STAGE_LABELS[stage] ?? stage}
              </button>
            ))}
          </div>
        )}

        {/* Stats bar */}
        {filtered.length > 0 && (
          <div className="flex gap-4 mb-6 text-sm text-gray-400">
            <span>{filtered.length} fixtures</span>
            <span>·</span>
            <span className="text-green-400">{playedCount} played</span>
            <span>·</span>
            <span>{filtered.length - playedCount} remaining</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rounds.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            No fixtures for this stage yet.
          </div>
        ) : (
          <div className="space-y-6">
            {rounds.map(round => (
              <div key={round}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold">
                    {selectedStage === "league" ? `Matchday ${round}` : `Leg ${round}`}
                  </h3>
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-gray-700 text-xs">{byRound.get(round)?.length} matches</span>
                </div>

                <div className="space-y-2">
                  {(byRound.get(round) ?? []).map((f: any) => (
                    <FixtureCard key={f.id} fixture={f} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FixtureCard({ fixture: f }: { fixture: any }) {
  return (
    <div className="rounded-xl px-4 py-3 transition-all hover:scale-[1.01]"
      style={{
        background: f.played ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.04)",
        border: f.played ? "1px solid rgba(34,197,94,0.15)" : "1px solid rgba(255,255,255,0.07)",
      }}>
      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-white font-semibold text-sm text-right">{f.homeTeam?.name ?? `Team ${f.homeTeamId}`}</span>
          {f.homeTeam?.logoUrl
            ? <img src={f.homeTeam.logoUrl} alt="" className="w-7 h-7 rounded-full object-contain flex-shrink-0" />
            : <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 flex-shrink-0">
                {f.homeTeam?.name?.[0] ?? "H"}
              </div>}
        </div>

        {/* Score / vs */}
        <div className="flex flex-col items-center flex-shrink-0 min-w-[80px]">
          {f.played ? (
            <div className="flex items-center gap-2">
              <span className={`text-xl font-black ${f.homeScore > f.awayScore ? "text-white" : "text-gray-500"}`}>{f.homeScore}</span>
              <span className="text-gray-600 text-sm">-</span>
              <span className={`text-xl font-black ${f.awayScore > f.homeScore ? "text-white" : "text-gray-500"}`}>{f.awayScore}</span>
            </div>
          ) : (
            <span className="text-gray-500 text-sm font-bold">vs</span>
          )}
          {f.leg > 1 && <span className="text-xs text-gray-600">Leg {f.leg}</span>}
          {f.played
            ? <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
            : <Clock className="w-3 h-3 text-gray-700 mt-0.5" />}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 flex-1">
          {f.awayTeam?.logoUrl
            ? <img src={f.awayTeam.logoUrl} alt="" className="w-7 h-7 rounded-full object-contain flex-shrink-0" />
            : <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-400 flex-shrink-0">
                {f.awayTeam?.name?.[0] ?? "A"}
              </div>}
          <span className="text-white font-semibold text-sm">{f.awayTeam?.name ?? `Team ${f.awayTeamId}`}</span>
        </div>
      </div>
    </div>
  );
}
