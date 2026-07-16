import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Trophy, Users, TrendingUp, TrendingDown, Crown, Star, ChevronUp, ChevronDown, Minus } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
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
  if (value === 0) return <span className="flex items-center gap-1 text-gray-400 text-sm"><Minus size={12} />0</span>;
  if (value > 0) return <span className="flex items-center gap-1 text-emerald-400 text-sm font-medium"><ChevronUp size={14} />+{value.toLocaleString()}</span>;
  return <span className="flex items-center gap-1 text-red-400 text-sm font-medium"><ChevronDown size={14} />{value.toLocaleString()}</span>;
}

const DIVISION_ICONS: Record<string, string> = {
  "Local Club": "🏘️",
  "Regional Club": "🏙️",
  "National Club": "🏟️",
  "Elite Club": "⭐",
  "Continental Giant": "🌍",
  "World Giant": "🌐",
  "Global Powerhouse": "👑",
};

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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 mb-6 text-blue-400 text-sm font-medium">
            <Users size={14} />
            Club Fanbase System
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            GEF Fanbase Rankings
          </h1>
          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            Every supporter counts. Track how fan empires are built, match by match.
          </p>
          <div className="inline-flex flex-col items-center gap-1 bg-gray-900 border border-gray-700 rounded-2xl px-10 py-6">
            <span className="text-gray-500 text-sm uppercase tracking-widest font-semibold">Total GEF Supporters</span>
            <span className="text-5xl font-black text-emerald-400">
              <AnimatedCounter value={totalFans} />
            </span>
            <span className="text-gray-500 text-sm">across {leaderboard.length} clubs</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Division pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          {divisionNames.map(d => (
            <button
              key={d}
              onClick={() => setDivFilter(d)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                divFilter === d
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {d === "all" ? "All Divisions" : `${DIVISION_ICONS[d] ?? "🏆"} ${d}`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clubs..."
            className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-500">Loading rankings...</div>
        ) : (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[60px_1fr_160px_160px_140px_160px] gap-4 px-6 py-3 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>#</span>
              <span>Club</span>
              <span className="text-right">Fans</span>
              <span className="text-right">Division</span>
              <span className="text-right">Season Growth</span>
              <span className="text-right">Highest Ever</span>
            </div>

            {filtered.length === 0 && (
              <div className="py-16 text-center text-gray-500">No clubs with fanbase data yet</div>
            )}

            {filtered.map((club: any, idx: number) => (
              <div
                key={club.teamId}
                className="grid grid-cols-[60px_1fr_160px_160px_140px_160px] gap-4 px-6 py-4 border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors items-center group"
              >
                {/* Rank */}
                <div className="flex items-center">
                  {club.rank <= 3 ? (
                    <span className={`text-xl font-black ${club.rank === 1 ? "text-yellow-400" : club.rank === 2 ? "text-gray-300" : "text-amber-600"}`}>
                      {club.rank === 1 ? "🥇" : club.rank === 2 ? "🥈" : "🥉"}
                    </span>
                  ) : (
                    <span className="text-gray-500 font-bold text-sm">{club.rank}</span>
                  )}
                </div>

                {/* Club */}
                <div className="flex items-center gap-3 min-w-0">
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt="" className="w-9 h-9 object-contain flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                      <Users size={16} />
                    </div>
                  )}
                  <span className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                    {club.teamName}
                  </span>
                </div>

                {/* Fans */}
                <div className="text-right">
                  <span className="text-white font-bold text-lg">
                    <AnimatedCounter value={club.currentFans} />
                  </span>
                </div>

                {/* Division */}
                <div className="flex justify-end">
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: `${club.divisionColor}20`, color: club.divisionColor, border: `1px solid ${club.divisionColor}40` }}
                  >
                    {DIVISION_ICONS[club.division] ?? "🏆"} {club.division}
                  </span>
                </div>

                {/* Season Growth */}
                <div className="text-right">
                  <GrowthBadge value={club.seasonGrowth} />
                </div>

                {/* Highest Ever */}
                <div className="text-right text-gray-400 text-sm">
                  {club.highestEver.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Divisions Guide */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-white mb-4">Fan Divisions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...divisions].sort((a: any, b: any) => a.minFans - b.minFans).map((d: any) => (
              <div
                key={d.id}
                className="bg-gray-900 border rounded-xl p-3 flex items-center gap-3"
                style={{ borderColor: `${d.color}40` }}
              >
                <span className="text-xl">{DIVISION_ICONS[d.name] ?? "🏆"}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{d.name}</div>
                  <div className="text-xs text-gray-500">{d.minFans.toLocaleString()}+ fans</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
