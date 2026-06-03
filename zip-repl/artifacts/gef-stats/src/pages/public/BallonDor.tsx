import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, ChevronUp } from "lucide-react";
import { BackgroundMusicYouTube } from "@/components/ceremony/BackgroundMusicYouTube";

// UEFA Champions League anthem — used as the ambient background score
// across the Ballon d'Or pages. Muted by default (browser autoplay
// policy); the user toggles it on with the floating button.
const UCL_ANTHEM_VIDEO_ID = "EijsH7uon7Q";

function fmt(n: number) {
  return n.toFixed(1);
}

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">🏆</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="w-7 h-7 rounded-full bg-[#1a1000] border border-[#5a4a00] flex items-center justify-center text-xs font-bold text-[#d4af37]">{rank}</span>;
}

const TIER_STYLE: Record<string, string> = {
  winner: "bg-gradient-to-r from-[#b8860b] via-[#ffd700] to-[#b8860b] text-black font-black",
  podium: "bg-gradient-to-r from-[#808080] via-[#e0e0e0] to-[#808080] text-black font-bold",
  elite: "bg-[#1a1000] border border-[#d4af37]/60 text-[#d4af37]",
  gold: "bg-[#1a1000] border border-[#d4af37]/40 text-[#c8a400]",
  silver: "bg-[#111111] border border-white/20 text-white/80",
  bronze: "bg-[#0d0d0d] border border-white/10 text-white/60",
};

const GCC_STAGE_LABEL: Record<string, string> = {
  league: "GCC", playoff: "PO", r16: "R16", qf: "QF", sf: "SF", final: "Final",
};

function gccStageBadge(gcc: any) {
  if (!gcc) return null;
  const label = gcc.wonCup ? "🏆" : (GCC_STAGE_LABEL[gcc.furthestStage] ?? "GCC");
  const color = gcc.wonCup
    ? "text-yellow-400"
    : gcc.furthestStage === "final" ? "text-orange-400"
    : gcc.furthestStage === "sf"    ? "text-purple-400"
    : gcc.furthestStage === "qf"    ? "text-blue-400"
    : gcc.furthestStage === "r16"   ? "text-cyan-400"
    : "text-gray-400";
  return <span className={`text-[10px] font-bold ${color}`}>{label}</span>;
}

const GCC_STAGE_FACTOR_LABEL: Record<string, { label: string; color: string }> = {
  champion: { label: "🏆 Cup Champion (+30%)", color: "text-yellow-400" },
  final:    { label: "🥈 Finalist (+18%)",      color: "text-orange-400" },
  sf:       { label: "🔥 Semi-Final (+12%)",     color: "text-purple-400" },
  qf:       { label: "⚡ Quarter-Final (+5%)",   color: "text-blue-400" },
  r16:      { label: "🎯 Round of 16 (−7%)",     color: "text-cyan-400" },
  playoff:  { label: "Playoff (−18%)",            color: "text-gray-400" },
  league:   { label: "❌ League Exit (−30%)",     color: "text-red-400" },
  none:     { label: "No GCC",                    color: "text-white/30" },
};

function ScoreBreakdown({ player }: { player: any }) {
  const gcc = player.gcc;
  const gccStageKey = gcc ? (gcc.wonCup ? "champion" : gcc.furthestStage) : "none";
  const gccFactorInfo = GCC_STAGE_FACTOR_LABEL[gccStageKey] ?? GCC_STAGE_FACTOR_LABEL.none;
  const factorVal = player.gccStageFactor ?? 1;
  const factorPct = Math.round((factorVal - 1) * 100);

  return (
    <div className="mt-2 mx-10 rounded-xl p-4 space-y-3 text-xs" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(212,175,55,0.15)" }}>
      <div className="font-bold text-[#d4af37]/60 uppercase tracking-widest text-[10px]">Score Breakdown</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center">
          <div className="font-mono font-bold text-white">{fmt(player.baseScore ?? 0)}</div>
          <div className="text-white/40 text-[10px] mt-0.5">Base Score</div>
          <div className="text-white/25 text-[10px]">Goals + Wins + MVPs</div>
        </div>
        <div className="text-center">
          <div className="font-mono font-bold text-green-400">+{fmt(player.efficiencyBonus ?? 0)}</div>
          <div className="text-white/40 text-[10px] mt-0.5">Efficiency</div>
          <div className="text-white/25 text-[10px]">Goals per match</div>
        </div>
        <div className="text-center">
          <div className="font-mono font-bold text-purple-400">+{fmt(player.trophyBonus ?? 0)}</div>
          <div className="text-white/40 text-[10px] mt-0.5">Trophies</div>
          <div className="text-white/25 text-[10px]">League/cup titles</div>
        </div>
        <div className="text-center">
          <div className="font-mono font-bold text-cyan-400">×{player.teamMultiplier ?? 1}</div>
          <div className="text-white/40 text-[10px] mt-0.5">Team Mult.</div>
          <div className="text-white/25 text-[10px]">Team win rate</div>
        </div>
      </div>

      {gcc && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-center">
            <div className="font-mono font-bold text-blue-400">+{fmt(gcc.winBonus ?? 0)}</div>
            <div className="text-white/40 text-[10px] mt-0.5">GCC Win Bonus</div>
            <div className="text-white/25 text-[10px]">{gcc.wins}W × 15pts</div>
          </div>
          <div className="text-center">
            <div className="font-mono font-bold text-blue-300">+{fmt(gcc.stageBonus ?? 0)}</div>
            <div className="text-white/40 text-[10px] mt-0.5">GCC Stage Bonus</div>
            <div className="text-white/25 text-[10px]">{gccStageBadge(gcc)}</div>
          </div>
          <div className="col-span-2 text-center">
            <div className={`font-mono font-bold ${factorPct < 0 ? "text-red-400" : factorPct > 0 ? "text-green-400" : "text-white/40"}`}>
              ×{factorVal.toFixed(2)} ({factorPct > 0 ? "+" : ""}{factorPct}%)
            </div>
            <div className="text-white/40 text-[10px] mt-0.5">GCC Stage Factor</div>
            <div className={`text-[10px] ${gccFactorInfo.color}`}>{gccFactorInfo.label}</div>
          </div>
        </div>
      )}

      {(player.individualAwardBonus ?? 0) > 0 && (
        <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex justify-between">
            <span className="text-white/40">Individual Awards Bonus</span>
            <span className="font-mono font-bold text-amber-400">+{fmt(player.individualAwardBonus)}</span>
          </div>
        </div>
      )}

      {(player.incidentDelta ?? 0) !== 0 && (
        <div className="flex justify-between">
          <span className="text-white/40">Incident Adjustments</span>
          <span className={`font-mono font-bold ${player.incidentDelta > 0 ? "text-green-400" : "text-red-400"}`}>
            {player.incidentDelta > 0 ? "+" : ""}{fmt(player.incidentDelta)}
          </span>
        </div>
      )}

      <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid rgba(212,175,55,0.2)" }}>
        <span className="text-[#d4af37]/60 font-bold uppercase tracking-wider text-[10px]">Total Points</span>
        <span className="font-mono font-black text-[#d4af37] text-base">{fmt(player.finalScore ?? player.score ?? 0)}</span>
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: any }) {
  const [expanded, setExpanded] = useState(false);
  const style = TIER_STYLE[player.tier] ?? TIER_STYLE.bronze;
  const isTop3 = player.rank <= 3;
  const gcc = player.gcc;
  const gccStageKey = gcc ? (gcc.wonCup ? "champion" : gcc.furthestStage) : null;
  const gccPenalty = gccStageKey === "league" || gccStageKey === "playoff" || gccStageKey === "r16";

  return (
    <div className={`rounded-xl transition-all duration-200 ${style} ${isTop3 ? "shadow-lg shadow-amber-500/20" : ""}`}>
      <div
        className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:brightness-110"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-10 flex-shrink-0 flex items-center justify-center">
          {player.rank <= 3 ? <Medal rank={player.rank} /> : <span className="text-sm font-bold opacity-70">#{player.rank}</span>}
        </div>
        <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border-2 border-[#d4af37]/40">
          {player.imageUrl
            ? <img src={player.imageUrl} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-[#2a2000] flex items-center justify-center text-[#d4af37] font-bold">{player.playerName[0]}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate flex items-center gap-2">
            {player.playerName}
            {gccPenalty && <span className="text-[9px] font-bold text-red-400 bg-red-950/60 border border-red-500/30 px-1.5 py-0.5 rounded-full">GCC PENALTY</span>}
          </div>
          <div className="text-[11px] opacity-70 truncate">{player.teamName ?? "—"} · {player.position ?? "—"}</div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-right">
          <div className="w-10"><div className="font-mono font-bold">{player.ovr}</div><div className="opacity-50 text-[10px]">OVR</div></div>
          <div className="w-10"><div className="font-mono font-bold">{player.stats?.goals ?? player.goals ?? 0}</div><div className="opacity-50 text-[10px]">Goals</div></div>
          <div className="w-10"><div className="font-mono font-bold">{player.stats?.cleanSheets ?? 0}</div><div className="opacity-50 text-[10px]">CS</div></div>
          <div className="w-10"><div className="font-mono font-bold">{player.stats?.mvps ?? player.mvps ?? 0}</div><div className="opacity-50 text-[10px]">MVPs</div></div>
          <div className="hidden lg:block w-14 text-center">
            {gcc ? (<><div className="font-mono font-bold text-blue-400/90">{gcc.wins}W</div><div className="mt-0.5">{gccStageBadge(gcc)}</div></>) : <div className="font-mono text-white/20">—</div>}
            <div className="opacity-50 text-[10px]">GCC</div>
          </div>
          <div className="hidden md:block w-14">
            <div className={`font-mono font-bold ${(player.gccStageFactor ?? 1) < 1 ? "text-red-400" : (player.gccStageFactor ?? 1) > 1 ? "text-green-400" : "text-white/40"}`}>
              ×{(player.gccStageFactor ?? 1).toFixed(2)}
            </div>
            <div className="opacity-50 text-[10px]">GCC ×</div>
          </div>
          <div className="hidden md:block w-12"><div className="font-mono font-bold text-purple-400/90">{player.teamMultiplier ?? 1}×</div><div className="opacity-50 text-[10px]">Team</div></div>
          <div className="w-16"><div className="font-mono font-bold text-[#d4af37]">{fmt(player.finalScore ?? player.score ?? 0)}</div><div className="opacity-50 text-[10px]">Points</div></div>
        </div>
        <div className="opacity-40 ml-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      {expanded && <ScoreBreakdown player={player} />}
    </div>
  );
}

function WinnerShowcase({ winner }: { winner: any }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#120d00] via-[#1e1600] to-[#0a0800]">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(ellipse at 50% 0%, #d4af37 0%, transparent 70%)" }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-60" />
      <div className="relative p-8 sm:p-12 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <div className="text-xs uppercase tracking-[0.3em] text-[#d4af37]/70 mb-2 font-semibold">Ballon d'Or Winner</div>
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.55) 0%, transparent 70%)", filter: "blur(22px)", transform: "scale(1.8)" }} />
            <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-[#d4af37]/70 shadow-2xl" style={{ boxShadow: "0 0 0 4px rgba(212,175,55,0.15), 0 0 60px rgba(212,175,55,0.5)" }}>
              {winner.imageUrl
                ? <img src={winner.imageUrl} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-[#2a2000] flex items-center justify-center text-[#d4af37] text-6xl font-bold">{winner.playerName[0]}</div>
              }
            </div>
          </div>
        </div>
        <h2 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-wide text-white mb-1">{winner.playerName}</h2>
        <div className="text-[#d4af37]/80 font-semibold mb-1">{winner.teamName ?? "—"}</div>
        <div className="text-sm text-white/50">{winner.nationality ?? ""} · {winner.position ?? ""}</div>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {[
            { label: "OVR", value: winner.ovr },
            { label: "Goals", value: winner.stats?.goals ?? winner.goals ?? 0 },
            { label: "Clean Sheets", value: winner.stats?.cleanSheets ?? 0 },
            { label: "MVPs", value: winner.stats?.mvps ?? winner.mvps ?? 0 },
          ].map(stat => (
            <div key={stat.label} className="bg-black/30 rounded-xl border border-[#d4af37]/20 px-3 py-4">
              <div className="text-xl font-bold text-[#d4af37] font-mono">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
        {winner.gcc && (
          <div className="mt-4 max-w-2xl mx-auto">
            <div className="text-[10px] uppercase tracking-[0.3em] text-blue-400/60 font-bold text-center mb-3">Champions Cup</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-950/30 rounded-xl border border-blue-500/20 px-3 py-3 text-center"><div className="text-lg font-bold text-blue-300 font-mono">{winner.gcc.personalMatches ?? winner.gcc.matches}</div><div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">GCC Matches</div></div>
              <div className="bg-blue-950/30 rounded-xl border border-blue-500/20 px-3 py-3 text-center"><div className="text-lg font-bold text-green-400 font-mono">{winner.gcc.wins}W / {winner.gcc.draws}D / {winner.gcc.losses}L</div><div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Record</div></div>
              <div className="bg-blue-950/30 rounded-xl border border-blue-500/20 px-3 py-3 text-center">
                <div className="text-lg font-bold text-cyan-400 font-mono">
                  {winner.gcc.personalGoals != null ? `${winner.gcc.personalGoals}` : winner.gcc.goals}
                  <span className="text-white/40 text-sm mx-0.5">–</span>
                  {winner.gcc.personalConceded != null ? `${winner.gcc.personalConceded}` : winner.gcc.conceded}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">GF – GA</div>
              </div>
              <div className="bg-blue-950/30 rounded-xl border border-blue-500/20 px-3 py-3 text-center"><div className="text-lg font-bold font-mono">{winner.gcc.wonCup ? "🏆 Champion" : (GCC_STAGE_LABEL[winner.gcc.furthestStage] ?? "GCC")}</div><div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Best Stage</div></div>
            </div>
          </div>
        )}
        {(winner.baseScore !== undefined) && (
          <div className="mt-6 max-w-lg mx-auto bg-black/40 rounded-2xl border border-[#d4af37]/20 p-5 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/50 font-bold text-center">Score Breakdown</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center text-sm">
              <div><div className="text-white/80 font-mono font-bold">{fmt(winner.baseScore)}</div><div className="text-[10px] text-white/30 mt-0.5">Base</div></div>
              <div><div className="text-green-400 font-mono font-bold">+{fmt(winner.efficiencyBonus ?? 0)}</div><div className="text-[10px] text-white/30 mt-0.5">Efficiency</div></div>
              <div><div className="text-purple-400 font-mono font-bold">+{fmt(winner.trophyBonus ?? 0)}</div><div className="text-[10px] text-white/30 mt-0.5">Trophies</div></div>
              <div><div className="text-blue-400 font-mono font-bold">+{fmt(winner.gccBonus ?? 0)}</div><div className="text-[10px] text-white/30 mt-0.5">GCC Bonus</div></div>
              <div><div className="text-cyan-400 font-mono font-bold">×{winner.teamMultiplier ?? 1}</div><div className="text-[10px] text-white/30 mt-0.5">Team Mult.</div></div>
              <div>
                <div className={`font-mono font-bold ${
                  (winner.gccStageFactor ?? 1) < 1 ? "text-red-400"
                  : (winner.gccStageFactor ?? 1) > 1 ? "text-yellow-400"
                  : "text-white/40"
                }`}>
                  ×{(winner.gccStageFactor ?? 1).toFixed(2)}
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">GCC Factor</div>
              </div>
            </div>
            <div className="border-t border-[#d4af37]/20 pt-3 text-center">
              <span className="text-2xl font-black font-mono text-[#d4af37]">{fmt(winner.finalScore ?? winner.score ?? 0)}</span>
              <span className="text-[10px] text-white/30 ml-2 uppercase tracking-wider">Total Points</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Join Live Ceremony Panel ─────────────────────────────── */

function JoinCeremonyPanel() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await fetch(getApiUrl("/api/ceremony/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: name.trim() }),
      });
      sessionStorage.setItem("ceremony_user", name.trim());
      navigate("/ceremony/live");
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-gradient-to-br from-[#120900] via-[#1a1000] to-[#0a0600]">
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% -20%, #d4af37 0%, transparent 60%)" }} />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent" />

      <div className="relative px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
        {/* Icon + text */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="absolute inset-0 blur-xl bg-[#d4af37]/30 rounded-full" />
            <span className="relative text-4xl select-none">🎙️</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-red-400 font-bold">Live Ceremony</span>
            </div>
            <div className="font-black text-white text-base sm:text-lg leading-tight">Join the Ballon d'Or Ceremony</div>
            <div className="text-[#d4af37]/50 text-xs mt-0.5">Enter your name to watch the live reveal</div>
          </div>
        </div>

        {/* Name form */}
        <form onSubmit={handleJoin} className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name..."
            maxLength={30}
            autoComplete="off"
            className="
              flex-1 sm:w-44 h-10 px-4 rounded-xl
              bg-black/50 border border-[#d4af37]/30
              text-white placeholder:text-white/30 text-sm
              focus:outline-none focus:border-[#d4af37]/70
              transition-colors
            "
          />
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="
              h-10 px-5 rounded-xl shrink-0
              bg-gradient-to-r from-[#b8860b] via-[#ffd700] to-[#b8860b]
              text-black font-black text-sm uppercase tracking-wider
              hover:brightness-110 disabled:opacity-40
              shadow-[0_0_20px_rgba(212,175,55,0.35)]
              transition-all duration-200
            "
          >
            {loading ? "Joining..." : "Join →"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Scrambled Nominees (pre-ceremony reveal) ─────────────── */

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const items = [...arr];
  let s = seed.split("").reduce((a, c) => ((a * 31 + c.charCodeAt(0)) | 0), 0x12345678);
  for (let i = items.length - 1; i > 0; i--) {
    s = ((s ^ (s << 13)) ^ (s >>> 17) ^ (s << 5)) | 0;
    const j = Math.abs(s) % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function ScrambledNominees({ nominees, season }: { nominees: any[]; season: string }) {
  const shuffled = useMemo(() => seededShuffle(nominees, season), [nominees, season]);

  return (
    <div className="space-y-8">
      {/* Announcement Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#0e0900] via-[#120c00] to-[#080600]">
        <div className="absolute inset-0 opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% -10%, #d4af37 0%, transparent 65%)" }} />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
        <div className="relative p-8 text-center space-y-3">
          <div className="text-4xl">✦</div>
          <div className="text-xs uppercase tracking-[0.4em] text-[#d4af37]/60 font-bold">Ballon d'Or · Season {season}</div>
          <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-wide text-white">
            50 Nominees Announced
          </h2>
          <p className="text-sm text-white/40 max-w-sm mx-auto leading-relaxed">
            The candidates have been selected. Rankings and the winner remain sealed until the live ceremony.
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 w-fit mx-auto px-4 py-1.5 rounded-full bg-[#1a1200] border border-[#d4af37]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]/70 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/60 font-bold">Results Sealed</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/20" />
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/40 font-bold">The Nominees</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/20" />
      </div>

      {/* Nominee Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {shuffled.map((player, i) => (
          <div
            key={player.playerId ?? i}
            className="
              relative group rounded-xl overflow-hidden
              border border-[#d4af37]/30 bg-[#080600]
              shadow-[0_0_10px_rgba(212,175,55,0.07)]
              hover:border-[#d4af37]/60
              hover:shadow-[0_0_22px_rgba(212,175,55,0.22)]
              transition-all duration-300
            "
          >
            {/* Inner glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
            {/* Top accent line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative flex items-center gap-3 px-4 py-3">
              {/* Golden dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]/50 shrink-0 group-hover:bg-[#d4af37]/90 transition-colors duration-300" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-sm truncate leading-tight">{player.playerName}</div>
                <div className="text-[#d4af37]/50 text-[11px] truncate mt-0.5 group-hover:text-[#d4af37]/70 transition-colors duration-300">
                  {player.teamName ?? "—"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-white/20 pt-2">
        Order is randomised · Rankings revealed at the ceremony
      </div>
    </div>
  );
}

/* ── Locked screens shown during ceremony ─────────────── */

function CeremonySoonScreen() {
  return (
    <div className="py-24 flex flex-col items-center text-center space-y-8">
      <div className="relative">
        <div className="absolute inset-0 blur-3xl bg-[#d4af37]/20 rounded-full scale-150" />
        <div className="relative text-7xl select-none">🔒</div>
      </div>
      <div className="space-y-3 max-w-md">
        <h2 className="text-2xl font-black uppercase tracking-widest text-[#d4af37]">Results Under Embargo</h2>
        <p className="text-white/50 text-sm leading-relaxed">
          The Ballon d'Or results are sealed until the live ceremony concludes. The winner will be revealed on stage.
        </p>
      </div>
      <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-[#1a1400] border border-[#d4af37]/20">
        <span className="w-2 h-2 rounded-full bg-[#d4af37]/60 animate-pulse" />
        <span className="text-xs text-[#d4af37]/60 uppercase tracking-widest font-bold">Ceremony Upcoming</span>
      </div>
      <Link href="/ceremony">
        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#d4af37]/40 text-[#d4af37]/80 text-sm font-bold hover:border-[#d4af37]/70 hover:text-[#d4af37] transition-all cursor-pointer">
          Enter the Ceremony Lobby →
        </div>
      </Link>
    </div>
  );
}

function CeremonyLiveScreen() {
  return (
    <div className="py-24 flex flex-col items-center text-center space-y-8">
      <div className="relative">
        <div className="absolute inset-0 blur-3xl bg-red-500/20 rounded-full scale-150" />
        <div className="relative text-7xl select-none">🎙️</div>
      </div>
      <div className="space-y-3 max-w-md">
        <h2 className="text-2xl font-black uppercase tracking-widest text-white">Ceremony is Live!</h2>
        <p className="text-white/50 text-sm leading-relaxed">
          The Ballon d'Or ceremony is happening right now. Results are embargoed until the winner is announced on stage.
        </p>
      </div>
      <Link href="/ceremony">
        <div className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-black text-sm shadow-[0_0_40px_rgba(239,68,68,0.5)] hover:shadow-[0_0_60px_rgba(239,68,68,0.7)] cursor-pointer transition-all">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span className="uppercase tracking-widest">Watch Live Now</span>
        </div>
      </Link>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */
export function BallonDor() {
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  const { data: ceremonyState } = useQuery({
    queryKey: ["/api/ceremony/state/public"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/ceremony/state"));
      if (!r.ok) return null;
      return r.json();
    },
    refetchInterval: 10000,
  });

  const ceremonyStatus: string = ceremonyState?.status ?? "none";
  // Results are visible only after the ceremony has been marked finished/revealed
  const resultsRevealed = ceremonyStatus === "finished" || ceremonyStatus === "revealed" || ceremonyStatus === "done";
  // Page is fully locked only while ceremony is actively live
  const ceremonyLive = ceremonyStatus === "live";
  // Ceremony is scheduled but not yet started (nominees still visible, but show banner)
  const ceremonyWaiting = ceremonyStatus === "waiting";

  // Always fetch seasons — needed to show nominees even before ceremony
  const { data: seasons, isLoading: loadingSeasons } = useQuery({
    queryKey: ["/api/ballon-dor"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/ballon-dor"));
      if (!r.ok) throw new Error();
      return r.json();
    },
  });

  const activeSeason = selectedSeason ?? seasons?.[0]?.season ?? null;

  const { data: seasonData, isLoading: loadingDetail } = useQuery({
    queryKey: ["/api/ballon-dor", activeSeason],
    queryFn: async () => {
      const r = await fetch(getApiUrl(`/api/ballon-dor/${encodeURIComponent(activeSeason!)}`));
      if (!r.ok) throw new Error();
      return r.json();
    },
    enabled: !!activeSeason,
  });

  const top50: any[] = seasonData?.top50 ?? [];
  const winner = seasonData?.winner ?? null;
  const hasData = (seasons?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#060400] text-white font-sans">
      {/* Looping Champions League anthem in the background. */}
      <BackgroundMusicYouTube videoId={UCL_ANTHEM_VIDEO_ID} volume={35} />
      {/* Top Bar */}
      <div className="border-b border-[#d4af37]/20 bg-[#060400]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-[#d4af37]/70 hover:text-[#d4af37] text-sm transition-colors">← Back to GEF Stats</Link>
          <div className="flex items-center gap-2">
            <span className="text-[#d4af37] text-lg">✦</span>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#d4af37]">Ballon d'Or</span>
            <span className="text-[#d4af37] text-lg">✦</span>
          </div>
          <Link href="/ceremony">
            {ceremonyLive ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:shadow-[0_0_30px_rgba(239,68,68,0.7)] transition-all cursor-pointer animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                Live
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#d4af37]/40 text-[#d4af37]/80 text-xs font-bold uppercase tracking-wider hover:border-[#d4af37]/80 hover:text-[#d4af37] hover:bg-[#d4af37]/5 transition-all cursor-pointer">
                <span className="text-base">🏆</span>
                Join Live
              </div>
            )}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">

        {/* Hero Title */}
        <div className="text-center space-y-3">
          <div className="text-[#d4af37]/50 text-xs uppercase tracking-[0.4em] font-semibold">Global EFootball Federation</div>
          <h1 className="text-5xl sm:text-7xl font-display font-black uppercase tracking-tight">
            <span className="bg-gradient-to-b from-[#ffd700] via-[#d4af37] to-[#8b7000] bg-clip-text text-transparent">
              Ballon d'Or
            </span>
          </h1>
          <p className="text-white/40 text-sm max-w-md mx-auto">The most prestigious individual award in GEF football. Presented to the best player each season.</p>
        </div>

        {/* No data yet */}
        {!loadingSeasons && !hasData && (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">🏅</div>
            <div className="text-xl font-bold text-white/60">No Ballon d'Or ceremonies yet</div>
            <p className="text-white/30 text-sm">The admin must initiate the Ballon d'Or calculation from the admin panel.</p>
          </div>
        )}

        {/* Season selector (only when data exists) */}
        {hasData && (seasons?.length ?? 0) > 1 && (
          <div className="flex flex-wrap justify-center gap-3">
            {seasons.map((s: any) => (
              <button
                key={s.season}
                onClick={() => setSelectedSeason(s.season)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeSeason === s.season
                    ? "bg-gradient-to-r from-[#b8860b] via-[#ffd700] to-[#b8860b] text-black shadow-lg shadow-amber-500/30"
                    : "border border-[#d4af37]/30 text-[#d4af37]/70 hover:border-[#d4af37]/60 hover:text-[#d4af37]"
                }`}
              >
                {s.season}
              </button>
            ))}
          </div>
        )}

        {/* CEREMONY LIVE — show join panel + locked screen */}
        {ceremonyLive && (
          <div className="space-y-6">
            <JoinCeremonyPanel />
            <CeremonyLiveScreen />
          </div>
        )}

        {/* CEREMONY WAITING — join panel + banner above nominees */}
        {ceremonyWaiting && !resultsRevealed && (
          <div className="space-y-6">
            <JoinCeremonyPanel />
            <CeremonySoonScreen />
          </div>
        )}

        {/* RESULTS REVEALED — full ranked list + winner showcase */}
        {resultsRevealed && hasData && (
          <>
            <div className="text-center">
              <Link href="/ceremony">
                <span className="text-xs text-[#d4af37]/30 hover:text-[#d4af37]/60 transition-colors cursor-pointer underline underline-offset-2">
                  Watch the Live Ceremony →
                </span>
              </Link>
            </div>

            {loadingDetail ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-[#1a1400] animate-pulse" />)}
              </div>
            ) : seasonData ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Season", value: seasonData.season },
                    { label: "Candidates", value: seasonData.totalCandidates },
                    { label: "Ceremony Date", value: new Date(seasonData.calculatedAt).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) },
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#0f0b00] border border-[#d4af37]/20 rounded-xl p-4 text-center">
                      <div className="text-[#d4af37] font-bold text-lg">{stat.value}</div>
                      <div className="text-white/40 text-[10px] uppercase tracking-wider mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {winner && <WinnerShowcase winner={winner} />}

                {top50.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/30" />
                      <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37]/60 font-bold">Top 50 Nominees</span>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/30" />
                    </div>
                    <div className="hidden sm:flex items-center gap-4 px-5 py-2 text-[10px] uppercase tracking-wider text-white/30">
                      <div className="w-10">Rank</div>
                      <div className="w-10" />
                      <div className="flex-1">Player</div>
                      <div className="w-10 text-right">OVR</div>
                      <div className="w-10 text-right">Goals</div>
                      <div className="w-10 text-right">CS</div>
                      <div className="w-10 text-right">MVPs</div>
                      <div className="hidden md:block w-14 text-right">Eff.</div>
                      <div className="hidden md:block w-12 text-right">Team</div>
                      <div className="w-16 text-right">Points</div>
                    </div>
                    <div className="space-y-2">
                      {top50.map((player: any) => (
                        <Link key={player.playerId} href={`/players/${player.playerId}`}>
                          <PlayerRow player={player} />
                        </Link>
                      ))}
                    </div>
                    <div className="text-center text-xs text-white/20 pt-4 space-y-1">
                      <div>Multi-factor scoring engine · Position-aware weights (FW / MF / DF / GK)</div>
                      <div className="font-mono text-[10px]">Points = (Base + Efficiency + Trophies) × Team Multiplier</div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}

        {/* NOMINEES ANNOUNCED — scrambled view (before ceremony reveals winner) */}
        {!ceremonyLive && !resultsRevealed && hasData && (
          <>
            {loadingDetail ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-[#0e0900] border border-[#d4af37]/10 animate-pulse" />
                ))}
              </div>
            ) : top50.length > 0 ? (
              <ScrambledNominees nominees={top50} season={activeSeason ?? ""} />
            ) : null}
          </>
        )}

      </div>

      {/* Footer */}
      <div className="border-t border-[#d4af37]/10 mt-20 py-8 text-center">
        <div className="text-[#d4af37]/30 text-xs uppercase tracking-[0.4em]">Global EFootball Federation · Ballon d'Or</div>
      </div>
    </div>
  );
}
