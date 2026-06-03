import { useListMatches } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Swords, Calendar, Trophy, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export function Matches() {
  const { data: matches, isLoading } = useListMatches();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-display font-bold uppercase mb-2 flex items-center gap-3">
          <Swords className="w-8 h-8 text-primary" /> Match Results
        </h1>
        <p className="text-muted-foreground mb-8">Complete history of team matchups and individual games.</p>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {matches?.map(match => (
              <MatchScorecard key={match.id} match={match} />
            ))}
            {matches?.length === 0 && (
              <div className="py-20 text-center text-muted-foreground">No match history available.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MatchScorecard({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false);
  const t1Won = match.team1Score > match.team2Score;
  const t2Won = match.team2Score > match.team1Score;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
      {/* Team Header */}
      <div 
        className="p-6 cursor-pointer hover:bg-secondary/30 transition-colors relative"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Calendar className="w-4 h-4" />
              {format(new Date(match.date), 'MMMM d, yyyy')}
            </div>
            {match.leagueName && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                <Globe className="w-3 h-3" /> {match.leagueName}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {expanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-4 md:gap-12">
          {/* Team 1 */}
          <div className="flex-1 text-right flex flex-col items-end gap-2">
            {match.team1LogoUrl && (
              <img src={match.team1LogoUrl} className="w-10 h-10 object-contain" alt="" />
            )}
            <h3 className={`font-display text-2xl md:text-3xl font-bold uppercase ${t1Won ? 'text-primary neon-text' : 'text-foreground'}`}>
              {match.team1Name}
            </h3>
            {t1Won && <span className="text-xs text-primary font-bold uppercase tracking-widest">Winner</span>}
          </div>

          {/* Score */}
          <div className="flex items-center justify-center px-4 md:px-8 py-3 bg-background border border-border rounded-lg shadow-inner">
            <span className="font-display text-4xl font-black text-white">{match.team1Score}</span>
            <span className="mx-3 text-muted-foreground font-bold">-</span>
            <span className="font-display text-4xl font-black text-white">{match.team2Score}</span>
          </div>

          {/* Team 2 */}
          <div className="flex-1 text-left flex flex-col items-start gap-2">
            {match.team2LogoUrl && (
              <img src={match.team2LogoUrl} className="w-10 h-10 object-contain" alt="" />
            )}
            <h3 className={`font-display text-2xl md:text-3xl font-bold uppercase ${t2Won ? 'text-primary neon-text' : 'text-foreground'}`}>
              {match.team2Name}
            </h3>
            {t2Won && <span className="text-xs text-primary font-bold uppercase tracking-widest">Winner</span>}
          </div>
        </div>
        
        {match.notes && (
          <p className="text-center text-sm text-muted-foreground mt-4 italic">"{match.notes}"</p>
        )}
      </div>

      {/* Expanded Matchups */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-background/50 overflow-hidden"
          >
            <div className="p-4 md:p-6 space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 text-center">Individual Matchups</h4>
              
              {match.playerMatchups?.map((pm: any, i: number) => {
                const p1Won = pm.player1Goals > pm.player2Goals;
                const p2Won = pm.player2Goals > pm.player1Goals;
                
                return (
                  <div key={pm.id || i} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors">
                    <div className="flex-1 text-right flex items-center justify-end gap-3">
                      <div className="text-right">
                        <span className={`font-bold uppercase block ${p1Won ? 'text-green-400' : 'text-foreground'}`}>{pm.player1Name}</span>
                        {pm.mvpPlayerId === pm.player1Id && <span className="text-[10px] text-yellow-500 font-bold flex items-center justify-end gap-1"><Trophy className="w-3 h-3"/> MVP</span>}
                      </div>
                      <img src={pm.player1ImageUrl || "/images/default-avatar.png"} className="w-9 h-9 rounded-full object-cover border-2 border-primary/30" alt="" />
                    </div>
                    
                    <div className="px-4 flex items-center gap-3 font-mono font-bold text-lg shrink-0">
                      <span className={p1Won ? 'text-green-400' : 'text-muted-foreground'}>{pm.player1Goals}</span>
                      <span className="text-muted-foreground/50 text-sm">vs</span>
                      <span className={p2Won ? 'text-green-400' : 'text-muted-foreground'}>{pm.player2Goals}</span>
                    </div>

                    <div className="flex-1 text-left flex items-center gap-3">
                      <img src={pm.player2ImageUrl || "/images/default-avatar.png"} className="w-9 h-9 rounded-full object-cover border-2 border-accent/30" alt="" />
                      <div>
                        <span className={`font-bold uppercase block ${p2Won ? 'text-green-400' : 'text-foreground'}`}>{pm.player2Name}</span>
                        {pm.mvpPlayerId === pm.player2Id && <span className="text-[10px] text-yellow-500 font-bold flex items-center gap-1"><Trophy className="w-3 h-3"/> MVP</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {(!match.playerMatchups || match.playerMatchups.length === 0) && (
                <div className="text-center text-sm text-muted-foreground py-4">No individual matchups recorded.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
