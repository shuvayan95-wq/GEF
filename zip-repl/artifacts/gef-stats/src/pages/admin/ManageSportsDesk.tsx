import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Zap, RefreshCw, Flame, Star, BarChart2, AlertTriangle, Swords, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface NewsArticle {
  headline: string;
  tone: "ROAST" | "PRAISE" | "ANALYSIS" | "BREAKING" | "RIVALRY";
  subject: string;
  category: string;
  body: string;
}

const TONE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  ROAST:    { label: "ROAST",    icon: Flame,         color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30" },
  PRAISE:   { label: "PRAISE",   icon: Star,          color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  ANALYSIS: { label: "ANALYSIS", icon: BarChart2,     color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/30" },
  BREAKING: { label: "BREAKING", icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  RIVALRY:  { label: "RIVALRY",  icon: Swords,        color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
};

export function ManageSportsDesk() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-sports-desk"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/ai/sports-desk"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<{ articles: NewsArticle[]; generatedAt: string | null }>;
    },
  });

  const articles = data?.articles ?? [];
  const generatedAt = data?.generatedAt ?? null;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(getApiUrl("/api/ai/sports-desk/generate"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Generation failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["ai-sports-desk"] });
      toast({ title: "New edition published!", description: "7 fresh articles are now live on the Sports Desk." });
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
          <h1 className="text-3xl font-display font-bold uppercase">AI Sports Desk</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate a fresh edition of AI-powered sports commentary. Published articles are immediately visible to all users.
          </p>
          {generatedAt && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Current edition: {format(new Date(generatedAt), "PPpp")}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/ai-news"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2 border-border">
              <Eye className="w-4 h-4" /> Preview Live Page
            </Button>
          </a>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2"
          >
            {generating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              <><Zap className="w-4 h-4" /> Generate New Edition</>
            )}
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-sm text-muted-foreground flex items-start gap-3">
        <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div>
          The AI reads all GEF data — team records, player goals & MVPs, recent match results, award history, and Ballon d'Or winners — then generates 7 brutally honest news articles. Generation takes ~10–15 seconds. Each new edition immediately replaces the previous one on the public page.
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
              <div className="h-4 w-20 bg-secondary rounded-full" />
              <div className="h-5 bg-secondary rounded" />
              <div className="h-3 bg-secondary rounded w-5/6" />
              <div className="h-3 bg-secondary rounded w-4/6" />
            </div>
          ))}
        </div>
      )}

      {/* Generating overlay */}
      {generating && (
        <div className="bg-card border border-primary/30 rounded-xl p-8 text-center mb-6">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="font-semibold">Generating fresh edition…</p>
          <p className="text-sm text-muted-foreground mt-1">Reading all GEF data and writing 7 AI articles. This takes ~15 seconds.</p>
        </div>
      )}

      {/* Articles preview */}
      {!isLoading && !generating && articles.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Current Edition</span>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{articles.length} articles</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {articles.map((article, i) => {
                const tone = TONE_CONFIG[article.tone] ?? TONE_CONFIG.ANALYSIS;
                const ToneIcon = tone.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-card border ${tone.border} rounded-xl overflow-hidden`}
                  >
                    <div className={`${tone.bg} border-b ${tone.border} px-4 py-2 flex items-center justify-between`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${tone.color}`}>
                        <ToneIcon className="w-3.5 h-3.5" />
                        {tone.label}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{article.category}</span>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{article.subject}</p>
                      <h3 className="font-display font-black uppercase text-sm leading-tight mb-2">{article.headline}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{article.body}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && !generating && articles.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-primary/50" />
          </div>
          <p className="font-display font-bold uppercase text-lg mb-1">No Edition Yet</p>
          <p className="text-sm text-muted-foreground mb-5">Generate your first Sports Desk edition to publish AI commentary to the public feed.</p>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            <Zap className="w-4 h-4" /> Generate First Edition
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
