import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, GitBranch, Trophy } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  playoff: "Playoff Round",
  r16: "Round of 16",
  qf: "Quarter-Finals",
  sf: "Semi-Finals",
  final: "Final",
};

export function GCCBracket() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["gcc-tournament", id],
    queryFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}`);
      return r.json();
    },
    refetchInterval: 15_000,
  });

  const bracket = data?.bracket ?? {};
  const tournament = data?.tournament;
  const stages = Object.keys(bracket).filter(s => bracket[s]?.length > 0);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #030712 0%, #0a0f1e 50%, #030712 100%)" }}>
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
        <Link href={`/gcc/${id}`}>
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <GitBranch className="w-6 h-6 text-purple-400" />
          <div>
            <h1 className="text-3xl font-black text-white">Knockout Bracket</h1>
            {tournament && <p className="text-gray-500 text-sm">{tournament.name} · Season {tournament.season}</p>}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stages.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-800" />
            <p>Knockout bracket will appear here once the knockout stage begins.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-8">
            <div className="flex gap-8 min-w-max">
              {["playoff", "r16", "qf", "sf", "final"].filter(s => stages.includes(s)).map(stage => (
                <div key={stage} className="flex flex-col gap-4 min-w-[260px]">
                  {/* Stage header */}
                  <div className="text-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
                      {STAGE_LABELS[stage] ?? stage}
                    </span>
                  </div>

                  {/* Ties */}
                  <div className="flex flex-col gap-6">
                    {bracket[stage]?.map((tie: any) => (
                      <TieCard key={tie.pairKey} tie={tie} isFinal={stage === "final"} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamRow({ team, score, agg, isWinner, isHome }: {
  team: any; score: number | null; agg: number; isWinner: boolean; isHome: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
      isWinner ? "bg-white/10" : ""
    }`}>
      {team?.logoUrl
        ? <img src={team.logoUrl} alt="" className="w-6 h-6 rounded-full object-contain flex-shrink-0" />
        : <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
            {team?.name?.[0] ?? (isHome ? "H" : "A")}
          </div>}
      <span className={`text-sm font-semibold flex-1 ${isWinner ? "text-white" : "text-gray-400"}`}>
        {team?.name ?? (isHome ? "TBD" : "TBD")}
      </span>
      <span className={`text-lg font-black ${isWinner ? "text-white" : "text-gray-600"}`}>{agg}</span>
      {isWinner && <Trophy className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
    </div>
  );
}

function TieCard({ tie, isFinal }: { tie: any; isFinal: boolean }) {
  const homeTeam = tie.leg1?.homeTeam;
  const awayTeam = tie.leg1?.awayTeam;

  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        background: tie.complete ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.04)",
        border: tie.complete ? "1px solid rgba(168,85,247,0.3)" : "1px solid rgba(255,255,255,0.07)",
        boxShadow: tie.complete ? "0 0 20px rgba(168,85,247,0.15)" : "none",
      }}>
      {/* Leg scores header */}
      {!isFinal && tie.leg1 && (
        <div className="flex justify-between px-3 py-1 text-xs text-gray-600"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span>Leg 1: {tie.leg1.played ? `${tie.leg1.homeScore}-${tie.leg1.awayScore}` : "—"}</span>
          <span>Leg 2: {tie.leg2?.played ? `${tie.leg2.homeScore}-${tie.leg2.awayScore}` : "—"}</span>
        </div>
      )}

      <div className="p-1">
        <TeamRow
          team={homeTeam}
          score={tie.leg1?.homeScore}
          agg={tie.agg1}
          isWinner={tie.winner === tie.homeTeamId}
          isHome
        />
        <div className="h-px mx-3 bg-white/5" />
        <TeamRow
          team={awayTeam}
          score={tie.leg1?.awayScore}
          agg={tie.agg2}
          isWinner={tie.winner === tie.awayTeamId}
          isHome={false}
        />
      </div>
    </div>
  );
}
