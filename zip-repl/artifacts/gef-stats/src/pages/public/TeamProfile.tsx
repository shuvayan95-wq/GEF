import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { PlayerCard } from "@/components/shared/PlayerCard";
import { motion } from "framer-motion";
import {
  Shield, Users, Wallet, TrendingUp, TrendingDown, ArrowLeft,
  CheckCircle, AlertTriangle, XCircle, ShieldAlert,
  ArrowUpRight, ArrowDownLeft, Gavel, Repeat2, CalendarDays,
  Loader2, Crown, Star, LogOut, Cpu, ChevronDown,
  Zap, Eye, BarChart2, Swords, Trophy, Activity, RefreshCw, CheckCircle2, Target,
} from "lucide-react";

function fmt(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(0)}K`;
  return `${sign}€${Math.round(abs)}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  transfer_in:  "Transfer Fee Received",
  transfer_out: "Transfer Fee Paid",
  prize_money:  "Prize Money",
  sponsorship:  "Sponsorship",
  grant:        "Grant / Allocation",
  wages:        "Player Wages",
  penalty:      "Financial Penalty",
  operational:  "Operational Cost",
  other:        "Other",
};

const CATEGORY_ICON: Record<string, any> = {
  transfer_in:  ArrowDownLeft,
  transfer_out: ArrowUpRight,
  penalty:      Gavel,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  compliant: { label: "Compliant",  color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  icon: CheckCircle },
  at_risk:   { label: "At Risk",    color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: AlertTriangle },
  high_risk: { label: "High Risk",  color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: ShieldAlert },
  breach:    { label: "FFP Breach", color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    icon: XCircle },
};

type Tab = "roster" | "finances" | "transfers" | "analysis";

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  if (role === "captain") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
        <Crown className="w-2.5 h-2.5" /> C
      </span>
    );
  }
  if (role === "vice_captain") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40">
        <Star className="w-2.5 h-2.5" /> VC
      </span>
    );
  }
  return null;
}

// ─── Team section configs ────────────────────────────────────────────────────

const TEAM_SECTION_CONFIGS: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  "club overview":       { icon: Eye,      color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/30", label: "Club Overview" },
  "overview":            { icon: Eye,      color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/30", label: "Overview" },
  "attack":              { icon: Swords,   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Attack & Scoring" },
  "attacking":           { icon: Swords,   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Attack" },
  "defensive":           { icon: Shield,   color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/30",    label: "Defensive Record" },
  "defense":             { icon: Shield,   color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/30",    label: "Defence" },
  "form":                { icon: BarChart2, color: "text-cyan-400",   bg: "bg-cyan-500/10",    border: "border-cyan-500/30",   label: "Form & Consistency" },
  "consistency":         { icon: BarChart2, color: "text-cyan-400",   bg: "bg-cyan-500/10",    border: "border-cyan-500/30",   label: "Consistency" },
  "squad":               { icon: Users,    color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/30", label: "Squad Strength" },
  "strengths":           { icon: Zap,      color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",  label: "Strengths" },
  "areas to watch":      { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", label: "Areas to Watch" },
  "key players":         { icon: Star,     color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30", label: "Key Players" },
  "verdict":             { icon: Trophy,   color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30", label: "Verdict" },
  "tactical":            { icon: Target,   color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",   label: "Tactical Analysis" },
};

const TEAM_COLOR_MAP: Record<string, { accent: string; border: string; headerBg: string; headerBorder: string; glow: string }> = {
  "PALTAN FC":           { accent: "text-orange-400",  border: "border-orange-500/40",  headerBg: "bg-gradient-to-r from-orange-500/15 to-amber-500/10",   headerBorder: "border-orange-500/30",  glow: "shadow-orange-500/10" },
  "MONEYBALL FC":        { accent: "text-emerald-400", border: "border-emerald-500/40", headerBg: "bg-gradient-to-r from-emerald-500/15 to-green-500/10",   headerBorder: "border-emerald-500/30", glow: "shadow-emerald-500/10" },
  "NEXUS FC":            { accent: "text-cyan-400",    border: "border-cyan-500/40",    headerBg: "bg-gradient-to-r from-cyan-500/15 to-sky-500/10",        headerBorder: "border-cyan-500/30",    glow: "shadow-cyan-500/10" },
  "RED DRAGONS FC":      { accent: "text-red-400",     border: "border-red-500/40",     headerBg: "bg-gradient-to-r from-red-500/15 to-rose-500/10",        headerBorder: "border-red-500/30",     glow: "shadow-red-500/10" },
  "INVICTUS FC":         { accent: "text-violet-400",  border: "border-violet-500/40",  headerBg: "bg-gradient-to-r from-violet-500/15 to-purple-500/10",   headerBorder: "border-violet-500/30",  glow: "shadow-violet-500/10" },
  "EXPENDABLES FC":      { accent: "text-amber-400",   border: "border-amber-500/40",   headerBg: "bg-gradient-to-r from-amber-500/15 to-yellow-500/10",    headerBorder: "border-amber-500/30",   glow: "shadow-amber-500/10" },
  "STORM FC":            { accent: "text-sky-400",     border: "border-sky-500/40",     headerBg: "bg-gradient-to-r from-sky-500/15 to-blue-500/10",        headerBorder: "border-sky-500/30",     glow: "shadow-sky-500/10" },
  "DARK REIGN FC":       { accent: "text-rose-400",    border: "border-rose-500/40",    headerBg: "bg-gradient-to-r from-rose-500/15 to-red-500/10",        headerBorder: "border-rose-500/30",    glow: "shadow-rose-500/10" },
  "APEX FC":             { accent: "text-yellow-400",  border: "border-yellow-500/40",  headerBg: "bg-gradient-to-r from-yellow-500/15 to-amber-500/10",    headerBorder: "border-yellow-500/30",  glow: "shadow-yellow-500/10" },
  "ROMA AQUILAE FC":     { accent: "text-lime-400",    border: "border-lime-500/40",    headerBg: "bg-gradient-to-r from-lime-500/15 to-green-500/10",      headerBorder: "border-lime-500/30",    glow: "shadow-lime-500/10" },
  "DHURANDHAR WARRIORS": { accent: "text-fuchsia-400", border: "border-fuchsia-500/40", headerBg: "bg-gradient-to-r from-fuchsia-500/15 to-purple-500/10",  headerBorder: "border-fuchsia-500/30", glow: "shadow-fuchsia-500/10" },
};

function getTeamTheme(name?: string) {
  if (!name) return { accent: "text-primary", border: "border-primary/30", headerBg: "bg-primary/5", headerBorder: "border-primary/20", glow: "" };
  const upper = name.toUpperCase();
  for (const key of Object.keys(TEAM_COLOR_MAP)) {
    if (upper.includes(key.toUpperCase())) return TEAM_COLOR_MAP[key];
  }
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % Object.keys(TEAM_COLOR_MAP).length;
  return Object.values(TEAM_COLOR_MAP)[hash];
}

function parseTeamSections(text: string): Array<{ key: string; content: string }> {
  const sections: Array<{ key: string; content: string }> = [];
  const regex = /\*\*([^*]+?):\*\*\s*/g;
  const parts = text.split(regex);
  for (let i = 1; i < parts.length; i += 2) {
    const label = parts[i].trim().toLowerCase();
    const content = (parts[i + 1] || "").trim();
    if (content) sections.push({ key: label, content });
  }
  if (sections.length === 0) {
    text.split("\n\n").forEach((para, idx) => {
      if (para.trim()) sections.push({ key: `section-${idx}`, content: para.trim() });
    });
  }
  return sections;
}

// ─── AIAnalysisSection Component ────────────────────────────────────────────

function AIAnalysisSection({ teamId, teamName }: { teamId: number; teamName?: string }) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/ai/team-analysis/${teamId}`);
      if (!r.ok) throw new Error("Failed to generate analysis");
      const data = await r.json();
      setAnalysis(data.analysis);
      setGenerated(true);
    } catch {
      setError("Failed to generate analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const theme = getTeamTheme(teamName);

  if (!generated && !loading) {
    return (
      <div className={`bg-card border ${theme.border} rounded-xl overflow-hidden shadow-lg`}>
        <div className={`px-6 py-5 ${theme.headerBg} border-b ${theme.headerBorder}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-white/5 border ${theme.border} flex items-center justify-center`}>
              <Cpu className={`w-5 h-5 ${theme.accent}`} />
            </div>
            <div>
              <div className="font-display font-black uppercase text-sm tracking-widest">AI Club Report</div>
              {teamName && <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme.accent}`}>{teamName}</div>}
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Generate an AI-powered scouting report for{" "}
            <span className={`font-bold ${theme.accent}`}>{teamName ?? "this club"}</span>{" "}
            based on performance data, match results, and squad composition.
          </p>
          <button
            onClick={generate}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all border ${theme.border} ${theme.headerBg} ${theme.accent} hover:opacity-90`}
          >
            <Cpu className="w-4 h-4" /> Generate Report
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-card border ${theme.border} rounded-xl p-12 text-center shadow-lg`}>
        <div className={`w-14 h-14 rounded-xl bg-white/5 border ${theme.border} flex items-center justify-center mx-auto mb-4`}>
          <Loader2 className={`w-7 h-7 animate-spin ${theme.accent}`} />
        </div>
        <p className={`text-sm font-bold uppercase tracking-wider ${theme.accent}`}>Analysing club data</p>
        <p className="text-xs text-muted-foreground mt-1">Building report for {teamName ?? "club"}…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-destructive/30 rounded-xl p-8 text-center">
        <p className="text-destructive text-sm mb-4">{error}</p>
        <button onClick={generate} className="text-xs text-muted-foreground hover:text-foreground underline">Try Again</button>
      </div>
    );
  }

  const sections = analysis ? parseTeamSections(analysis) : [];

  return (
    <div className={`bg-card border ${theme.border} rounded-xl overflow-hidden shadow-xl ${theme.glow}`}>
      {/* Header */}
      <div className={`px-6 py-4 ${theme.headerBg} border-b ${theme.headerBorder}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-white/5 border ${theme.border} flex items-center justify-center`}>
              <Cpu className={`w-5 h-5 ${theme.accent}`} />
            </div>
            <div>
              <div className="font-display font-black uppercase text-sm tracking-widest">AI Club Report</div>
              {teamName && (
                <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme.accent}`}>
                  {teamName}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded hover:bg-white/5"
          >
            <RefreshCw className="w-3 h-3" /> Regenerate
          </button>
        </div>
      </div>

      {/* Sections grid */}
      <div className="p-4 grid gap-3 md:grid-cols-2">
        {sections.map(({ key, content }) => {
          const cfgKey = Object.keys(TEAM_SECTION_CONFIGS).find(k => key.includes(k));
          const cfg = cfgKey ? TEAM_SECTION_CONFIGS[cfgKey] : null;

          if (!cfg) {
            return (
              <div key={key} className="text-sm text-muted-foreground leading-relaxed px-1 md:col-span-2">
                {content}
              </div>
            );
          }
          const SectionIcon = cfg.icon;
          const isVerdict = key.includes("verdict");
          return (
            <div
              key={key}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden ${isVerdict ? "md:col-span-2" : ""}`}
            >
              <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${cfg.border}`}>
                <div className={`w-6 h-6 rounded-md ${cfg.bg} flex items-center justify-center`}>
                  <SectionIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <span className={`font-display font-black uppercase text-[11px] tracking-widest ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-foreground/80 leading-relaxed">{content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`px-6 py-2.5 border-t ${theme.headerBorder} ${theme.headerBg} flex items-center gap-2`}>
        <CheckCircle2 className={`w-3 h-3 ${theme.accent}`} />
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Powered by Groq · llama-3.3-70b · GEF AI Engine
        </span>
      </div>
    </div>
  );
}

export function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);

  const [tab, setTab] = useState<Tab>("roster");
  const [team, setTeam] = useState<any>(null);
  const [budget, setBudget] = useState<any>(null);
  const [ffp, setFfp] = useState<any>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [showLeft, setShowLeft] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/teams/${teamId}`).then(r => r.json()),
      fetch(`/api/ffp/teams`).then(r => r.json()),
    ]).then(([t, ffpTeams]) => {
      setTeam(t);
      setFfp(ffpTeams.find((f: any) => f.teamId === teamId) ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    if (tab !== "finances" || budget) return;
    setBudgetLoading(true);
    fetch(`/api/budget/${teamId}`)
      .then(r => r.json())
      .then(d => { setBudget(d); setBudgetLoading(false); })
      .catch(() => setBudgetLoading(false));
  }, [tab, teamId]);

  useEffect(() => {
    if (tab !== "transfers" || transfers.length > 0) return;
    setTransfersLoading(true);
    fetch(`/api/transfers`)
      .then(r => r.json())
      .then(d => {
        const teamTransfers = d.filter(
          (t: any) => t.toTeamId === teamId || t.fromTeamId === teamId
        ).sort((a: any, b: any) => new Date(b.transferDate || b.createdAt).getTime() - new Date(a.transferDate || a.createdAt).getTime());
        setTransfers(teamTransfers);
        setTransfersLoading(false);
      })
      .catch(() => setTransfersLoading(false));
  }, [tab, teamId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!team || team.error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Team not found. <Link href="/teams" className="ml-2 text-primary hover:underline">Back to franchises</Link>
        </div>
      </div>
    );
  }

  const ffpStatus = ffp ? (STATUS_CONFIG[ffp.status] ?? STATUS_CONFIG.compliant) : null;

  const allPlayers: any[] = team.players ?? [];
  const activePlayers = allPlayers.filter((p: any) => p.status !== "left");
  const leftPlayers = allPlayers.filter((p: any) => p.status === "left");
  const captain = allPlayers.find((p: any) => p.teamRole === "captain");
  const vc = allPlayers.find((p: any) => p.teamRole === "vice_captain");

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "roster",    label: "Roster",    icon: Users },
    { id: "finances",  label: "Finances",  icon: Wallet },
    { id: "transfers", label: "Transfers", icon: Repeat2 },
    { id: "analysis",  label: "AI Report", icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-6 max-w-6xl">
        <Link href="/teams" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> All Franchises
        </Link>

        {/* Club Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-6 flex-wrap">
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="w-20 h-20 object-contain rounded-xl border border-border/50" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-secondary border border-border flex items-center justify-center">
                <Shield className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-4xl font-display font-black uppercase text-primary tracking-tight leading-none">{team.name}</h1>
                {team.status === "left" && (
                  <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                    <LogOut className="w-3 h-3" /> Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {activePlayers.length} active players
                  {leftPlayers.length > 0 && <span className="text-red-400 ml-1">· {leftPlayers.length} left</span>}
                </span>
                {captain && (
                  <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-0.5">
                    <Crown className="w-3 h-3" /> {captain.name}
                  </span>
                )}
                {vc && (
                  <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-full px-2 py-0.5">
                    <Star className="w-3 h-3" /> {vc.name}
                  </span>
                )}
                {ffpStatus && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${ffpStatus.color} ${ffpStatus.bg} ${ffpStatus.border}`}>
                    <ffpStatus.icon className="w-3.5 h-3.5" /> {ffpStatus.label}
                  </span>
                )}
              </div>
            </div>
            {ffp && (
              <div className="hidden md:grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Income</div>
                  <div className="text-lg font-black text-green-400">{fmt(ffp.income)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Expenses</div>
                  <div className="text-lg font-black text-red-400">{fmt(ffp.expenses)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Net</div>
                  <div className={`text-lg font-black ${ffp.netPosition >= 0 ? "text-green-400" : "text-red-400"}`}>{ffp.netPosition >= 0 ? "+" : ""}{fmt(ffp.netPosition)}</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-card border border-border rounded-xl w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "roster" && (
          <motion.div key="roster" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {activePlayers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {activePlayers.map((player: any, i: number) => (
                  <motion.div key={player.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="relative">
                    {player.teamRole && (
                      <div className="absolute top-2 right-2 z-10">
                        <RoleBadge role={player.teamRole} />
                      </div>
                    )}
                    <PlayerCard player={player} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-muted-foreground bg-card border border-border rounded-xl">
                No active roster registered for this club.
              </div>
            )}

            {/* Left Legends */}
            {leftPlayers.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowLeft(!showLeft)}
                  className="flex items-center gap-2 mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span className="font-bold uppercase tracking-wider">Left Legends</span>
                  <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 font-bold">{leftPlayers.length}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showLeft ? "rotate-180" : ""}`} />
                </button>

                {showLeft && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                  >
                    {leftPlayers.map((player: any, i: number) => (
                      <motion.div key={player.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="relative opacity-60 hover:opacity-80 transition-opacity">
                        <div className="absolute top-2 left-2 z-10">
                          <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">
                            Left
                          </span>
                        </div>
                        <PlayerCard player={player} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {tab === "finances" && (
          <motion.div key="finances" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {budgetLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading finances...
              </div>
            ) : budget ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Starting Budget", value: budget.startingBudget,                         color: "text-blue-400",  icon: Wallet },
                    { label: "Total Income",    value: budget.matchIncome + budget.budgetIncome,       color: "text-green-400", icon: TrendingUp },
                    { label: "Total Expenses",  value: budget.budgetExpenses,                         color: "text-red-400",   icon: TrendingDown },
                    { label: "Current Balance", value: budget.currentBalance,                         color: budget.currentBalance >= 0 ? "text-green-400" : "text-red-400", icon: Wallet },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
                      </div>
                      <div className={`text-2xl font-black ${color}`}>{fmt(value)}</div>
                    </div>
                  ))}
                </div>

                {ffp && (
                  <div className={`rounded-xl border p-5 ${ffpStatus?.bg} ${ffpStatus?.border}`}>
                    <div className="flex items-center gap-3 mb-4">
                      {ffpStatus && <ffpStatus.icon className={`w-5 h-5 ${ffpStatus.color}`} />}
                      <h3 className="font-bold uppercase tracking-wider text-sm">Financial Fair Play Status</h3>
                      {ffpStatus && (
                        <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${ffpStatus.color} ${ffpStatus.bg} ${ffpStatus.border}`}>
                          {ffpStatus.label}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {[
                        { label: "FFP Income",    value: fmt(ffp.income),                              color: "text-green-400" },
                        { label: "FFP Expenses",  value: fmt(ffp.expenses),                            color: "text-red-400" },
                        { label: "Net Position",  value: `${ffp.netPosition >= 0 ? "+" : ""}${fmt(ffp.netPosition)}`, color: ffp.netPosition >= 0 ? "text-green-400" : "text-red-400" },
                        { label: "Expense Ratio", value: `${((ffp.expenseRatio ?? 1) * 100 - 100).toFixed(1)}% over income`, color: "text-muted-foreground" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-background/40 rounded-lg p-3">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{label}</div>
                          <div className={`text-base font-black ${color}`}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-400" /> Income Sources
                    </h3>
                    <div className="space-y-3">
                      {budget.matchIncome > 0 && (
                        <FinanceRow label="Match Bonuses" value={budget.matchIncome} type="income" />
                      )}
                      {Object.entries(budget.byCategory ?? {}).map(([cat, vals]: any) => {
                        if (!vals.income) return null;
                        return <FinanceRow key={cat} label={CATEGORY_LABELS[cat] ?? cat} value={vals.income} type="income" />;
                      })}
                      {!budget.matchIncome && !Object.values(budget.byCategory ?? {}).some((v: any) => v.income) && (
                        <p className="text-xs text-muted-foreground py-2">No income recorded yet</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-400" /> Expenditure
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(budget.byCategory ?? {}).map(([cat, vals]: any) => {
                        if (!vals.expense) return null;
                        return <FinanceRow key={cat} label={CATEGORY_LABELS[cat] ?? cat} value={vals.expense} type={cat === "penalty" ? "penalty" : "expense"} />;
                      })}
                      {!Object.values(budget.byCategory ?? {}).some((v: any) => v.expense) && (
                        <p className="text-xs text-muted-foreground py-2">No expenses recorded yet</p>
                      )}
                    </div>
                  </div>
                </div>

                {budget.transactions?.length > 0 && (
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Transaction History</h3>
                      <span className="text-xs text-muted-foreground">{budget.transactions.length} records</span>
                    </div>
                    <div className="divide-y divide-border">
                      {budget.transactions.map((txn: any, i: number) => {
                        const CatIcon = CATEGORY_ICON[txn.category] ?? (txn.type === "income" ? TrendingUp : TrendingDown);
                        return (
                          <motion.div
                            key={txn.id}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${txn.type === "income" ? "bg-green-400/15 text-green-400" : txn.category === "penalty" ? "bg-orange-400/15 text-orange-400" : "bg-red-400/15 text-red-400"}`}>
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate">{txn.description || CATEGORY_LABELS[txn.category]}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <CalendarDays className="w-3 h-3" />
                                {txn.season} · {new Date(txn.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className={`font-black text-sm shrink-0 ${txn.type === "income" ? "text-green-400" : txn.category === "penalty" ? "text-orange-400" : "text-red-400"}`}>
                              {txn.type === "income" ? "+" : "-"}{fmt(txn.amount)}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center text-muted-foreground bg-card border border-border rounded-xl">
                No financial data available for this club yet.
              </div>
            )}
          </motion.div>
        )}

        {tab === "transfers" && (
          <motion.div key="transfers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {transfersLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading transfers...
              </div>
            ) : transfers.length > 0 ? (
              <div className="space-y-3">
                {transfers.map((txfr: any, i: number) => {
                  const isArrival = txfr.toTeamId === teamId;
                  return (
                    <motion.div
                      key={txfr.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`bg-card border rounded-xl p-4 flex items-center gap-4 ${isArrival ? "border-green-500/20" : "border-red-500/20"}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isArrival ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                        {isArrival ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{txfr.playerName ?? `Player #${txfr.playerId}`}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${isArrival ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-red-400 border-red-400/30 bg-red-400/10"}`}>
                            {isArrival ? "Signing" : "Departure"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {isArrival ? (
                            <>From <span className="text-foreground font-semibold">{txfr.fromTeamName ?? "Free Agent"}</span></>
                          ) : (
                            <>To <span className="text-foreground font-semibold">{txfr.toTeamName ?? "Unknown"}</span></>
                          )}
                          {txfr.transferDate && (
                            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{new Date(txfr.transferDate).toLocaleDateString()}</span>
                          )}
                        </div>
                        {txfr.notes && <div className="text-xs text-muted-foreground mt-1 italic">"{txfr.notes}"</div>}
                      </div>
                      {txfr.fee && Number(txfr.fee) > 0 ? (
                        <div className="text-right shrink-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Fee</div>
                          <div className={`font-black text-base ${isArrival ? "text-red-400" : "text-green-400"}`}>{fmt(Number(txfr.fee))}</div>
                        </div>
                      ) : (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">Free</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground bg-card border border-border rounded-xl">
                No transfer history for this club.
              </div>
            )}
          </motion.div>
        )}

        {tab === "analysis" && (
          <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AIAnalysisSection teamId={teamId} teamName={team?.name} />
          </motion.div>
        )}
      </main>
    </div>
  );
}

function FinanceRow({ label, value, type }: { label: string; value: number; type: "income" | "expense" | "penalty" }) {
  const color = type === "income" ? "text-green-400" : type === "penalty" ? "text-orange-400" : "text-red-400";
  const sign = type === "income" ? "+" : "-";
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${type === "penalty" ? "text-orange-400/80" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm font-bold ${color}`}>{sign}{fmt(value)}</span>
    </div>
  );
}
