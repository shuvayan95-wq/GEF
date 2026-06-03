import { Navbar } from "@/components/layout/Navbar";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Trophy, Star, Crown, Medal, Shield, Zap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

function useTrophies() {
  return useQuery({
    queryKey: ["/api/trophies"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/trophies"), { credentials: "include" });
      return r.json();
    },
  });
}

const TROPHY_ICONS: Record<string, { icon: any; color: string; glow: string; label: string }> = {
  league_champion: { icon: Trophy, color: "text-yellow-400", glow: "shadow-yellow-500/40", label: "League Champion" },
  cup_winner: { icon: Crown, color: "text-purple-400", glow: "shadow-purple-500/40", label: "Cup Winner" },
  golden_boot: { icon: Zap, color: "text-orange-400", glow: "shadow-orange-500/40", label: "Golden Boot" },
  best_player: { icon: Star, color: "text-primary", glow: "shadow-primary/40", label: "Best Player" },
  top_defender: { icon: Shield, color: "text-blue-400", glow: "shadow-blue-500/40", label: "Top Defender" },
  team_award: { icon: Users, color: "text-green-400", glow: "shadow-green-500/40", label: "Team Award" },
  other: { icon: Medal, color: "text-pink-400", glow: "shadow-pink-500/40", label: "Award" },
};

function TrophyCard({ trophy, index }: { trophy: any; index: number }) {
  const meta = TROPHY_ICONS[trophy.type] || TROPHY_ICONS.other;
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "relative bg-card border border-border rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-opacity-80 group",
        "hover:shadow-xl", meta.glow
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Background glow effect */}
      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300", `bg-gradient-to-br from-current`)} />
      
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
        <Icon className="w-full h-full" />
      </div>

      {/* Trophy icon */}
      <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg", meta.glow, "bg-card border border-border")}>
        <Icon className={cn("w-8 h-8", meta.color)} />
      </div>

      {/* Trophy name */}
      <h3 className="text-lg font-display font-bold uppercase mb-1 leading-tight">{trophy.name}</h3>
      
      {/* Season & League */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs bg-secondary px-2 py-1 rounded-full text-muted-foreground font-medium">
          {trophy.season}
        </span>
        {trophy.leagueName && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium border border-primary/20">
            {trophy.leagueName}
          </span>
        )}
        <span className={cn("text-xs px-2 py-1 rounded-full font-medium border", meta.color, "bg-card border-current border-opacity-30")}>
          {meta.label}
        </span>
      </div>

      {/* Winner section */}
      <div className="border-t border-border pt-4">
        {trophy.winnerTeamName && (
          <div className="flex items-center gap-3">
            {trophy.winnerTeamLogo
              ? <img src={trophy.winnerTeamLogo} className="w-10 h-10 object-contain" alt="" />
              : <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold border border-border">{trophy.winnerTeamName[0]}</div>
            }
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Winner</div>
              <div className="font-display font-bold uppercase text-sm">{trophy.winnerTeamName}</div>
            </div>
            <Crown className={cn("w-5 h-5 ml-auto", meta.color)} />
          </div>
        )}
        {trophy.winnerPlayerName && (
          <div className="flex items-center gap-3">
            <img
              src={trophy.winnerPlayerImage || "/images/default-avatar.png"}
              className="w-10 h-10 rounded-full object-cover border-2 border-border"
              alt=""
            />
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Winner</div>
              <div className="font-display font-bold uppercase text-sm">{trophy.winnerPlayerName}</div>
            </div>
            <Star className={cn("w-5 h-5 ml-auto", meta.color)} />
          </div>
        )}
        {trophy.description && (
          <p className="text-xs text-muted-foreground mt-2 italic">{trophy.description}</p>
        )}
      </div>
    </div>
  );
}

export function Trophies() {
  const { data: trophies, isLoading } = useTrophies();

  // Group by season
  const grouped: Record<string, any[]> = {};
  (trophies || []).forEach((t: any) => {
    const key = t.season || "Unknown Season";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });
  const seasons = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Hero header */}
        <div className="text-center mb-14 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div className="w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent flex-1 max-w-24" />
            <Trophy className="w-10 h-10 text-yellow-500" />
            <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent flex-1 max-w-24" />
          </div>
          <h1 className="text-5xl font-display font-black uppercase mb-3 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
            Trophy Cabinet
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Where legends are immortalized. Every title earned, every champion crowned.
          </p>
          {trophies && (
            <div className="mt-6 inline-flex items-center gap-6 bg-card border border-border rounded-full px-8 py-3">
              <div className="text-center">
                <div className="text-2xl font-display font-black text-yellow-400">{trophies.length}</div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Trophies</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-display font-black text-primary">{seasons.length}</div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Seasons</div>
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-56 bg-card rounded-2xl animate-pulse border border-border" />)}
          </div>
        )}

        {!isLoading && seasons.length === 0 && (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500/30" />
            <h3 className="font-display text-xl uppercase text-muted-foreground mb-2">No Trophies Yet</h3>
            <p className="text-sm text-muted-foreground">The cabinet awaits its first champion.</p>
          </div>
        )}

        {seasons.map(season => (
          <section key={season} className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <h2 className="text-xl font-display font-bold uppercase">{season}</h2>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-yellow-500/30 to-transparent" />
              <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">{grouped[season].length} trophy{grouped[season].length !== 1 ? "ies" : ""}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {grouped[season].map((trophy, i) => (
                <TrophyCard key={trophy.id} trophy={trophy} index={i} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
