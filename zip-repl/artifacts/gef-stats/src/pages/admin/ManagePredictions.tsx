import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, RefreshCw, Zap, Eye, Clock, TrendingUp, Star,
  AlertCircle, Flame, Activity, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Prediction {
  team1: string;
  team2: string;
  predictedScore: string;
  winner: string;
  confidence: number;
  starPlayer: string;
  analysis: string;
  banter: string;
  verdict: string;
  mood: "BANGER" | "TIGHT" | "UPSET" | "ROUTINE";
}

const MOOD_CONFIG = {
  BANGER:  { label: "BANGER",  icon: Flame,      color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  TIGHT:   { label: "TIGHT",   icon: Activity,   color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  UPSET:   { label: "UPSET",   icon: AlertCircle,color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  ROUTINE: { label: "ROUTINE", icon: Shield,      color: "text-sky-400",   bg: "bg-sky-500/10",   border: "border-sky-500/30"   },
};

export function ManagePredictions() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-predictions"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/ai/predictions"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<{ predictions: Prediction[]; generatedAt: string | null }>;
    },
  });

  const predictions = data?.predictions ?? [];
  const generatedAt = data?.generatedAt ?? null;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(getApiUrl("/api/ai/predictions/generate"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Generation failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["ai-predictions"] });
      toast({ title: "Predictions published!", description: "Fresh AI match predictions are now live." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Generation failed", description: err?.message });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase">AI Match Predictions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate AI-powered match predictions based on live GEF stats. Published predictions are immediately visible to all users.
          </p>
          {generatedAt && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Current batch: {format(new Date(generatedAt), "PPpp")}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a href="/predictions" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2 border-border">
              <Eye className="w-4 h-4" /> Preview Live Page
            </Button>
          </a>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Predictions</>
            )}
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-sm text-muted-foreground flex items-start gap-3">
        <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div>
          The AI Oracle reads all GEF data — team form, win rates, goal difference, H2H records, star player stats — and generates 4–6 match predictions with confidence levels, scorelines, analysis, and pundit banter. Generation takes ~15 seconds. Each new batch replaces the previous one.
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
              <div className="h-4 w-20 bg-secondary rounded-full" />
              <div className="h-6 bg-secondary rounded" />
              <div className="h-3 bg-secondary rounded w-5/6" />
              <div className="h-3 bg-secondary rounded w-4/6" />
            </div>
          ))}
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="bg-card border border-primary/30 rounded-xl p-8 text-center mb-6">
          <Sparkles className="w-8 h-8 text-primary animate-pulse mx-auto mb-3" />
          <p className="font-semibold">The Oracle is calculating…</p>
          <p className="text-sm text-muted-foreground mt-1">
            Reading team form, H2H records, player stats, and generating predictions. ~15 seconds.
          </p>
        </div>
      )}

      {/* Predictions preview */}
      {!isLoading && !generating && predictions.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Current Batch</span>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{predictions.length} predictions</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {predictions.map((p, i) => {
                const mood = MOOD_CONFIG[p.mood as keyof typeof MOOD_CONFIG] ?? MOOD_CONFIG.ROUTINE;
                const MoodIcon = mood.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-card border ${mood.border} rounded-xl overflow-hidden`}
                  >
                    <div className={`${mood.bg} border-b ${mood.border} px-4 py-2 flex items-center justify-between`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${mood.color}`}>
                        <MoodIcon className="w-3.5 h-3.5" /> {mood.label}
                      </div>
                      <span className={`text-[10px] font-bold ${p.confidence >= 80 ? "text-emerald-400" : p.confidence >= 65 ? "text-yellow-400" : "text-red-400"}`}>
                        {p.confidence}% confidence
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Match */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-black uppercase ${p.winner === p.team1 ? "text-primary" : "text-muted-foreground"}`}>{p.team1}</span>
                        <span className="text-lg font-black tabular-nums text-foreground">{p.predictedScore}</span>
                        <span className={`text-sm font-black uppercase ${p.winner === p.team2 ? "text-primary" : "text-muted-foreground"}`}>{p.team2}</span>
                      </div>
                      {/* Star player */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="font-semibold">{p.starPlayer}</span>
                      </div>
                      {/* Analysis */}
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3 text-sky-400 mt-0.5 shrink-0" />
                        <p className="line-clamp-2 leading-relaxed">{p.analysis}</p>
                      </div>
                      {/* Banter */}
                      <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2 line-clamp-1">"{p.banter}"</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && !generating && predictions.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary/50" />
          </div>
          <p className="font-display font-bold uppercase text-lg mb-1">No Predictions Yet</p>
          <p className="text-sm text-muted-foreground mb-5">
            Generate the first batch to publish AI match predictions to all users.
          </p>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            <Sparkles className="w-4 h-4" /> Generate First Batch
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
