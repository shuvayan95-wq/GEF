import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, MessageCircle, Newspaper, Trophy, Star, Flame, Zap,
  ChevronRight, Shield, Crown, Filter, TrendingUp, Swords, Radio,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const API = import.meta.env.VITE_API_URL ?? "";

const PERSONALITY_CONFIG: Record<string, { label: string; emoji: string; color: string; glow: string }> = {
  optimistic:       { label: "Optimist",     emoji: "😄", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", glow: "shadow-emerald-500/20" },
  angry:            { label: "Furious",       emoji: "😤", color: "text-red-400 bg-red-400/10 border-red-400/30",           glow: "shadow-red-500/20" },
  sarcastic:        { label: "Sarcastic",     emoji: "😏", color: "text-purple-400 bg-purple-400/10 border-purple-400/30", glow: "shadow-purple-500/20" },
  tactical:         { label: "Tactician",     emoji: "📊", color: "text-sky-400 bg-sky-400/10 border-sky-400/30",           glow: "shadow-sky-500/20" },
  transfer_addict:  { label: "Transfer MD",   emoji: "💰", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", glow: "shadow-yellow-500/20" },
  young_supporter:  { label: "Young Fan",     emoji: "🔥", color: "text-orange-400 bg-orange-400/10 border-orange-400/30", glow: "shadow-orange-500/20" },
  old_guard:        { label: "Old Guard",     emoji: "🧓", color: "text-stone-400 bg-stone-400/10 border-stone-400/30",    glow: "shadow-stone-500/20" },
  glory_hunter:     { label: "Glory Hunter",  emoji: "🏆", color: "text-amber-400 bg-amber-400/10 border-amber-400/30",    glow: "shadow-amber-500/20" },
  die_hard:         { label: "Die Hard",      emoji: "❤️", color: "text-rose-400 bg-rose-400/10 border-rose-400/30",       glow: "shadow-rose-500/20" },
  media_pundit:     { label: "Pundit",        emoji: "🎙️", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/30", glow: "shadow-indigo-500/20" },
  legend:           { label: "Legend",        emoji: "👑", color: "text-amber-300 bg-amber-300/10 border-amber-300/30",    glow: "shadow-amber-300/25" },
  neutral_observer: { label: "Neutral",       emoji: "🤷", color: "text-gray-400 bg-gray-400/10 border-gray-400/30",       glow: "" },
  frustrated:       { label: "Frustrated",    emoji: "😞", color: "text-red-300 bg-red-300/10 border-red-300/30",          glow: "shadow-red-400/15" },
  neutral:          { label: "Neutral",        emoji: "🤷", color: "text-gray-400 bg-gray-400/10 border-gray-400/30",      glow: "" },
};

const MOOD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ecstatic:   { label: "🥳 Ecstatic",   color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
  happy:      { label: "😊 Happy",      color: "text-green-400",   bg: "bg-green-400/10 border-green-400/30" },
  satisfied:  { label: "😌 Satisfied",  color: "text-teal-400",    bg: "bg-teal-400/10 border-teal-400/30" },
  neutral:    { label: "😐 Neutral",    color: "text-gray-400",    bg: "bg-gray-400/10 border-gray-400/30" },
  concerned:  { label: "😟 Concerned",  color: "text-yellow-400",  bg: "bg-yellow-400/10 border-yellow-400/30" },
  frustrated: { label: "😤 Frustrated", color: "text-orange-400",  bg: "bg-orange-400/10 border-orange-400/30" },
  angry:      { label: "😡 Angry",      color: "text-red-400",     bg: "bg-red-400/10 border-red-400/30" },
  furious:    { label: "🤬 Furious",    color: "text-red-600",     bg: "bg-red-600/10 border-red-600/30" },
};

function FanComment({ reaction, index }: { reaction: any; index: number }) {
  const cfg = PERSONALITY_CONFIG[reaction.fanPersonality] ?? PERSONALITY_CONFIG.neutral;
  const isRival = reaction.isRival;
  const isPinned = reaction.isPinned;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 280, damping: 28 }}
      className={`relative rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${
        isPinned
          ? "border-yellow-500/40 bg-gradient-to-br from-yellow-500/5 to-gray-900/80 shadow-lg shadow-yellow-500/10"
          : isRival
          ? "border-red-500/25 bg-gradient-to-br from-red-500/5 to-gray-900/80"
          : "border-white/5 bg-gray-900/60 hover:border-white/10"
      }`}
    >
      {/* Pinned ribbon */}
      {isPinned && (
        <div className="absolute top-0 right-0">
          <div className="bg-yellow-500/20 border-b border-l border-yellow-500/30 px-3 py-1 flex items-center gap-1 rounded-bl-xl">
            <Star size={9} className="fill-yellow-400 text-yellow-400" />
            <span className="text-[9px] text-yellow-400 font-black uppercase tracking-widest">Pinned</span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Team */}
          {reaction.team && (
            <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2.5 py-1">
              {reaction.team.logoUrl
                ? <img src={reaction.team.logoUrl} className="w-4 h-4 object-contain" alt="" />
                : <Shield size={12} className="text-gray-500" />
              }
              <span className="text-[10px] font-black text-gray-200 uppercase tracking-wide">{reaction.team.name}</span>
            </div>
          )}
          {isRival && (
            <span className="text-[9px] font-black text-red-400 bg-red-400/10 border border-red-400/25 px-2 py-0.5 rounded-full">⚔️ RIVAL</span>
          )}
          {/* Personality badge */}
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.color}`}>
            {cfg.emoji} {cfg.label}
          </span>
          <span className="text-[10px] text-gray-600 ml-auto">
            {formatDistanceToNow(new Date(reaction.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Comment text */}
        <p className="text-sm text-gray-100 leading-relaxed font-medium">{reaction.comment}</p>
      </div>

      {/* Bottom accent line */}
      <div className={`h-0.5 ${isRival ? "bg-gradient-to-r from-red-500/30 via-red-500/10 to-transparent" : isPinned ? "bg-gradient-to-r from-yellow-500/30 via-yellow-500/10 to-transparent" : "bg-gradient-to-r from-primary/20 via-primary/5 to-transparent"}`} />
    </motion.div>
  );
}

function ArticleCard({ article, index }: { article: any; index: number }) {
  const isGCC = article.matchType === "gcc";
  const isDraw = article.homeScore === article.awayScore;
  const homeWon = article.homeScore > article.awayScore;
  const winnerMood = MOOD_CONFIG[article.winnerMood ?? "happy"] ?? MOOD_CONFIG.happy;
  const loserMood = MOOD_CONFIG[article.loserMood ?? "frustrated"] ?? MOOD_CONFIG.frustrated;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 26 }}
      className={`rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
        isGCC
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-gray-900 to-gray-900"
          : "border-white/5 bg-gray-900/80 hover:border-white/10"
      }`}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Comp header */}
      <div className={`px-5 py-2.5 flex items-center justify-between ${isGCC ? "bg-amber-500/10 border-b border-amber-500/20" : "bg-white/3 border-b border-white/5"}`}>
        <div className="flex items-center gap-2">
          {isGCC
            ? <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">🏆 Champions Cup</span>
            : <span className="text-[10px] font-black text-primary uppercase tracking-widest">⚽ League Match</span>
          }
          {article.mediaRating && (
            <span className="text-[10px] text-gray-500">•  Media <span className="text-white font-bold">{article.mediaRating}/10</span></span>
          )}
        </div>
        <span className="text-[10px] text-gray-600">{formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}</span>
      </div>

      <div className="p-5">
        {/* Scoreline — the hero */}
        <div className="flex items-center gap-2 mb-5">
          {/* Home team */}
          <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${homeWon ? "opacity-100" : isDraw ? "opacity-70" : "opacity-45"}`}>
            {article.homeTeam?.logoUrl && (
              <img src={article.homeTeam.logoUrl} className={`w-9 h-9 object-contain shrink-0 ${homeWon ? "drop-shadow-[0_0_8px_hsl(142,76%,45%,0.5)]" : ""}`} alt="" />
            )}
            <span className="font-display font-black text-sm uppercase truncate">{article.homeTeam?.name ?? "Home"}</span>
          </div>

          {/* Score center */}
          <div className="shrink-0 text-center bg-gray-800/60 border border-white/5 rounded-xl px-4 py-2 mx-1">
            <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">
              {article.homeScore ?? "—"} <span className="text-gray-600">—</span> {article.awayScore ?? "—"}
            </div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
              {isDraw ? "Draw" : homeWon ? "Home Win" : "Away Win"}
            </div>
          </div>

          {/* Away team */}
          <div className={`flex items-center gap-2 flex-1 min-w-0 ${!homeWon && !isDraw ? "opacity-100" : isDraw ? "opacity-70" : "opacity-45"}`}>
            <span className="font-display font-black text-sm uppercase truncate">{article.awayTeam?.name ?? "Away"}</span>
            {article.awayTeam?.logoUrl && (
              <img src={article.awayTeam.logoUrl} className={`w-9 h-9 object-contain shrink-0 ${!homeWon && !isDraw ? "drop-shadow-[0_0_8px_hsl(142,76%,45%,0.5)]" : ""}`} alt="" />
            )}
          </div>
        </div>

        {/* Headline */}
        <h3 className="font-display font-black text-white text-xl uppercase leading-tight mb-2">{article.headline}</h3>

        {/* Summary */}
        <p className="text-sm text-gray-400 leading-relaxed mb-4">{article.summary}</p>

        {/* Talking point */}
        {article.talkingPoint && (
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 mb-4">
            <div className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-1">💬 Talking Point</div>
            <p className="text-sm text-gray-300">{article.talkingPoint}</p>
          </div>
        )}

        {/* Fan moods row */}
        {!isDraw && (
          <div className="flex gap-2 flex-wrap">
            {article.winnerMood && (
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${winnerMood.bg} ${winnerMood.color}`}>
                {article.homeTeam?.name ?? "Winner"}: {winnerMood.label}
              </span>
            )}
            {article.loserMood && (
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${loserMood.bg} ${loserMood.color}`}>
                {article.awayTeam?.name ?? "Loser"}: {loserMood.label}
              </span>
            )}
          </div>
        )}

        {article.momentumChange && (
          <p className="text-[11px] text-gray-600 italic mt-3">{article.momentumChange}</p>
        )}
      </div>
    </motion.div>
  );
}

export function FanCommunity() {
  const [tab, setTab] = useState<"all" | "articles" | "comments">("all");
  const [teamFilter, setTeamFilter] = useState<number | null>(null);
  const [matchTypeFilter, setMatchTypeFilter] = useState<"all" | "league" | "gcc">("all");

  const { data: feed, isLoading } = useQuery({
    queryKey: ["fan-community-feed"],
    queryFn: async () => {
      const r = await fetch(`${API}/api/fan-community/feed?limit=30`);
      if (!r.ok) return { articles: [], reactions: [] };
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const { data: fanbase } = useQuery({
    queryKey: ["fanbase-leaderboard"],
    queryFn: async () => {
      const r = await fetch(`${API}/api/fanbase/leaderboard`);
      return r.json();
    },
  });

  const articles: any[] = feed?.articles ?? [];
  const reactions: any[] = feed?.reactions ?? [];

  const allTeams: any[] = [...new Map([
    ...articles.map((a: any) => a.homeTeam),
    ...articles.map((a: any) => a.awayTeam),
    ...reactions.map((r: any) => r.team),
  ].filter(Boolean).map((t: any) => [t.id, t])).values()];

  const filteredArticles = articles.filter((a: any) =>
    (!teamFilter || a.homeTeamId === teamFilter || a.awayTeamId === teamFilter) &&
    (matchTypeFilter === "all" || a.matchType === matchTypeFilter)
  );

  const filteredReactions = reactions.filter((r: any) =>
    !teamFilter || r.teamId === teamFilter || r.rivalTeamId === teamFilter
  );

  const totalFans = (fanbase ?? []).reduce((s: number, c: any) => s + (c.currentFans || 0), 0);

  return (
    <div className="min-h-screen text-white" style={{ background: "hsl(224 25% 4%)" }}>

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        {/* Layered glows */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/25 via-primary/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-500/8 rounded-full blur-3xl pointer-events-none" />

        {/* Corner brackets */}
        <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-primary/50" />
        <div className="absolute top-5 right-5 w-8 h-8 border-t-2 border-r-2 border-primary/50" />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-10">
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-6"
          >
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <Radio size={12} className="text-primary" />
            <span className="text-xs font-black text-primary uppercase tracking-widest">Live Fan Community</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="font-display font-black uppercase tracking-tight leading-none text-5xl sm:text-7xl lg:text-8xl mb-4"
            style={{ textShadow: "0 0 60px hsl(142 76% 45% / 0.15)" }}
          >
            <span className="text-white">GEF</span>{" "}
            <span className="text-primary">Fan Hub</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-base sm:text-lg max-w-2xl mb-10 font-medium"
          >
            Virtual supporters reacting to every result, transfer, and moment across GEF.
            Feel the pulse of every fanbase.
          </motion.p>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              { icon: Users,         label: "Total Fans",     value: totalFans.toLocaleString(),          color: "text-primary",   bg: "bg-primary/10",   border: "border-primary/20"   },
              { icon: MessageCircle, label: "Fan Reactions",  value: reactions.length.toLocaleString(),   color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20" },
              { icon: Newspaper,     label: "Match Reports",  value: articles.length.toLocaleString(),    color: "text-sky-400",   bg: "bg-sky-400/10",   border: "border-sky-400/20"   },
              { icon: Trophy,        label: "Active Clubs",   value: (fanbase?.length ?? 0).toString(),  color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20"  },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className={`relative overflow-hidden ${stat.bg} border ${stat.border} rounded-2xl p-4 flex items-center gap-3 group hover:scale-[1.02] transition-transform`}
              >
                <div className={`w-10 h-10 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center shrink-0`}>
                  <stat.icon size={18} className={stat.color} />
                </div>
                <div>
                  <div className={`text-2xl font-black tabular-nums ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom divider with glow */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-8 items-center">
          {/* Tab */}
          <div className="flex bg-gray-900/80 border border-white/5 rounded-xl p-1 gap-1">
            {(["all", "articles", "comments"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                  tab === t
                    ? "bg-primary text-black shadow-lg shadow-primary/25"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t === "all" ? "All" : t === "articles" ? "📰 Reports" : "💬 Reactions"}
              </button>
            ))}
          </div>

          {/* Match type */}
          <div className="flex bg-gray-900/80 border border-white/5 rounded-xl p-1 gap-1">
            {(["all", "league", "gcc"] as const).map(t => (
              <button
                key={t}
                onClick={() => setMatchTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                  matchTypeFilter === t
                    ? "bg-gray-700 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t === "all" ? "All Comps" : t === "league" ? "⚽ League" : "🏆 Cup"}
              </button>
            ))}
          </div>

          {/* Team filter */}
          {allTeams.length > 0 && (
            <select
              value={teamFilter ?? ""}
              onChange={e => setTeamFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="bg-gray-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-300 font-bold focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="">All Clubs</option>
              {allTeams.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Main content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Loading fan activity…</p>
            </div>
          </div>
        ) : articles.length === 0 && reactions.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-900 border border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <MessageCircle size={36} className="text-gray-700" />
            </div>
            <p className="font-display font-black text-2xl uppercase text-gray-600 mb-2">No Reactions Yet</p>
            <p className="text-sm text-gray-600">Fan reactions are generated automatically when match results are recorded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── MAIN FEED ── */}
            <div className="lg:col-span-2 space-y-8">

              {/* Match Reports */}
              {(tab === "all" || tab === "articles") && filteredArticles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    <Newspaper size={14} className="text-primary" />
                    <h2 className="font-display font-black text-sm uppercase tracking-widest text-gray-300">Match Reports</h2>
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-800/80 border border-white/5 px-2 py-0.5 rounded-full">{filteredArticles.length}</span>
                  </div>
                  <div className="space-y-4">
                    {filteredArticles.map((article: any, i: number) => (
                      <ArticleCard key={article.id} article={article} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Fan Reactions */}
              {(tab === "all" || tab === "comments") && filteredReactions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-5 mt-2">
                    <div className="w-1 h-5 bg-violet-500 rounded-full" />
                    <MessageCircle size={14} className="text-violet-400" />
                    <h2 className="font-display font-black text-sm uppercase tracking-widest text-gray-300">Fan Reactions</h2>
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-800/80 border border-white/5 px-2 py-0.5 rounded-full">{filteredReactions.length}</span>
                  </div>
                  <div className="space-y-3">
                    {filteredReactions.map((reaction: any, i: number) => (
                      <FanComment key={reaction.id} reaction={reaction} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {filteredArticles.length === 0 && filteredReactions.length === 0 && (
                <div className="text-center py-16 text-gray-700">
                  <Filter size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-bold uppercase tracking-wider">No content matches these filters</p>
                </div>
              )}
            </div>

            {/* ── SIDEBAR ── */}
            <div className="space-y-5">

              {/* Fan Rankings */}
              {fanbase && fanbase.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-900/80 border border-white/5 rounded-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-5 py-4 bg-primary/5 border-b border-primary/15 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown size={14} className="text-amber-400" />
                      <span className="font-display font-black text-sm uppercase tracking-wider text-white">Fan Rankings</span>
                    </div>
                    <Link href="/fanbase">
                      <span className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-0.5 font-bold uppercase tracking-wide">
                        Full table <ChevronRight size={11} />
                      </span>
                    </Link>
                  </div>

                  <div className="divide-y divide-white/5">
                    {fanbase.slice(0, 8).map((club: any, i: number) => (
                      <div key={club.teamId} className="px-4 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors">
                        <span className="text-sm font-black w-6 text-center shrink-0">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (
                            <span className="text-gray-600 text-xs">{i + 1}</span>
                          )}
                        </span>
                        {club.logoUrl
                          ? <img src={club.logoUrl} className="w-7 h-7 object-contain shrink-0" alt="" />
                          : <Shield size={14} className="text-gray-600 shrink-0" />
                        }
                        <span className="text-sm font-semibold flex-1 min-w-0 truncate text-gray-200">{club.teamName}</span>
                        <span className="text-sm font-black text-primary shrink-0">{club.currentFans.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="px-5 py-3 bg-primary/5 border-t border-primary/10">
                    <Link href="/fanbase">
                      <button className="w-full text-center text-xs font-black text-primary uppercase tracking-wider py-1 hover:text-primary/80 transition-colors">
                        View Full Rankings →
                      </button>
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Recent Scores */}
              {articles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gray-900/80 border border-white/5 rounded-2xl overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                    <TrendingUp size={14} className="text-sky-400" />
                    <span className="font-display font-black text-sm uppercase tracking-wider">Recent Results</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {articles.slice(0, 6).map((a: any) => {
                      const isDraw = a.homeScore === a.awayScore;
                      const homeWon = a.homeScore > a.awayScore;
                      return (
                        <div key={a.id} className="px-4 py-3 hover:bg-white/3 transition-colors">
                          <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1.5 font-bold">
                            {a.matchType === "gcc" ? "🏆 Cup" : "⚽ League"}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold flex-1 truncate ${homeWon ? "text-white" : isDraw ? "text-gray-400" : "text-gray-600"}`}>
                              {a.homeTeam?.name ?? "?"}
                            </span>
                            <span className="text-sm font-black text-white shrink-0 bg-gray-800 px-2 py-0.5 rounded-lg tabular-nums">
                              {a.homeScore}-{a.awayScore}
                            </span>
                            <span className={`text-xs font-bold flex-1 truncate text-right ${!homeWon && !isDraw ? "text-white" : isDraw ? "text-gray-400" : "text-gray-600"}`}>
                              {a.awayTeam?.name ?? "?"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Fan Types Guide */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-900/80 border border-white/5 rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Swords size={13} className="text-violet-400" />
                  <span className="font-display font-black text-sm uppercase tracking-wider">Fan Personalities</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PERSONALITY_CONFIG).slice(0, 9).map(([key, cfg]) => (
                    <span key={key} className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.color}`}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
