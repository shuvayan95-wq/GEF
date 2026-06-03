import { useListPlayers, useGetPlayerStats } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from "recharts";
import { Search, X, Swords, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

function formatOvr(val: number) { return Math.round(val); }
function formatValue(v: number | null | undefined): string {
  if (!v) return "—";
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}

function getOvrTierStyle(ovr: number, color: "primary" | "accent") {
  if (color === "primary") {
    if (ovr >= 90) return { className: "ovr-elite", shadow: "rgba(234,179,8,0.5)" };
    if (ovr >= 80) return { className: "ovr-great", shadow: "rgba(34,197,94,0.5)" };
    if (ovr >= 70) return { className: "ovr-average", shadow: "rgba(96,165,250,0.4)" };
    return { className: "ovr-poor", shadow: "rgba(239,68,68,0.4)" };
  }
  return { className: "text-accent", shadow: "rgba(245,158,11,0.4)" };
}

function PlayerSearchPicker({
  label, color, accentColor, selectedId, onSelect, players, excludeId,
}: {
  label: string; color: string; accentColor: string;
  selectedId: number | ""; onSelect: (id: number | "") => void;
  players: any[]; excludeId: number | "";
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const filtered = useMemo(() => {
    if (!query) return players.filter(p => p.id !== excludeId).slice(0, 8);
    return players.filter(p => p.id !== excludeId && p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }, [players, query, excludeId]);
  const selected = players.find(p => p.id === selectedId);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg hover:border-primary/20 transition-colors">
      <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${color}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
        {label}
      </h3>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search player name..."
            value={selected && !focused ? selected.name : query}
            onChange={e => { setQuery(e.target.value); if (selectedId) onSelect(""); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            className="pl-10 pr-10 bg-background border-border focus-visible:border-primary/50"
          />
          {selectedId && (
            <button onClick={() => { onSelect(""); setQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {focused && (
          <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-lg mt-1 shadow-2xl overflow-hidden">
            {filtered.length === 0
              ? <div className="p-3 text-sm text-muted-foreground text-center">No players found</div>
              : filtered.map(p => (
                <button key={p.id} onMouseDown={() => { onSelect(p.id); setQuery(""); setFocused(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 text-left transition-colors">
                  <img src={p.imageUrl || "/images/default-avatar.png"} className="w-8 h-8 rounded-full object-cover border border-border" />
                  <div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.teamName || "Free Agent"} · OVR {formatOvr(p.overallRating)}</div>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-5 flex flex-col items-center gap-3">
            <div style={{ perspective: "900px" }}>
              <motion.div key={`img-${selected.id}`}
                initial={{ rotateY: 90, scale: 0.8, opacity: 0 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 14 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <motion.div
                  animate={{ boxShadow: [`0 0 0px ${accentColor}00`, `0 0 32px ${accentColor}90`, `0 0 16px ${accentColor}50`] }}
                  transition={{ duration: 0.9, delay: 0.4, times: [0, 0.5, 1] }}
                  className="w-24 h-24 rounded-2xl border-2 overflow-hidden"
                  style={{ borderColor: accentColor }}
                >
                  <img src={selected.imageUrl || "/images/default-avatar.png"} alt={selected.name} className="w-full h-full object-cover" />
                </motion.div>
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-center">
              <div className={`font-display font-black uppercase text-lg ${color}`}>{selected.name}</div>
              <div className="text-xs text-muted-foreground">{selected.teamName || "Free Agent"}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-bold">OVR <span style={{ color: accentColor }}>{formatOvr(selected.overallRating)}</span></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatRow({ label, val1, val2, higher = "more" }: any) {
  const n1 = parseFloat(String(val1));
  const n2 = parseFloat(String(val2));
  const better1 = !isNaN(n1) && !isNaN(n2) ? (higher === "more" ? n1 >= n2 : n1 <= n2) : true;
  return (
    <div className="grid grid-cols-3 text-center py-3 border-b border-border/60 last:border-0 hover:bg-secondary/10 transition-colors rounded-md">
      <div className={cn("font-bold text-lg tabular-nums", better1 ? "text-primary" : "text-muted-foreground")}>{val1}</div>
      <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest self-center">{label}</div>
      <div className={cn("font-bold text-lg tabular-nums", !better1 ? "text-accent" : "text-muted-foreground")}>{val2}</div>
    </div>
  );
}

export function Compare() {
  const { data: players } = useListPlayers();
  const [p1Id, setP1Id] = useState<number | "">("");
  const [p2Id, setP2Id] = useState<number | "">("");
  const { data: p1Stats } = useGetPlayerStats(Number(p1Id), { query: { enabled: !!p1Id } });
  const { data: p2Stats } = useGetPlayerStats(Number(p2Id), { query: { enabled: !!p2Id } });
  const allPlayers = players || [];

  const bothSelected = !!p1Stats && !!p2Stats;

  const radarData = bothSelected ? [
    { subject: "OVR",          A: p1Stats.overallRating,                                    B: p2Stats.overallRating,                                    fullMark: 100 },
    { subject: "Win Rate",     A: p1Stats.winRate,                                          B: p2Stats.winRate,                                          fullMark: 100 },
    { subject: "Goals/Match",  A: Math.min(p1Stats.goalsPerMatch * 30, 100),                B: Math.min(p2Stats.goalsPerMatch * 30, 100),                fullMark: 100 },
    { subject: "Defense",      A: Math.max(100 - p1Stats.goalsConcededPerMatch * 30, 0),    B: Math.max(100 - p2Stats.goalsConcededPerMatch * 30, 0),    fullMark: 100 },
    { subject: "Experience",   A: Math.min(p1Stats.matchesPlayed * 2, 100),                 B: Math.min(p2Stats.matchesPlayed * 2, 100),                 fullMark: 100 },
    { subject: "MVPs",         A: Math.min(p1Stats.mvpCount * 10, 100),                     B: Math.min(p2Stats.mvpCount * 10, 100),                     fullMark: 100 },
  ] : [];

  const barData = bothSelected ? [
    { name: "Goals",   [p1Stats.name]: p1Stats.goalsScored, [p2Stats.name]: p2Stats.goalsScored },
    { name: "Wins",    [p1Stats.name]: p1Stats.wins,        [p2Stats.name]: p2Stats.wins        },
    { name: "Losses",  [p1Stats.name]: p1Stats.losses,      [p2Stats.name]: p2Stats.losses      },
    { name: "Draws",   [p1Stats.name]: p1Stats.draws,       [p2Stats.name]: p2Stats.draws       },
    { name: "MVPs",    [p1Stats.name]: p1Stats.mvpCount,    [p2Stats.name]: p2Stats.mvpCount    },
  ] : [];

  const p1MV = (p1Stats as any)?.marketValue as number | null;
  const p2MV = (p2Stats as any)?.marketValue as number | null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">GEF Analytics</div>
          <h1 className="text-4xl font-display font-bold uppercase">Player Comparison</h1>
          <p className="text-muted-foreground mt-1 text-sm">Search and compare player stats side by side</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 max-w-4xl mx-auto">
          <PlayerSearchPicker label="Player 1" color="text-primary" accentColor="#22c55e" selectedId={p1Id} onSelect={setP1Id} players={allPlayers} excludeId={p2Id} />
          <PlayerSearchPicker label="Player 2" color="text-accent"  accentColor="#f59e0b" selectedId={p2Id} onSelect={setP2Id} players={allPlayers} excludeId={p1Id} />
        </div>

        <AnimatePresence mode="wait">
          {bothSelected ? (
            <motion.div key={`${p1Id}-${p2Id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 max-w-5xl mx-auto">

              {/* ── VS BANNER ────────────────────────────────────────────────── */}
              <div className="relative overflow-hidden">
                {/* Flash overlay */}
                <motion.div
                  key={`flash-${p1Id}-${p2Id}`}
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute inset-0 bg-primary/20 z-20 pointer-events-none rounded-2xl"
                />

                <div className="grid grid-cols-3 bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xl relative">
                  {/* Corner brackets */}
                  <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/40 z-10" />
                  <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/40 z-10" />
                  <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/40 z-10" />
                  <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/40 z-10" />

                  {/* Grid bg */}
                  <div className="absolute inset-0 grid-bg opacity-40" />

                  {/* Player 1 */}
                  <motion.div
                    initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                    className="p-6 text-center border-r border-border/50 relative"
                  >
                    <motion.div
                      className={`text-7xl font-display font-black tabular-nums ${getOvrTierStyle(p1Stats.overallRating, "primary").className}`}
                      initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 12 }}
                    >
                      {formatOvr(p1Stats.overallRating)}
                    </motion.div>
                    <div className="text-sm font-display font-black uppercase text-primary tracking-widest mt-1">{p1Stats.name}</div>
                    {p1MV && <div className="text-xs text-emerald-400 font-bold mt-2">{formatValue(p1MV)}</div>}
                  </motion.div>

                  {/* VS Center */}
                  <div className="p-6 flex items-center justify-center flex-col bg-secondary/20 relative">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 180, damping: 14 }}
                    >
                      <Swords className="w-10 h-10 text-muted-foreground mb-3" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 2 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                      className="font-display font-black text-2xl tracking-widest"
                      style={{ color: "hsl(var(--primary))", textShadow: "0 0 20px hsl(var(--primary)/0.7), 0 0 40px hsl(var(--primary)/0.3)" }}
                    >
                      VS
                    </motion.div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-1">OVR Rating</div>
                  </div>

                  {/* Player 2 */}
                  <motion.div
                    initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                    className="p-6 text-center border-l border-border/50 relative"
                  >
                    <motion.div
                      className="text-7xl font-display font-black tabular-nums text-accent"
                      initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 12 }}
                      style={{ textShadow: "0 0 14px rgba(245,158,11,0.6)" }}
                    >
                      {formatOvr(p2Stats.overallRating)}
                    </motion.div>
                    <div className="text-sm font-display font-black uppercase text-accent tracking-widest mt-1">{p2Stats.name}</div>
                    {p2MV && <div className="text-xs text-emerald-400 font-bold mt-2">{formatValue(p2MV)}</div>}
                  </motion.div>
                </div>
              </div>

              {/* ── SIDE BY SIDE STATS ───────────────────────────────────────── */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/60">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">
                    <span className="text-primary">{p1Stats.name}</span>
                    <span className="mx-2 text-muted-foreground/40">vs</span>
                    <span className="text-accent">{p2Stats.name}</span>
                  </h3>
                </div>
                <StatRow label="Matches"     val1={p1Stats.matchesPlayed}                    val2={p2Stats.matchesPlayed} />
                <StatRow label="Wins"        val1={p1Stats.wins}                             val2={p2Stats.wins} />
                <StatRow label="Losses"      val1={p1Stats.losses}                           val2={p2Stats.losses}                          higher="less" />
                <StatRow label="Draws"       val1={p1Stats.draws}                            val2={p2Stats.draws} />
                <StatRow label="Goals"       val1={p1Stats.goalsScored}                      val2={p2Stats.goalsScored} />
                <StatRow label="Conceded"    val1={p1Stats.goalsConceded}                    val2={p2Stats.goalsConceded}                   higher="less" />
                <StatRow label="Goal Diff"   val1={p1Stats.goalDiff}                         val2={p2Stats.goalDiff} />
                <StatRow label="Win Rate %"  val1={`${p1Stats.winRate.toFixed(1)}%`}         val2={`${p2Stats.winRate.toFixed(1)}%`} />
                <StatRow label="Goals/Match" val1={p1Stats.goalsPerMatch.toFixed(2)}         val2={p2Stats.goalsPerMatch.toFixed(2)} />
                <StatRow label="MVPs"        val1={p1Stats.mvpCount}                         val2={p2Stats.mvpCount} />
                {(p1MV || p2MV) && <StatRow label="Market Value" val1={formatValue(p1MV)} val2={formatValue(p2MV)} />}
              </div>

              {/* ── CHARTS ──────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-xl border border-border shadow-lg" style={{ height: 400 }}>
                  <h3 className="text-sm font-display font-bold uppercase mb-4 text-center tracking-widest text-muted-foreground">Attribute Radar</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name={p1Stats.name} dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                      <Radar name={p2Stats.name} dataKey="B" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.25} />
                      <Legend />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border shadow-lg" style={{ height: 400 }}>
                  <h3 className="text-sm font-display font-bold uppercase mb-4 text-center tracking-widest text-muted-foreground">Volume Comparison</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "hsl(var(--secondary))" }} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                      <Legend />
                      <Bar dataKey={p1Stats.name} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={p2Stats.name} fill="hsl(var(--accent))"  radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-24 text-muted-foreground bg-card/40 border border-border border-dashed rounded-xl max-w-4xl mx-auto relative overflow-hidden">
              <div className="absolute inset-0 grid-bg opacity-30" />
              <div className="relative z-10">
                <Swords className="w-12 h-12 mx-auto mb-4 opacity-20 text-primary" />
                <p className="font-display uppercase text-lg tracking-widest">Select Two Players to Compare</p>
                <p className="text-sm text-muted-foreground mt-2">Use the search boxes above to begin</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
