import { useListPlayers } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Crown, Medal } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function formatValue(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#cd7f32", "#10b981", "#6366f1"];
const PIE_COLORS = ["#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#a3e635","#e879f9"];

export function Market() {
  const { data: players, isLoading } = useListPlayers();

  const ranked = useMemo(() => {
    if (!players) return [];
    return [...players]
      .filter(p => p.marketValue != null)
      .sort((a, b) => Number(b.marketValue) - Number(a.marketValue));
  }, [players]);

  const totalCap = useMemo(() => ranked.reduce((s, p) => s + Number(p.marketValue), 0), [ranked]);

  const barData = ranked.slice(0, 12).map(p => ({
    name: p.name,
    value: Number(p.marketValue),
  }));

  const pieData = ranked.slice(0, 8).map(p => ({
    name: p.name,
    value: Number(p.marketValue),
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse text-lg">Loading market data…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-10">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">
            <DollarSign className="w-3 h-3" /> Transfer Market
          </div>
          <h1 className="text-5xl font-display font-black uppercase">Player Market</h1>
          <p className="text-muted-foreground">Real-time valuations based on in-season performance</p>
        </div>

        {/* Market Cap Hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="md:col-span-1 bg-gradient-to-br from-emerald-900/40 to-emerald-700/10 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-lg"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Total Market Cap</div>
            <div className="text-4xl font-display font-black text-emerald-300">{formatValue(totalCap)}</div>
            <div className="text-xs text-muted-foreground mt-2">{ranked.length} active players</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-amber-900/30 to-amber-700/10 border border-amber-500/30 rounded-2xl p-6 text-center shadow-lg"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">Highest Value</div>
            <div className="text-4xl font-display font-black text-amber-300">{ranked[0] ? formatValue(Number(ranked[0].marketValue)) : "—"}</div>
            <div className="text-sm font-bold text-muted-foreground mt-2 uppercase">{ranked[0]?.name ?? "—"}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-2xl p-6 text-center shadow-lg"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Average Value</div>
            <div className="text-4xl font-display font-black text-foreground">
              {ranked.length > 0 ? formatValue(Math.round(totalCap / ranked.length)) : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-2">per player</div>
          </motion.div>
        </div>

        {/* Top 5 Elite Cards */}
        <div>
          <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2 border-b border-border pb-3 mb-6">
            <Crown className="text-amber-400 w-6 h-6" /> Elite Valuations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {ranked.slice(0, 5).map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                className={`relative rounded-2xl border p-5 text-center shadow-lg overflow-hidden ${
                  i === 0
                    ? "border-amber-500/50 bg-gradient-to-b from-amber-950/50 to-card"
                    : i === 1
                    ? "border-slate-400/30 bg-gradient-to-b from-slate-800/40 to-card"
                    : i === 2
                    ? "border-amber-700/30 bg-gradient-to-b from-amber-950/30 to-card"
                    : "border-border bg-card"
                }`}
              >
                {/* Rank badge */}
                <div
                  className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ backgroundColor: RANK_COLORS[i] + "30", color: RANK_COLORS[i] }}
                >
                  {i === 0 ? <Crown className="w-4 h-4" /> : i < 3 ? <Medal className="w-4 h-4" /> : `#${i + 1}`}
                </div>

                <div className="w-20 h-20 mx-auto mb-3 rounded-xl border-2 overflow-hidden shadow-lg"
                  style={{ borderColor: RANK_COLORS[i] + "60" }}>
                  <img
                    src={player.imageUrl || "/images/default-avatar.png"}
                    alt={player.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="font-display font-black uppercase text-sm mb-1 truncate">{player.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase mb-3">{(player as any).teamName || "Free Agent"}</div>
                <div className="font-black text-lg" style={{ color: RANK_COLORS[i] }}>
                  {formatValue(Number(player.marketValue))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">OVR {Math.round(Number((player as any).overallRating))}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Bar Chart — top 12 */}
          <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-display font-bold uppercase mb-5 flex items-center gap-2">
              <TrendingUp className="text-emerald-400 w-5 h-5" /> Market Rankings
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                layout="vertical"
                data={barData}
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatValue(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#d1d5db", fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [formatValue(Number(v)), "Market Value"]}
                  cursor={{ fill: "#ffffff08" }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {barData.map((_, idx) => (
                    <Cell key={idx} fill={idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#cd7f32" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart — market share */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-display font-bold uppercase mb-5">Market Share</h3>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius="50%"
                  outerRadius="75%"
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any, name) => [formatValue(Number(v)), name]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: 10, color: "#9ca3af" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full Ranking Table */}
        <div>
          <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2 border-b border-border pb-3 mb-6">
            <Medal className="text-primary w-6 h-6" /> Full Rankings
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            <div className="grid grid-cols-[48px_1fr_120px_80px_100px] text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-3 border-b border-border bg-secondary/20">
              <div className="text-center">#</div>
              <div>Player</div>
              <div className="text-right">Market Value</div>
              <div className="text-center">OVR</div>
              <div className="text-right">Team</div>
            </div>
            {ranked.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[48px_1fr_120px_80px_100px] items-center px-4 py-3 border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors"
              >
                <div className="text-center font-bold text-sm" style={{ color: i < 3 ? RANK_COLORS[i] : "#6b7280" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src={player.imageUrl || "/images/default-avatar.png"}
                    className="w-9 h-9 rounded-lg object-cover border border-border"
                  />
                  <div>
                    <div className="font-bold text-sm uppercase">{player.name}</div>
                    <div className="text-[10px] text-muted-foreground">{(player as any).position || "—"}</div>
                  </div>
                </div>
                <div className="text-right font-black text-emerald-400">{formatValue(Number(player.marketValue))}</div>
                <div className="text-center font-bold text-sm text-primary">{Math.round(Number((player as any).overallRating))}</div>
                <div className="text-right text-xs text-muted-foreground truncate">{(player as any).teamName || "Free Agent"}</div>
              </motion.div>
            ))}
            {ranked.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">No market value data yet. Add match results to generate valuations.</div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
