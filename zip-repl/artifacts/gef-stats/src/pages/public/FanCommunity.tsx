import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Users, MessageCircle, Newspaper, Trophy, TrendingUp, TrendingDown,
  Minus, Star, Flame, Zap, ChevronRight, Shield, Crown, Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const API = import.meta.env.VITE_API_URL ?? "";

const PERSONALITY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  optimistic:      { label: "Optimist",     emoji: "😄", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  angry:           { label: "Furious",      emoji: "😤", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  sarcastic:       { label: "Sarcastic",    emoji: "😏", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  tactical:        { label: "Tactician",    emoji: "📊", color: "text-sky-400 bg-sky-400/10 border-sky-400/20" },
  transfer_addict: { label: "Transfer MD",  emoji: "💰", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  young_supporter: { label: "Young Fan",    emoji: "🔥", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  old_guard:       { label: "Old Guard",    emoji: "🧓", color: "text-stone-400 bg-stone-400/10 border-stone-400/20" },
  glory_hunter:    { label: "Glory Hunter", emoji: "🏆", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  die_hard:        { label: "Die Hard",     emoji: "❤️", color: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
  media_pundit:    { label: "Pundit",       emoji: "🎙️", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" },
  legend:          { label: "Legend",       emoji: "👑", color: "text-amber-300 bg-amber-300/10 border-amber-300/20" },
  neutral_observer:{ label: "Neutral",      emoji: "🤷", color: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
  frustrated:      { label: "Frustrated",   emoji: "😞", color: "text-red-300 bg-red-300/10 border-red-300/20" },
  neutral:         { label: "Neutral",      emoji: "🤷", color: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`relative rounded-xl border p-4 ${isRival ? "border-red-500/20 bg-red-500/5" : "border-gray-800 bg-gray-900/60"} ${reaction.isPinned ? "ring-1 ring-yellow-500/40" : ""}`}
    >
      {reaction.isPinned && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-yellow-400 font-bold uppercase tracking-wider">
          <Star size={10} className="fill-yellow-400" /> Pinned
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        {/* Team badge */}
        {reaction.team && (
          <div className="flex items-center gap-1.5">
            {reaction.team.logoUrl ? (
              <img src={reaction.team.logoUrl} className="w-5 h-5 object-contain" alt="" />
            ) : (
              <Shield size={14} className="text-gray-500" />
            )}
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">
              {isRival ? `${reaction.team.name} Fan` : reaction.team.name}
            </span>
          </div>
        )}
        {isRival && (
          <span className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">⚔️ Rival Fan</span>
        )}
        {/* Personality */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
          {cfg.emoji} {cfg.label}
        </span>
      </div>
      {/* Comment */}
      <p className="text-sm text-gray-200 leading-relaxed">{reaction.comment}</p>
      {/* Footer */}
      <div className="mt-2 text-[11px] text-gray-600">
        {formatDistanceToNow(new Date(reaction.createdAt), { addSuffix: true })}
      </div>
    </motion.div>
  );
}

function ArticleCard({ article, index }: { article: any; index: number }) {
  const isGCC = article.matchType === "gcc";
  const isDraw = article.homeScore === article.awayScore;
  const homeWon = article.homeScore > article.awayScore;
  const moodKey = isDraw ? "satisfied" : homeWon ? (article.winnerMood ?? "happy") : (article.loserMood ?? "frustrated");
  const mood = MOOD_CONFIG[moodKey] ?? MOOD_CONFIG.neutral;
  const winnerMood = MOOD_CONFIG[article.winnerMood ?? "happy"] ?? MOOD_CONFIG.happy;
  const loserMood = MOOD_CONFIG[article.loserMood ?? "frustrated"] ?? MOOD_CONFIG.frustrated;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-2xl border overflow-hidden ${isGCC ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-gray-900" : "border-gray-800 bg-gray-900"}`}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isGCC && <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">🏆 Champions Cup</span>}
          {!isGCC && <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">⚽ League</span>}
          {article.mediaRating && (
            <span className="text-[10px] text-gray-500 font-medium">• Media Rating: <span className="text-white font-bold">{article.mediaRating}/10</span></span>
          )}
        </div>
        <span className="text-[10px] text-gray-600">
          {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
        </span>
      </div>

      <div className="p-5">
        {/* Scoreline */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            {article.homeTeam?.logoUrl && <img src={article.homeTeam.logoUrl} className="w-7 h-7 object-contain" alt="" />}
            <span className="font-bold text-sm truncate">{article.homeTeam?.name ?? "Home"}</span>
          </div>
          <div className="text-center shrink-0">
            <div className="text-xl font-black text-white tabular-nums">{article.homeScore ?? "—"} - {article.awayScore ?? "—"}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{isDraw ? "Draw" : homeWon ? "Home Win" : "Away Win"}</div>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-bold text-sm truncate">{article.awayTeam?.name ?? "Away"}</span>
            {article.awayTeam?.logoUrl && <img src={article.awayTeam.logoUrl} className="w-7 h-7 object-contain" alt="" />}
          </div>
        </div>

        {/* Headline */}
        <h3 className="font-black text-white text-lg uppercase leading-tight mb-3">{article.headline}</h3>

        {/* Summary */}
        <p className="text-sm text-gray-400 leading-relaxed mb-4">{article.summary}</p>

        {/* Talking Point */}
        {article.talkingPoint && (
          <div className="bg-gray-800/60 rounded-xl p-3 mb-4 border border-gray-700/50">
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">💬 Talking Point</div>
            <p className="text-sm text-gray-300">{article.talkingPoint}</p>
          </div>
        )}

        {/* Fan Moods */}
        {!isDraw && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {article.winnerMood && (
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${winnerMood.bg} ${winnerMood.color}`}>
                {article.homeTeam?.name ?? "Winner"}: {winnerMood.label}
              </span>
            )}
            {article.loserMood && (
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${loserMood.bg} ${loserMood.color}`}>
                {article.awayTeam?.name ?? "Loser"}: {loserMood.label}
              </span>
            )}
          </div>
        )}

        {/* Momentum */}
        {article.momentumChange && (
          <p className="text-[11px] text-gray-500 italic">{article.momentumChange}</p>
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

  const allTeamIds = [...new Set([
    ...articles.map((a: any) => a.homeTeamId),
    ...articles.map((a: any) => a.awayTeamId),
    ...reactions.map((r: any) => r.teamId),
  ])];

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
    (!teamFilter || r.teamId === teamFilter || r.rivalTeamId === teamFilter) &&
    (matchTypeFilter === "all" || true) // reactions don't have matchType directly
  );

  const totalFans = (fanbase ?? []).reduce((s: number, c: any) => s + (c.currentFans || 0), 0);
  const totalComments = reactions.length;
  const totalArticles = articles.length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(217,91%,60%,0.1),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
            </span>
            <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Live Fan Community</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight mb-3 leading-none">
            GEF Fan Hub
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mb-8">
            Virtual supporters reacting to every result, transfer, and moment across GEF. Feel the pulse of every fanbase.
          </p>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users,         label: "Total Fans",     value: totalFans.toLocaleString(),    color: "text-blue-400"   },
              { icon: MessageCircle, label: "Fan Comments",   value: totalComments.toLocaleString(), color: "text-purple-400" },
              { icon: Newspaper,     label: "Match Articles", value: totalArticles.toLocaleString(), color: "text-emerald-400" },
              { icon: Trophy,        label: "Active Clubs",   value: (fanbase?.length ?? 0).toString(), color: "text-amber-400" },
            ].map((stat, i) => (
              <div key={i} className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                <stat.icon size={20} className={stat.color + " shrink-0"} />
                <div className="min-w-0">
                  <div className={`text-lg sm:text-xl font-black tabular-nums ${stat.color}`}>{stat.value}</div>
                  <div className="text-[11px] text-gray-500 uppercase tracking-wide">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Tab filter */}
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
            {(["all", "articles", "comments"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  tab === t ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t === "all" ? "All" : t === "articles" ? "📰 Articles" : "💬 Reactions"}
              </button>
            ))}
          </div>

          {/* Match type filter */}
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
            {(["all", "league", "gcc"] as const).map(t => (
              <button
                key={t}
                onClick={() => setMatchTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  matchTypeFilter === t ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
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
              className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="">All Clubs</option>
              {allTeams.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading fan community...
            </div>
          </div>
        ) : articles.length === 0 && reactions.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-lg">No reactions yet.</p>
            <p className="text-sm mt-1">Fan reactions are generated automatically when match results are recorded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main feed */}
            <div className="lg:col-span-2 space-y-5">
              {/* Articles */}
              {(tab === "all" || tab === "articles") && filteredArticles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Newspaper size={16} className="text-blue-400" />
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-400">Match Reports</h2>
                  </div>
                  <div className="space-y-4">
                    {filteredArticles.map((article: any, i: number) => (
                      <ArticleCard key={article.id} article={article} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              {(tab === "all" || tab === "comments") && filteredReactions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4 mt-6">
                    <MessageCircle size={16} className="text-purple-400" />
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-400">Fan Reactions</h2>
                    <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">{filteredReactions.length}</span>
                  </div>
                  <div className="space-y-3">
                    {filteredReactions.map((reaction: any, i: number) => (
                      <FanComment key={reaction.id} reaction={reaction} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {filteredArticles.length === 0 && filteredReactions.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <Filter size={32} className="mx-auto mb-2 opacity-30" />
                  No content matches the current filters.
                </div>
              )}
            </div>

            {/* Sidebar: Fanbase leaderboard teaser */}
            <div className="space-y-5">
              {/* Fan Rankings */}
              {fanbase && fanbase.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-blue-400" />
                      <span className="text-sm font-black uppercase tracking-wide">Fan Rankings</span>
                    </div>
                    <Link href="/fanbase">
                      <span className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        Full table <ChevronRight size={12} />
                      </span>
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {fanbase.slice(0, 6).map((club: any, i: number) => (
                      <div key={club.teamId} className="px-4 py-3 flex items-center gap-3">
                        <span className={`text-xs font-black w-5 text-center ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-600"}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </span>
                        {club.logoUrl ? (
                          <img src={club.logoUrl} className="w-6 h-6 object-contain shrink-0" alt="" />
                        ) : (
                          <Shield size={14} className="text-gray-600 shrink-0" />
                        )}
                        <span className="text-sm font-semibold flex-1 min-w-0 truncate">{club.teamName}</span>
                        <span className="text-sm font-bold text-blue-400 shrink-0">{club.currentFans.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3">
                    <Link href="/fanbase">
                      <button className="w-full text-center text-xs text-blue-400 hover:text-blue-300 font-bold py-1">
                        View Full Fanbase Rankings →
                      </button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Recent match articles summary */}
              {articles.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-800">
                    <span className="text-sm font-black uppercase tracking-wide">Recent Results</span>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {articles.slice(0, 5).map((a: any) => {
                      const isDraw = a.homeScore === a.awayScore;
                      const homeWon = a.homeScore > a.awayScore;
                      return (
                        <div key={a.id} className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-1 uppercase tracking-wide">
                            {a.matchType === "gcc" ? "🏆 Cup" : "⚽ League"}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold flex-1 truncate ${homeWon ? "text-white" : isDraw ? "text-gray-400" : "text-gray-500"}`}>
                              {a.homeTeam?.name ?? "?"}
                            </span>
                            <span className="text-sm font-black text-white shrink-0 tabular-nums">
                              {a.homeScore}-{a.awayScore}
                            </span>
                            <span className={`text-xs font-bold flex-1 truncate text-right ${!homeWon && !isDraw ? "text-white" : isDraw ? "text-gray-400" : "text-gray-500"}`}>
                              {a.awayTeam?.name ?? "?"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Personality guide */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="text-sm font-black uppercase tracking-wide mb-4">Fan Types</div>
                <div className="space-y-2">
                  {Object.entries(PERSONALITY_CONFIG).slice(0, 8).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-base">{cfg.emoji}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
