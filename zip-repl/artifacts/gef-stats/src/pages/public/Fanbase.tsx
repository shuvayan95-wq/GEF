import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Trophy, Users, TrendingUp, TrendingDown, Crown,
  ChevronUp, ChevronDown, Minus, MessageCircle, Shield, Flame, Star, Zap,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

function AnimatedCounter({ value, duration = 1400 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(value);

  useEffect(() => {
    const start = ref.current;
    const end = value;
    if (start === end) { setDisplay(end); return; }
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
      else ref.current = end;
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
}

function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return (
    <span className="flex items-center gap-1 text-gray-500 text-xs font-bold">
      <Minus size={11} /> 0
    </span>
  );
  if (value > 0) return (
    <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
      <ChevronUp size={13} /> +{value.toLocaleString()}
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
      <ChevronDown size={13} /> {value.toLocaleString()}
    </span>
  );
}

const DIVISION_ICONS: Record<string, string> = {
  "Local Club":        "🏘️",
  "Regional Club":     "🏙️",
  "National Club":     "🏟️",
  "Elite Club":        "⭐",
  "Continental Giant": "🌍",
  "World Giant":       "🌐",
  "Global Powerhouse": "👑",
};

// Top 3 podium card
function PodiumCard({ club, rank }: { club: any; rank: number }) {
  const configs: Record<number, { height: string; badge: string; color: string; glow: string; delay: number }> = {
    1: { height: "h-32", badge: "🥇", color: "text-yellow-400", glow: "shadow-yellow-500/30 border-yellow-500/30", delay: 0.1 },
    2: { height: "h-24", badge: "🥈", color: "text-gray-300",   glow: "shadow-gray-400/20 border-gray-400/20",   delay: 0.2 },
    3: { height: "h-20", badge: "🥉", color: "text-amber-600",  glow: "shadow-amber-600/20 border-amber-600/20", delay: 0.15 },
  };
  const cfg = configs[rank];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: cfg.delay, type: "spring", stiffness: 220, damping: 22 }}
      className={`flex flex-col items-center gap-2 ${rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}
    >
      {/* Club logo + badge */}
      <div className={`relative rounded-2xl border bg-gray-900/80 p-4 shadow-lg ${cfg.glow} flex flex-col items-center gap-2 min-w-[100px]`}>
        <span className="text-2xl">{cfg.badge}</span>
        {club.logoUrl
          ? <img src={club.logoUrl} alt="" className="w-12 h-12 object-contain" />
          : <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center"><Users size={20} className="text-gray-600" /></div>
        }
        <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>#{rank}</span>
      </div>

      {/* Podium block */}
      <div className={`w-full ${cfg.height} bg-gradient-to-t from-gray-800/80 to-gray-900/40 border border-white/5 rounded-t-xl flex flex-col items-center justify-end pb-3 px-2`}>
        <span className="font-display font-black text-white text-xs uppercase tracking-wide text-center leading-tight mb-1 line-clamp-2">
          {club.teamName}
        </span>
        <span className={`text-lg font-black tabular-nums ${cfg.color}`}>
          <AnimatedCounter value={club.currentFans} />
        </span>
        <span className="text-[9px] text-gray-600 uppercase tracking-wider">fans</span>
      </div>
    </motion.div>
  );
}

export function Fanbase() {
  const [search, setSearch] = useState("");
  const [divFilter, setDivFilter] = useState("all");

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["fanbase-leaderboard"],
    queryFn: async () => {
      const r = await fetch(`${API}/api/fanbase/leaderboard`);
      return r.json();
    },
  });

  const { data: divisionsRaw } = useQuery({
    queryKey: ["fanbase-divisions"],
    queryFn: async () => {
      const r = await fetch(`${API}/api/fanbase/divisions`);
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const divisions = Array.isArray(divisionsRaw) ? divisionsRaw : [];

  const totalFans = leaderboard.reduce((s: number, c: any) => s + (c.currentFans || 0), 0);

  const filtered = leaderboard.filter((c: any) => {
    const matchSearch = c.teamName.toLowerCase().includes(search.toLowerCase());
    const matchDiv = divFilter === "all" || c.division === divFilter;
    return matchSearch && matchDiv;
  });

  const divisionNames = ["all", ...Array.from(new Set(leaderboard.map((c: any) => c.division)))];
  const top3 = leaderboard.slice(0, 3);
  const rest = filtered.filter((c: any) => c.rank > 3);

  return (
    <div className="min-h-screen text-white" style={{ background: "hsl(224 25% 4%)" }}>

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-primary/6 rounded-full blur-3xl pointer-events-none" />

        {/* Corner brackets */}
        <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-primary/40" />
        <div className="absolute top-5 right-5 w-8 h-8 border-t-2 border-r-2 border-primary/40" />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-10 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-6"
          >
            <Crown size={13} className="text-primary" />
            <span className="text-xs font-black text-primary uppercase tracking-widest">Club Fanbase Rankings</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="font-display font-black uppercase tracking-tight text-5xl sm:text-7xl lg:text-8xl leading-none mb-3"
            style={{ textShadow: "0 0 60px hsl(142 76% 45% / 0.12)" }}
          >
            GEF{" "}
            <span className="text-primary">Fanbase</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="text-gray-400 text-base sm:text-lg mb-8 max-w-xl mx-auto"
          >
            Every supporter counts. Track how fan empires are built, match by match.
          </motion.p>

          {/* Giant total fans counter */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="inline-flex flex-col items-center bg-gray-900/80 border border-primary/20 rounded-3xl px-12 py-7 mb-6 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Total GEF Supporters</span>
            <span className="text-5xl sm:text-6xl font-black text-primary tabular-nums">
              <AnimatedCounter value={totalFans} duration={1800} />
            </span>
            <span className="text-sm text-gray-500 mt-1">across {leaderboard.length} clubs</span>
          </motion.div>

          {/* Fan community CTA */}
          <div className="flex justify-center">
            <Link href="/fan-community">
              <button className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wider text-primary border border-primary/25 bg-primary/5 hover:bg-primary/10 rounded-full px-5 py-2 transition-colors">
                <MessageCircle size={14} /> Fan Community Hub →
              </button>
            </Link>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* ── TOP 3 PODIUM ── */}
        {!isLoading && top3.length >= 3 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-5 bg-amber-400 rounded-full" />
              <Trophy size={14} className="text-amber-400" />
              <h2 className="font-display font-black text-sm uppercase tracking-widest text-gray-300">Top Fanbases</h2>
            </div>
            <div className="flex items-end justify-center gap-4 sm:gap-8">
              {top3.map((club: any) => (
                <PodiumCard key={club.teamId} club={club} rank={club.rank} />
              ))}
            </div>
          </div>
        )}

        {/* ── FILTERS ── */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clubs…"
              className="w-full bg-gray-900/80 border border-white/5 rounded-xl px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-primary/40 text-sm font-medium transition-colors"
            />
          </div>

          {/* Division pills */}
          <div className="flex gap-2 flex-wrap">
            {(divisionNames as string[]).map(d => (
              <button
                key={d}
                onClick={() => setDivFilter(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide transition-all shrink-0 ${
                  divFilter === d
                    ? "bg-primary text-black shadow-lg shadow-primary/25"
                    : "bg-gray-900/80 text-gray-500 border border-white/5 hover:text-gray-300 hover:border-white/10"
                }`}
              >
                {d === "all" ? "All Divisions" : `${DIVISION_ICONS[d] ?? "🏆"} ${d}`}
              </button>
            ))}
          </div>
        </div>

        {/* ── TABLE ── */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-600">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider">Loading rankings…</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900/60 border border-white/5 rounded-2xl overflow-hidden">
            {/* Desktop header */}
            <div className="hidden lg:grid lg:grid-cols-[56px_1fr_140px_170px_130px_140px] gap-4 px-6 py-3 border-b border-white/5">
              {["#", "Club", "Fans", "Division", "Season Growth", "All-Time Peak"].map(h => (
                <span key={h} className={`text-[10px] font-black text-gray-600 uppercase tracking-widest ${h !== "#" && h !== "Club" ? "text-right" : ""}`}>{h}</span>
              ))}
            </div>
            {/* Mobile header */}
            <div className="grid grid-cols-[40px_1fr_110px] gap-3 lg:hidden px-4 py-3 border-b border-white/5">
              {["#", "Club", "Fans"].map(h => (
                <span key={h} className={`text-[10px] font-black text-gray-600 uppercase tracking-widest ${h === "Fans" ? "text-right" : ""}`}>{h}</span>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="py-16 text-center text-gray-600">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold uppercase tracking-wide">No clubs with fanbase data yet</p>
              </div>
            )}

            {filtered.map((club: any, idx: number) => (
              <motion.div
                key={club.teamId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.025 }}
                className="border-b border-white/4 hover:bg-white/3 transition-colors group"
              >
                {/* Desktop row */}
                <div className="hidden lg:grid lg:grid-cols-[56px_1fr_140px_170px_130px_140px] gap-4 px-6 py-4 items-center">
                  {/* Rank */}
                  <div className="flex items-center">
                    {club.rank <= 3 ? (
                      <span className="text-xl">{club.rank === 1 ? "🥇" : club.rank === 2 ? "🥈" : "🥉"}</span>
                    ) : (
                      <span className="text-gray-600 font-black text-sm">{club.rank}</span>
                    )}
                  </div>

                  {/* Club */}
                  <div className="flex items-center gap-3 min-w-0">
                    {club.logoUrl
                      ? <img src={club.logoUrl} alt="" className="w-10 h-10 object-contain shrink-0" />
                      : <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                          <Users size={16} className="text-gray-600" />
                        </div>
                    }
                    <div className="min-w-0">
                      <span className="font-display font-black text-white truncate block group-hover:text-primary transition-colors">
                        {club.teamName}
                      </span>
                    </div>
                  </div>

                  {/* Fans */}
                  <div className="text-right">
                    <span className="font-black text-lg text-white tabular-nums"><AnimatedCounter value={club.currentFans} /></span>
                  </div>

                  {/* Division */}
                  <div className="flex justify-end">
                    <span
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide"
                      style={{ backgroundColor: `${club.divisionColor}18`, color: club.divisionColor, border: `1px solid ${club.divisionColor}35` }}
                    >
                      {DIVISION_ICONS[club.division] ?? "🏆"} {club.division}
                    </span>
                  </div>

                  {/* Growth */}
                  <div className="flex justify-end"><GrowthBadge value={club.seasonGrowth} /></div>

                  {/* Peak */}
                  <div className="text-right text-sm text-gray-500 font-bold">{club.highestEver.toLocaleString()}</div>
                </div>

                {/* Mobile row */}
                <div className="grid grid-cols-[40px_1fr_110px] gap-3 lg:hidden px-4 py-3 items-center">
                  <div>
                    {club.rank <= 3
                      ? <span className="text-base">{club.rank === 1 ? "🥇" : club.rank === 2 ? "🥈" : "🥉"}</span>
                      : <span className="text-gray-600 font-black text-sm">{club.rank}</span>
                    }
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    {club.logoUrl
                      ? <img src={club.logoUrl} alt="" className="w-8 h-8 object-contain shrink-0" />
                      : <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0"><Users size={13} className="text-gray-600" /></div>
                    }
                    <div className="min-w-0">
                      <div className="font-black text-white text-sm truncate group-hover:text-primary transition-colors">{club.teamName}</div>
                      <span className="text-[10px] font-bold" style={{ color: club.divisionColor }}>
                        {DIVISION_ICONS[club.division] ?? "🏆"} {club.division}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-white text-sm"><AnimatedCounter value={club.currentFans} /></div>
                    <div className="mt-0.5"><GrowthBadge value={club.seasonGrowth} /></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── DIVISIONS GUIDE ── */}
        {divisions.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-violet-500 rounded-full" />
              <Star size={13} className="text-violet-400" />
              <h2 className="font-display font-black text-sm uppercase tracking-widest text-gray-300">Fan Divisions</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[...divisions].sort((a: any, b: any) => a.minFans - b.minFans).map((d: any) => (
                <div
                  key={d.id}
                  className="bg-gray-900/60 border rounded-xl p-3 flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform"
                  style={{ borderColor: `${d.color}35` }}
                >
                  <span className="text-2xl">{DIVISION_ICONS[d.name] ?? "🏆"}</span>
                  <div className="text-xs font-black text-white leading-tight">{d.name}</div>
                  <div className="text-[10px] text-gray-600 font-bold">{d.minFans.toLocaleString()}+ fans</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
