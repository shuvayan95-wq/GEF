import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Link } from "wouter";
import {
  Users, Shield, Search, ChevronDown, Tag, Gamepad2, Star,
  Swords, TrendingUp, TrendingDown, Minus, Trophy, Flame, MessageCircle,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaglistPlayer {
  id: number; name: string; imageUrl: string | null; position: string | null;
  nationality: string | null; efootballId: string | null; rank: string | null; crewName: string | null;
  whatsappNumber: string | null; status: string; lineupRole: string | null;
}
interface LineupChange {
  id: number; inPlayerId: number | null; inPlayerName: string;
  outPlayerId: number | null; outPlayerName: string | null; changedAt: string;
}
interface TaglistTeam {
  id: number; name: string; logoUrl: string | null; leagueId: number | null;
  playerCount: number; players: TaglistPlayer[]; recentChanges?: LineupChange[];
}
interface TaglistData { teams: TaglistTeam[]; freeAgents: TaglistPlayer[]; }

interface OpponentRecord {
  opponentId: number; opponentName: string; opponentLogoUrl: string | null;
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; goalDiff: number; winRate: number;
}
interface TeamWithRecords {
  id: number; name: string; logoUrl: string | null;
  totalPlayed: number; totalWon: number; totalDrawn: number; totalLost: number;
  totalGoalsFor: number; totalGoalsAgainst: number; records: OpponentRecord[];
}
interface TeamRecordsData { teams: TeamWithRecords[]; }

// ── Queries ───────────────────────────────────────────────────────────────────

function useTaglist() {
  return useQuery<TaglistData>({
    queryKey: ["/api/taglist"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/taglist"), { credentials: "include" });
      if (!r.ok) throw new Error(`Failed to load taglist (${r.status})`);
      return r.json();
    },
    retry: 2,
    staleTime: 30_000,
  });
}

function useTeamRecords() {
  return useQuery<TeamRecordsData>({
    queryKey: ["/api/team-records"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/team-records"), { credentials: "include" });
      if (!r.ok) throw new Error(`Failed to load records (${r.status})`);
      return r.json();
    },
    retry: 2,
    staleTime: 30_000,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function TeamLogo({ url, name, size = 10 }: { url: string | null; name: string; size?: number }) {
  if (url) return <img src={url} className={`w-${size} h-${size} object-contain rounded shrink-0`} alt={name} />;
  return (
    <div className={`w-${size} h-${size} rounded bg-secondary flex items-center justify-center shrink-0`}>
      <Shield className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

function WinRateBar({ rate, won, drawn, lost }: { rate: number; won: number; drawn: number; lost: number }) {
  const total = won + drawn + lost;
  const wPct = total > 0 ? (won / total) * 100 : 0;
  const dPct = total > 0 ? (drawn / total) * 100 : 0;
  const lPct = total > 0 ? (lost / total) * 100 : 0;
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full gap-px bg-secondary/40">
      {wPct > 0 && <div className="bg-green-500 rounded-l-full" style={{ width: `${wPct}%` }} />}
      {dPct > 0 && <div className="bg-yellow-500" style={{ width: `${dPct}%` }} />}
      {lPct > 0 && <div className="bg-red-500 rounded-r-full" style={{ width: `${lPct}%` }} />}
    </div>
  );
}

function dominanceClass(winRate: number) {
  if (winRate >= 60) return "text-green-400";
  if (winRate >= 40) return "text-yellow-400";
  return "text-red-400";
}

// ── Roster Section ────────────────────────────────────────────────────────────

function PlayerRow({ player, index }: { player: TaglistPlayer; index: number }) {
  const waDigits = player.whatsappNumber ? player.whatsappNumber.replace(/\D/g, "") : "";

  const WaButton = waDigits ? (
    <a
      href={`https://wa.me/${waDigits}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="w-8 h-8 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center hover:bg-[#25D366]/25 hover:border-[#25D366]/70 transition-all group/wa shrink-0"
      title={`Chat with ${player.name} on WhatsApp`}
    >
      <MessageCircle className="w-3.5 h-3.5 text-[#25D366] group-hover/wa:scale-110 transition-transform" />
    </a>
  ) : (
    <div className="w-8 h-8 rounded-full border border-border/30 flex items-center justify-center opacity-20 shrink-0">
      <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors group"
    >
      {/* ── Mobile layout (< sm) ─────────────────────────────── */}
      <div className="flex sm:hidden items-start gap-3 px-4 py-3">
        <Link href={`/players/${player.id}`} className="shrink-0">
          <img
            src={player.imageUrl || "/images/default-avatar.png"}
            className="w-10 h-10 rounded-full object-cover border border-border group-hover:border-primary/50 transition-colors"
            alt={player.name}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link href={`/players/${player.id}`} className="font-bold text-sm uppercase hover:text-primary transition-colors truncate">
                {player.name}
              </Link>
              {player.status === "left" && (
                <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">LEFT</span>
              )}
            </div>
            {WaButton}
          </div>
          {player.position && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{player.position}</span>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            <span className="flex items-center gap-1 text-[10px]">
              <span className="text-muted-foreground uppercase tracking-wide font-bold">ID:</span>
              <span className={cn("font-mono font-bold", player.efootballId ? "text-primary" : "text-muted-foreground/40")}>
                {player.efootballId || "—"}
              </span>
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <span className="text-muted-foreground uppercase tracking-wide font-bold">Rank:</span>
              {player.rank
                ? <span className="font-bold text-yellow-400 flex items-center gap-0.5"><Star className="w-2 h-2" />{player.rank}</span>
                : <span className="text-muted-foreground/40">—</span>}
            </span>
            {player.nationality && (
              <span className="flex items-center gap-1 text-[10px]">
                <span className="text-muted-foreground uppercase tracking-wide font-bold">Nat:</span>
                <span className="text-foreground font-medium">{player.nationality}</span>
              </span>
            )}
            {player.crewName && (
              <span className="flex items-center gap-1 text-[10px]">
                <span className="text-muted-foreground uppercase tracking-wide font-bold">Crew:</span>
                <span className="text-cyan-400 font-medium">{player.crewName}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop layout (≥ sm) ────────────────────────────── */}
      <div className="hidden sm:flex items-center gap-4 px-5 py-3">
        <Link href={`/players/${player.id}`} className="shrink-0">
          <img
            src={player.imageUrl || "/images/default-avatar.png"}
            className="w-10 h-10 rounded-full object-cover border border-border group-hover:border-primary/50 transition-colors"
            alt={player.name}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/players/${player.id}`} className="font-bold text-sm uppercase hover:text-primary transition-colors truncate">
              {player.name}
            </Link>
            {player.status === "left" && (
              <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">LEFT</span>
            )}
          </div>
          {player.position && <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{player.position}</span>}
        </div>
        <div className="flex flex-col items-center min-w-[110px]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">eFootball ID</span>
          <span className={cn("font-mono text-xs font-bold", player.efootballId ? "text-primary" : "text-muted-foreground/40")}>
            {player.efootballId || "—"}
          </span>
        </div>
        <div className="hidden md:flex flex-col items-center min-w-[80px]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Rank</span>
          {player.rank
            ? <span className="text-xs font-bold text-yellow-400 flex items-center gap-1"><Star className="w-2.5 h-2.5" />{player.rank}</span>
            : <span className="text-xs text-muted-foreground/40">—</span>}
        </div>
        <div className="hidden lg:flex flex-col items-center min-w-[90px]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Nationality</span>
          <span className={cn("text-xs font-medium", player.nationality ? "text-foreground" : "text-muted-foreground/40")}>
            {player.nationality || "—"}
          </span>
        </div>
        <div className="hidden xl:flex flex-col items-center min-w-[100px]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Crew</span>
          <span className={cn("text-xs font-medium", player.crewName ? "text-cyan-400" : "text-muted-foreground/40")}>
            {player.crewName || "—"}
          </span>
        </div>
        <div className="flex flex-col items-center min-w-[44px]">
          {WaButton}
        </div>
      </div>
    </motion.div>
  );
}

function LineupChangeStrip({ changes }: { changes: LineupChange[] }) {
  if (!changes || changes.length === 0) return null;
  return (
    <div className="px-5 py-2.5 bg-primary/5 border-b border-primary/15 flex flex-wrap gap-3">
      {changes.map(c => (
        <div key={c.id} className="flex items-center gap-1.5 text-xs">
          <ArrowUp className="w-3 h-3 text-green-400 shrink-0" />
          <span className="font-bold text-green-400">{c.inPlayerName}</span>
          {c.outPlayerName && (
            <>
              <span className="text-muted-foreground/50 text-[10px]">for</span>
              <ArrowDown className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-400">{c.outPlayerName}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function PlayerRoster({ players, label, accent }: {
  players: TaglistPlayer[]; label: string; accent: string;
}) {
  if (players.length === 0) return null;
  return (
    <div>
      <div className={cn("flex items-center gap-2 px-5 py-2 border-b border-border/40", accent)}>
        <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
        <span className="text-[9px] opacity-60">({players.length})</span>
      </div>
      <div className="hidden sm:flex items-center gap-4 px-5 py-1.5 bg-secondary/20 border-b border-border/30">
        <div className="w-10 shrink-0" />
        <div className="flex-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Player</div>
        <div className="min-w-[110px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">eFootball ID</div>
        <div className="hidden md:block min-w-[80px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">Rank</div>
        <div className="hidden lg:block min-w-[90px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">Nationality</div>
        <div className="hidden xl:block min-w-[100px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">Crew</div>
        <div className="min-w-[44px]" />
      </div>
      {players.map((p, i) => <PlayerRow key={p.id} player={p} index={i} />)}
    </div>
  );
}

function TeamCard({ team, defaultOpen = false }: { team: TaglistTeam; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const mainPlayers = team.players.filter(p => p.lineupRole === "main");
  const benchPlayers = team.players.filter(p => p.lineupRole === "bench");
  const unassigned = team.players.filter(p => !p.lineupRole);
  const hasRoles = mainPlayers.length > 0 || benchPlayers.length > 0;

  return (
    <div className={cn("bg-card border rounded-2xl overflow-hidden transition-all duration-200", open ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border hover:border-primary/20")}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-secondary/10 transition-colors">
        <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center border border-border shrink-0 overflow-hidden">
          {team.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-contain" /> : <Shield className="w-6 h-6 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold uppercase text-lg leading-tight truncate">{team.name}</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>{team.playerCount} player{team.playerCount !== 1 ? "s" : ""}</span>
            {mainPlayers.length > 0 && (
              <span className="flex items-center gap-0.5 text-green-400 text-xs font-bold">
                <ArrowUp className="w-3 h-3" />{mainPlayers.length} main
              </span>
            )}
            {benchPlayers.length > 0 && (
              <span className="flex items-center gap-0.5 text-amber-400 text-xs font-bold">
                <ArrowDown className="w-3 h-3" />{benchPlayers.length} bench
              </span>
            )}
          </div>
        </div>
        <div className={cn("transition-transform duration-200", open && "rotate-180")}><ChevronDown className="w-5 h-5 text-muted-foreground" /></div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {/* Recent lineup changes */}
            {team.recentChanges && team.recentChanges.length > 0 && (
              <LineupChangeStrip changes={team.recentChanges} />
            )}

            {team.players.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground border-t border-border/60">No players registered for this team yet.</div>
            ) : hasRoles ? (
              <div className="border-t border-border/60 divide-y divide-border/30">
                <PlayerRoster players={mainPlayers} label="Starting Lineup" accent="bg-green-500/5 text-green-400" />
                <PlayerRoster players={benchPlayers} label="Bench" accent="bg-amber-500/5 text-amber-400" />
                {unassigned.length > 0 && (
                  <PlayerRoster players={unassigned} label="Unassigned" accent="bg-secondary/30 text-muted-foreground" />
                )}
              </div>
            ) : (
              <div className="border-t border-border/60">
                <div className="hidden sm:flex items-center gap-4 px-5 py-2 bg-secondary/30 border-b border-border/40">
                  <div className="w-10 shrink-0" />
                  <div className="flex-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Player</div>
                  <div className="min-w-[110px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">eFootball ID</div>
                  <div className="hidden md:block min-w-[80px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">Rank</div>
                  <div className="hidden lg:block min-w-[90px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">Nationality</div>
                  <div className="hidden xl:block min-w-[100px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">Crew</div>
                  <div className="min-w-[44px]" />
                </div>
                {team.players.map((p, i) => <PlayerRow key={p.id} player={p} index={i} />)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Rival Records Section ─────────────────────────────────────────────────────

function RivalRecordsSection() {
  const { data, isLoading } = useTeamRecords();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const teams = data?.teams ?? [];
  const selected = teams.find(t => t.id === selectedId) ?? (teams.length > 0 ? teams[0] : null);

  const activeId = selectedId ?? selected?.id ?? null;

  if (isLoading) {
    return (
      <div className="flex gap-6">
        <div className="w-64 shrink-0 space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse border border-border" />)}
        </div>
        <div className="flex-1 space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-14 bg-card rounded-xl animate-pulse border border-border" />)}
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
        <Swords className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="font-display uppercase text-lg">No match data yet</p>
        <p className="text-sm mt-1">Club rivalries will appear here once matches are recorded.</p>
      </div>
    );
  }

  const activeTeam = teams.find(t => t.id === activeId) ?? teams[0];

  return (
    <div className="flex flex-col lg:flex-row gap-6">

      {/* Left: team list */}
      <div className="lg:w-64 shrink-0 space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Select Club</div>
        {teams.map(team => {
          const isActive = team.id === activeTeam?.id;
          const winRate = team.totalPlayed > 0 ? Math.round((team.totalWon / team.totalPlayed) * 100) : 0;
          return (
            <button
              key={team.id}
              onClick={() => setSelectedId(team.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                isActive
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-card border border-border hover:border-primary/20 hover:bg-secondary/20"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center border border-border shrink-0 overflow-hidden">
                {team.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-contain" /> : <Shield className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn("font-display font-bold uppercase text-xs truncate leading-tight", isActive && "text-primary")}>{team.name}</div>
                <div className={cn("text-[9px] font-bold mt-0.5", dominanceClass(winRate))}>
                  {team.totalWon}W {team.totalDrawn}D {team.totalLost}L
                </div>
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" style={{ boxShadow: "0 0 6px hsl(var(--primary))" }} />}
            </button>
          );
        })}
      </div>

      {/* Right: H2H records for selected team */}
      <div className="flex-1 min-w-0">
        {activeTeam && (
          <>
            {/* Team summary header */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-4 relative overflow-hidden">
              <div className="absolute inset-0 grid-bg opacity-20" />
              <div className="relative z-10 flex items-center gap-4 flex-wrap">
                <div className="w-14 h-14 rounded-xl bg-secondary/50 border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {activeTeam.logoUrl
                    ? <img src={activeTeam.logoUrl} className="w-full h-full object-contain" />
                    : <Shield className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-black uppercase text-xl truncate">{activeTeam.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{activeTeam.records.length} rival club{activeTeam.records.length !== 1 ? "s" : ""} faced</div>
                </div>
                <div className="flex gap-3">
                  {[
                    { label: "Played", value: activeTeam.totalPlayed, color: "text-foreground" },
                    { label: "Won",    value: activeTeam.totalWon,    color: "text-green-400"  },
                    { label: "Drawn",  value: activeTeam.totalDrawn,  color: "text-yellow-400" },
                    { label: "Lost",   value: activeTeam.totalLost,   color: "text-red-400"    },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className={cn("font-display font-black text-xl tabular-nums", s.color)}>{s.value}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Overall win bar */}
              {activeTeam.totalPlayed > 0 && (
                <div className="relative z-10 mt-4">
                  <WinRateBar rate={activeTeam.totalPlayed > 0 ? (activeTeam.totalWon / activeTeam.totalPlayed) * 100 : 0} won={activeTeam.totalWon} drawn={activeTeam.totalDrawn} lost={activeTeam.totalLost} />
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                    <span className="text-green-400 font-bold">{activeTeam.totalPlayed > 0 ? Math.round((activeTeam.totalWon / activeTeam.totalPlayed) * 100) : 0}% Win</span>
                    <span>{activeTeam.totalGoalsFor} GF — {activeTeam.totalGoalsAgainst} GA</span>
                  </div>
                </div>
              )}
            </div>

            {/* H2H records table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_1fr] items-center gap-2 px-5 py-3 bg-secondary/30 border-b border-border text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Opponent</span>
                <span className="w-8 text-center">P</span>
                <span className="w-8 text-center text-green-400">W</span>
                <span className="w-8 text-center text-yellow-400">D</span>
                <span className="w-8 text-center text-red-400">L</span>
                <span className="hidden sm:block w-14 text-center">GF–GA</span>
                <span className="hidden md:block w-10 text-center">GD</span>
                <span className="w-20 text-right">Win%</span>
              </div>

              {activeTeam.records.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No matches played yet.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {activeTeam.records.map((rec, i) => {
                    const domClass = dominanceClass(rec.winRate);
                    const isDominant = rec.winRate >= 60;
                    const isTough = rec.winRate < 40;
                    return (
                      <motion.div
                        key={rec.opponentId}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.035 }}
                        className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_1fr] items-center gap-2 px-5 py-3 hover:bg-secondary/20 transition-colors group"
                      >
                        {/* Opponent */}
                        <div className="flex items-center gap-3 min-w-0">
                          {isDominant && <Flame className="w-3 h-3 text-orange-400 shrink-0" title="You dominate this matchup" />}
                          {isTough    && <TrendingDown className="w-3 h-3 text-red-400 shrink-0" title="Tough rival" />}
                          <div className="w-7 h-7 rounded-lg bg-secondary/60 border border-border flex items-center justify-center overflow-hidden shrink-0">
                            {rec.opponentLogoUrl
                              ? <img src={rec.opponentLogoUrl} className="w-full h-full object-contain" />
                              : <Shield className="w-3 h-3 text-muted-foreground" />}
                          </div>
                          <span className="font-display font-bold uppercase text-xs truncate group-hover:text-primary transition-colors">
                            {rec.opponentName}
                          </span>
                        </div>

                        {/* Stats */}
                        <span className="w-8 text-center text-xs tabular-nums text-muted-foreground">{rec.played}</span>
                        <span className="w-8 text-center text-xs font-bold tabular-nums text-green-400">{rec.won}</span>
                        <span className="w-8 text-center text-xs font-bold tabular-nums text-yellow-400">{rec.drawn}</span>
                        <span className="w-8 text-center text-xs font-bold tabular-nums text-red-400">{rec.lost}</span>
                        <span className="hidden sm:block w-14 text-center text-xs tabular-nums text-muted-foreground">{rec.goalsFor}–{rec.goalsAgainst}</span>
                        <span className={cn("hidden md:block w-10 text-center text-xs font-bold tabular-nums", rec.goalDiff > 0 ? "text-green-400" : rec.goalDiff < 0 ? "text-red-400" : "text-muted-foreground")}>
                          {rec.goalDiff > 0 ? `+${rec.goalDiff}` : rec.goalDiff}
                        </span>

                        {/* Win% */}
                        <div className="w-20 flex flex-col gap-1 items-end">
                          <span className={cn("text-xs font-black tabular-nums", domClass)}>{rec.winRate}%</span>
                          <WinRateBar rate={rec.winRate} won={rec.won} drawn={rec.drawn} lost={rec.lost} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> Dominant (≥60% win rate)</span>
              <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-400" /> Tough rival (&lt;40% win rate)</span>
              <span className="flex items-center gap-1"><div className="w-3 h-1.5 rounded-full bg-green-500" /> Wins</span>
              <span className="flex items-center gap-1"><div className="w-3 h-1.5 rounded-full bg-yellow-500" /> Draws</span>
              <span className="flex items-center gap-1"><div className="w-3 h-1.5 rounded-full bg-red-500" /> Losses</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type PageTab = "rosters" | "rivals";

export function Taglist() {
  const { data, isLoading, isError, refetch } = useTaglist();
  const [search, setSearch] = useState("");
  const [pageTab, setPageTab] = useState<PageTab>("rosters");

  const filtered = useMemo(() => {
    if (!data) return { teams: [], freeAgents: [] };
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return {
      teams: data.teams
        .map(t => {
          const teamNameMatches = t.name.toLowerCase().includes(q);
          return {
            ...t,
            // If the team name matches, show ALL its players — don't filter them out
            players: teamNameMatches
              ? t.players
              : t.players.filter(p =>
                  p.name.toLowerCase().includes(q) ||
                  (p.efootballId && p.efootballId.toLowerCase().includes(q)) ||
                  (p.nationality && p.nationality.toLowerCase().includes(q)) ||
                  (p.crewName && p.crewName.toLowerCase().includes(q)) ||
                  (p.rank && p.rank.toLowerCase().includes(q))
                ),
            _nameMatches: teamNameMatches,
          };
        })
        .filter(t => t._nameMatches || t.players.length > 0),
      freeAgents: data.freeAgents.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.efootballId && p.efootballId.toLowerCase().includes(q)) ||
        (p.nationality && p.nationality.toLowerCase().includes(q)) ||
        (p.crewName && p.crewName.toLowerCase().includes(q)) ||
        (p.rank && p.rank.toLowerCase().includes(q))
      ),
    };
  }, [data, search]);

  const totalPlayers = (data?.teams.reduce((s, t) => s + t.playerCount, 0) ?? 0) + (data?.freeAgents.length ?? 0);

  const PAGE_TABS: { key: PageTab; label: string; icon: React.ElementType }[] = [
    { key: "rosters", label: "Rosters",       icon: Users  },
    { key: "rivals",  label: "Rival Records", icon: Swords },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1 flex items-center justify-center gap-2">
            <Tag className="w-3 h-3" /> GEF Registry
          </div>
          <h1 className="text-4xl font-display font-bold uppercase">Team Taglist</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Official GEF club registry — rosters, identities & rival records
          </p>
        </div>

        {/* Stats bar */}
        {!isLoading && data && (
          <div className="flex justify-center gap-4 mb-6 flex-wrap">
            {[
              { label: "Teams",       value: data.teams.length, icon: Shield   },
              { label: "Players",     value: totalPlayers,      icon: Users    },
              { label: "Free Agents", value: data.freeAgents.length, icon: Gamepad2 },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl">
                <stat.icon className="w-4 h-4 text-primary" />
                <span className="font-display font-black text-lg text-primary">{stat.value}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Page tabs */}
        <div className="flex bg-card border border-border rounded-xl overflow-hidden mb-6 max-w-xs mx-auto">
          {PAGE_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setPageTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-widest transition-all relative",
                pageTab === t.key ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              )}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
              {pageTab === t.key && (
                <motion.div
                  layoutId="taglist-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  style={{ boxShadow: "0 0 8px hsl(var(--primary)/0.8)" }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {pageTab === "rosters" ? (
            <motion.div key="rosters" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {/* Search */}
              <div className="relative max-w-md mx-auto mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by player, eFootball ID, nationality, crew…"
                  className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
                />
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse border border-border" />)}
                </div>
              ) : isError ? (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
                  <Tag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-display uppercase text-lg text-muted-foreground mb-4">Failed to load taglist</p>
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.teams
                    .filter(t => t.playerCount > 0 || !search)
                    .map((team, i) => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        defaultOpen={
                          !search
                            ? i === 0
                            : !!(team as any)._nameMatches || filtered.teams.length === 1
                        }
                      />
                    ))}

                  {filtered.freeAgents.length > 0 && (
                    <div className="bg-card border border-dashed border-border/60 rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-4 p-5 border-b border-border/40">
                        <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center border border-dashed border-border shrink-0">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-display font-bold uppercase text-lg text-muted-foreground">Free Agents</div>
                          <div className="text-sm text-muted-foreground">{filtered.freeAgents.length} unattached player{filtered.freeAgents.length !== 1 ? "s" : ""}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 px-5 py-2 bg-secondary/20 border-b border-border/40">
                        <div className="w-10 shrink-0" />
                        <div className="flex-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Player</div>
                        <div className="hidden sm:block min-w-[110px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">eFootball ID</div>
                        <div className="hidden md:block min-w-[80px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">Rank</div>
                        <div className="hidden lg:block min-w-[90px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">Nationality</div>
                        <div className="hidden xl:block min-w-[100px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center">Crew</div>
                      </div>
                      {filtered.freeAgents.map((p, i) => <PlayerRow key={p.id} player={p} index={i} />)}
                    </div>
                  )}

                  {filtered.teams.filter(t => t.playerCount > 0 || !search).length === 0 && filtered.freeAgents.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
                      <Tag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-display uppercase text-lg">{search ? "No results found" : "No players registered"}</p>
                      {search && <p className="text-sm mt-1">Try a different name, ID or nationality.</p>}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="rivals" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <RivalRecordsSection />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
