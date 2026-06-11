import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { getApiUrl } from "@/lib/api";
import { Trophy, ArrowLeft, Loader2, Swords, Shield, BarChart2, Star, ChevronRight, Target } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TeamRef { id: number; name: string; logoUrl: string | null }
interface MatchupItem {
  player1Id: number; player2Id: number;
  player1Goals: number; player2Goals: number;
  mvpPlayerId: number | null;
  player1Name: string; player1ImageUrl: string | null;
  player2Name: string; player2ImageUrl: string | null;
}
interface Fixture {
  id: number; cupId: number; roundKey: string; leg: number;
  team1Id: number | null; team2Id: number | null;
  team1Score: number | null; team2Score: number | null;
  matchups: MatchupItem[];
  notes: string | null; matchDate: string | null;
  team1: TeamRef | null; team2: TeamRef | null;
}
interface Round { key: string; label: string; order: number; twoLegged: boolean }
interface CupDetail {
  id: number; name: string; season: string | null; logoUrl: string | null;
  description: string | null; status: string; rounds: Round[]; fixtures: Fixture[];
}

const DEFAULT_AVATAR = "/images/default-avatar.png";

function TeamLogo({ team, size = 9 }: { team: TeamRef | null | undefined; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full object-cover border border-border`;
  if (team?.logoUrl) return <img src={team.logoUrl} className={cls} />;
  return (
    <div className={`w-${size} h-${size} rounded-full bg-secondary border border-border flex items-center justify-center`}>
      <Shield className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

function FixtureCard({ fix, expanded, onToggle }: { fix: Fixture; expanded: boolean; onToggle: () => void }) {
  const hasResult = fix.team1Score !== null && fix.team2Score !== null;
  const t1Win = hasResult && fix.team1Score! > fix.team2Score!;
  const t2Win = hasResult && fix.team2Score! > fix.team1Score!;
  const isDraw = hasResult && fix.team1Score === fix.team2Score;

  return (
    <div className={cn("bg-card border rounded-xl overflow-hidden", hasResult ? "border-border" : "border-dashed border-border/50")}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors text-left"
      >
        {/* Date */}
        {fix.matchDate && (
          <div className="shrink-0 text-[10px] text-muted-foreground font-bold uppercase tracking-widest w-20 text-center">{fix.matchDate}</div>
        )}

        {/* Team 1 */}
        <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
          <span className={cn("font-display font-bold uppercase text-sm truncate", t1Win ? "text-foreground" : "text-muted-foreground")}>
            {fix.team1?.name ?? "TBD"}
          </span>
          <TeamLogo team={fix.team1} size={8} />
        </div>

        {/* Score */}
        <div className="shrink-0 flex items-center gap-2">
          <span className={cn("font-display font-black text-2xl w-8 text-right tabular-nums", t1Win ? "text-primary" : isDraw ? "text-yellow-400" : "text-muted-foreground")}>
            {hasResult ? fix.team1Score : "—"}
          </span>
          <span className="text-muted-foreground/40 font-bold text-lg">—</span>
          <span className={cn("font-display font-black text-2xl w-8 text-left tabular-nums", t2Win ? "text-primary" : isDraw ? "text-yellow-400" : "text-muted-foreground")}>
            {hasResult ? fix.team2Score : "—"}
          </span>
        </div>

        {/* Team 2 */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <TeamLogo team={fix.team2} size={8} />
          <span className={cn("font-display font-bold uppercase text-sm truncate", t2Win ? "text-foreground" : "text-muted-foreground")}>
            {fix.team2?.name ?? "TBD"}
          </span>
        </div>

        <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200", expanded && "rotate-90")} />
      </button>

      <AnimatePresence>
        {expanded && fix.matchups.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-secondary/10 border-t border-border/40"
          >
            <div className="px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Target className="w-3 h-3" /> Player Matchups
              </div>
              <div className="space-y-2">
                {fix.matchups.map((mu, idx) => {
                  const p1Win = mu.player1Goals > mu.player2Goals;
                  const p2Win = mu.player2Goals > mu.player1Goals;
                  const isMvp1 = mu.mvpPlayerId === mu.player1Id;
                  const isMvp2 = mu.mvpPlayerId === mu.player2Id;
                  return (
                    <div key={idx} className="flex items-center gap-3 py-1.5">
                      <Link href={`/players/${mu.player1Id}`} className="flex items-center gap-2 flex-1 min-w-0 justify-end group">
                        {isMvp1 && <Star className="w-3 h-3 text-yellow-400 shrink-0" />}
                        <span className={cn("text-sm font-bold uppercase truncate group-hover:text-primary transition-colors", p1Win ? "text-foreground" : "text-muted-foreground")}>
                          {mu.player1Name}
                        </span>
                        <img src={mu.player1ImageUrl || DEFAULT_AVATAR} className="w-7 h-7 rounded-full object-cover border border-border shrink-0" />
                      </Link>
                      <div className="shrink-0 flex items-center gap-1.5 min-w-[80px] justify-center">
                        <span className={cn("font-display font-black text-lg tabular-nums w-5 text-right", p1Win ? "text-primary" : "text-muted-foreground")}>{mu.player1Goals}</span>
                        <span className="text-muted-foreground/40">-</span>
                        <span className={cn("font-display font-black text-lg tabular-nums w-5 text-left", p2Win ? "text-primary" : "text-muted-foreground")}>{mu.player2Goals}</span>
                      </div>
                      <Link href={`/players/${mu.player2Id}`} className="flex items-center gap-2 flex-1 min-w-0 group">
                        <img src={mu.player2ImageUrl || DEFAULT_AVATAR} className="w-7 h-7 rounded-full object-cover border border-border shrink-0" />
                        <span className={cn("text-sm font-bold uppercase truncate group-hover:text-primary transition-colors", p2Win ? "text-foreground" : "text-muted-foreground")}>
                          {mu.player2Name}
                        </span>
                        {isMvp2 && <Star className="w-3 h-3 text-yellow-400 shrink-0" />}
                      </Link>
                    </div>
                  );
                })}
              </div>
              {fix.notes && (
                <div className="mt-3 text-xs text-muted-foreground italic border-t border-border/40 pt-2">{fix.notes}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TwoLeggedGroup({ fixtures }: { fixtures: Fixture[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const pairMap = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const a = Math.min(f.team1Id ?? 0, f.team2Id ?? 0);
    const b = Math.max(f.team1Id ?? 0, f.team2Id ?? 0);
    const key = `${a}-${b}`;
    if (!pairMap.has(key)) pairMap.set(key, []);
    pairMap.get(key)!.push(f);
  }

  if (pairMap.size === 0) {
    return <p className="text-muted-foreground text-sm italic">No fixtures yet.</p>;
  }

  return (
    <div className="space-y-6">
      {Array.from(pairMap.values()).map((legs, pairIdx) => {
        const sorted = [...legs].sort((a, b) => a.leg - b.leg);
        const firstLeg = sorted[0];
        let agg1 = 0, agg2 = 0;
        let aggComplete = sorted.length >= 2;
        for (const leg of sorted) {
          if (leg.team1Score === null || leg.team2Score === null) { aggComplete = false; continue; }
          const isFirst = (leg.team1Id === firstLeg.team1Id);
          if (isFirst) { agg1 += leg.team1Score; agg2 += leg.team2Score; }
          else { agg1 += leg.team2Score; agg2 += leg.team1Score; }
        }

        return (
          <div key={pairIdx} className="bg-secondary/20 border border-border/50 rounded-xl p-4 space-y-3">
            {sorted.map(leg => (
              <div key={leg.id}>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Leg {leg.leg}</p>
                <FixtureCard
                  fix={leg}
                  expanded={expanded === leg.id}
                  onToggle={() => setExpanded(expanded === leg.id ? null : leg.id)}
                />
              </div>
            ))}
            {aggComplete && (
              <div className="border-t border-border pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Aggregate</p>
                <div className="flex items-center gap-4">
                  <span className={cn("font-display font-bold uppercase text-sm", agg1 > agg2 ? "text-foreground" : "text-muted-foreground")}>
                    {firstLeg.team1?.name ?? "?"}
                  </span>
                  <span className="font-display font-black text-xl text-primary">{agg1} – {agg2}</span>
                  <span className={cn("font-display font-bold uppercase text-sm", agg2 > agg1 ? "text-foreground" : "text-muted-foreground")}>
                    {firstLeg.team2?.name ?? "?"}
                  </span>
                  {agg1 !== agg2 && (
                    <span className="text-xs text-green-400 font-bold ml-1">
                      ({agg1 > agg2 ? firstLeg.team1?.name : firstLeg.team2?.name} wins)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CupDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: cup, isLoading, error } = useQuery<CupDetail>({
    queryKey: [`/api/cups/${id}`],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/cups/${id}`));
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !cup) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Cup not found.</div>
      </div>
    );
  }

  const rounds = (cup.rounds as Round[]).sort((a, b) => a.order - b.order);
  const fixturesByRound = new Map<string, Fixture[]>();
  for (const f of cup.fixtures ?? []) {
    if (!fixturesByRound.has(f.roundKey)) fixturesByRound.set(f.roundKey, []);
    fixturesByRound.get(f.roundKey)!.push(f);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-4xl">

        <Link href="/cups">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> All Cups
          </button>
        </Link>

        {/* Cup Header */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8 flex items-start gap-5">
          {cup.logoUrl ? (
            <img src={cup.logoUrl} alt={cup.name} className="w-20 h-20 rounded-xl object-cover border border-border flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-display font-black uppercase">{cup.name}</h1>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                cup.status === "completed"
                  ? "text-gray-400 bg-gray-500/10 border-gray-500/30"
                  : "text-green-400 bg-green-500/10 border-green-500/30"
              }`}>
                {cup.status === "completed" ? "Completed" : "Active"}
              </span>
            </div>
            {cup.season && <p className="text-muted-foreground text-sm mt-1">{cup.season}</p>}
            {cup.description && <p className="text-sm mt-2 text-muted-foreground">{cup.description}</p>}
            {rounds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {rounds.map((r, i) => (
                  <span key={r.key} className="flex items-center gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                      {r.label || r.key}{r.twoLegged ? " (2L)" : ""}
                    </span>
                    {i < rounds.length - 1 && <span className="text-muted-foreground">→</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {rounds.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No rounds configured for this cup yet.</p>
          </div>
        )}

        <div className="space-y-10">
          {rounds.map(round => {
            const roundFixtures = fixturesByRound.get(round.key) ?? [];
            return (
              <section key={round.key}>
                <div className="flex items-center gap-3 mb-4">
                  <Swords className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-display font-bold uppercase">{round.label || round.key}</h2>
                  {round.twoLegged && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-primary/30 text-primary">Two Legged</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {roundFixtures.length} fixture{roundFixtures.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {roundFixtures.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic pl-2">No fixtures added yet.</p>
                ) : round.twoLegged ? (
                  <TwoLeggedGroup fixtures={roundFixtures} />
                ) : (
                  <div className="space-y-3">
                    {roundFixtures.map(fix => (
                      <FixtureCard
                        key={fix.id}
                        fix={fix}
                        expanded={expanded === fix.id}
                        onToggle={() => setExpanded(expanded === fix.id ? null : fix.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
