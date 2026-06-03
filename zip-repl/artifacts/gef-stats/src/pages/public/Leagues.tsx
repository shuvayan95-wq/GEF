import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Link } from "wouter";
import {
  Trophy, Users, Shield, Crown, Medal, Target,
  ChevronRight, Calendar, Swords, Star, Zap, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

interface LeagueItem {
  id: number; name: string; description: string | null;
  season: string | null; logoUrl: string | null;
  leagueType: string; teamCount: number; createdAt: string;
}
interface StandingRow {
  teamId: number; teamName: string; teamLogoUrl: string | null;
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; goalDiff: number; points: number;
}
interface PlayerStatRow {
  playerId: number; playerName: string; playerImageUrl: string | null;
  teamName: string | null; matchesPlayed: number; wins: number; losses: number;
  draws: number; goals: number; conceded: number; mvps: number;
  winRate: number; goalDiff: number;
}
interface LeagueDetail {
  id: number; name: string; season: string | null;
  standings: StandingRow[]; playerStats: PlayerStatRow[]; matchCount: number;
}
interface FixtureMatchup {
  id: number; player1Name: string; player2Name: string;
  player1ImageUrl: string | null; player2ImageUrl: string | null;
  player1Goals: number; player2Goals: number; mvpPlayerId: number | null;
  player1Id: number; player2Id: number;
}
interface Fixture {
  id: number; date: string;
  team1Name: string; team1LogoUrl: string | null; team1Score: number;
  team2Name: string; team2LogoUrl: string | null; team2Score: number;
  notes: string | null; matchups: FixtureMatchup[];
}
interface FixturesResponse { leagueId: number; fixtures: Fixture[]; }

// ── League grouping ───────────────────────────────────────────────────────────
// Groups by exact name; seasons sorted newest-first within each group
interface LeagueGroup {
  name: string;
  seasons: LeagueItem[];
}

function groupLeagues(leagues: LeagueItem[]): LeagueGroup[] {
  const map = new Map<string, LeagueItem[]>();
  for (const l of leagues) {
    if (!map.has(l.name)) map.set(l.name, []);
    map.get(l.name)!.push(l);
  }
  return Array.from(map.entries()).map(([name, seasons]) => ({
    name,
    seasons: seasons.sort((a, b) => b.id - a.id), // newest first
  }));
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="w-7 h-7 rounded-full bg-yellow-500 text-black font-black text-sm flex items-center justify-center shadow-lg shadow-yellow-500/30">1</span>;
  if (rank === 2) return <span className="w-7 h-7 rounded-full bg-slate-400 text-black font-black text-sm flex items-center justify-center">2</span>;
  if (rank === 3) return <span className="w-7 h-7 rounded-full bg-orange-700 text-white font-black text-sm flex items-center justify-center">3</span>;
  return <span className="w-7 h-7 rounded-full bg-secondary text-muted-foreground font-bold text-sm flex items-center justify-center">{rank}</span>;
}

function TeamLogo({ url, name, size = 8 }: { url: string | null; name: string; size?: number }) {
  if (url) return <img src={url} className={`w-${size} h-${size} object-contain rounded shrink-0`} alt={name} />;
  return (
    <div className={`w-${size} h-${size} rounded bg-secondary flex items-center justify-center shrink-0`}>
      <Shield className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

// ── Queries ───────────────────────────────────────────────────────────────────

function useLeagues() {
  return useQuery<LeagueItem[]>({
    queryKey: ["/api/leagues"],
    queryFn: () => fetch(getApiUrl("/api/leagues"), { credentials: "include" }).then(r => r.json()),
  });
}

function useLeagueDetail(id: number | null) {
  return useQuery<LeagueDetail>({
    queryKey: ["/api/leagues", id],
    queryFn: () => fetch(getApiUrl(`/api/leagues/${id}`), { credentials: "include" }).then(r => r.json()),
    enabled: id !== null,
  });
}

function useLeagueFixtures(id: number | null) {
  return useQuery<FixturesResponse>({
    queryKey: ["/api/leagues", id, "fixtures"],
    queryFn: () => fetch(getApiUrl(`/api/leagues/${id}/fixtures`), { credentials: "include" }).then(r => r.json()),
    enabled: id !== null,
  });
}

// ── Standings Tab ─────────────────────────────────────────────────────────────

function StandingsTab({ standings }: { standings: StandingRow[] }) {
  if (standings.length === 0)
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="font-display uppercase">No matches recorded yet</p>
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[640px]">
        <thead className="bg-secondary/40 border-b border-border">
          <tr>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase w-10">#</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Team</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-center w-10">P</th>
            <th className="p-4 text-xs font-bold text-green-400 uppercase text-center w-10">W</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-center w-10">D</th>
            <th className="p-4 text-xs font-bold text-red-400 uppercase text-center w-10">L</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-center w-10">GF</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-center w-10">GA</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-center w-10">GD</th>
            <th className="p-4 text-xs font-bold text-primary uppercase text-center w-14">PTS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {standings.map((row, i) => (
            <motion.tr
              key={row.teamId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "hover:bg-secondary/20 transition-colors group",
                i === 0 && "bg-yellow-500/5",
                i < 3 && "border-l-2 border-l-transparent",
                i === 0 && "border-l-yellow-500/60",
                i === 1 && "border-l-slate-400/60",
                i === 2 && "border-l-orange-700/60",
              )}
            >
              <td className="p-4"><RankBadge rank={i + 1} /></td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <TeamLogo url={row.teamLogoUrl} name={row.teamName} />
                  <span className="font-bold uppercase text-sm group-hover:text-primary transition-colors">{row.teamName}</span>
                  {i === 0 && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                </div>
              </td>
              <td className="p-4 text-center text-sm tabular-nums">{row.played}</td>
              <td className="p-4 text-center text-sm text-green-400 font-bold tabular-nums">{row.won}</td>
              <td className="p-4 text-center text-sm text-muted-foreground tabular-nums">{row.drawn}</td>
              <td className="p-4 text-center text-sm text-red-400 font-bold tabular-nums">{row.lost}</td>
              <td className="p-4 text-center text-sm tabular-nums">{row.goalsFor}</td>
              <td className="p-4 text-center text-sm tabular-nums">{row.goalsAgainst}</td>
              <td className="p-4 text-center text-sm font-bold tabular-nums">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
              <td className="p-4 text-center">
                <span className={cn("font-display font-black text-lg tabular-nums", i === 0 ? "text-yellow-400" : "text-primary")}>{row.points}</span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Fixtures Tab ──────────────────────────────────────────────────────────────

function FixturesTab({ leagueId }: { leagueId: number }) {
  const { data, isLoading } = useLeagueFixtures(leagueId);
  const [expanded, setExpanded] = useState<number | null>(null);

  const fixtures = data?.fixtures ?? [];

  if (isLoading)
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-secondary/30 rounded-xl animate-pulse" />)}
      </div>
    );

  if (fixtures.length === 0)
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Swords className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="font-display uppercase">No fixtures recorded yet</p>
        <p className="text-sm mt-1">Matches assigned to this league will appear here.</p>
      </div>
    );

  return (
    <div className="divide-y divide-border/60">
      {fixtures.map((f, i) => {
        const isOpen = expanded === f.id;
        const t1Win = f.team1Score > f.team2Score;
        const t2Win = f.team2Score > f.team1Score;
        const isDraw = f.team1Score === f.team2Score;
        return (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            {/* Match row */}
            <button
              onClick={() => setExpanded(isOpen ? null : f.id)}
              className="w-full px-6 py-4 hover:bg-secondary/20 transition-colors flex items-center gap-4 text-left"
            >
              {/* Date */}
              <div className="shrink-0 w-20 text-center">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {format(new Date(f.date), "MMM d")}
                </div>
                <div className="text-[10px] text-muted-foreground">{format(new Date(f.date), "yyyy")}</div>
              </div>

              {/* Team 1 */}
              <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
                <span className={cn("font-display font-bold uppercase text-sm truncate", t1Win ? "text-foreground" : "text-muted-foreground")}>
                  {f.team1Name}
                </span>
                <TeamLogo url={f.team1LogoUrl} name={f.team1Name} size={7} />
              </div>

              {/* Score */}
              <div className="shrink-0 flex items-center gap-2">
                <span className={cn("font-display font-black text-2xl w-8 text-right tabular-nums", t1Win ? "text-primary" : isDraw ? "text-yellow-400" : "text-muted-foreground")}>
                  {f.team1Score}
                </span>
                <span className="text-muted-foreground/40 font-bold text-lg">—</span>
                <span className={cn("font-display font-black text-2xl w-8 text-left tabular-nums", t2Win ? "text-primary" : isDraw ? "text-yellow-400" : "text-muted-foreground")}>
                  {f.team2Score}
                </span>
              </div>

              {/* Team 2 */}
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <TeamLogo url={f.team2LogoUrl} name={f.team2Name} size={7} />
                <span className={cn("font-display font-bold uppercase text-sm truncate", t2Win ? "text-foreground" : "text-muted-foreground")}>
                  {f.team2Name}
                </span>
              </div>

              {/* Expand hint */}
              <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200", isOpen && "rotate-90")} />
            </button>

            {/* Expanded: player matchups */}
            <AnimatePresence>
              {isOpen && f.matchups.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden bg-secondary/10 border-t border-border/40"
                >
                  <div className="px-6 py-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Target className="w-3 h-3" /> Player Matchups
                    </div>
                    <div className="space-y-2">
                      {f.matchups.map(mu => {
                        const p1Win = mu.player1Goals > mu.player2Goals;
                        const p2Win = mu.player2Goals > mu.player1Goals;
                        const isMvp1 = mu.mvpPlayerId === mu.player1Id;
                        const isMvp2 = mu.mvpPlayerId === mu.player2Id;
                        return (
                          <div key={mu.id} className="flex items-center gap-3 py-1.5">
                            <Link href={`/players/${mu.player1Id}`} className="flex items-center gap-2 flex-1 min-w-0 justify-end group">
                              {isMvp1 && <Star className="w-3 h-3 text-yellow-400 shrink-0" />}
                              <span className={cn("text-sm font-bold uppercase truncate group-hover:text-primary transition-colors", p1Win ? "text-foreground" : "text-muted-foreground")}>
                                {mu.player1Name}
                              </span>
                              <img src={mu.player1ImageUrl || `${import.meta.env.BASE_URL}images/default-avatar.png`} className="w-7 h-7 rounded-full object-cover border border-border shrink-0" />
                            </Link>
                            <div className="shrink-0 flex items-center gap-1.5 min-w-[80px] justify-center">
                              <span className={cn("font-display font-black text-lg tabular-nums w-5 text-right", p1Win ? "text-primary" : "text-muted-foreground")}>{mu.player1Goals}</span>
                              <span className="text-muted-foreground/40">-</span>
                              <span className={cn("font-display font-black text-lg tabular-nums w-5 text-left", p2Win ? "text-primary" : "text-muted-foreground")}>{mu.player2Goals}</span>
                            </div>
                            <Link href={`/players/${mu.player2Id}`} className="flex items-center gap-2 flex-1 min-w-0 group">
                              <img src={mu.player2ImageUrl || `${import.meta.env.BASE_URL}images/default-avatar.png`} className="w-7 h-7 rounded-full object-cover border border-border shrink-0" />
                              <span className={cn("text-sm font-bold uppercase truncate group-hover:text-primary transition-colors", p2Win ? "text-foreground" : "text-muted-foreground")}>
                                {mu.player2Name}
                              </span>
                              {isMvp2 && <Star className="w-3 h-3 text-yellow-400 shrink-0" />}
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                    {f.notes && (
                      <div className="mt-3 text-xs text-muted-foreground italic border-t border-border/40 pt-2">{f.notes}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Players Tab ───────────────────────────────────────────────────────────────

function PlayersTab({ playerStats }: { playerStats: PlayerStatRow[] }) {
  if (playerStats.length === 0)
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="font-display uppercase">No player data yet</p>
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[720px]">
        <thead className="bg-secondary/40 border-b border-border">
          <tr>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase w-10">#</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Player</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Team</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-center w-10">MP</th>
            <th className="p-4 text-xs font-bold text-green-400 uppercase text-center w-10">W</th>
            <th className="p-4 text-xs font-bold text-red-400 uppercase text-center w-10">L</th>
            <th className="p-4 text-xs font-bold text-primary uppercase text-center w-14">Goals</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-center w-10">GD</th>
            <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-center w-14">Win%</th>
            <th className="p-4 text-xs font-bold text-yellow-400 uppercase text-center w-14">MVP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {playerStats.map((p, i) => (
            <motion.tr
              key={p.playerId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="hover:bg-secondary/20 transition-colors group"
            >
              <td className="p-4"><RankBadge rank={i + 1} /></td>
              <td className="p-4">
                <Link href={`/players/${p.playerId}`} className="flex items-center gap-3 group/link">
                  <img src={p.playerImageUrl || "/images/default-avatar.png"} className="w-8 h-8 rounded-full object-cover border border-border group-hover/link:border-primary transition-colors" />
                  <span className="font-bold text-sm group-hover/link:text-primary transition-colors">{p.playerName}</span>
                </Link>
              </td>
              <td className="p-4 text-sm text-muted-foreground">{p.teamName ?? "—"}</td>
              <td className="p-4 text-center text-sm tabular-nums">{p.matchesPlayed}</td>
              <td className="p-4 text-center text-sm text-green-400 font-bold tabular-nums">{p.wins}</td>
              <td className="p-4 text-center text-sm text-red-400 font-bold tabular-nums">{p.losses}</td>
              <td className="p-4 text-center font-bold text-primary tabular-nums">{p.goals}</td>
              <td className="p-4 text-center text-sm font-bold tabular-nums">{p.goalDiff > 0 ? `+${p.goalDiff}` : p.goalDiff}</td>
              <td className="p-4 text-center text-sm tabular-nums">{p.winRate}%</td>
              <td className="p-4 text-center">
                {p.mvps > 0
                  ? <span className="inline-flex items-center gap-1 text-yellow-400 font-bold"><Medal className="w-3 h-3" />{p.mvps}</span>
                  : <span className="text-muted-foreground">—</span>}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type DetailTab = "standings" | "fixtures" | "players";

export function Leagues() {
  const { data: leagues, isLoading } = useLeagues();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("standings");

  const groups = useMemo(() => groupLeagues(leagues ?? []), [leagues]);

  // Auto-expand first group when data loads
  useMemo(() => {
    if (groups.length > 0 && expandedGroup === null) {
      setExpandedGroup(groups[0].name);
      if (!selectedId && groups[0].seasons.length > 0) {
        setSelectedId(groups[0].seasons[0].id);
      }
    }
  }, [groups]);

  const { data: detail, isLoading: loadingDetail } = useLeagueDetail(selectedId);

  const selectedLeague = (leagues ?? []).find(l => l.id === selectedId);
  const selectedGroup = groups.find(g => g.name === expandedGroup);

  function selectLeague(id: number) {
    setSelectedId(id);
    setTab("standings");
  }

  const TABS: { key: DetailTab; label: string; icon: React.ElementType }[] = [
    { key: "standings", label: "Standings", icon: Trophy },
    { key: "fixtures",  label: "Fixtures",  icon: Swords },
    { key: "players",   label: "Players",   icon: Users  },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">

        {/* Page header */}
        <div className="text-center mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">GEF Competitions</div>
          <h1 className="text-4xl font-display font-bold uppercase">Leagues & Divisions</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse competitions, standings, fixtures and player stats by season</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse border border-border" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-card border border-dashed border-border rounded-xl">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-display uppercase text-lg">No leagues created yet</p>
            <p className="text-sm mt-1">Create leagues from the Admin panel to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── LEFT: Competition list ─────────────────────────────────── */}
            <div className="lg:w-72 shrink-0 space-y-2">
              {groups.map(group => {
                const isGroupOpen = expandedGroup === group.name;
                return (
                  <div key={group.name} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                    {/* Group header */}
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/20 transition-colors"
                      onClick={() => setExpandedGroup(isGroupOpen ? null : group.name)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Trophy className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-display font-bold uppercase text-sm leading-tight truncate">{group.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {group.seasons.length} season{group.seasons.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200", isGroupOpen && "rotate-90")} />
                    </button>

                    {/* Season list */}
                    <AnimatePresence>
                      {isGroupOpen && (
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-border/60"
                        >
                          <div className="p-2 space-y-1">
                            {group.seasons.map(s => {
                              const isActive = selectedId === s.id;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => selectLeague(s.id)}
                                  className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-lg text-left text-sm transition-all",
                                    isActive
                                      ? "bg-primary/10 border border-primary/30 text-primary"
                                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" style={{ boxShadow: "0 0 6px hsl(var(--primary))" }} />}
                                    <span className="font-bold font-display uppercase truncate text-xs">
                                      {s.season ?? `Season ${s.id}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-muted-foreground">{s.teamCount}T</span>
                                    {isActive && <ChevronRight className="w-3 h-3 text-primary" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* ── RIGHT: Detail panel ────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              {!selectedId ? (
                <div className="h-full flex items-center justify-center py-24 text-muted-foreground bg-card border border-dashed border-border rounded-xl">
                  <div className="text-center">
                    <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-display uppercase">Select a league and season</p>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">

                  {/* Detail header */}
                  <div className="relative overflow-hidden border-b border-border/60">
                    <div className="absolute inset-0 grid-bg opacity-30" />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                    <div className="relative z-10 p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-primary" style={{ boxShadow: "0 0 8px hsl(var(--primary))" }} />
                            <span className="text-xs font-bold uppercase tracking-widest text-primary">
                              {selectedLeague?.leagueType === "cup" ? "Cup Competition" : "League"}
                            </span>
                          </div>
                          <h2 className="text-2xl font-display font-black uppercase text-foreground">{selectedLeague?.name}</h2>
                          {selectedLeague?.season && (
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground font-medium">Season {selectedLeague.season}</span>
                            </div>
                          )}
                          {selectedLeague?.description && (
                            <p className="text-sm text-muted-foreground mt-2 max-w-lg">{selectedLeague.description}</p>
                          )}
                        </div>
                        {detail && (
                          <div className="flex gap-4 text-center">
                            <div className="bg-secondary/50 rounded-xl px-4 py-2">
                              <div className="font-display font-black text-xl text-primary">{detail.standings?.length ?? 0}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Teams</div>
                            </div>
                            <div className="bg-secondary/50 rounded-xl px-4 py-2">
                              <div className="font-display font-black text-xl text-primary">{detail.matchCount ?? 0}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Matches</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Season history pills */}
                      {selectedGroup && selectedGroup.seasons.length > 1 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest self-center mr-1">Seasons:</span>
                          {selectedGroup.seasons.map(s => (
                            <button
                              key={s.id}
                              onClick={() => selectLeague(s.id)}
                              className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all",
                                selectedId === s.id
                                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                              )}
                            >
                              {s.season ?? `#${s.id}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-border/60 bg-secondary/10">
                    {TABS.map(t => (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest transition-all relative",
                          tab === t.key
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                        {tab === t.key && (
                          <motion.div
                            layoutId="league-tab-indicator"
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
                    {loadingDetail ? (
                      <div className="p-12 text-center text-muted-foreground">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 max-w-lg mx-auto">
                          {[1,2,3].map(i => <div key={i} className="h-12 bg-secondary/30 rounded animate-pulse" />)}
                        </motion.div>
                      </div>
                    ) : (
                      <motion.div
                        key={`${selectedId}-${tab}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        {tab === "standings" && <StandingsTab standings={detail?.standings ?? []} />}
                        {tab === "fixtures"  && <FixturesTab  leagueId={selectedId} />}
                        {tab === "players"   && <PlayersTab   playerStats={detail?.playerStats ?? []} />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
