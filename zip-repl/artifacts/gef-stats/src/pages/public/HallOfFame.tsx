import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { getApiUrl } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Calendar, Users, Star, Lock, GitCompare, Award, ChevronDown, ChevronUp } from "lucide-react";
import gefTrophy from "@/assets/gef-trophy.png";
import { useState } from "react";

interface HofAward {
  emoji?: string;
  title: string;
  playerName: string;
  teamName?: string;
}

interface HallEntry {
  id: number;
  season: string;
  winner: any;
  revealed: boolean;
  totalCandidates: number;
  calculatedAt: string;
  notes: string | null;
  hofAwards: HofAward[];
}

function fmt(n: number) {
  return typeof n === "number" ? n.toFixed(1) : "—";
}

function statWinner(a: number | null, b: number | null): "a" | "b" | "tie" {
  if (a == null && b == null) return "tie";
  if (a == null) return "b";
  if (b == null) return "a";
  if (a > b) return "a";
  if (b > a) return "b";
  return "tie";
}

function WinnerCard({ entry, index, onCompare, inCompare }: {
  entry: HallEntry; index: number;
  onCompare?: () => void; inCompare?: boolean;
}) {
  if (!entry.revealed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.06, type: "spring", stiffness: 120, damping: 16 }}
        className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#0d0d0d] via-[#080808] to-[#050505] group"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="p-6 sm:p-7 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-5 bg-[#111] border border-white/8 rounded-full px-4 py-1.5">
            <Calendar className="w-3 h-3 text-white/30" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">Season {entry.season}</span>
          </div>
          <div className="relative mb-5">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-[3px] border-white/10 bg-white/3 flex items-center justify-center">
              <Lock className="w-10 h-10 text-white/15" />
            </div>
          </div>
          <h3 className="font-black text-white/20 uppercase tracking-widest text-sm mb-1">Winner Sealed</h3>
          <p className="text-white/12 text-[10px] uppercase tracking-[0.3em]">Ceremony Pending</p>
          <div className="w-16 h-px my-4" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />
          <div className="grid grid-cols-3 gap-2 w-full">
            {["—", "—", "—"].map((v, i) => (
              <div key={i} className="bg-black/30 border border-white/5 rounded-xl py-2">
                <div className="text-white/15 font-black text-base">—</div>
                <div className="text-[9px] text-white/15 uppercase tracking-wider mt-0.5">{["Goals", "MVPs", "W%"][i]}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/6 to-transparent" />
      </motion.div>
    );
  }

  const w = entry.winner;
  if (!w) return null;

  const name: string = w.name ?? w.playerName ?? "Unknown";
  const team: string = w.team ?? w.teamName ?? "—";
  const image: string | null = w.image ?? w.imageUrl ?? null;
  const points: number | null = w.points ?? w.finalScore ?? w.score ?? null;
  const stats = w.stats ?? {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 120, damping: 16 }}
      className={`relative rounded-3xl overflow-hidden border bg-gradient-to-b from-[#1a1200] via-[#0e0900] to-[#080600] shadow-[0_0_50px_rgba(212,175,55,0.08)] group hover:border-[#d4af37]/70 hover:shadow-[0_0_70px_rgba(212,175,55,0.18)] transition-all duration-300 ${inCompare ? "border-[#d4af37]/80 shadow-[0_0_60px_rgba(212,175,55,0.2)]" : "border-[#d4af37]/40"}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)", transform: "translate(20%, -20%)" }} />

      <div className="p-6 sm:p-7 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-5 bg-[#1a1000] border border-[#d4af37]/25 rounded-full px-4 py-1.5">
          <Calendar className="w-3 h-3 text-[#d4af37]/50" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/70 font-bold">Season {entry.season}</span>
        </div>

        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.45) 0%, transparent 70%)", filter: "blur(16px)", transform: "scale(1.7)", zIndex: 0 }} />
          <div
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-[3px] border-[#d4af37]/65"
            style={{ boxShadow: "0 0 0 3px rgba(212,175,55,0.12), 0 0 40px rgba(212,175,55,0.4)", zIndex: 1 }}
          >
            {image ? (
              <img src={image} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#2a1800] flex items-center justify-center text-[#d4af37] text-4xl font-black">
                {name[0]}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#1a1000] border border-[#d4af37]/50 flex items-center justify-center z-10">
            <span className="text-sm">🏆</span>
          </div>
        </div>

        <h3 className="font-black text-white leading-tight mb-1" style={{ fontSize: "clamp(1rem, 2.5vw, 1.35rem)", textShadow: "0 0 30px rgba(212,175,55,0.3)" }}>{name}</h3>
        <p className="text-[#d4af37]/60 text-xs uppercase tracking-wider mb-1 font-semibold">{team}</p>
        {w.position && <p className="text-white/25 text-[10px] uppercase tracking-widest mb-4">{w.position}</p>}
        {!w.position && <div className="mb-4" />}

        <div className="w-16 h-px mb-4" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)" }} />

        <div className="grid grid-cols-3 gap-2 w-full mb-4">
          {[
            { label: "Goals", val: stats.goals ?? w.goals ?? "—" },
            { label: "MVPs",  val: stats.mvps  ?? w.mvps  ?? "—" },
            { label: "W%",    val: stats.winRate != null ? `${stats.winRate}%` : (w.winRate != null ? `${w.winRate}%` : "—") },
          ].map(s => (
            <div key={s.label} className="bg-black/40 border border-[#d4af37]/12 rounded-xl py-2">
              <div className="text-[#d4af37] font-black font-mono text-base leading-none">{s.val}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {points != null && (
          <div className="bg-[#d4af37]/08 border border-[#d4af37]/25 rounded-xl px-4 py-2 flex items-baseline gap-1.5 mb-3">
            <span className="text-[#d4af37] font-black font-mono text-lg leading-none">{fmt(points)}</span>
            <span className="text-white/30 text-[10px] uppercase tracking-wider">pts</span>
          </div>
        )}

        {onCompare && (
          <button
            onClick={onCompare}
            className={`mt-1 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border transition-all ${inCompare ? "border-[#d4af37]/60 text-[#d4af37] bg-[#d4af37]/10" : "border-white/15 text-white/30 hover:border-[#d4af37]/40 hover:text-[#d4af37]/60"}`}
          >
            {inCompare ? "✓ Selected" : "Compare"}
          </button>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent" />
    </motion.div>
  );
}

function ComparePanel({ a, b }: { a: HallEntry; b: HallEntry }) {
  const wa = a.winner;
  const wb = b.winner;

  const rows = [
    { label: "Goals",   av: wa?.stats?.goals   ?? wa?.goals,   bv: wb?.stats?.goals   ?? wb?.goals   },
    { label: "MVPs",    av: wa?.stats?.mvps    ?? wa?.mvps,    bv: wb?.stats?.mvps    ?? wb?.mvps    },
    { label: "Win %",   av: wa?.stats?.winRate ?? wa?.winRate, bv: wb?.stats?.winRate ?? wb?.winRate },
    { label: "Points",  av: wa?.finalScore ?? wa?.score ?? wa?.points, bv: wb?.finalScore ?? wb?.score ?? wb?.points },
    { label: "Assists", av: wa?.stats?.assists  ?? wa?.assists, bv: wb?.stats?.assists  ?? wb?.assists },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-[#d4af37]/30 bg-gradient-to-b from-[#120e00] to-[#080600] overflow-hidden mt-6"
    >
      <div className="grid grid-cols-[1fr_auto_1fr]">
        {/* Player A */}
        <div className="p-6 flex flex-col items-center text-center border-r border-[#d4af37]/15">
          {(wa?.image ?? wa?.imageUrl) ? (
            <img src={wa.image ?? wa.imageUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-[3px] border-[#d4af37]/60 mb-3" style={{ boxShadow: "0 0 30px rgba(212,175,55,0.4)" }} />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] border-[#d4af37]/40 bg-[#2a1800] flex items-center justify-center text-[#d4af37] text-3xl font-black mb-3">
              {(wa?.name ?? wa?.playerName ?? "?")[0]}
            </div>
          )}
          <p className="font-black text-white text-sm leading-tight">{wa?.name ?? wa?.playerName ?? "—"}</p>
          <p className="text-[#d4af37]/50 text-[10px] uppercase tracking-wider mt-0.5">{a.season}</p>
        </div>

        {/* VS column */}
        <div className="flex items-center justify-center px-3 sm:px-6">
          <span className="font-black text-[#d4af37]/40 text-lg sm:text-2xl tracking-[0.15em]">VS</span>
        </div>

        {/* Player B */}
        <div className="p-6 flex flex-col items-center text-center border-l border-[#d4af37]/15">
          {(wb?.image ?? wb?.imageUrl) ? (
            <img src={wb.image ?? wb.imageUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-[3px] border-[#d4af37]/60 mb-3" style={{ boxShadow: "0 0 30px rgba(212,175,55,0.4)" }} />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] border-[#d4af37]/40 bg-[#2a1800] flex items-center justify-center text-[#d4af37] text-3xl font-black mb-3">
              {(wb?.name ?? wb?.playerName ?? "?")[0]}
            </div>
          )}
          <p className="font-black text-white text-sm leading-tight">{wb?.name ?? wb?.playerName ?? "—"}</p>
          <p className="text-[#d4af37]/50 text-[10px] uppercase tracking-wider mt-0.5">{b.season}</p>
        </div>
      </div>

      {/* Stats rows */}
      <div className="border-t border-[#d4af37]/15 divide-y divide-[#d4af37]/8">
        {rows.map(row => {
          const winner = statWinner(row.av ?? null, row.bv ?? null);
          return (
            <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-8 py-3">
              <div className={`text-right font-black font-mono text-sm sm:text-base transition-colors ${winner === "a" ? "text-[#d4af37]" : "text-white/40"}`}>
                {row.av != null ? (row.label === "Win %" ? `${Number(row.av).toFixed(0)}%` : Number(row.av).toFixed(row.label === "Points" ? 1 : 0)) : "—"}
                {winner === "a" && <span className="ml-2 text-[#d4af37] text-[10px]">▲</span>}
              </div>
              <div className="mx-3 sm:mx-5 text-[10px] uppercase tracking-widest text-white/25 font-bold whitespace-nowrap text-center w-14 sm:w-20">{row.label}</div>
              <div className={`font-black font-mono text-sm sm:text-base transition-colors ${winner === "b" ? "text-[#d4af37]" : "text-white/40"}`}>
                {winner === "b" && <span className="mr-2 text-[#d4af37] text-[10px]">▲</span>}
                {row.bv != null ? (row.label === "Win %" ? `${Number(row.bv).toFixed(0)}%` : Number(row.bv).toFixed(row.label === "Points" ? 1 : 0)) : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function AwardsSection({ entries }: { entries: HallEntry[] }) {
  const withAwards = entries.filter(e => e.revealed && e.hofAwards?.length > 0);
  const [expanded, setExpanded] = useState<string | null>(withAwards[0]?.season ?? null);

  if (withAwards.length === 0) return null;

  return (
    <section className="mt-14">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/20" />
        <div className="flex items-center gap-2 text-[#d4af37]/60">
          <Award className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold whitespace-nowrap">Season Awards</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/20" />
      </div>

      <div className="space-y-3">
        {withAwards.map(entry => (
          <motion.div
            key={entry.season}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#d4af37]/20 bg-gradient-to-b from-[#120e00] to-[#080600] overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
              onClick={() => setExpanded(expanded === entry.season ? null : entry.season)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🏆</span>
                <div className="text-left">
                  <span className="font-black text-[#d4af37]/90 text-sm uppercase tracking-wider">Season {entry.season}</span>
                  <span className="text-white/30 text-xs ml-3">{entry.hofAwards.length} award{entry.hofAwards.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              {expanded === entry.season
                ? <ChevronUp className="w-4 h-4 text-[#d4af37]/40" />
                : <ChevronDown className="w-4 h-4 text-[#d4af37]/40" />}
            </button>

            <AnimatePresence>
              {expanded === entry.season && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden border-t border-[#d4af37]/10"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-5">
                    {entry.hofAwards.map((award, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-black/30 border border-[#d4af37]/12 rounded-xl px-4 py-3"
                      >
                        <span className="text-2xl shrink-0">{award.emoji || "🎖️"}</span>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]/60 font-bold truncate">{award.title}</div>
                          <div className="font-black text-white text-sm truncate">{award.playerName}</div>
                          {award.teamName && <div className="text-white/35 text-[10px] truncate">{award.teamName}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function HallOfFame() {
  const { data: entries = [], isLoading } = useQuery<HallEntry[]>({
    queryKey: ["hall-of-fame"],
    queryFn: () => fetch(getApiUrl("/api/ballon-dor")).then(r => r.json()),
  });

  const sorted = [...entries].sort((a, b) => b.season.localeCompare(a.season));
  const revealed = sorted.filter(e => e.revealed && e.winner);
  const winnersCount = revealed.length;

  const [compareSeasons, setCompareSeasons] = useState<[string, string]>(["", ""]);
  const toggleCompare = (season: string) => {
    setCompareSeasons(prev => {
      if (prev[0] === season) return ["", prev[1]];
      if (prev[1] === season) return [prev[0], ""];
      if (!prev[0]) return [season, prev[1]];
      if (!prev[1]) return [prev[0], season];
      return [season, prev[1]];
    });
  };

  const compareA = sorted.find(e => e.season === compareSeasons[0]);
  const compareB = sorted.find(e => e.season === compareSeasons[1]);
  const canCompare = compareA?.revealed && compareA.winner && compareB?.revealed && compareB.winner;

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ backgroundImage: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 60%)" }}>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-10 max-w-7xl">
        {/* ─── Cinematic Header ─────────────────────────────── */}
        <div className="text-center mb-14">
          <motion.div
            className="flex justify-center mb-5"
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 16 }}
          >
            <div className="relative">
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.6) 0%, transparent 65%)", filter: "blur(28px)", transform: "scale(1.9)" }} />
              <img src={gefTrophy} alt="GEF Ballon d'Or Trophy" className="relative w-24 sm:w-32 h-auto" style={{ filter: "drop-shadow(0 0 25px rgba(212,175,55,0.9)) drop-shadow(0 0 60px rgba(212,175,55,0.5))" }} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.55em] text-[#d4af37]/50 mb-3 font-semibold">GEF Ballon d'Or</p>
            <h1 className="font-black text-white uppercase leading-none mb-4" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", letterSpacing: "-0.02em", textShadow: "0 0 60px rgba(212,175,55,0.4)" }}>
              Hall of Fame
            </h1>
            <p className="text-white/35 text-sm max-w-md mx-auto leading-relaxed">
              Every season. Every legend. The greatest players to ever lift the GEF Ballon d'Or.
            </p>
          </motion.div>

          {!isLoading && sorted.length > 0 && (
            <motion.div className="flex items-center justify-center gap-6 sm:gap-10 mt-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
              {[
                { icon: <Trophy className="w-4 h-4" />, label: "Seasons",         val: sorted.length },
                { icon: <Star className="w-4 h-4" />,   label: "Winners Crowned", val: winnersCount },
                { icon: <Users className="w-4 h-4" />,  label: "Total Candidates",val: sorted.reduce((s, e) => s + (e.totalCandidates || 0), 0) },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5 text-[#d4af37]/50">{stat.icon}</div>
                  <div className="text-xl font-black text-[#d4af37] font-mono">{stat.val}</div>
                  <div className="text-[9px] text-white/30 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ─── Loading ────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#d4af37]/30 border-t-[#d4af37] animate-spin" />
            <p className="text-white/30 text-sm uppercase tracking-widest">Loading legends…</p>
          </div>
        )}

        {/* ─── Empty ──────────────────────────────────────── */}
        {!isLoading && sorted.length === 0 && (
          <div className="text-center py-24">
            <div className="text-6xl mb-6">🏆</div>
            <h2 className="text-2xl font-black text-white/40 uppercase tracking-widest mb-3">No Records Yet</h2>
            <p className="text-white/25 text-sm">Ballon d'Or seasons will appear here after the first calculation.</p>
          </div>
        )}

        {/* ─── Winners Grid ───────────────────────────────── */}
        {!isLoading && sorted.length > 0 && (
          <>
            <motion.div className="flex items-center gap-4 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/20" />
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#d4af37]/40 font-bold whitespace-nowrap">
                {sorted.length} Season{sorted.length !== 1 ? "s" : ""} of Excellence
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/20" />
            </motion.div>

            {/* Compare hint */}
            {revealed.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-2 mb-6 text-white/25 text-[11px] uppercase tracking-widest"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Click "Compare" on two cards to compare legends</span>
              </motion.div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {sorted.map((entry, i) => (
                <WinnerCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onCompare={entry.revealed && entry.winner ? () => toggleCompare(entry.season) : undefined}
                  inCompare={compareSeasons.includes(entry.season)}
                />
              ))}
            </div>

            {/* ─── Comparison Panel ─────────────────────── */}
            <AnimatePresence>
              {canCompare && compareA && compareB && (
                <section className="mt-12">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/20" />
                    <div className="flex items-center gap-2 text-[#d4af37]/60">
                      <GitCompare className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-[0.4em] font-bold whitespace-nowrap">Legend Comparison</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/20" />
                  </div>
                  <ComparePanel a={compareA} b={compareB} />
                  <div className="text-center mt-3">
                    <button
                      onClick={() => setCompareSeasons(["", ""])}
                      className="text-[10px] uppercase tracking-widest text-white/25 hover:text-white/50 transition-colors border border-white/10 hover:border-white/20 px-4 py-1.5 rounded-full"
                    >
                      Clear Comparison
                    </button>
                  </div>
                </section>
              )}
            </AnimatePresence>

            {/* ─── Season Awards ────────────────────────── */}
            <AwardsSection entries={sorted} />

            {/* ─── Sealed seasons ───────────────────────── */}
            {sorted.some(e => !e.revealed) && (
              <div className="mt-10 space-y-2">
                <div className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-bold mb-3">Seasons Pending Reveal</div>
                {sorted.filter(e => !e.revealed).map(entry => (
                  <div key={entry.id} className="flex items-center gap-4 bg-white/3 border border-white/8 rounded-xl px-5 py-3">
                    <Lock className="w-4 h-4 text-white/20 shrink-0" />
                    <span className="text-white/40 text-sm font-semibold">Season {entry.season}</span>
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-white/20 text-xs uppercase tracking-wider">Winner Sealed</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
