import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { ArrowRight, UserX, Search, CalendarDays, Repeat2 } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";

interface Transfer {
  id: number;
  playerId: number;
  fromTeamId: number | null;
  toTeamId: number;
  transferDate: string;
  season: string | null;
  fee: string | null;
  notes: string | null;
  playerName: string;
  playerImage: string | null;
  fromTeamName: string | null;
  fromTeamLogo: string | null;
  toTeamName: string;
  toTeamLogo: string | null;
}

function formatFee(fee: string | null): string {
  if (!fee) return "Free Transfer";
  const n = Number(fee);
  if (isNaN(n) || n === 0) return "Free Transfer";
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n}`;
}

function TeamBadge({ name, logo }: { name: string; logo: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1 w-28 text-center">
      {logo ? (
        <img src={logo} alt={name} className="w-10 h-10 rounded-full object-cover border border-border bg-secondary" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="text-xs font-bold uppercase text-muted-foreground leading-tight">{name}</span>
    </div>
  );
}

export function Transfers() {
  const [search, setSearch] = useState("");
  const [filterSeason, setFilterSeason] = useState("all");

  const { data: transfers = [], isLoading } = useQuery<Transfer[]>({
    queryKey: ["transfers"],
    queryFn: () => fetch("/api/transfers").then(r => r.json()),
  });

  const seasons = useMemo(() => {
    const s = new Set(transfers.map(t => t.season).filter(Boolean) as string[]);
    return ["all", ...Array.from(s).sort().reverse()];
  }, [transfers]);

  const filtered = useMemo(() => {
    return [...transfers]
      .filter(t => {
        const q = search.toLowerCase();
        if (q && !t.playerName.toLowerCase().includes(q) && !(t.fromTeamName ?? "").toLowerCase().includes(q) && !t.toTeamName.toLowerCase().includes(q)) return false;
        if (filterSeason !== "all" && t.season !== filterSeason) return false;
        return true;
      })
      .sort((a, b) => b.transferDate.localeCompare(a.transferDate));
  }, [transfers, search, filterSeason]);

  const totalSpent = useMemo(() => transfers.reduce((s, t) => s + (Number(t.fee) || 0), 0), [transfers]);
  const freeAgentMoves = useMemo(() => transfers.filter(t => !t.fromTeamId || !t.fee || Number(t.fee) === 0).length, [transfers]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse text-lg">Loading transfers…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1 text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">
            <Repeat2 className="w-3 h-3" /> Transfer Centre
          </div>
          <h1 className="text-5xl font-display font-black uppercase">Transfers</h1>
          <p className="text-muted-foreground">All player movements across GEF clubs</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card border border-border rounded-2xl p-5 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Transfers</div>
            <div className="text-4xl font-display font-black text-foreground">{transfers.length}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-emerald-900/30 to-card border border-emerald-500/20 rounded-2xl p-5 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">Total Fees Spent</div>
            <div className="text-4xl font-display font-black text-emerald-300">{formatFee(String(totalSpent))}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-2xl p-5 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Free Moves</div>
            <div className="text-4xl font-display font-black text-foreground">{freeAgentMoves}</div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search player or team…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <select
            value={filterSeason}
            onChange={e => setFilterSeason(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {seasons.map(s => (
              <option key={s} value={s}>{s === "all" ? "All Seasons" : s}</option>
            ))}
          </select>
        </div>

        {/* Transfer Feed */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="py-20 text-center text-muted-foreground bg-card rounded-2xl border border-border">
              No transfers found.
            </div>
          )}

          {filtered.map((t, i) => {
            const isFreeAgent = !t.fromTeamId;
            const isFreeTransfer = !t.fee || Number(t.fee) === 0;
            const feeFormatted = formatFee(t.fee);

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Player */}
                  <div className="flex items-center gap-3 sm:w-44 shrink-0">
                    <img
                      src={t.playerImage || "/images/default-avatar.png"}
                      alt={t.playerName}
                      className="w-12 h-12 rounded-xl object-cover border border-border bg-secondary shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-display font-black uppercase text-sm truncate">{t.playerName}</div>
                      {t.season && (
                        <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> {t.season}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="flex-1 flex items-center justify-center gap-4">
                    {isFreeAgent ? (
                      <div className="flex flex-col items-center gap-1 w-28 text-center">
                        <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
                          <UserX className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-bold uppercase text-muted-foreground">Free Agent</span>
                      </div>
                    ) : (
                      <TeamBadge name={t.fromTeamName!} logo={t.fromTeamLogo} />
                    )}

                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight className="w-6 h-6 text-primary" />
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isFreeTransfer ? "bg-secondary text-muted-foreground" : "bg-emerald-500/15 text-emerald-400"}`}>
                        {feeFormatted}
                      </span>
                    </div>

                    <TeamBadge name={t.toTeamName} logo={t.toTeamLogo} />
                  </div>

                  {/* Date + Notes */}
                  <div className="sm:w-32 text-right shrink-0">
                    <div className="text-sm font-bold text-foreground">
                      {format(new Date(t.transferDate), "dd MMM yyyy")}
                    </div>
                    {t.notes && (
                      <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{t.notes}</div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
