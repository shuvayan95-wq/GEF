import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { getApiUrl } from "@/lib/api";
import { Trophy, ArrowLeft, Loader2, Swords, Shield, BarChart2 } from "lucide-react";

interface PlayerRef {
  id: number;
  name: string;
  imageUrl: string | null;
  position: string | null;
}

interface Fixture {
  id: number;
  cupId: number;
  roundKey: string;
  leg: number;
  player1Id: number | null;
  player2Id: number | null;
  player1Goals: number | null;
  player2Goals: number | null;
  notes: string | null;
  matchDate: string | null;
  player1: PlayerRef | null;
  player2: PlayerRef | null;
}

interface Round {
  key: string;
  label: string;
  order: number;
  twoLegged: boolean;
}

interface CupDetail {
  id: number;
  name: string;
  season: string | null;
  logoUrl: string | null;
  description: string | null;
  status: string;
  rounds: Round[];
  fixtures: Fixture[];
}

const defaultAvatar = "/images/default-avatar.png";

function PlayerCell({ player }: { player: PlayerRef | null }) {
  if (!player) return <span className="text-muted-foreground italic text-sm">TBD</span>;
  return (
    <Link href={`/players/${player.id}`}>
      <div className="flex items-center gap-2 group cursor-pointer">
        <img
          src={player.imageUrl || defaultAvatar}
          alt={player.name}
          className="w-8 h-8 rounded border border-border object-cover flex-shrink-0"
        />
        <span className="font-bold text-sm group-hover:text-primary transition-colors truncate">{player.name}</span>
      </div>
    </Link>
  );
}

function ScoreDisplay({ goals, isWinner }: { goals: number | null; isWinner: boolean }) {
  if (goals === null) return <span className="text-muted-foreground font-bold text-xl">—</span>;
  return (
    <span className={`font-display font-black text-2xl ${isWinner ? "text-primary" : "text-foreground"}`}>
      {goals}
    </span>
  );
}

function FixtureCard({ fix }: { fix: Fixture }) {
  const hasResult = fix.player1Goals !== null && fix.player2Goals !== null;
  const p1Wins = hasResult && fix.player1Goals! > fix.player2Goals!;
  const p2Wins = hasResult && fix.player2Goals! > fix.player1Goals!;

  return (
    <div className={`bg-card border rounded-xl p-4 ${hasResult ? "border-border" : "border-dashed border-border/50"}`}>
      <div className="flex items-center gap-3">
        {/* Player 1 */}
        <div className="flex-1 min-w-0">
          <PlayerCell player={fix.player1} />
        </div>
        {/* Score */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ScoreDisplay goals={fix.player1Goals} isWinner={p1Wins} />
          <span className="text-muted-foreground font-bold text-sm">:</span>
          <ScoreDisplay goals={fix.player2Goals} isWinner={p2Wins} />
        </div>
        {/* Player 2 */}
        <div className="flex-1 min-w-0 flex justify-end">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => fix.player2 && (window.location.href = `/players/${fix.player2.id}`)}>
            <span className="font-bold text-sm group-hover:text-primary transition-colors truncate text-right">{fix.player2?.name ?? <span className="text-muted-foreground italic">TBD</span>}</span>
            {fix.player2?.imageUrl && <img src={fix.player2.imageUrl} alt={fix.player2.name} className="w-8 h-8 rounded border border-border object-cover flex-shrink-0" />}
            {!fix.player2?.imageUrl && fix.player2 && <img src={defaultAvatar} alt="avatar" className="w-8 h-8 rounded border border-border object-cover flex-shrink-0" />}
          </div>
        </div>
      </div>
      {fix.notes && (
        <p className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">{fix.notes}</p>
      )}
      {fix.matchDate && (
        <p className="text-xs text-muted-foreground mt-1">{fix.matchDate}</p>
      )}
    </div>
  );
}

function TwoLeggedGroup({ fixtures, roundLabel }: { fixtures: Fixture[]; roundLabel: string }) {
  // Group by pair (player1Id, player2Id) — normalise so smaller id is always first
  const pairMap = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const a = Math.min(f.player1Id ?? 0, f.player2Id ?? 0);
    const b = Math.max(f.player1Id ?? 0, f.player2Id ?? 0);
    const key = `${a}-${b}`;
    if (!pairMap.has(key)) pairMap.set(key, []);
    pairMap.get(key)!.push(f);
  }

  if (pairMap.size === 0) {
    return <p className="text-muted-foreground text-sm italic">No fixtures yet.</p>;
  }

  return (
    <div className="space-y-6">
      {Array.from(pairMap.values()).map((legs, i) => {
        const sorted = [...legs].sort((a, b) => a.leg - b.leg);
        // Aggregate: figure out who's player1 and player2 across legs
        const firstLeg = sorted[0];
        let agg1 = 0, agg2 = 0;
        let agg1Complete = true, agg2Complete = true;
        for (const leg of sorted) {
          const isFirst = leg.player1Id === firstLeg.player1Id;
          if (leg.player1Goals === null || leg.player2Goals === null) { agg1Complete = false; agg2Complete = false; }
          else {
            if (isFirst) { agg1 += leg.player1Goals; agg2 += leg.player2Goals; }
            else { agg1 += leg.player2Goals; agg2 += leg.player1Goals; }
          }
        }

        return (
          <div key={i} className="bg-secondary/20 border border-border/50 rounded-xl p-4 space-y-3">
            {/* Legs */}
            {sorted.map(leg => (
              <div key={leg.id}>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Leg {leg.leg}</p>
                <FixtureCard fix={leg} />
              </div>
            ))}
            {/* Aggregate */}
            {sorted.length === 2 && agg1Complete && (
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aggregate</span>
                <span className="font-display font-black text-lg text-primary">
                  {firstLeg.player1?.name ?? "?"} {agg1} – {agg2} {firstLeg.player2?.name ?? "?"}
                  {agg1 !== agg2 && <span className="ml-2 text-xs text-green-400">({agg1 > agg2 ? firstLeg.player1?.name : firstLeg.player2?.name} wins)</span>}
                </span>
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !cup) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cup not found.
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
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Back */}
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

        {/* Rounds */}
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
                {/* Round header */}
                <div className="flex items-center gap-3 mb-4">
                  <Swords className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-display font-bold uppercase">{round.label || round.key}</h2>
                  {round.twoLegged && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-primary/30 text-primary">
                      Two Legged
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {roundFixtures.length} fixture{roundFixtures.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {roundFixtures.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic pl-2">No fixtures added yet.</p>
                ) : round.twoLegged ? (
                  <TwoLeggedGroup fixtures={roundFixtures} roundLabel={round.label} />
                ) : (
                  <div className="space-y-3">
                    {roundFixtures.map(fix => <FixtureCard key={fix.id} fix={fix} />)}
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
