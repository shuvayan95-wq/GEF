import { Navbar } from "@/components/layout/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useState } from "react";
import { Swords, Flame, Zap, Star, Trophy, BarChart2, Sparkles, ChevronRight, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlayerListItem {
  id: number; name: string; teamId?: number; teamName?: string;
  position?: string; imageUrl?: string; cardOvr?: number;
}

interface RivalryResult {
  player1: PlayerListItem & { totalGoals: number; totalWins: number; totalGames: number; totalMvps: number; winRate: number };
  player2: PlayerListItem & { totalGoals: number; totalWins: number; totalGames: number; totalMvps: number; winRate: number };
  h2h: { p1Wins: number; p2Wins: number; draws: number; p1Goals: number; p2Goals: number; p1Mvps: number; p2Mvps: number; total: number };
  narrative: {
    title: string; subtitle: string; intro: string;
    p1Chapter: string; p2Chapter: string; clashNarrative: string;
    verdict: string; edgeHolder: string; intensityScore: number;
    tagline1: string; tagline2: string;
  };
}

function PlayerSelector({ players, value, onChange, label, accentClass }: {
  players: PlayerListItem[]; value: number | null;
  onChange: (id: number) => void; label: string; accentClass: string;
}) {
  const selected = players.find(p => p.id === value);
  return (
    <div className="flex-1 min-w-0 space-y-2">
      <label className={cn("text-[10px] font-black uppercase tracking-widest block", accentClass)}>{label}</label>
      <select
        className="w-full bg-card border border-border rounded-xl px-3 py-3 text-sm font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
        value={value ?? ""}
        onChange={e => onChange(parseInt(e.target.value))}
      >
        <option value="">— Pick a player —</option>
        {players.map(p => (
          <option key={p.id} value={p.id}>{p.name} ({p.teamName || "No Team"}, {p.position || "?"})</option>
        ))}
      </select>
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-border"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
            {selected.imageUrl ? (
              <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-black text-primary text-sm">{selected.name[0]}</span>
            )}
          </div>
          <div>
            <div className="text-sm font-bold">{selected.name}</div>
            <div className="text-xs text-muted-foreground">{selected.teamName} · {selected.position} {selected.cardOvr ? `· OVR ${selected.cardOvr}` : ""}</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatBar({ label, v1, v2, higher = "higher" }: { label: string; v1: number; v2: number; higher?: "higher" | "lower" }) {
  const max = Math.max(v1, v2, 1);
  const p1Better = higher === "higher" ? v1 >= v2 : v1 <= v2;
  const p2Better = higher === "higher" ? v2 >= v1 : v2 <= v1;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className={cn("font-bold tabular-nums", p1Better ? "text-sky-400" : "text-muted-foreground")}>{v1}</span>
        <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold">{label}</span>
        <span className={cn("font-bold tabular-nums", p2Better ? "text-rose-400" : "text-muted-foreground")}>{v2}</span>
      </div>
      <div className="flex gap-1 items-center">
        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden flex justify-end">
          <motion.div
            className="h-full rounded-full bg-sky-500"
            initial={{ width: 0 }}
            animate={{ width: `${(v1 / max) * 100}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
        <div className="w-px h-3 bg-border shrink-0" />
        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-rose-500"
            initial={{ width: 0 }}
            animate={{ width: `${(v2 / max) * 100}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

function IntensityMeter({ score }: { score: number }) {
  const color = score >= 8 ? "bg-red-500" : score >= 6 ? "bg-orange-500" : score >= 4 ? "bg-yellow-500" : "bg-sky-500";
  const label = score >= 8 ? "LEGENDARY" : score >= 6 ? "HEATED" : score >= 4 ? "BUILDING" : "EMERGING";
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground uppercase tracking-widest font-semibold">Rivalry Intensity</span>
        <span className="font-black text-foreground">{score}/10 — <span className="text-primary">{label}</span></span>
      </div>
      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          style={{ boxShadow: `0 0 12px currentColor` }}
        />
      </div>
    </div>
  );
}

export function RivalryGenerator() {
  const [p1Id, setP1Id] = useState<number | null>(null);
  const [p2Id, setP2Id] = useState<number | null>(null);
  const [result, setResult] = useState<RivalryResult | null>(null);

  const { data: players = [], isLoading: loadingPlayers } = useQuery<PlayerListItem[]>({
    queryKey: ["players-dropdown"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/players-dropdown"));
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const { mutate: generate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/ai/rivalry"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1Id: p1Id, player2Id: p2Id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Failed");
      }
      return res.json() as Promise<RivalryResult>;
    },
    onSuccess: (data) => setResult(data),
  });

  const canGenerate = p1Id && p2Id && p1Id !== p2Id;
  const nar = result?.narrative;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Masthead */}
      <div className="border-b border-border bg-card/40">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-[10px] font-black uppercase tracking-widest text-red-400">
              <Swords className="w-3 h-3" /> AI-Powered
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-2">Rivalry Generator</h1>
          <p className="text-muted-foreground text-base max-w-xl">
            Pick two players and the AI Oracle will craft an epic rivalry narrative backed by real GEF head-to-head data.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 space-y-10">

        {/* Selector */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
            <PlayerSelector players={players} value={p1Id} onChange={setP1Id} label="Player 1" accentClass="text-sky-400" />
            <div className="flex items-center justify-center shrink-0 pb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Swords className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <PlayerSelector players={players} value={p2Id} onChange={setP2Id} label="Player 2" accentClass="text-rose-400" />
          </div>

          <Button
            className="w-full gap-2 h-12 text-sm font-bold"
            onClick={() => generate()}
            disabled={!canGenerate || isPending || loadingPlayers}
          >
            {isPending ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Crafting the rivalry…</>
            ) : (
              <><Flame className="w-4 h-4" /> Generate Rivalry Breakdown</>
            )}
          </Button>
          {p1Id === p2Id && p1Id !== null && (
            <p className="text-xs text-red-400 text-center">Pick two different players.</p>
          )}
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && nar && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Epic title banner */}
              <div className="relative rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/20 via-card to-card overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08),transparent_70%)]" />
                <div className="relative p-8 text-center space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">GEF Oracle Rivalry Report</div>
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground"
                    style={{ textShadow: "0 0 40px rgba(239,68,68,0.3)" }}>
                    {nar.title}
                  </h2>
                  <p className="text-muted-foreground text-base italic">{nar.subtitle}</p>
                  <div className="flex justify-center gap-6 pt-2">
                    <span className="text-sky-400 text-sm font-black uppercase">"{nar.tagline1}"</span>
                    <span className="text-red-400 opacity-50">vs</span>
                    <span className="text-rose-400 text-sm font-black uppercase">"{nar.tagline2}"</span>
                  </div>
                </div>
              </div>

              {/* Players side by side */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* P1 */}
                <div className="bg-card border border-sky-500/25 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-sky-500/10 border-2 border-sky-500/30 flex items-center justify-center overflow-hidden">
                      {result.player1.imageUrl ? <img src={result.player1.imageUrl} className="w-full h-full object-cover" /> : <span className="font-black text-sky-400 text-xl">{result.player1.name[0]}</span>}
                    </div>
                    <div>
                      <div className="font-black text-lg text-foreground">{result.player1.name}</div>
                      <div className="text-xs text-sky-400 font-semibold">{result.player1.teamName} · {result.player1.position}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{nar.p1Chapter}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["Games", result.player1.totalGames],
                      ["Goals", result.player1.totalGoals],
                      ["MVPs", result.player1.totalMvps],
                    ].map(([l, v]) => (
                      <div key={l as string} className="text-center bg-white/5 rounded-lg p-2">
                        <div className="text-xl font-black text-sky-400">{v}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* P2 */}
                <div className="bg-card border border-rose-500/25 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center overflow-hidden">
                      {result.player2.imageUrl ? <img src={result.player2.imageUrl} className="w-full h-full object-cover" /> : <span className="font-black text-rose-400 text-xl">{result.player2.name[0]}</span>}
                    </div>
                    <div>
                      <div className="font-black text-lg text-foreground">{result.player2.name}</div>
                      <div className="text-xs text-rose-400 font-semibold">{result.player2.teamName} · {result.player2.position}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{nar.p2Chapter}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["Games", result.player2.totalGames],
                      ["Goals", result.player2.totalGoals],
                      ["MVPs", result.player2.totalMvps],
                    ].map(([l, v]) => (
                      <div key={l as string} className="text-center bg-white/5 rounded-lg p-2">
                        <div className="text-xl font-black text-rose-400">{v}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* H2H Stats */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-black uppercase tracking-widest">Head-to-Head Breakdown</span>
                  <span className="ml-auto text-xs text-muted-foreground">{result.h2h.total} clashes</span>
                </div>
                <StatBar label="Wins" v1={result.h2h.p1Wins} v2={result.h2h.p2Wins} />
                <StatBar label="Goals" v1={result.h2h.p1Goals} v2={result.h2h.p2Goals} />
                <StatBar label="MVPs" v1={result.h2h.p1Mvps} v2={result.h2h.p2Mvps} />
                <StatBar label="Win Rate %" v1={result.player1.winRate} v2={result.player2.winRate} />
                <div className="pt-2">
                  <IntensityMeter score={nar.intensityScore} />
                </div>
              </div>

              {/* Narrative sections */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-primary uppercase tracking-widest font-black">
                    <Swords className="w-3 h-3" /> The Clash
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{nar.clashNarrative}</p>
                </div>
                <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-primary uppercase tracking-widest font-black">
                    <Zap className="w-3 h-3" /> The Verdict
                  </div>
                  <p className="text-sm text-foreground leading-relaxed font-medium">{nar.verdict}</p>
                  {nar.edgeHolder && nar.edgeHolder !== "EVEN" && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">Edge holder:</span>
                      <span className="text-xs font-black text-primary">{nar.edgeHolder}</span>
                    </div>
                  )}
                  {nar.edgeHolder === "EVEN" && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                      <span className="text-xs text-yellow-400 font-black">⚖️ Too close to call</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Intro narrative */}
              <div className="bg-gradient-to-r from-red-950/10 via-card to-card border border-border rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-base text-foreground/90 leading-relaxed font-medium italic">{nar.intro}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
