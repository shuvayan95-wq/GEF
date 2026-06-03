import { Navbar } from "@/components/layout/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, BarChart2, AlertTriangle, Swords, Newspaper, Clock, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { format } from "date-fns";

interface NewsArticle {
  headline: string;
  tone: "ROAST" | "PRAISE" | "ANALYSIS" | "BREAKING" | "RIVALRY";
  subject: string;
  category: string;
  body: string;
}

const TONE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string; accent: string }> = {
  ROAST:    { label: "ROAST",    icon: Flame,         color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    accent: "from-red-500/20"    },
  PRAISE:   { label: "PRAISE",   icon: Star,          color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", accent: "from-yellow-500/20" },
  ANALYSIS: { label: "ANALYSIS", icon: BarChart2,     color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/30",    accent: "from-sky-500/20"    },
  BREAKING: { label: "BREAKING", icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", accent: "from-orange-500/20" },
  RIVALRY:  { label: "RIVALRY",  icon: Swords,        color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", accent: "from-purple-500/20" },
};

function TonePill({ tone }: { tone: string }) {
  const cfg = TONE_CONFIG[tone] ?? TONE_CONFIG.ANALYSIS;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

export function AISportsDesk() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai-sports-desk"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/ai/sports-desk"));
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<{ articles: NewsArticle[]; generatedAt: string | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const articles = data?.articles ?? [];
  const generatedAt = data?.generatedAt ?? null;
  const featured = articles[0] ?? null;
  const rest = articles.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── MASTHEAD ── */}
      <div className="border-b border-border bg-card/40">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-[10px] font-black uppercase tracking-widest text-primary">
                  <span className="relative flex w-2 h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  AI-Powered
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2.5 py-1">GEF Official</span>
              </div>
              <h1 className="font-display font-black uppercase text-5xl md:text-6xl lg:text-7xl tracking-tight leading-none">
                GEF Sports<br />
                <span className="text-primary">Desk</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-3 max-w-lg">
                The most brutally honest AI sports journalist in eFootball. Roasts, praises, rivalries &amp; hot takes — generated from live GEF data.
              </p>
            </div>
            {generatedAt && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0 mb-1">
                <Clock className="w-3.5 h-3.5" />
                Last edition: {format(new Date(generatedAt), "PPp")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thin divider bar */}
      <div className="h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="container mx-auto px-4 py-10 max-w-7xl">

        {/* ── LOADING ── */}
        {isLoading && (
          <div className="space-y-6">
            <div className="h-72 bg-card border border-border rounded-3xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-56 bg-card border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {isError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
            Failed to load articles. Please try again later.
          </div>
        )}

        {/* ── FEATURED ARTICLE ── */}
        {!isLoading && featured && (
          <AnimatePresence>
            <motion.article
              key="featured"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className={`relative overflow-hidden rounded-3xl border ${TONE_CONFIG[featured.tone]?.border ?? "border-border"} mb-8 bg-card`}
            >
              {/* Gradient accent */}
              <div className={`absolute inset-0 bg-gradient-to-br ${TONE_CONFIG[featured.tone]?.accent ?? "from-primary/10"} to-transparent pointer-events-none`} />

              <div className="relative p-6 md:p-10 lg:p-14">
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <TonePill tone={featured.tone} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2.5 py-1">{featured.category}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">— {featured.subject}</span>
                </div>

                <h2 className="font-display font-black uppercase leading-none text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-8 max-w-5xl">
                  {featured.headline}
                </h2>

                <div className="grid md:grid-cols-3 gap-6 text-sm text-foreground/80 leading-relaxed max-w-5xl">
                  {featured.body.split(/\n\n+/).filter(Boolean).map((para, pi) => (
                    <p key={pi} className={pi === 0 ? "md:col-span-1 text-base font-medium text-foreground" : para.startsWith('"') ? "border-l-2 border-primary/50 pl-3 italic text-foreground/70" : ""}>
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </motion.article>

            {/* ── REST OF ARTICLES ── */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((article, i) => {
                  const cfg = TONE_CONFIG[article.tone] ?? TONE_CONFIG.ANALYSIS;
                  const paras = article.body.split(/\n\n+/).filter(Boolean);
                  return (
                    <motion.article
                      key={i + 1}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (i + 1) * 0.06, duration: 0.35 }}
                      className={`bg-card border ${cfg.border} rounded-2xl overflow-hidden flex flex-col group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300`}
                    >
                      {/* Tone banner */}
                      <div className={`${cfg.bg} border-b ${cfg.border} px-4 py-2.5 flex items-center justify-between`}>
                        <TonePill tone={article.tone} />
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{article.category}</span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                          {article.subject}
                        </div>

                        <h2 className="font-display font-black uppercase leading-tight text-2xl sm:text-3xl mb-4 group-hover:text-primary transition-colors">
                          {article.headline}
                        </h2>

                        <div className="text-sm text-muted-foreground leading-relaxed flex-1 space-y-3">
                          {paras.map((para, pi) => (
                            <p key={pi} className={para.startsWith('"') ? "border-l-2 border-primary/40 pl-3 italic text-foreground/75" : ""}>
                              {para}
                            </p>
                          ))}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        )}

        {/* ── EMPTY ── */}
        {!isLoading && !isError && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
              <Newspaper className="w-9 h-9 text-primary/50" />
            </div>
            <h2 className="font-display font-black uppercase text-2xl mb-2">No Edition Published Yet</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              The GEF Sports Desk is waiting for its first edition. An admin can generate one from the Admin panel.
            </p>
          </div>
        )}
      </div>

      {/* Footer note */}
      {articles.length > 0 && (
        <div className="border-t border-border bg-card/30 mt-8">
          <div className="container mx-auto px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Zap className="w-3 h-3 text-primary" />
              Articles generated by AI using live GEF data. All roasts are stat-backed and thoroughly deserved.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
