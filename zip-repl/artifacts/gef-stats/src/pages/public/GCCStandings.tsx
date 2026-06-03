import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, TrendingUp } from "lucide-react";

const ZONE_CONFIG = {
  direct:    { label: "UCL R16",   bar: "bg-blue-500",   text: "text-blue-400",   bg: "rgba(59,130,246,0.08)" },
  playoff:   { label: "Playoff",   bar: "bg-orange-500", text: "text-orange-400", bg: "rgba(249,115,22,0.08)" },
  eliminated:{ label: "Out",       bar: "bg-red-900",    text: "text-red-500",    bg: "rgba(239,68,68,0.04)" },
};

export function GCCStandings() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["gcc-standings", id],
    queryFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}/standings`);
      if (!r.ok) throw new Error("Failed");
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

  const standings: any[] = data?.standings ?? [];
  const tournament = tData.data?.tournament;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #030712 0%, #0a0f1e 50%, #030712 100%)" }}>
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <Link href={`/gcc/${id}`}>
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-6 h-6 text-blue-400" />
          <div>
            <h1 className="text-3xl font-black text-white">League Standings</h1>
            {tournament && <p className="text-gray-500 text-sm">{tournament.name} · Season {tournament.season}</p>}
          </div>
        </div>

        {/* Zone legend */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          {Object.entries(ZONE_CONFIG).map(([zone, cfg]) => (
            <div key={zone} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm ${cfg.bar}`} />
              <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : standings.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            No standings yet. League phase has not started.
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Header row */}
            <div className="grid gap-0 px-4 py-3 text-xs uppercase tracking-widest text-gray-600"
              style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)",
                gridTemplateColumns: "36px 2fr repeat(7, 1fr)" }}>
              <span>#</span>
              <span>Club</span>
              <span className="text-center">P</span>
              <span className="text-center">W</span>
              <span className="text-center">D</span>
              <span className="text-center">L</span>
              <span className="text-center">GD</span>
              <span className="text-center">GF</span>
              <span className="text-center font-bold text-gray-400">Pts</span>
            </div>

            {/* Zone separator tracking */}
            {(() => {
              let lastZone = "";
              return standings.map((s: any, idx: number) => {
                const zone = s.zone ?? "eliminated";
                const cfg = ZONE_CONFIG[zone as keyof typeof ZONE_CONFIG] ?? ZONE_CONFIG.eliminated;
                const showZoneBorder = zone !== lastZone && idx > 0;
                lastZone = zone;

                return (
                  <div key={s.teamId}>
                    {showZoneBorder && (
                      <div className="h-px opacity-40" style={{ background: `linear-gradient(90deg, transparent, ${zone === "playoff" ? "#f97316" : "#ef4444"}, transparent)` }} />
                    )}
                    <div
                      className="grid items-center px-4 py-3 transition-colors hover:bg-white/5"
                      style={{
                        gridTemplateColumns: "36px 2fr repeat(7, 1fr)",
                        background: s.zone === "direct" ? "rgba(59,130,246,0.05)" : "transparent",
                        borderLeft: `3px solid ${zone === "direct" ? "#3b82f6" : zone === "playoff" ? "#f97316" : "transparent"}`,
                      }}>
                      <span className={`text-sm font-bold ${cfg.text}`}>{s.rank}</span>

                      <div className="flex items-center gap-2">
                        {s.team?.logoUrl
                          ? <img src={s.team.logoUrl} alt="" className="w-7 h-7 rounded-full object-contain" />
                          : <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400">
                              {s.team?.name?.[0] ?? "?"}
                            </div>}
                        <span className="text-white font-semibold text-sm truncate">{s.team?.name ?? `Team ${s.teamId}`}</span>
                      </div>

                      {[s.played, s.wins, s.draws, s.losses].map((v, i) => (
                        <span key={i} className="text-center text-gray-400 text-sm">{v}</span>
                      ))}
                      <span className={`text-center text-sm font-semibold ${s.gd > 0 ? "text-green-400" : s.gd < 0 ? "text-red-400" : "text-gray-400"}`}>
                        {s.gd > 0 ? "+" : ""}{s.gd}
                      </span>
                      <span className="text-center text-gray-400 text-sm">{s.gf}</span>
                      <span className="text-center text-white font-black text-sm">{s.pts}</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
