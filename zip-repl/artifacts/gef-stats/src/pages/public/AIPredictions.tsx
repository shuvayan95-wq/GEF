import { Navbar } from "@/components/layout/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { format } from "date-fns";
import {
  Sparkles, TrendingUp, Zap, Shield, AlertCircle, Star, Clock,
  ChevronRight, Flame, Activity,
} from "lucide-react";

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
  BANGER:  { label: "BANGER",  icon: Flame,      color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", glow: "shadow-orange-500/20" },
  TIGHT:   { label: "TIGHT",   icon: Activity,   color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", glow: "shadow-yellow-500/20" },
  UPSET:   { label: "UPSET",   icon: AlertCircle,color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", glow: "shadow-purple-500/20" },
  ROUTINE: { label: "ROUTINE", icon: Shield,      color: "text-sky-400",   bg: "bg-sky-500/10",   border: "border-sky-500/30",   glow: "shadow-sky-500/20"   },
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color = confidence >= 80 ? "bg-emerald-500" : confidence >= 65 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Confidence</span>
        <span className="font-bold text-foreground">{confidence}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function MoodPill({ mood }: { mood: string }) {
  const cfg = MOOD_CONFIG[mood as keyof typeof MOOD_CONFIG] ?? MOOD_CONFIG.ROUTINE;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function PredictionCard({ prediction, index }: { prediction: Prediction; index: number }) {
  const mood = MOOD_CONFIG[prediction.mood as keyof typeof MOOD_CONFIG] ?? MOOD_CONFIG.ROUTINE;
  const [s1, s2] = (prediction.predictedScore ?? "1-1").split("-").map(Number);
  const team1Wins = s1 > s2;
  const team2Wins = s2 > s1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative rounded-2xl border bg-card overflow-hidden ${mood.border} shadow-lg ${mood.glow}`}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${mood.bg.replace("bg-", "bg-").replace("/10", "/60")}`} />

      <div className="p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <MoodPill mood={prediction.mood} />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-primary">AI ORACLE</span>
          </div>
        </div>

        {/* Score prediction */}
        <div className="flex items-center justify-between gap-2">
          <div className={`flex-1 text-center ${team1Wins ? "opacity-100" : "opacity-50"}`}>
            <div className={`text-sm font-black uppercase tracking-wide mb-1 ${team1Wins ? "text-primary" : "text-muted-foreground"}`}>
              {prediction.team1}
            </div>
            {team1Wins && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Predicted Winner
              </span>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 px-4">
            <div className="flex items-center gap-2 text-3xl font-black tabular-nums">
              <span className={team1Wins ? "text-primary" : "text-muted-foreground"}>{s1}</span>
              <span className="text-muted-foreground/40 text-xl">—</span>
              <span className={team2Wins ? "text-primary" : "text-muted-foreground"}>{s2}</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Predicted</span>
          </div>

          <div className={`flex-1 text-center ${team2Wins ? "opacity-100" : "opacity-50"}`}>
            <div className={`text-sm font-black uppercase tracking-wide mb-1 ${team2Wins ? "text-primary" : "text-muted-foreground"}`}>
              {prediction.team2}
            </div>
            {team2Wins && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Predicted Winner
              </span>
            )}
          </div>
        </div>

        {/* Draw case */}
        {!team1Wins && !team2Wins && (
          <div className="text-center -mt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
              Draw Predicted
            </span>
          </div>
        )}

        {/* Confidence bar */}
        <ConfidenceBar confidence={prediction.confidence} />

        {/* Star player */}
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
          <Star className="w-4 h-4 text-yellow-400 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Star to Watch</div>
            <div className="text-sm font-bold text-foreground">{prediction.starPlayer}</div>
          </div>
        </div>

        {/* Analysis */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] text-sky-400 uppercase tracking-widest font-bold">
            <TrendingUp className="w-3 h-3" /> Analysis
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{prediction.analysis}</p>
        </div>

        {/* Banter */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/90 italic leading-relaxed">"{prediction.banter}"</p>
          </div>
        </div>

        {/* Verdict */}
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <ChevronRight className={`w-4 h-4 ${mood.color}`} />
          <p className="text-sm font-semibold text-foreground">{prediction.verdict}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function AIPredictions() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai-predictions"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/ai/predictions"));
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<{ predictions: Prediction[]; generatedAt: string | null }>;
    },
    staleTime: 10 * 60 * 1000,
  });

  const predictions = data?.predictions ?? [];
  const generatedAt = data?.generatedAt ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Masthead */}
      <div className="border-b border-border bg-card/40">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-[10px] font-black uppercase tracking-widest text-primary">
                  <Sparkles className="w-3 h-3" /> AI Oracle
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-2">
                Match Predictions
              </h1>
              <p className="text-muted-foreground text-base max-w-xl">
                AI-powered match forecasts built on real GEF stats — confidence levels, predicted scores, and pundit-grade banter.
              </p>
            </div>
            {generatedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>Updated {format(new Date(generatedAt), "d MMM yyyy, HH:mm")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-card animate-pulse border border-border" />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-muted-foreground">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400 opacity-60" />
            <p className="text-lg font-semibold">Could not load predictions</p>
          </div>
        )}

        {!isLoading && !isError && predictions.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <Sparkles className="w-14 h-14 mx-auto text-primary opacity-30" />
            <h2 className="text-2xl font-bold text-foreground">No Predictions Yet</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              The AI Oracle is waiting to be activated. Ask an admin to generate the first round of predictions.
            </p>
          </div>
        )}

        {predictions.length > 0 && (
          <AnimatePresence>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {predictions.map((p, i) => (
                <PredictionCard key={i} prediction={p} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
