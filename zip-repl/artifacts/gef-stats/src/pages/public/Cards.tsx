import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Layers, Search, Filter, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerCard } from "@/components/PlayerCard";

interface EfCard {
  id: number;
  name: string;
  imageUrl: string | null;
  position: string | null;
  nationality: string | null;
  clubName: string | null;
  cardOvr: number | null;
  cardType: string | null;
  playingStyle: string | null;
  cardPace: number | null;
  cardShooting: number | null;
  cardPassing: number | null;
  cardDribbling: number | null;
  cardDefending: number | null;
  cardPhysical: number | null;
}

const CARD_TYPES = ["All", "Black Ball", "Iconic", "Featured", "Matchday", "Standard"];
const POSITIONS = ["All", "GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST", "SS"];

const TYPE_ORDER: Record<string, number> = {
  "Black Ball": 0, "Iconic": 1, "Featured": 2, "Matchday": 3, "Standard": 4,
};

export function Cards() {
  const { data: allCards, isLoading } = useQuery<EfCard[]>({
    queryKey: ["/api/ef-cards"],
    queryFn: () => fetch(getApiUrl("/api/ef-cards")).then(r => r.json()),
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [posFilter, setPosFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"ovr" | "pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical">("ovr");

  const cards = useMemo(() => {
    if (!allCards) return [];
    return allCards
      .filter(c => typeFilter === "All" || c.cardType === typeFilter)
      .filter(c => posFilter === "All" || c.position?.toUpperCase() === posFilter)
      .filter(c => {
        const q = search.toLowerCase().trim();
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.clubName?.toLowerCase().includes(q) ?? false) ||
          (c.playingStyle?.toLowerCase().includes(q) ?? false) ||
          (c.nationality?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        const key = sortBy === "ovr" ? "cardOvr" : `card${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`;
        const aVal = (a as any)[key] ?? 0;
        const bVal = (b as any)[key] ?? 0;
        if (bVal !== aVal) return bVal - aVal;
        return (TYPE_ORDER[a.cardType ?? "Standard"] ?? 4) - (TYPE_ORDER[b.cardType ?? "Standard"] ?? 4);
      });
  }, [allCards, typeFilter, posFilter, search, sortBy]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1 flex items-center justify-center gap-2">
            <Layers className="w-3 h-3" /> GEF Card Gallery
          </div>
          <h1 className="text-4xl font-display font-bold uppercase">Player Cards</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse eFootball in-game cards curated by GEF
          </p>
          {!isLoading && (
            <div className="mt-3 inline-flex items-center gap-2 bg-card border border-border px-4 py-1.5 rounded-full text-sm">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-primary">{allCards?.length ?? 0}</span>
              <span className="text-muted-foreground">cards in database</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by player, club, playing style, nationality…"
              className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Card type */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Type</span>
              <div className="flex flex-wrap gap-1.5">
                {CARD_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all",
                      typeFilter === t
                        ? t === "Black Ball" ? "bg-yellow-500/20 border-yellow-500/60 text-yellow-300"
                          : t === "Iconic" ? "bg-amber-500/20 border-amber-400/60 text-amber-300"
                          : t === "Featured" ? "bg-blue-500/20 border-blue-400/50 text-blue-300"
                          : t === "Matchday" ? "bg-green-500/20 border-green-400/50 text-green-300"
                          : "bg-primary/15 border-primary/40 text-primary"
                        : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Pos</span>
              <select
                value={posFilter}
                onChange={e => setPosFilter(e.target.value)}
                className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-primary/50 text-foreground"
              >
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 ml-auto">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Sort</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-primary/50 text-foreground"
              >
                {["ovr","pace","shooting","passing","dribbling","defending","physical"].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-card rounded-2xl animate-pulse border border-border" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
            <Layers className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="font-display uppercase text-xl">
              {!allCards?.length ? "No cards in database yet" : "No cards match your filters"}
            </p>
            <p className="text-sm mt-2 max-w-xs mx-auto opacity-70">
              {!allCards?.length
                ? "Admins can add eFootball cards via Admin → eFootball Cards."
                : "Try adjusting your filters or search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <AnimatePresence mode="popLayout">
              {cards.map((card, i) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.2 }}
                  className="group"
                >
                  <div className="transition-transform duration-200 group-hover:-translate-y-1 group-hover:drop-shadow-2xl cursor-default">
                    <PlayerCard
                      player={{
                        name: card.name,
                        imageUrl: card.imageUrl,
                        position: card.position,
                        nationality: card.nationality,
                        cardOvr: card.cardOvr,
                        cardType: card.cardType,
                        cardPace: card.cardPace,
                        cardShooting: card.cardShooting,
                        cardPassing: card.cardPassing,
                        cardDribbling: card.cardDribbling,
                        cardDefending: card.cardDefending,
                        cardPhysical: card.cardPhysical,
                        cardPlayingStyle: card.playingStyle,
                      }}
                      size="md"
                      className="w-full"
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-xs font-bold truncate">{card.name}</div>
                    {card.clubName && (
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground truncate">{card.clubName}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
