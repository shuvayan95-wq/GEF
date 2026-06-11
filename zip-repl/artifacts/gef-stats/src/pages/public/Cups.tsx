import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getApiUrl } from "@/lib/api";
import { Trophy, ChevronRight, Calendar, Loader2 } from "lucide-react";

interface Cup {
  id: number;
  name: string;
  season: string | null;
  logoUrl: string | null;
  description: string | null;
  status: string;
  rounds: { key: string; label: string; order: number; twoLegged: boolean }[];
  createdAt: string;
}

export function Cups() {
  const { data: cups = [], isLoading } = useQuery<Cup[]>({
    queryKey: ["/api/cups"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/cups"));
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-display font-black uppercase tracking-tight">Knockout Cups</h1>
          </div>
          <p className="text-muted-foreground">Mini knockout competitions — from two-legged finals to full RO16 brackets.</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && cups.length === 0 && (
          <div className="text-center py-24 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-bold uppercase">No cups yet</p>
            <p className="text-sm mt-1">Check back soon.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {cups.map(cup => {
            const rounds = (cup.rounds as any[]) ?? [];
            const roundLabels = rounds.map((r: any) => r.label || r.key).join(" → ");
            return (
              <Link key={cup.id} href={`/cups/${cup.id}`}>
                <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group">
                  <div className="flex items-start gap-4">
                    {cup.logoUrl ? (
                      <img src={cup.logoUrl} alt={cup.name} className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                        <Trophy className="w-7 h-7 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-display font-bold text-lg uppercase truncate group-hover:text-primary transition-colors">{cup.name}</h2>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                      </div>
                      {cup.season && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" /> {cup.season}
                        </div>
                      )}
                      {cup.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cup.description}</p>
                      )}
                      {rounds.length > 0 && (
                        <p className="text-xs text-primary font-bold mt-2 uppercase tracking-wider">{roundLabels}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                      cup.status === "completed"
                        ? "text-gray-400 bg-gray-500/10 border-gray-500/30"
                        : "text-green-400 bg-green-500/10 border-green-500/30"
                    }`}>
                      {cup.status === "completed" ? "Completed" : "Active"}
                    </span>
                    <span className="text-xs text-muted-foreground">{rounds.length} round{rounds.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
