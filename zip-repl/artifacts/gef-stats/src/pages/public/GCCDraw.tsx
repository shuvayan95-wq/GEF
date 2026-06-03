import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Trophy, ArrowLeft, Zap, Eye, ChevronRight, Star } from "lucide-react";
import { useAppAuth } from "@/hooks/use-app-auth";

const POT_COLORS = [
  { border: "rgba(255,215,0,0.5)",  glow: "rgba(255,215,0,0.2)",  text: "text-yellow-400",  bg: "rgba(255,215,0,0.1)" },
  { border: "rgba(192,192,192,0.5)",glow: "rgba(192,192,192,0.2)",text: "text-gray-300",     bg: "rgba(192,192,192,0.08)" },
  { border: "rgba(205,127,50,0.5)", glow: "rgba(205,127,50,0.2)", text: "text-orange-400",  bg: "rgba(205,127,50,0.1)" },
  { border: "rgba(59,130,246,0.5)", glow: "rgba(59,130,246,0.2)", text: "text-blue-400",    bg: "rgba(59,130,246,0.1)" },
];

export function GCCDraw() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAppAuth();
  const qc = useQueryClient();
  const [lastRevealedIdx, setLastRevealedIdx] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gcc-tournament", id],
    queryFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}`);
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    refetchInterval: 3000,
  });

  const revealMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}/draw/reveal`, { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (result) => {
      setLastRevealedIdx((result.revealed ?? 1) - 1);
      qc.invalidateQueries({ queryKey: ["gcc-tournament", id] });
    },
  });

  const revealAllMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}/draw/reveal-all`, { method: "POST" });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcc-tournament", id] }),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${id}/draw/complete`, { method: "POST" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcc-tournament", id] }),
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#030712" }}>
      <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { tournament, entries } = data ?? {};
  const drawState = (tournament?.drawState as any) ?? {};
  const pairs: { homeTeamId: number; awayTeamId: number }[] = drawState.pairs ?? [];
  const revealed: number = drawState.revealed ?? 0;
  const drawComplete = drawState.complete ?? false;
  const revealedPairs = pairs.slice(0, revealed);

  // Group entries by pot
  const byPot = new Map<number, any[]>();
  for (const e of (entries ?? [])) {
    if (!byPot.has(e.pot)) byPot.set(e.pot, []);
    byPot.get(e.pot)!.push(e);
  }
  const pots = [...byPot.keys()].sort();

  const teamById = new Map((entries ?? []).map((e: any) => [e.teamId, e.team]));

  const canReveal = isAuthenticated && tournament?.status === "draw" && revealed < pairs.length;
  const canComplete = isAuthenticated && tournament?.status === "draw" && drawComplete;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #030712 0%, #0a0f1e 50%, #030712 100%)" }}>
      {/* Stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(60)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
              top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
            }} />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-7xl">
        <Link href={`/gcc/${id}`}>
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Tournament
          </button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <h1 className="text-4xl font-black text-white" style={{ textShadow: "0 0 30px rgba(59,130,246,0.5)" }}>
              Live Draw
            </h1>
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          </div>
          <p className="text-gray-400">{tournament?.name} · Season {tournament?.season}</p>

          {tournament?.status === "draw" && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm"
              style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.4)" }}>
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-yellow-400 font-semibold">
                {drawComplete ? "Draw Complete" : `Drawing live · ${revealed}/${pairs.length} revealed`}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Pots */}
          <div>
            <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-4 font-semibold">The Pots</h2>
            <div className="grid grid-cols-2 gap-3">
              {pots.map(pot => {
                const potTeams = byPot.get(pot) ?? [];
                const cfg = POT_COLORS[(pot - 1) % POT_COLORS.length];
                return (
                  <div key={pot} className="rounded-xl p-4 transition-all"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, boxShadow: `0 0 20px ${cfg.glow}` }}>
                    <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${cfg.text}`}>
                      Pot {pot}
                    </div>
                    <div className="space-y-2">
                      {potTeams.map((e: any) => {
                        const drawn = revealedPairs.some(p => p.homeTeamId === e.teamId || p.awayTeamId === e.teamId);
                        return (
                          <div key={e.id} className={`flex items-center gap-2 py-1 transition-all ${drawn ? "opacity-40" : "opacity-100"}`}>
                            {e.team?.logoUrl
                              ? <img src={e.team.logoUrl} alt="" className="w-6 h-6 rounded-full object-contain" />
                              : <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${cfg.text}`}
                                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                  {e.team?.name?.[0] ?? "?"}
                                </div>}
                            <span className="text-white text-sm font-medium">{e.team?.name ?? `Team ${e.teamId}`}</span>
                            {drawn && <span className={`ml-auto text-xs ${cfg.text}`}>✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Admin controls */}
            {isAuthenticated && tournament?.status === "draw" && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => revealMutation.mutate()}
                  disabled={!canReveal || revealMutation.isPending}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: canReveal ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "rgba(255,255,255,0.05)",
                    color: "white",
                    boxShadow: canReveal ? "0 0 30px rgba(59,130,246,0.4)" : "none",
                  }}>
                  {revealMutation.isPending ? "Drawing..." : revealed === 0 ? "⚽ Draw First Match" : `⚽ Draw Next (${pairs.length - revealed} left)`}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => revealAllMutation.mutate()}
                    disabled={revealed >= pairs.length || revealAllMutation.isPending}
                    className="py-3 rounded-xl text-sm font-semibold text-gray-300 transition-all disabled:opacity-30"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    Reveal All
                  </button>
                  <button
                    onClick={() => completeMutation.mutate()}
                    disabled={!canComplete || completeMutation.isPending}
                    className="py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                    style={{
                      background: canComplete ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,255,255,0.06)",
                      color: canComplete ? "white" : "rgba(255,255,255,0.3)",
                      border: canComplete ? "none" : "1px solid rgba(255,255,255,0.1)",
                    }}>
                    {completeMutation.isPending ? "Generating..." : "Generate Fixtures"}
                  </button>
                </div>
                {completeMutation.isError && (
                  <p className="text-red-400 text-sm text-center">{(completeMutation.error as Error).message}</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Drawn Pairs */}
          <div>
            <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-4 font-semibold">
              Drawn Matchups ({revealedPairs.length} / {pairs.length})
            </h2>

            {revealedPairs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <Eye className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-gray-600">Waiting for draw to begin...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {revealedPairs.map((pair, idx) => {
                  const home = teamById.get(pair.homeTeamId);
                  const away = teamById.get(pair.awayTeamId);
                  const isNew = idx === lastRevealedIdx;
                  return (
                    <div key={idx}
                      className={`flex items-center gap-3 p-4 rounded-xl transition-all ${isNew ? "scale-105" : ""}`}
                      style={{
                        background: isNew ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                        border: isNew ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.06)",
                        boxShadow: isNew ? "0 0 20px rgba(59,130,246,0.3)" : "none",
                        animation: isNew ? "none" : undefined,
                      }}>
                      <span className="text-gray-600 text-xs w-5 text-center">{idx + 1}</span>

                      {/* Home */}
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-white text-sm font-semibold text-right">{home?.name ?? `Team ${pair.homeTeamId}`}</span>
                        {home?.logoUrl
                          ? <img src={home.logoUrl} alt="" className="w-7 h-7 rounded-full object-contain flex-shrink-0" />
                          : <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 flex-shrink-0">
                              {home?.name?.[0] ?? "?"}
                            </div>}
                      </div>

                      <div className="text-blue-400 font-black text-sm px-2 flex-shrink-0">vs</div>

                      {/* Away */}
                      <div className="flex items-center gap-2 flex-1">
                        {away?.logoUrl
                          ? <img src={away.logoUrl} alt="" className="w-7 h-7 rounded-full object-contain flex-shrink-0" />
                          : <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-400 flex-shrink-0">
                              {away?.name?.[0] ?? "?"}
                            </div>}
                        <span className="text-white text-sm font-semibold">{away?.name ?? `Team ${pair.awayTeamId}`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
