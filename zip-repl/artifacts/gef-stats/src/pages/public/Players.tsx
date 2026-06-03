import { useListPlayers } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { PlayerCard } from "@/components/shared/PlayerCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

export function Players() {
  const { data: players, isLoading } = useListPlayers();
  const [search, setSearch] = useState("");

  const filteredPlayers = players?.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold uppercase">Player Roster</h1>
            <p className="text-muted-foreground mt-1">Browse all active players in the league.</p>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search players..." 
              className="pl-9 bg-card border-border focus-visible:border-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <div key={i} className="h-80 bg-card rounded-xl animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredPlayers.map(player => (
              <PlayerCard key={player.id} player={player} />
            ))}
            {filteredPlayers.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                No players found matching "{search}".
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
