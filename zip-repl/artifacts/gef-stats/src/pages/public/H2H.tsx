import { useListH2H, useGetPlayerH2H, useListPlayers } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Flame, Swords, Search, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

function PlayerSearchPicker({ label, color, selectedId, onSelect, players, excludeId }: {
  label: string; color: string; selectedId: number | ""; onSelect: (id: number | "") => void;
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
    <div className="flex-1">
      <label className={`text-xs font-bold uppercase mb-1.5 block tracking-widest ${color}`}>{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search player..."
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
                    <div className="text-xs text-muted-foreground">{p.teamName || "Free Agent"}</div>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function H2HDisplay({ record }: { record: any }) {
  const total = record.totalGames || 1;
  const p1WinPct = Math.round((record.player1Wins / total) * 100);
  const p2WinPct = Math.round((record.player2Wins / total) * 100);
  const drawPct  = Math.round((record.draws / total) * 100);

  const score = record.rivalryScore ?? 0;
  const heatLevel = score >= 8 ? "inferno" : score >= 5 ? "hot" : score >= 2 ? "warm" : "cool";

  const heatColors = {
    inferno: { bar: "from-red-600 via-orange-500 to-yellow-400", badge: "bg-red-500/20 text-red-400 border-red-500/30", glow: "rgba(239,68,68,0.4)", border: "border-red-500/30" },
    hot:     { bar: "from-orange-600 via-orange-400 to-amber-400", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30", glow: "rgba(249,115,22,0.3)", border: "border-orange-500/20" },
    warm:    { bar: "from-amber-600 via-yellow-500 to-yellow-400", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30", glow: "rgba(245,158,11,0.25)", border: "border-amber-500/20" },
    cool:    { bar: "from-primary via-green-500 to-green-400", badge: "bg-primary/10 text-primary border-primary/20", glow: "rgba(34,197,94,0.15)", border: "border-border" },
  };

  const heat = heatColors[heatLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`bg-card border ${heat.border} rounded-xl p-6 shadow-lg overflow-hidden relative transition-all hover:shadow-xl`}
      style={{ boxShadow: `0 0 30px ${heat.glow}` }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.03),transparent_70%)] pointer-events-none" />

      {/* Rivalry heat badge */}
      <div className={`absolute top-0 right-0 flex items-center gap-1.5 px-3 py-2 rounded-bl-xl border-l border-b text-xs font-bold uppercase tracking-widest ${heat.badge}`}>
        <Flame className={`w-3.5 h-3.5 ${heatLevel === "inferno" ? "flicker" : ""}`} />
        {score.toFixed(1)}
        <span className="text-muted-foreground font-normal">heat</span>
      </div>

      {/* Total games */}
      <div className="text-center mb-5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{record.totalGames} Career Meetings</span>
      </div>

      {/* Players row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-5">
        {/* Player 1 */}
        <div className="flex-1 flex flex-col md:flex-row items-center md:justify-end gap-3">
          <div className="text-center md:text-right">
            <h3 className="text-xl font-display font-black uppercase">{record.player1Name}</h3>
            <p className="text-primary font-bold text-sm mt-0.5">{record.player1Wins}W · {record.player1Goals}G</p>
          </div>
          <div className="relative shrink-0">
            <img src={record.player1ImageUrl || "/images/default-avatar.png"} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-primary" style={{ boxShadow: "0 0 14px rgba(34,197,94,0.4)" }} />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center border-2 border-card">
              {p1WinPct}%
            </span>
          </div>
        </div>

        {/* VS center */}
        <div className="flex flex-col items-center shrink-0 w-full md:w-52 gap-3">
          <motion.div
            className="font-display font-black text-xl tracking-widest"
            animate={{ textShadow: ["0 0 8px rgba(239,68,68,0.5)", "0 0 20px rgba(239,68,68,0.9)", "0 0 8px rgba(239,68,68,0.5)"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ color: "rgb(239,68,68)" }}
          >
            VS
          </motion.div>

          {/* Fire Win Bar */}
          <div className="w-full">
            <div className="flex w-full h-3 rounded-full overflow-hidden border border-white/10 bg-secondary/40">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${p1WinPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${heat.bar}`}
                style={{ boxShadow: `0 0 8px ${heat.glow}` }}
              />
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${drawPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                className="h-full bg-muted-foreground/40"
              />
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${p2WinPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="h-full bg-gradient-to-l from-accent/80 to-accent/60"
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] font-bold">
              <span className="text-primary">{p1WinPct}%</span>
              {drawPct > 0 && <span className="text-muted-foreground">{drawPct}%D</span>}
              <span className="text-accent">{p2WinPct}%</span>
            </div>
          </div>

          <div className="flex gap-3 text-[11px] font-bold text-muted-foreground">
            <span className="text-green-400">{record.player1Wins}W</span>
            <span>·</span>
            <span className="text-yellow-400">{record.draws}D</span>
            <span>·</span>
            <span className="text-red-400">{record.player2Wins}W</span>
          </div>
        </div>

        {/* Player 2 */}
        <div className="flex-1 flex flex-col md:flex-row-reverse items-center md:justify-end gap-3">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-display font-black uppercase">{record.player2Name}</h3>
            <p className="text-accent font-bold text-sm mt-0.5">{record.player2Wins}W · {record.player2Goals}G</p>
          </div>
          <div className="relative shrink-0">
            <img src={record.player2ImageUrl || "/images/default-avatar.png"} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-accent" style={{ boxShadow: "0 0 14px rgba(245,158,11,0.35)" }} />
            <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-accent text-black text-[10px] font-black flex items-center justify-center border-2 border-card">
              {p2WinPct}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function H2H() {
  const { data: rivalries, isLoading: isLoadingList } = useListH2H();
  const { data: players } = useListPlayers();
  const [p1Id, setP1Id] = useState<number | "">("");
  const [p2Id, setP2Id] = useState<number | "">("");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [rivalrySearch, setRivalrySearch] = useState("");

  const { data: specificH2H, isLoading: isLoadingSpecific } = useGetPlayerH2H(
    { player1Id: Number(p1Id), player2Id: Number(p2Id) },
    { query: { enabled: searchTriggered && !!p1Id && !!p2Id } }
  );

  const handleSearch = () => { if (p1Id && p2Id) setSearchTriggered(true); };
  const allPlayers = players || [];

  const filteredRivalries = useMemo(() => {
    if (!rivalrySearch) return rivalries || [];
    const q = rivalrySearch.toLowerCase();
    return (rivalries || []).filter(r => r.player1Name.toLowerCase().includes(q) || r.player2Name.toLowerCase().includes(q));
  }, [rivalries, rivalrySearch]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">

        {/* ── Search Section ───────────────────────────────────────────────── */}
        <section className="bg-card border border-border/80 p-6 rounded-xl shadow-lg mb-12 relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl font-display font-bold uppercase mb-6 flex items-center gap-2">
              <Swords className="text-primary w-6 h-6" /> Search Head-to-Head
            </h2>
            <div className="flex flex-col md:flex-row items-end gap-4">
              <PlayerSearchPicker label="Player 1" color="text-primary" selectedId={p1Id} onSelect={(id) => { setP1Id(id); setSearchTriggered(false); }} players={allPlayers} excludeId={p2Id} />
              <motion.div
                className="text-muted-foreground font-display font-black text-lg px-2 py-2 shrink-0"
                animate={{ color: p1Id && p2Id ? "rgb(239,68,68)" : "hsl(var(--muted-foreground))", textShadow: p1Id && p2Id ? ["0 0 8px rgba(239,68,68,0.4)", "0 0 18px rgba(239,68,68,0.8)", "0 0 8px rgba(239,68,68,0.4)"] : ["none"] }}
                transition={{ duration: 1.5, repeat: p1Id && p2Id ? Infinity : 0, ease: "easeInOut" }}
              >
                VS
              </motion.div>
              <PlayerSearchPicker label="Player 2" color="text-accent" selectedId={p2Id} onSelect={(id) => { setP2Id(id); setSearchTriggered(false); }} players={allPlayers} excludeId={p1Id} />
              <Button onClick={handleSearch} disabled={!p1Id || !p2Id} variant="gaming" className="h-10 px-6 shrink-0 self-end">
                Analyze
              </Button>
            </div>

            {searchTriggered && specificH2H && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-8 border-t border-border pt-8">
                <H2HDisplay record={specificH2H.h2h} />
                {specificH2H.matches && specificH2H.matches.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-primary" /> Match History
                    </h3>
                    <div className="space-y-3">
                      {specificH2H.matches.map((m: any) => (
                        <div key={m.id} className="bg-secondary/30 border border-border rounded-lg p-4 hover:border-primary/20 transition-colors">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
                            <span className="font-bold font-mono text-sm">
                              {m.team1Name} <span className="text-primary">{m.team1Score}</span>
                              <span className="text-muted-foreground/50 mx-1">-</span>
                              <span className="text-accent">{m.team2Score}</span> {m.team2Name}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {m.playerMatchups?.map((mu: any) => (
                              <div key={mu.id} className="flex items-center justify-between text-sm">
                                <span className="font-medium text-primary/80">{mu.player1Name}</span>
                                <span className="font-mono font-bold px-3 text-xs bg-secondary rounded-full py-0.5">{mu.player1Goals} — {mu.player2Goals}</span>
                                <span className="font-medium text-accent/80">{mu.player2Name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            {searchTriggered && !specificH2H && !isLoadingSpecific && (
              <div className="mt-8 text-center text-muted-foreground text-sm py-4">No matches found between these two players.</div>
            )}
            {isLoadingSpecific && searchTriggered && (
              <div className="mt-8 text-center text-muted-foreground text-sm py-4">Loading match data...</div>
            )}
          </div>
        </section>

        {/* ── Heated Rivalries ─────────────────────────────────────────────── */}
        <section>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">All-Time Records</div>
              <h2 className="text-3xl font-display font-bold uppercase flex items-center gap-3">
                <Flame className="text-orange-500 w-7 h-7 flicker" /> Heated Rivalries
              </h2>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter rivalries by name..."
                value={rivalrySearch}
                onChange={e => setRivalrySearch(e.target.value)}
                className="pl-10 bg-card border-border focus-visible:border-primary/50"
              />
              {rivalrySearch && (
                <button onClick={() => setRivalrySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {isLoadingList ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-40 bg-card rounded-xl animate-pulse border border-border" />)}
            </div>
          ) : (
            <div className="space-y-5">
              {filteredRivalries.map(record => (
                <H2HDisplay key={`${record.player1Id}-${record.player2Id}`} record={record} />
              ))}
              {filteredRivalries.length === 0 && (
                <div className="text-center text-muted-foreground py-12 bg-card rounded-xl border border-border border-dashed">
                  <Flame className="w-10 h-10 mx-auto mb-3 opacity-20 text-orange-500" />
                  {rivalrySearch ? `No rivalries found for "${rivalrySearch}"` : "No rivalries recorded yet."}
                </div>
              )}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
