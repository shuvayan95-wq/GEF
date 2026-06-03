import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, Star, Zap, ChevronRight, Globe } from "lucide-react";
import { useState } from "react";

const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  setup:    { label: "Setting Up",    color: "text-gray-400",   glow: "shadow-gray-500/20" },
  draw:     { label: "Draw Phase",    color: "text-yellow-400", glow: "shadow-yellow-500/30" },
  league:   { label: "League Phase",  color: "text-blue-400",   glow: "shadow-blue-500/30" },
  playoffs: { label: "Playoffs",      color: "text-orange-400", glow: "shadow-orange-500/30" },
  knockout: { label: "Knockout Stage",color: "text-purple-400", glow: "shadow-purple-500/30" },
  complete: { label: "Completed",     color: "text-green-400",  glow: "shadow-green-500/30" },
};

export function GCCHub() {
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gcc-tournaments"],
    queryFn: async () => {
      const r = await fetch("/api/gcc/tournaments");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const allTournaments: any[] = data?.tournaments ?? [];
  const seasons = [...new Set(allTournaments.map((t: any) => t.season))].sort().reverse();
  const activeSeason = selectedSeason ?? seasons[0] ?? null;
  const tournaments = activeSeason
    ? allTournaments.filter((t: any) => t.season === activeSeason)
    : allTournaments;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #030712 0%, #0a0f1e 50%, #030712 100%)" }}>
      {/* Stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(80)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.1,
              animationDuration: `${Math.random() * 3 + 2}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)", boxShadow: "0 0 60px rgba(59,130,246,0.4)" }}>
            <Trophy className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight"
            style={{ textShadow: "0 0 40px rgba(59,130,246,0.5)" }}>
            GEF Champions Cup
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            The premier eFootball cup competition — Swiss format, live draw, knockout drama.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
        </div>

        {/* Season Filter */}
        {seasons.length > 1 && (
          <div className="flex flex-wrap justify-center gap-3 mb-10 -mt-6">
            {seasons.map((s: string) => (
              <button
                key={s}
                onClick={() => setSelectedSeason(s === activeSeason ? null : s)}
                className={`px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                  s === activeSeason
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/40"
                    : "border border-white/15 text-gray-400 hover:border-blue-500/50 hover:text-blue-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Tournament List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No tournaments yet.</p>
            <p className="text-gray-600 text-sm mt-2">Admins can create one from the admin panel.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t: any) => {
              const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.setup;
              return (
                <Link key={t.id} href={`/gcc/${t.id}`}>
                  <div className="group relative rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: `0 0 0 1px rgba(59,130,246,0.1), 0 20px 60px -10px rgba(0,0,0,0.5)`,
                    }}>
                    {/* Glow accent */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: "radial-gradient(600px circle at 50% 0%, rgba(59,130,246,0.1), transparent 70%)" }} />

                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
                          {t.logoUrl
                            ? <img src={t.logoUrl} alt="" className="w-8 h-8 object-contain" />
                            : <Trophy className="w-6 h-6 text-blue-400" />}
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.color}`}
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid currentColor", opacity: 0.9 }}>
                          {cfg.label}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-1">{t.name}</h3>
                      <p className="text-gray-500 text-sm mb-4">Season {t.season}</p>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{t.numPots} pots · {t.directQualifiers} direct</span>
                        <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
