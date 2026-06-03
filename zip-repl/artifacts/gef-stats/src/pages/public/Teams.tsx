import { useListTeams } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Shield, Users, ChevronRight, LogOut } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";

export function Teams() {
  const { data: allTeams, isLoading } = useListTeams();
  const [showInactive, setShowInactive] = useState(false);

  const activeTeams = allTeams?.filter(t => (t as any).status !== "left") ?? [];
  const inactiveTeams = allTeams?.filter(t => (t as any).status === "left") ?? [];

  const TeamCard = ({ team, i, dimmed }: { team: any; i: number; dimmed?: boolean }) => (
    <motion.div
      key={team.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
    >
      <Link href={`/teams/${team.id}`}>
        <div className={`group bg-card border rounded-xl p-5 transition-all cursor-pointer shadow-sm hover:shadow-md ${dimmed ? "border-border/40 opacity-60 hover:opacity-80 hover:border-border" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}>
          <div className="flex items-center gap-4">
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="w-14 h-14 object-contain rounded-lg border border-border/50 shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                <Shield className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className={`font-display font-bold uppercase text-lg truncate transition-colors ${dimmed ? "text-muted-foreground group-hover:text-foreground" : "text-primary group-hover:text-primary"}`}>{team.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> {team.players?.length || 0} players
                </p>
                {dimmed && (
                  <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                    <LogOut className="w-2.5 h-2.5" /> Left
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </div>
      </Link>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-4xl font-display font-bold uppercase mb-2">Franchises</h1>
        <p className="text-muted-foreground mb-8">Official clubs participating in the GEF league. Click a club to view their full profile.</p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-28 bg-card rounded-xl animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTeams.map((team, i) => (
                <TeamCard key={team.id} team={team} i={i} />
              ))}
              {activeTeams.length === 0 && (
                <div className="col-span-3 py-20 text-center text-muted-foreground">
                  No active teams registered yet.
                </div>
              )}
            </div>

            {inactiveTeams.length > 0 && (
              <div className="mt-10">
                <button
                  onClick={() => setShowInactive(!showInactive)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 group"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span className="font-bold uppercase tracking-wider">
                    {showInactive ? "Hide" : "Show"} Inactive Teams
                  </span>
                  <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 font-bold">
                    {inactiveTeams.length}
                  </span>
                </button>

                {showInactive && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {inactiveTeams.map((team, i) => (
                      <TeamCard key={team.id} team={team} i={i} dimmed />
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
