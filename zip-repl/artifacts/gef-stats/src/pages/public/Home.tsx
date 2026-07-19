import { Navbar } from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, CalendarDays, MapPin, Clock, Flame,
  BookOpen, Megaphone, Newspaper, Zap, Users, Shield,
  Swords, Trophy, ArrowLeftRight, Star, Skull, TrendingUp,
  Globe, Handshake, Crown, BarChart2, AlertTriangle, MessageCircle,
} from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { format, isPast } from "date-fns";
import { useEffect, useState } from "react";

function useCountUp(target: number, duration = 1100, delay = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target || isNaN(target)) return;
    let raf: number;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  return count;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface CmsPost {
  id: number; title: string; slug: string; excerpt: string; content: string;
  category: string; author: string; imageUrl: string | null;
  isPublished: boolean; publishedAt: string | null;
}
interface CmsEvent {
  id: number; title: string; description: string; eventDate: string;
  eventTime: string | null; location: string | null; isPublished: boolean;
}
interface Transfer {
  id: number; playerName: string; playerImageUrl: string | null;
  fromTeamName: string | null; toTeamName: string | null;
  fromTeamLogoUrl: string | null; toTeamLogoUrl: string | null;
  transferDate: string; fee: number | null; transferType: string;
}
interface TeamRival {
  teamAId: number; teamBId: number; teamAName: string; teamBName: string;
  teamALogoUrl: string | null; teamBLogoUrl: string | null;
  teamAWins: number; teamBWins: number; draws: number; total: number;
}
interface PlayerRival {
  p1Id: number; p2Id: number; p1Name: string; p2Name: string;
  p1ImageUrl: string | null; p2ImageUrl: string | null;
  p1Wins: number; p2Wins: number; draws: number; total: number;
  p1Goals: number; p2Goals: number;
}
interface CmsPartner {
  id: number; name: string; description: string;
  imageUrl: string | null; type: string; website: string | null;
  sortOrder: number; isVisible: boolean;
}
interface CmsAdminMember {
  id: number; name: string; role: string;
  imageUrl: string | null; bio: string;
  sortOrder: number; isVisible: boolean;
}
interface NewsArticle {
  headline: string;
  tone: "ROAST" | "PRAISE" | "ANALYSIS" | "BREAKING" | "RIVALRY";
  subject: string;
  category: string;
  body: string;
}
type CmsSettings = Record<string, string>;

// ── Category Styles ──────────────────────────────────────────────────────────

const TONE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  ROAST:    { label: "ROAST",    icon: Flame,         color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30"    },
  PRAISE:   { label: "PRAISE",   icon: Star,          color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  ANALYSIS: { label: "ANALYSIS", icon: BarChart2,     color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/30"    },
  BREAKING: { label: "BREAKING", icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  RIVALRY:  { label: "RIVALRY",  icon: Swords,        color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
};

const CATEGORY_STYLES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  news:         { label: "News",         color: "text-blue-400 bg-blue-500/10 border-blue-500/20",     icon: Newspaper  },
  blog:         { label: "Blog",         color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: BookOpen },
  announcement: { label: "Announcement", color: "text-amber-400 bg-amber-500/10 border-amber-500/20",  icon: Megaphone  },
};

// ── Stat Counter ─────────────────────────────────────────────────────────────

function StatCounter({ stat, index }: { stat: { icon: React.ElementType; label: string; value: number | string; color: string; bg: string }; index: number }) {
  const numTarget = typeof stat.value === "number" ? stat.value : 0;
  const count = useCountUp(numTarget, 1100, index * 140);
  const display = typeof stat.value === "string" ? stat.value : count;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}
      className="card-beam flex items-center gap-3 p-4 rounded-xl bg-background border border-border/80 hover:border-primary/30 transition-colors group"
    >
      <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        <stat.icon className={`w-5 h-5 ${stat.color}`} />
      </div>
      <div>
        <div className={`text-xl font-display font-black tabular-nums ${stat.color}`}>{display}</div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">{stat.label}</div>
      </div>
    </motion.div>
  );
}

// ── Sub-Components ────────────────────────────────────────────────────────────

function PostCard({ post, index }: { post: CmsPost; index: number }) {
  const cat = CATEGORY_STYLES[post.category] ?? CATEGORY_STYLES.news;
  const CatIcon = cat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all group flex flex-col"
    >
      {post.imageUrl ? (
        <div className="h-44 overflow-hidden shrink-0">
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <div className="h-44 bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center shrink-0">
          <CatIcon className="w-12 h-12 text-primary/30" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 mb-3 w-fit ${cat.color}`}>
          <CatIcon className="w-3 h-3" /> {cat.label}
        </div>
        <h3 className="font-display font-black uppercase text-base mb-2 leading-tight group-hover:text-primary transition-colors">{post.title}</h3>
        {post.excerpt && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">{post.excerpt}</p>}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">{post.author}</span>
          {post.publishedAt && <span className="text-[11px] text-muted-foreground">{format(new Date(post.publishedAt), "MMM d, yyyy")}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function EventCard({ event, index }: { event: CmsEvent; index: number }) {
  const past = isPast(new Date(event.eventDate + (event.eventTime ? `T${event.eventTime}` : "T23:59")));
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}
      className={`flex gap-4 p-4 rounded-xl border ${past ? "opacity-50 border-border bg-card/50" : "border-primary/20 bg-primary/5"}`}
    >
      <div className={`shrink-0 w-14 text-center rounded-xl py-2 ${past ? "bg-secondary" : "bg-primary/10 border border-primary/20"}`}>
        <div className="text-xs font-bold text-muted-foreground uppercase">{format(new Date(event.eventDate), "MMM")}</div>
        <div className={`text-2xl font-display font-black leading-none ${past ? "text-muted-foreground" : "text-primary"}`}>{format(new Date(event.eventDate), "d")}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm uppercase truncate">{event.title}</div>
        {event.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>}
        <div className="flex flex-wrap gap-3 mt-2">
          {event.eventTime && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" /> {event.eventTime}</span>}
          {event.location && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="w-3 h-3" /> {event.location}</span>}
        </div>
      </div>
      {past && <span className="text-[10px] font-bold text-muted-foreground self-start bg-secondary px-2 py-0.5 rounded-full">Past</span>}
    </motion.div>
  );
}

function WinBar({ aWins, bWins, draws }: { aWins: number; bWins: number; draws: number }) {
  const total = aWins + bWins + draws || 1;
  const aPct = Math.round((aWins / total) * 100);
  const dPct = Math.round((draws / total) * 100);
  const bPct = 100 - aPct - dPct;
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full">
      <div className="bg-green-500 transition-all" style={{ width: `${aPct}%` }} />
      <div className="bg-yellow-500/60 transition-all" style={{ width: `${dPct}%` }} />
      <div className="bg-red-500 transition-all" style={{ width: `${bPct}%` }} />
    </div>
  );
}

// ── Fan Community Section ─────────────────────────────────────────────────────

const PERSONALITY_CFG: Record<string, { emoji: string; label: string; color: string }> = {
  optimistic:       { emoji: "😄", label: "Optimist",    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
  angry:            { emoji: "😤", label: "Furious",     color: "text-red-400 bg-red-400/10 border-red-400/25" },
  sarcastic:        { emoji: "😏", label: "Sarcastic",   color: "text-purple-400 bg-purple-400/10 border-purple-400/25" },
  tactical:         { emoji: "📊", label: "Tactician",   color: "text-sky-400 bg-sky-400/10 border-sky-400/25" },
  transfer_addict:  { emoji: "💰", label: "Transfer MD", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/25" },
  young_supporter:  { emoji: "🔥", label: "Young Fan",   color: "text-orange-400 bg-orange-400/10 border-orange-400/25" },
  old_guard:        { emoji: "🧓", label: "Old Guard",   color: "text-stone-400 bg-stone-400/10 border-stone-400/25" },
  glory_hunter:     { emoji: "🏆", label: "Glory Hunter",color: "text-amber-400 bg-amber-400/10 border-amber-400/25" },
  die_hard:         { emoji: "❤️", label: "Die Hard",    color: "text-rose-400 bg-rose-400/10 border-rose-400/25" },
  media_pundit:     { emoji: "🎙️", label: "Pundit",      color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/25" },
  legend:           { emoji: "👑", label: "Legend",      color: "text-amber-300 bg-amber-300/10 border-amber-300/25" },
  neutral_observer: { emoji: "🤷", label: "Neutral",     color: "text-gray-400 bg-gray-400/10 border-gray-400/25" },
  frustrated:       { emoji: "😞", label: "Frustrated",  color: "text-red-300 bg-red-300/10 border-red-300/25" },
  neutral:          { emoji: "🤷", label: "Neutral",     color: "text-gray-400 bg-gray-400/10 border-gray-400/25" },
};

function FanCommunitySection() {
  const { data: feed } = useQuery<{ articles: any[]; reactions: any[] }>({
    queryKey: ["home-fan-community"],
    queryFn: () => fetch("/api/fan-community/feed?limit=8").then(r => r.ok ? r.json() : { articles: [], reactions: [] }),
    staleTime: 60_000,
  });
  const { data: fanbase = [] } = useQuery<any[]>({
    queryKey: ["fanbase-leaderboard"],
    queryFn: () => fetch("/api/fanbase/leaderboard").then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });

  const articles = feed?.articles ?? [];
  const reactions = feed?.reactions ?? [];
  const totalFans = fanbase.reduce((s: number, c: any) => s + (c.currentFans || 0), 0);

  if (articles.length === 0 && reactions.length === 0) return null;

  const featured = articles[0];
  const isDraw = featured ? featured.homeScore === featured.awayScore : false;
  const homeWon = featured ? featured.homeScore > featured.awayScore : false;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary mb-2">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Live · Virtual Fan Community
          </div>
          <h2 className="font-display font-black uppercase text-3xl sm:text-4xl tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <span>Fan <span className="text-primary">Hub</span></span>
          </h2>
          {totalFans > 0 && (
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">
              <span className="text-primary font-black">{totalFans.toLocaleString()}</span> supporters across {fanbase.length} clubs
            </p>
          )}
        </div>
        <Link href="/fan-community">
          <Button variant="outline" size="sm" className="gap-2 border-primary/25 hover:border-primary/50 hover:bg-primary/5">
            <MessageCircle className="w-4 h-4" /> Full Fan Hub <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Featured article (3 cols) ── */}
        {featured && (
          <div className="lg:col-span-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Newspaper className="w-3.5 h-3.5 text-primary" />
              <span>Latest Match Report</span>
            </div>
            <Link href="/fan-community">
              <motion.div
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className={`relative overflow-hidden bg-card border rounded-2xl cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 ${featured.matchType === "gcc" ? "border-amber-500/25" : "border-border"}`}
              >
                {featured.matchType === "gcc" && (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                )}

                {/* Comp banner */}
                <div className={`px-5 py-2 flex items-center gap-2 ${featured.matchType === "gcc" ? "bg-amber-500/10 border-b border-amber-500/15" : "bg-primary/5 border-b border-primary/10"}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${featured.matchType === "gcc" ? "text-amber-400" : "text-primary"}`}>
                    {featured.matchType === "gcc" ? "🏆 Champions Cup" : "⚽ League Match"}
                  </span>
                </div>

                <div className="p-5">
                  {/* Scoreline */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${homeWon ? "opacity-100" : isDraw ? "opacity-70" : "opacity-40"}`}>
                      {featured.homeTeam?.logoUrl && <img src={featured.homeTeam.logoUrl} className="w-8 h-8 object-contain shrink-0" alt="" />}
                      <span className="font-display font-black text-sm uppercase truncate">{featured.homeTeam?.name ?? "?"}</span>
                    </div>
                    <div className="text-center shrink-0 bg-secondary rounded-xl px-3 py-1.5 mx-1">
                      <div className="text-xl font-black tabular-nums tracking-tighter">
                        {featured.homeScore}<span className="text-muted-foreground mx-0.5">–</span>{featured.awayScore}
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-widest">{isDraw ? "Draw" : homeWon ? "Home Win" : "Away Win"}</div>
                    </div>
                    <div className={`flex items-center gap-2 flex-1 min-w-0 ${!homeWon && !isDraw ? "opacity-100" : isDraw ? "opacity-70" : "opacity-40"}`}>
                      <span className="font-display font-black text-sm uppercase truncate">{featured.awayTeam?.name ?? "?"}</span>
                      {featured.awayTeam?.logoUrl && <img src={featured.awayTeam.logoUrl} className="w-8 h-8 object-contain shrink-0" alt="" />}
                    </div>
                  </div>

                  <h3 className="font-display font-black uppercase text-2xl sm:text-3xl leading-tight mb-3 group-hover:text-primary transition-colors">
                    {featured.headline}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{featured.summary}</p>

                  {featured.talkingPoint && (
                    <div className="mt-3 bg-primary/5 border border-primary/15 rounded-xl p-3">
                      <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">💬 Talking Point  </span>
                      <span className="text-xs text-muted-foreground">{featured.talkingPoint}</span>
                    </div>
                  )}

                  <div className="mt-4 text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read full report <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        )}

        {/* ── Fan reactions (2 cols) ── */}
        <div className={featured ? "lg:col-span-2" : "lg:col-span-5"}>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <MessageCircle className="w-3.5 h-3.5 text-violet-400" />
            <span>Latest Reactions</span>
          </div>
          <div className="space-y-2.5">
            {reactions.slice(0, 6).map((r: any, i: number) => {
              const pcfg = PERSONALITY_CFG[r.fanPersonality] ?? PERSONALITY_CFG.neutral;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className={`bg-card border rounded-xl p-3 transition-all hover:border-primary/20 ${r.isRival ? "border-red-500/20 bg-red-500/3" : r.isPinned ? "border-yellow-500/25 bg-yellow-500/3" : "border-border"}`}
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {r.team?.logoUrl
                      ? <img src={r.team.logoUrl} className="w-4 h-4 object-contain shrink-0" alt="" />
                      : null
                    }
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wide truncate max-w-[90px]">
                      {r.team?.name ?? "Fan"}
                    </span>
                    {r.isRival && <span className="text-[9px] text-red-400 font-black">⚔️ Rival</span>}
                    {r.isPinned && <span className="text-[9px] text-yellow-400 font-black">⭐ Pinned</span>}
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ml-auto ${pcfg.color}`}>
                      {pcfg.emoji} {pcfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed line-clamp-2 font-medium">{r.comment}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Top fanbases mini list */}
          {fanbase.length > 0 && (
            <div className="mt-4 bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Top Fanbases</span>
                </div>
                <Link href="/fanbase">
                  <span className="text-[10px] text-primary font-black uppercase tracking-wide hover:text-primary/80">Full table →</span>
                </Link>
              </div>
              <div className="divide-y divide-border">
                {fanbase.slice(0, 3).map((club: any, i: number) => (
                  <div key={club.teamId} className="px-4 py-2.5 flex items-center gap-2.5">
                    <span className="text-sm shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                    {club.logoUrl && <img src={club.logoUrl} className="w-5 h-5 object-contain shrink-0" alt="" />}
                    <span className="text-xs font-bold flex-1 truncate">{club.teamName}</span>
                    <span className="text-xs font-black text-primary">{club.currentFans.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link href="/fan-community">
            <button className="mt-3 w-full text-center text-xs font-black text-primary uppercase tracking-wider py-2.5 border border-primary/20 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all">
              Enter Fan Community →
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Home() {
  const { data: settings } = useQuery<CmsSettings>({
    queryKey: ["cms-settings"],
    queryFn: () => fetch("/api/cms/settings").then(r => r.json()),
  });
  const { data: posts = [] } = useQuery<CmsPost[]>({
    queryKey: ["cms-posts"],
    queryFn: () => fetch("/api/cms/posts").then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });
  const { data: events = [] } = useQuery<CmsEvent[]>({
    queryKey: ["cms-events"],
    queryFn: () => fetch("/api/cms/events").then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });
  const { data: transfers = [] } = useQuery<Transfer[]>({
    queryKey: ["recent-transfers"],
    queryFn: () => fetch("/api/transfers").then(r => r.json()).then(d => Array.isArray(d) ? d : (d.transfers ?? [])),
  });
  const { data: rivals } = useQuery<{ teamRivals: TeamRival[]; playerRivals: PlayerRival[] }>({
    queryKey: ["rivals"],
    queryFn: () => fetch("/api/rivals").then(r => r.json()),
  });
  const { data: players = [] } = useQuery<any[]>({
    queryKey: ["all-players-count"],
    queryFn: () => fetch("/api/players").then(r => r.json()),
  });
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["all-teams-count"],
    queryFn: () => fetch("/api/teams").then(r => r.json()),
  });
  const { data: matches = [] } = useQuery<any[]>({
    queryKey: ["all-matches-count"],
    queryFn: () => fetch("/api/matches").then(r => r.json()),
  });
  const { data: partners = [] } = useQuery<CmsPartner[]>({
    queryKey: ["cms-partners"],
    queryFn: () => fetch("/api/cms/partners").then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });
  const { data: adminTeam = [] } = useQuery<CmsAdminMember[]>({
    queryKey: ["cms-admin-team"],
    queryFn: () => fetch("/api/cms/admin-team").then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });
  const { data: sportsDesk } = useQuery<{ articles: NewsArticle[]; generatedAt: string | null }>({
    queryKey: ["ai-sports-desk"],
    queryFn: () => fetch(getApiUrl("/api/ai/sports-desk")).then(r => r.ok ? r.json() : { articles: [], generatedAt: null }),
    staleTime: 5 * 60 * 1000,
  });
  const articles = sportsDesk?.articles ?? [];

  const s = settings ?? {};
  const upcomingEvents = events.filter(e => !isPast(new Date(e.eventDate + "T23:59")));
  const pastEvents = events.filter(e => isPast(new Date(e.eventDate + "T23:59")));
  const sortedEvents = [...upcomingEvents, ...pastEvents].slice(0, 6);
  const funFacts = [s.fun_fact_1, s.fun_fact_2, s.fun_fact_3].filter(Boolean);
  const teamRivals = rivals?.teamRivals ?? [];
  const playerRivals = rivals?.playerRivals ?? [];
  const hasRivals = teamRivals.length > 0 || playerRivals.length > 0;

  const STAT_BOXES = [
    { icon: Users,    label: "Players",       value: players.length, color: "text-blue-400",   bg: "bg-blue-500/10"   },
    { icon: Shield,   label: "Teams",         value: teams.length,   color: "text-green-400",  bg: "bg-green-500/10"  },
    { icon: Swords,   label: "Matches",       value: matches.length, color: "text-purple-400", bg: "bg-purple-500/10" },
    { icon: Trophy,   label: "Season",        value: "2024/25",      color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative w-full min-h-[580px] flex items-center justify-center overflow-hidden border-b border-primary/10 scanline-beam">
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg opacity-60" />
        {/* Hero image */}
        <div className="absolute inset-0 z-0">
          <img src={`${import.meta.env.BASE_URL}images/hero-bg.png`} alt="Hero"
            className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        {/* Radial glow center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,hsl(var(--primary)/0.07),transparent)]" />

        {/* Corner bracket decorations */}
        <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-primary/40" />
        <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-primary/40" />
        <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-primary/40" />
        <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-primary/40" />

        <div className="container relative z-10 px-4 text-center py-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {s.hero_badge && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/40 text-primary text-xs font-bold tracking-widest uppercase mb-6 neon-pulse"
              >
                <Flame className="w-3.5 h-3.5" /> {s.hero_badge}
              </motion.div>
            )}
            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
              className="glitch font-display text-5xl md:text-7xl lg:text-8xl font-black text-foreground uppercase tracking-tighter mb-5 drop-shadow-2xl leading-none"
              style={{ textShadow: "0 0 40px hsl(var(--primary)/0.15)" }}
            >
              {s.hero_title ?? "Global eFootball Federation"}
            </motion.h1>
            {s.hero_subtitle && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-light leading-relaxed"
              >
                {s.hero_subtitle}
              </motion.p>
            )}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/players">
                <Button variant="gaming" size="lg" className="w-full sm:w-auto relative overflow-hidden">
                  View Players <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/matches">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all">
                  Latest Matches
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </section>

      {/* ── QUICK STATS STRIP ─────────────────────────────────────────────── */}
      <section className="border-b border-border/60 bg-card/40">
        <div className="container mx-auto px-4 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STAT_BOXES.map((stat, i) => (
              <StatCounter key={stat.label} stat={stat} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── AI SPORTS DESK STRIP ─────────────────────────────────────────── */}
      {articles.length > 0 && (
        <section className="border-b border-border bg-card/20">
          {/* Section header */}
          <div className="container mx-auto px-4 pt-10 pb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-[10px] font-black uppercase tracking-widest text-primary">
                  <span className="relative flex w-2 h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  AI-Powered
                </div>
                <h2 className="font-display font-black uppercase text-3xl md:text-4xl tracking-tight">GEF Sports Desk</h2>
              </div>
              <Link href="/ai-news">
                <Button variant="outline" size="sm" className="gap-2 border-primary/30 hover:border-primary hover:bg-primary/5">
                  Full Edition <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Featured article — full width, huge headline */}
          {articles[0] && (() => {
            const featured = articles[0];
            const cfg = TONE_CONFIG[featured.tone] ?? TONE_CONFIG.ANALYSIS;
            const Icon = cfg.icon;
            const firstPara = featured.body.split(/\n\n+/)[0] ?? "";
            return (
              <Link href="/ai-news">
                <div className={`container mx-auto px-4 mb-6`}>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
                    className={`relative overflow-hidden rounded-2xl border ${cfg.border} bg-card cursor-pointer group hover:shadow-2xl transition-all duration-300`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${featured.tone === "ROAST" ? "from-red-500/10" : featured.tone === "PRAISE" ? "from-yellow-500/10" : featured.tone === "BREAKING" ? "from-orange-500/10" : featured.tone === "RIVALRY" ? "from-purple-500/10" : "from-sky-500/10"} to-transparent pointer-events-none`} />
                    <div className="relative p-6 md:p-10">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2.5 py-1">{featured.category}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">— {featured.subject}</span>
                      </div>
                      <h3 className="font-display font-black uppercase leading-none text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-5 group-hover:text-primary transition-colors max-w-4xl">
                        {featured.headline}
                      </h3>
                      <p className="text-muted-foreground text-sm md:text-base leading-relaxed line-clamp-3 max-w-3xl">{firstPara}</p>
                      <div className={`inline-flex items-center gap-1.5 mt-4 text-xs font-bold uppercase tracking-wider ${cfg.color}`}>
                        Read Full Article <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </Link>
            );
          })()}

          {/* Next 3 articles — smaller cards with big headlines */}
          {articles.slice(1, 4).length > 0 && (
            <Link href="/ai-news">
              <div className="container mx-auto px-4 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 cursor-pointer">
                  {articles.slice(1, 4).map((article, i) => {
                    const cfg = TONE_CONFIG[article.tone] ?? TONE_CONFIG.ANALYSIS;
                    const Icon = cfg.icon;
                    const firstPara = article.body.split(/\n\n+/)[0] ?? "";
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.35 }}
                        className={`bg-card border ${cfg.border} rounded-xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex flex-col`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            <Icon className="w-2.5 h-2.5" /> {cfg.label}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-medium uppercase">{article.category}</span>
                        </div>
                        <h3 className="font-display font-black uppercase leading-tight text-xl sm:text-2xl mb-3 group-hover:text-primary transition-colors flex-1">
                          {article.headline}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{firstPara}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </Link>
          )}
        </section>
      )}

      <main className="flex-1 container mx-auto px-4 py-14 space-y-20">

        {/* ── NEWS & POSTS ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Latest from GEF</div>
              <h2 className="text-3xl font-display font-black uppercase">News & Stories</h2>
            </div>
          </div>
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.slice(0, 6).map((post, i) => <PostCard key={post.id} post={post} index={i} />)}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
              <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No posts published yet.</p>
              <p className="text-sm mt-1">Go to Admin → Homepage & CMS to write your first post.</p>
            </div>
          )}
        </section>

        {/* ── ABOUT + MISSION ───────────────────────────────────────────────── */}
        {(s.mission_text || s.about_text) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {s.mission_text && (
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-2xl p-8"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-black uppercase text-2xl mb-3">{s.mission_title ?? "Our Mission"}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.mission_text}</p>
              </motion.div>
            )}
            {s.about_text && (
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="bg-card border border-border rounded-2xl p-8"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <Flame className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="font-display font-black uppercase text-2xl mb-3">{s.about_title ?? "About GEF"}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.about_text}</p>
              </motion.div>
            )}
          </section>
        )}

        {/* ── FAN COMMUNITY TEASER ──────────────────────────────────────────── */}
        <FanCommunitySection />

        {/* ── TOP RIVALS ────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Fierce Competition</div>
              <h2 className="text-3xl font-display font-black uppercase flex items-center gap-3">
                <Skull className="w-7 h-7 text-red-500" /> Top Rivals
              </h2>
            </div>
            <Link href="/h2h">
              <Button variant="outline" size="sm" className="gap-1.5">H2H Lookup <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>

          {hasRivals ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Team Rivalries */}
              {teamRivals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Team Rivalries</span>
                  </div>
                  <div className="space-y-3">
                    {teamRivals.map((r, i) => (
                      <motion.div key={`${r.teamAId}-${r.teamBId}`}
                        initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                        className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
                      >
                        {/* Teams Row */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {r.teamALogoUrl
                              ? <img src={r.teamALogoUrl} className="w-8 h-8 object-contain rounded shrink-0" alt="" />
                              : <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0"><Shield className="w-4 h-4 text-muted-foreground" /></div>}
                            <span className="font-bold text-sm uppercase truncate">{r.teamAName}</span>
                          </div>
                          <div className="shrink-0 text-center px-2">
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">VS</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{r.total} matches</div>
                          </div>
                          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                            <span className="font-bold text-sm uppercase truncate text-right">{r.teamBName}</span>
                            {r.teamBLogoUrl
                              ? <img src={r.teamBLogoUrl} className="w-8 h-8 object-contain rounded shrink-0" alt="" />
                              : <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0"><Shield className="w-4 h-4 text-muted-foreground" /></div>}
                          </div>
                        </div>
                        {/* Win bar */}
                        <WinBar aWins={r.teamAWins} bWins={r.teamBWins} draws={r.draws} />
                        {/* Score labels */}
                        <div className="flex justify-between mt-1.5 text-[11px] font-bold">
                          <span className="text-green-400">{r.teamAWins}W</span>
                          {r.draws > 0 && <span className="text-yellow-400">{r.draws}D</span>}
                          <span className="text-red-400">{r.teamBWins}W</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Player Rivalries */}
              {playerRivals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Player Rivalries</span>
                  </div>
                  <div className="space-y-3">
                    {playerRivals.map((r, i) => (
                      <motion.div key={`${r.p1Id}-${r.p2Id}`}
                        initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                        className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
                      >
                        {/* Players Row */}
                        <div className="flex items-center gap-3 mb-3">
                          <Link href={`/players/${r.p1Id}`} className="flex items-center gap-2 flex-1 min-w-0 group">
                            <img src={r.p1ImageUrl || `${import.meta.env.BASE_URL}images/default-avatar.png`} alt={r.p1Name}
                              className="w-8 h-8 rounded-full object-cover border border-border group-hover:border-primary transition-colors shrink-0" />
                            <span className="font-bold text-sm uppercase truncate group-hover:text-primary transition-colors">{r.p1Name}</span>
                          </Link>
                          <div className="shrink-0 text-center px-2">
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">VS</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{r.total} games</div>
                          </div>
                          <Link href={`/players/${r.p2Id}`} className="flex items-center gap-2 flex-1 min-w-0 justify-end group">
                            <span className="font-bold text-sm uppercase truncate text-right group-hover:text-primary transition-colors">{r.p2Name}</span>
                            <img src={r.p2ImageUrl || `${import.meta.env.BASE_URL}images/default-avatar.png`} alt={r.p2Name}
                              className="w-8 h-8 rounded-full object-cover border border-border group-hover:border-primary transition-colors shrink-0" />
                          </Link>
                        </div>
                        {/* Win bar */}
                        <WinBar aWins={r.p1Wins} bWins={r.p2Wins} draws={r.draws} />
                        {/* Stats row */}
                        <div className="flex justify-between mt-1.5 text-[11px] font-bold">
                          <span className="text-green-400">{r.p1Wins}W · {r.p1Goals}G</span>
                          {r.draws > 0 && <span className="text-yellow-400">{r.draws}D</span>}
                          <span className="text-red-400">{r.p2Goals}G · {r.p2Wins}W</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
              <Skull className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No rivalry data yet.</p>
              <p className="text-sm mt-1">Rivalries appear automatically once matches are recorded.</p>
            </div>
          )}
        </section>

        {/* ── RECENT TRANSFERS ──────────────────────────────────────────────── */}
        {transfers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Transfer Window</div>
                <h2 className="text-3xl font-display font-black uppercase flex items-center gap-3">
                  <ArrowLeftRight className="w-7 h-7 text-primary" /> Recent Transfers
                </h2>
              </div>
              <Link href="/transfers">
                <Button variant="outline" size="sm" className="gap-1.5">All Transfers <ArrowRight className="w-4 h-4" /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transfers.slice(0, 6).map((t, i) => (
                <motion.div key={t.id}
                  initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img src={t.playerImageUrl || `${import.meta.env.BASE_URL}images/default-avatar.png`} alt={t.playerName}
                      className="w-10 h-10 rounded-full object-cover border border-border" />
                    <div>
                      <div className="font-bold text-sm uppercase">{t.playerName}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(t.transferDate), "MMM d, yyyy")}</div>
                    </div>
                    {t.fee && t.fee > 0 && (
                      <div className="ml-auto text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                        €{(t.fee / 1_000_000).toFixed(1)}M
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {t.fromTeamLogoUrl && <img src={t.fromTeamLogoUrl} className="w-5 h-5 object-contain rounded shrink-0" alt="" />}
                      <span className="text-muted-foreground truncate">{t.fromTeamName ?? "Free Agent"}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className="font-semibold truncate">{t.toTeamName ?? "Free Agent"}</span>
                      {t.toTeamLogoUrl && <img src={t.toTeamLogoUrl} className="w-5 h-5 object-contain rounded shrink-0" alt="" />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── UPCOMING EVENTS ───────────────────────────────────────────────── */}
        <section>
          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Schedule</div>
            <h2 className="text-3xl font-display font-black uppercase flex items-center gap-3">
              <CalendarDays className="w-7 h-7 text-primary" /> Upcoming Events
            </h2>
          </div>
          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedEvents.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No events added yet.</p>
              <p className="text-sm mt-1">Add upcoming GEF events from Admin → Homepage & CMS.</p>
            </div>
          )}
        </section>

        {/* ── FUN FACTS ─────────────────────────────────────────────────────── */}
        {funFacts.length > 0 && (
          <section>
            <div className="mb-8">
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Did You Know?</div>
              <h2 className="text-3xl font-display font-black uppercase">GEF Facts</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {funFacts.map((fact, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="bg-card border border-border rounded-2xl p-6 flex gap-4"
                >
                  <div className="text-3xl font-display font-black text-primary/30 leading-none shrink-0">#{i + 1}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{fact}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── EXPLORE GEF ───────────────────────────────────────────────────── */}
        <section>
          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Explore</div>
            <h2 className="text-3xl font-display font-black uppercase">What's in GEF</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { href: "/players",   icon: Users,        label: "Players",    color: "text-blue-400   bg-blue-500/10"   },
              { href: "/teams",     icon: Shield,       label: "Teams",      color: "text-green-400  bg-green-500/10"  },
              { href: "/matches",   icon: Swords,       label: "Matches",    color: "text-purple-400 bg-purple-500/10" },
              { href: "/trophies",  icon: Trophy,       label: "Trophies",   color: "text-yellow-400 bg-yellow-500/10" },
              { href: "/transfers", icon: ArrowLeftRight, label: "Transfers", color: "text-orange-400 bg-orange-500/10"},
              { href: "/ballon-dor",icon: Star,         label: "Ballon d'Or",color: "text-pink-400   bg-pink-500/10"   },
            ].map((item, i) => (
              <Link key={item.href} href={item.href}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-primary/40 hover:-translate-y-1 transition-all cursor-pointer text-center"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wide">{item.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── ADMINISTRATION ────────────────────────────────────────────────── */}
        {adminTeam.length > 0 && (
          <section>
            <div className="mb-8 flex items-center gap-3">
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">The Team Behind GEF</div>
            </div>
            <div className="text-3xl font-display font-black uppercase mb-8">Administration</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {adminTeam.map((member, i) => (
                <motion.div key={member.id}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all group text-center"
                >
                  <div className="h-36 overflow-hidden bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center relative">
                    {member.imageUrl ? (
                      <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Crown className="w-14 h-14 text-primary/20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <div className="p-4">
                    <div className="font-display font-black uppercase text-sm leading-tight">{member.name}</div>
                    {member.role && <div className="text-[11px] text-primary font-bold uppercase tracking-wider mt-0.5">{member.role}</div>}
                    {member.bio && <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{member.bio}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── OUR PARTNERS ──────────────────────────────────────────────────── */}
        {partners.length > 0 && (
          <section>
            <div className="mb-8">
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Collaborations</div>
              <h2 className="text-3xl font-display font-black uppercase">Our Partners</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {partners.map((partner, i) => {
                const isLeague = partner.type === "league";
                return (
                  <Link key={partner.id} href={`/partners/${partner.id}`}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                      className={`bg-card border rounded-2xl overflow-hidden transition-all group flex flex-col cursor-pointer hover:-translate-y-1 ${isLeague ? "border-yellow-500/30 hover:border-yellow-400/50" : "border-border hover:border-primary/40"}`}
                    >
                      <div className={`h-28 flex items-center justify-center overflow-hidden ${isLeague ? "bg-gradient-to-br from-yellow-500/10 to-card" : "bg-gradient-to-br from-primary/5 to-secondary"}`}>
                        {partner.imageUrl ? (
                          <img src={partner.imageUrl} alt={partner.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          isLeague ? <Trophy className="w-12 h-12 text-yellow-500/30" /> : <Handshake className="w-12 h-12 text-primary/20" />
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <div className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit mb-2 ${isLeague ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-primary/10 text-primary border border-primary/20"}`}>
                          {isLeague ? <Trophy className="w-3 h-3" /> : <Handshake className="w-3 h-3" />}
                          {isLeague ? "League" : "Partner"}
                        </div>
                        <div className="font-display font-black uppercase text-sm leading-tight group-hover:text-primary transition-colors">{partner.name}</div>
                        {partner.description && <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 flex-1">{partner.description}</p>}
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── AI SPORTS DESK ────────────────────────────────────────────────────── */}
        {articles.length > 0 && (
          <section>
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
                  <span className="relative flex w-2 h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  AI-Powered Commentary
                </div>
                <h2 className="text-3xl font-display font-black uppercase">Sports Desk</h2>
              </div>
              <Link href="/ai-news">
                <Button variant="outline" className="gap-2 border-border hover:border-primary/40 text-primary hover:text-primary">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {articles.slice(0, 2).map((article, i) => {
                const toneIcon = article.tone === "ROAST" ? Flame : article.tone === "PRAISE" ? Star : article.tone === "RIVALRY" ? Swords : article.tone === "BREAKING" ? AlertTriangle : BarChart2;
                const ToneIcon = toneIcon;
                const toneColor = article.tone === "ROAST" ? "text-red-400" : article.tone === "PRAISE" ? "text-yellow-400" : article.tone === "RIVALRY" ? "text-purple-400" : article.tone === "BREAKING" ? "text-orange-400" : "text-sky-400";
                const toneBg = article.tone === "ROAST" ? "bg-red-500/10 border-red-500/30" : article.tone === "PRAISE" ? "bg-yellow-500/10 border-yellow-500/30" : article.tone === "RIVALRY" ? "bg-purple-500/10 border-purple-500/30" : article.tone === "BREAKING" ? "bg-orange-500/10 border-orange-500/30" : "bg-sky-500/10 border-sky-500/30";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                    className={`bg-card border rounded-2xl overflow-hidden hover:border-primary/40 transition-all group flex flex-col ${toneBg}`}
                  >
                    <div className={`px-4 py-2.5 flex items-center justify-between`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${toneColor}`}>
                        <ToneIcon className="w-3.5 h-3.5" />
                        {article.tone}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{article.category}</span>
                    </div>
                    <div className="px-4 py-3 flex-1 flex flex-col">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{article.subject}</div>
                      <h3 className="font-display font-black uppercase text-sm leading-tight mb-2 group-hover:text-primary transition-colors">{article.headline}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3">{article.body}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
        {(s.cta_text || s.cta_subtitle) && (
          <section>
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-card border border-primary/30 rounded-3xl p-12 text-center shadow-2xl shadow-primary/10"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.08),transparent_70%)]" />
              <div className="relative z-10">
                <h2 className="font-display text-4xl md:text-5xl font-black uppercase mb-3">{s.cta_text}</h2>
                {s.cta_subtitle && <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">{s.cta_subtitle}</p>}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/players">
                    <Button variant="gaming" size="lg">Browse Players <ArrowRight className="ml-2 w-5 h-5" /></Button>
                  </Link>
                  <Link href="/matches">
                    <Button variant="outline" size="lg" className="border-primary/30 hover:bg-primary/10">View Matches</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </section>
        )}

      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/30 mt-4">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-bold text-sm">GEF STATS</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Global eFootball Federation. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/players"   className="hover:text-foreground transition-colors">Players</Link>
            <Link href="/teams"     className="hover:text-foreground transition-colors">Teams</Link>
            <Link href="/matches"   className="hover:text-foreground transition-colors">Matches</Link>
            <Link href="/transfers" className="hover:text-foreground transition-colors">Transfers</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
