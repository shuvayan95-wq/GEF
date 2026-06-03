import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Loader2, Trash2, Trophy, Calculator, Star, Info, SlidersHorizontal, RotateCcw, Save, ChevronDown, ChevronUp, Eye, EyeOff, Lock, Award, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

type Tab = "calculate" | "weights";

const GROUP_ORDER = ["Forward", "Midfielder", "Defender", "Goalkeeper", "Shared", "Team", "Champions Cup", "Champions Cup Multiplier"];
const GROUP_COLORS: Record<string, string> = {
  Forward: "text-orange-400 border-orange-500/30 bg-orange-500/5",
  Midfielder: "text-blue-400 border-blue-500/30 bg-blue-500/5",
  Defender: "text-green-400 border-green-500/30 bg-green-500/5",
  Goalkeeper: "text-purple-400 border-purple-500/30 bg-purple-500/5",
  Shared: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
  Team: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  "Champions Cup": "text-blue-400 border-blue-500/30 bg-blue-500/5",
  "Champions Cup Multiplier": "text-red-400 border-red-500/30 bg-red-500/5",
};

function fmt(n: number) {
  return typeof n === "number" ? n.toFixed(2) : "—";
}

export function ManageBallonDor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("calculate");
  const [season, setSeason] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Hall of Fame: reveal + awards state
  const [revealLoading, setRevealLoading] = useState<Record<string, boolean>>({});
  const [awardsExpanded, setAwardsExpanded] = useState<string | null>(null);
  const [awardsDraft, setAwardsDraft] = useState<Record<string, any[]>>({});
  const [awardsSaving, setAwardsSaving] = useState<Record<string, boolean>>({});

  // Weights state
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [meta, setMeta] = useState<Record<string, { label: string; group: string; description: string }>>({});
  const [defaults, setDefaults] = useState<Record<string, number>>({});
  const [weightsSaving, setWeightsSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(GROUP_ORDER.map(g => [g, true]))
  );

  const { data: seasons, isLoading } = useQuery({
    queryKey: ["/api/ballon-dor"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/ballon-dor"), { credentials: "include" });
      return r.json();
    },
  });

  const { data: ceremonyState, refetch: refetchCeremony } = useQuery({
    queryKey: ["/api/ceremony/state/admin"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/ceremony/state"), { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    refetchInterval: 15000,
  });

  const ceremonyStatus: string = ceremonyState?.status ?? "none";
  const resultsRevealed = ceremonyStatus === "finished" || ceremonyStatus === "revealed" || ceremonyStatus === "done";
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  async function setResultsVisibility(reveal: boolean) {
    setVisibilityLoading(true);
    try {
      const r = await fetch(getApiUrl("/api/ceremony/state"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: reveal ? "finished" : "none" }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      await refetchCeremony();
      toast({
        title: reveal ? "Results revealed to public!" : "Results sealed — nominees view active",
        description: reveal
          ? "The ranked list and winner are now visible on the public Ballon d'Or page."
          : "The public page now shows only the scrambled nominees without rankings.",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setVisibilityLoading(false);
    }
  }

  useEffect(() => {
    let retries = 3;
    function loadWeights() {
      fetch(getApiUrl("/api/ballon-dor/weights"), { credentials: "include" })
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
        .then(text => {
          if (!text.trim()) throw new Error("Empty response");
          return JSON.parse(text);
        })
        .then(data => {
          setWeights(data.weights ?? {});
          setMeta(data.meta ?? {});
          setDefaults(data.defaults ?? {});
        })
        .catch(() => {
          if (retries-- > 0) setTimeout(loadWeights, 1500);
        });
    }
    loadWeights();
  }, []);

  // ── Calculate ─────────────────────────────────────────────────────────────

  async function calculate() {
    if (!season.trim()) {
      toast({ title: "Season required", description: "Enter a season label like 2025-26", variant: "destructive" });
      return;
    }
    setCalculating(true);
    setLastResult(null);
    try {
      const r = await fetch(getApiUrl("/api/ballon-dor/calculate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ season: season.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Calculation failed");
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/ballon-dor"] });
      toast({
        title: `Ballon d'Or ${season} Calculated!`,
        description: `${data.top50Length} players ranked from ${data.totalCandidates} candidates.`,
      });
    } catch (e: any) {
      toast({ title: "Calculation failed", description: e.message, variant: "destructive" });
    } finally {
      setCalculating(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function deleteSeason(seasonLabel: string) {
    try {
      const r = await fetch(getApiUrl(`/api/ballon-dor/${encodeURIComponent(seasonLabel)}`), {
        method: "DELETE", credentials: "include",
      });
      if (!r.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/ballon-dor"] });
      toast({ title: "Season deleted" });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  // ── Hall of Fame: Reveal toggle ───────────────────────────────────────────

  async function toggleReveal(seasonLabel: string, current: boolean) {
    setRevealLoading(p => ({ ...p, [seasonLabel]: true }));
    try {
      const r = await fetch(getApiUrl(`/api/ballon-dor/${encodeURIComponent(seasonLabel)}/reveal`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ revealed: !current }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      queryClient.invalidateQueries({ queryKey: ["/api/ballon-dor"] });
      toast({
        title: !current ? `Season ${seasonLabel} revealed in Hall of Fame!` : `Season ${seasonLabel} sealed — winner hidden`,
        description: !current
          ? "The winner is now visible on the Hall of Fame page."
          : "The winner is now hidden from the public Hall of Fame.",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRevealLoading(p => ({ ...p, [seasonLabel]: false }));
    }
  }

  // ── Hall of Fame: Awards ───────────────────────────────────────────────────

  function openAwards(seasonLabel: string, current: any[]) {
    setAwardsDraft(p => ({ ...p, [seasonLabel]: current?.length ? [...current] : [] }));
    setAwardsExpanded(awardsExpanded === seasonLabel ? null : seasonLabel);
  }

  function addAward(seasonLabel: string) {
    setAwardsDraft(p => ({
      ...p,
      [seasonLabel]: [...(p[seasonLabel] ?? []), { emoji: "", title: "", playerName: "", teamName: "" }],
    }));
  }

  function updateAward(seasonLabel: string, idx: number, field: string, value: string) {
    setAwardsDraft(p => ({
      ...p,
      [seasonLabel]: p[seasonLabel].map((a, i) => i === idx ? { ...a, [field]: value } : a),
    }));
  }

  function removeAward(seasonLabel: string, idx: number) {
    setAwardsDraft(p => ({
      ...p,
      [seasonLabel]: p[seasonLabel].filter((_, i) => i !== idx),
    }));
  }

  async function saveAwards(seasonLabel: string) {
    setAwardsSaving(p => ({ ...p, [seasonLabel]: true }));
    try {
      const awards = (awardsDraft[seasonLabel] ?? []).filter(a => a.title && a.playerName);
      const r = await fetch(getApiUrl(`/api/ballon-dor/${encodeURIComponent(seasonLabel)}/hof-awards`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ awards }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      queryClient.invalidateQueries({ queryKey: ["/api/ballon-dor"] });
      toast({ title: `Awards saved for ${seasonLabel}!`, description: `${awards.length} award${awards.length !== 1 ? "s" : ""} saved.` });
    } catch (e: any) {
      toast({ title: "Error saving awards", description: e.message, variant: "destructive" });
    } finally {
      setAwardsSaving(p => ({ ...p, [seasonLabel]: false }));
    }
  }

  // ── Save Weights ──────────────────────────────────────────────────────────

  async function saveWeights() {
    setWeightsSaving(true);
    try {
      const r = await fetch(getApiUrl("/api/ballon-dor/weights"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(weights),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast({ title: "Weights saved! Recalculate any season to apply." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setWeightsSaving(false);
    }
  }

  function resetToDefaults() {
    setWeights({ ...defaults });
    toast({ title: "Reset to defaults — click Save to apply." });
  }

  const groupedKeys = GROUP_ORDER.map(group => ({
    group,
    keys: Object.keys(meta).filter(k => meta[k]?.group === group),
  }));

  const INPUT_CLS = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors";

  return (
    <AdminLayout>
      <div className="max-w-4xl space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase mb-1 flex items-center gap-3">
              <Trophy className="text-[#d4af37] w-7 h-7" /> Ballon d'Or Engine
            </h1>
            <p className="text-muted-foreground text-sm">Professional multi-factor scoring system with position-aware weights and team bonuses.</p>
          </div>
          <Link href="/ballon-dor">
            <Button variant="outline" size="sm" className="gap-2">
              <Star className="w-3.5 h-3.5" /> Public Page
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 w-fit">
          {([["calculate", "Calculate"], ["weights", "Scoring Weights"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${tab === t ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── CALCULATE TAB ──────────────────────────────────────────────── */}
        {tab === "calculate" && (
          <div className="space-y-8">

            {/* Public Visibility Control */}
            <div className={`rounded-2xl border p-5 space-y-4 ${resultsRevealed ? "bg-green-950/20 border-green-600/30" : "bg-[#1a1000] border-[#d4af37]/30"}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  {resultsRevealed
                    ? <Eye className="w-4 h-4 text-green-400" />
                    : <Lock className="w-4 h-4 text-[#d4af37]" />
                  }
                  <span className={`text-sm font-bold uppercase tracking-wider ${resultsRevealed ? "text-green-400" : "text-[#d4af37]"}`}>
                    Public Visibility
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    ceremonyStatus === "waiting" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                    ceremonyStatus === "live"    ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                    resultsRevealed             ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                    "bg-white/5 text-white/40 border border-white/10"
                  }`}>
                    {ceremonyStatus === "waiting" ? "🔒 Ceremony Upcoming"
                      : ceremonyStatus === "live" ? "🎙️ Live Ceremony"
                      : resultsRevealed           ? "✅ Results Revealed"
                      : "🎴 Nominees Scrambled"}
                  </span>
                </div>
              </div>

              <p className="text-sm text-white/50 leading-relaxed">
                {resultsRevealed
                  ? "The ranked list and winner are visible to everyone on the public Ballon d'Or page."
                  : ceremonyStatus === "waiting" || ceremonyStatus === "live"
                  ? "The public page is locked during the ceremony. Results will show after you reveal them below."
                  : "The public page shows only the 50 nominees in scrambled order — no rankings, no winner, no stats."}
              </p>

              <div className="flex gap-3 flex-wrap">
                {!resultsRevealed ? (
                  <Button
                    onClick={() => setResultsVisibility(true)}
                    disabled={visibilityLoading}
                    className="bg-gradient-to-r from-green-700 to-green-600 hover:brightness-110 text-white font-bold gap-2"
                  >
                    {visibilityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    Reveal Full Results to Public
                  </Button>
                ) : (
                  <Button
                    onClick={() => setResultsVisibility(false)}
                    disabled={visibilityLoading}
                    variant="outline"
                    className="border-[#d4af37]/40 text-[#d4af37] hover:border-[#d4af37]/70 gap-2"
                  >
                    {visibilityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
                    Seal Results (back to nominees view)
                  </Button>
                )}
              </div>
            </div>

            {/* Formula Overview */}
            <div className="bg-amber-950/20 border border-amber-700/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-bold uppercase tracking-wider">
                <Info className="w-4 h-4" /> How the Engine Works
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="space-y-1.5">
                  <div className="font-semibold text-foreground">Position-Aware Base Score</div>
                  <div className="font-mono bg-background/50 rounded p-2 text-xs border border-border">
                    baseScore = goals × <span className="text-amber-400">fw/mf/df/gk_goals</span><br/>
                    + cleanSheets × <span className="text-amber-400">position_weight</span><br/>
                    + wins × <span className="text-amber-400">win_bonus</span><br/>
                    + MVPs × <span className="text-amber-400">mvp_bonus</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="font-semibold text-foreground">Multipliers & Bonuses</div>
                  <div className="font-mono bg-background/50 rounded p-2 text-xs border border-border">
                    efficiency = (G/M) × <span className="text-amber-400">efficiency_weight</span><br/>
                    trophyBonus = trophies × <span className="text-amber-400">weights</span><br/>
                    teamMult = 1 + (winRate × <span className="text-amber-400">0.4</span>)<br/>
                    <span className="text-primary">finalScore = (base + eff + trophy) × mult</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Goalkeepers: clean sheets heavily weighted. Defenders: both clean sheets & goals. Forwards: goals & efficiency dominate. All weights are configurable in the Scoring Weights tab.</p>
            </div>

            {/* Calculate Form */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <h2 className="text-xl font-display font-bold uppercase border-b border-border pb-3 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" /> Run Calculation
              </h2>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Season Label</label>
                <div className="flex gap-3">
                  <Input
                    value={season}
                    onChange={e => setSeason(e.target.value)}
                    placeholder="e.g. 2025-26"
                    className="bg-background max-w-xs"
                    onKeyDown={e => e.key === "Enter" && calculate()}
                  />
                  <Button
                    onClick={calculate}
                    disabled={calculating}
                    className="bg-gradient-to-r from-[#b8860b] via-[#d4af37] to-[#b8860b] text-black font-bold hover:brightness-110 px-6"
                  >
                    {calculating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculating…</> : <><Trophy className="w-4 h-4 mr-2" /> Calculate</>}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Must match the season label set on your leagues (e.g. "2025-26"). Recalculating an existing season overwrites results.</p>
              </div>

              {/* Result */}
              {lastResult && (
                <div className="bg-amber-950/20 border border-amber-600/30 rounded-xl p-5 space-y-4">
                  <div className="text-amber-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> {lastResult.season} — Complete
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><div className="text-muted-foreground text-[11px]">Candidates</div><div className="font-bold text-amber-400 text-lg">{lastResult.totalCandidates}</div></div>
                    <div><div className="text-muted-foreground text-[11px]">Matches</div><div className="font-bold text-lg">{lastResult.matchesAnalyzed}</div></div>
                    <div><div className="text-muted-foreground text-[11px]">Ranked</div><div className="font-bold text-lg">{lastResult.top50Length}</div></div>
                  </div>

                  {lastResult.winner && (
                    <div className="bg-black/40 rounded-xl p-4 border border-amber-500/30">
                      <div className="text-xs text-amber-400/70 font-bold uppercase mb-2">Winner</div>
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">🏆</div>
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500/50 shrink-0">
                          {lastResult.winner.imageUrl
                            ? <img src={lastResult.winner.imageUrl} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-amber-950 flex items-center justify-center font-bold text-amber-400">{lastResult.winner.playerName[0]}</div>}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-amber-400 text-lg">{lastResult.winner.playerName}</div>
                          <div className="text-xs text-muted-foreground">{lastResult.winner.teamName} · {lastResult.winner.position}</div>
                          <div className="flex gap-4 mt-1 text-xs font-mono">
                            <span>Base: <span className="text-amber-400">{fmt(lastResult.winner.baseScore)}</span></span>
                            <span>+Eff: <span className="text-green-400">{fmt(lastResult.winner.efficiencyBonus)}</span></span>
                            <span>+Trophy: <span className="text-purple-400">{fmt(lastResult.winner.trophyBonus)}</span></span>
                            <span>×{lastResult.winner.teamMultiplier}</span>
                            <span className="text-amber-400 font-bold">= {fmt(lastResult.winner.finalScore)}</span>
                          </div>
                        </div>
                        <Link href="/ballon-dor">
                          <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/30">View →</Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* GCC Diagnostics */}
                  {lastResult.gccDiagnostics && (
                    <div className={`rounded-lg border px-4 py-3 text-xs ${
                      lastResult.gccDiagnostics.tournamentsFound === 0
                        ? "border-red-500/40 bg-red-500/5 text-red-300"
                        : "border-green-500/30 bg-green-500/5 text-green-300"
                    }`}>
                      <div className="font-bold uppercase tracking-wider mb-1">
                        {lastResult.gccDiagnostics.tournamentsFound === 0 ? "⚠️ No GCC Tournament Found" : `✅ GCC Data Loaded`}
                      </div>
                      <div className="space-y-0.5 text-white/60">
                        <div>BD Season: <span className="text-white font-mono">{lastResult.gccDiagnostics.bdSeasonUsed}</span> (matched year: <span className="font-mono">{lastResult.gccDiagnostics.bdYearExtracted}</span>)</div>
                        {lastResult.gccDiagnostics.tournamentsFound > 0
                          ? <div>Tournaments: <span className="text-white">{lastResult.gccDiagnostics.tournamentSeasons.join(", ")}</span></div>
                          : <div className="text-red-300">No GCC tournament found with year <span className="font-mono font-bold">{lastResult.gccDiagnostics.bdYearExtracted}</span> — elimination penalties were NOT applied. Check your GCC tournament season label.</div>
                        }
                        <div>Teams with GCC stats: <span className="text-white font-mono">{lastResult.gccDiagnostics.teamsWithGccStats}</span></div>
                      </div>
                    </div>
                  )}

                  {/* GCC Elimination Breakdown */}
                  {lastResult.gccEliminationSummary && Object.keys(lastResult.gccEliminationSummary).length > 0 && (() => {
                    const STAGE_ORDER = ["champion", "final", "sf", "qf", "r16", "playoff", "league"];
                    const STAGE_COLORS: Record<string, string> = {
                      champion: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
                      final:    "text-orange-400 border-orange-500/30 bg-orange-500/5",
                      sf:       "text-purple-400 border-purple-500/30 bg-purple-500/5",
                      qf:       "text-blue-400 border-blue-500/30 bg-blue-500/5",
                      r16:      "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
                      playoff:  "text-gray-300 border-gray-500/30 bg-gray-500/5",
                      league:   "text-red-400 border-red-500/30 bg-red-500/5",
                    };
                    const STAGE_ICONS: Record<string, string> = {
                      champion: "🏆", final: "🥈", sf: "🔥", qf: "⚡",
                      r16: "🎯", playoff: "⬆️", league: "❌",
                    };
                    return (
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-1">GCC Elimination Breakdown</div>
                        <p className="text-[11px] text-muted-foreground">Verify that each team's furthest stage is correct — this determines the GCC factor applied to their players' scores.</p>
                        <div className="space-y-2">
                          {STAGE_ORDER.filter(s => lastResult.gccEliminationSummary[s]?.length > 0).map((stageKey: string) => {
                            const teams: any[] = lastResult.gccEliminationSummary[stageKey];
                            const label = lastResult.gccStageLabels?.[stageKey] ?? stageKey;
                            const factor = teams[0]?.factor ?? 1;
                            const color = STAGE_COLORS[stageKey] ?? "text-white border-white/10 bg-white/5";
                            const icon = STAGE_ICONS[stageKey] ?? "•";
                            return (
                              <div key={stageKey} className={`rounded-lg border px-4 py-3 ${color}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span>{icon}</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                                  </div>
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                    factor < 1 ? "bg-red-500/20 text-red-300" : factor > 1 ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50"
                                  }`}>
                                    ×{factor.toFixed(2)} factor
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {teams.map((t: any) => (
                                    <span key={t.teamId} className="text-xs bg-black/30 rounded px-2 py-0.5 font-medium">
                                      {t.teamName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Past Seasons */}
            <div>
              <h2 className="text-xl font-display font-bold uppercase border-b border-border pb-3 mb-5">Past Ceremonies</h2>
              {isLoading ? (
                <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-card animate-pulse border border-border" />)}</div>
              ) : (seasons?.length ?? 0) === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
                  <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No ceremonies yet. Run the first calculation above.
                </div>
              ) : (
                <div className="space-y-3">
                  {seasons.map((s: any) => {
                    const isRevealed: boolean = s.revealed ?? false;
                    const isAwardsOpen = awardsExpanded === s.season;
                    const draft: any[] = awardsDraft[s.season] ?? s.hofAwards ?? [];
                    return (
                      <div key={s.season} className="bg-card border border-border rounded-xl overflow-hidden">
                        {/* Main row */}
                        <div className="p-5 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                          <div className="text-2xl">🏆</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold uppercase font-display flex items-center gap-2 flex-wrap">
                              {s.season}
                              {isRevealed && (
                                <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  Revealed in HoF
                                </span>
                              )}
                            </div>
                            {s.winner && (
                              <div className="text-sm text-muted-foreground">
                                Winner: <span className="text-amber-400 font-semibold">{(s.winner as any).playerName}</span>
                                {(s.winner as any).teamName ? ` · ${(s.winner as any).teamName}` : ""}
                                {" · "}<span className="font-mono text-xs">{fmt((s.winner as any).finalScore ?? (s.winner as any).score ?? 0)} pts</span>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {s.totalCandidates} candidates · {new Date(s.calculatedAt).toLocaleDateString("en-GB")}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            {/* Reveal toggle */}
                            <Button
                              size="sm"
                              variant={isRevealed ? "outline" : "ghost"}
                              className={isRevealed
                                ? "border-green-500/40 text-green-400 hover:border-green-500/60 gap-1.5"
                                : "text-[#d4af37]/60 hover:text-[#d4af37] gap-1.5"}
                              onClick={() => toggleReveal(s.season, isRevealed)}
                              disabled={revealLoading[s.season]}
                            >
                              {revealLoading[s.season]
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : isRevealed ? <Eye className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              {isRevealed ? "Revealed" : "Sealed"}
                            </Button>
                            {/* Awards toggle */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-muted-foreground hover:text-foreground"
                              onClick={() => openAwards(s.season, s.hofAwards ?? [])}
                            >
                              <Award className="w-3.5 h-3.5" />
                              Awards
                              {isAwardsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                            {/* View in HoF */}
                            <Link href="/hall-of-fame">
                              <Button size="sm" variant="outline" className="gap-1 text-[#d4af37]/70 border-[#d4af37]/25 hover:border-[#d4af37]/50">
                                <Trophy className="w-3.5 h-3.5" /> HoF
                              </Button>
                            </Link>
                            {/* Delete */}
                            {deleteTarget === s.season ? (
                              <div className="flex gap-2 items-center">
                                <span className="text-xs text-destructive font-semibold">Confirm?</span>
                                <Button size="sm" variant="destructive" onClick={() => deleteSeason(s.season)}>Yes</Button>
                                <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(null)}>No</Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s.season)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Awards drawer */}
                        {isAwardsOpen && (
                          <div className="border-t border-border bg-background/50 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-bold uppercase tracking-wider text-[#d4af37]/70 flex items-center gap-2">
                                <Award className="w-3.5 h-3.5" />
                                Season Awards for Hall of Fame
                              </div>
                              <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => addAward(s.season)}>
                                <Plus className="w-3.5 h-3.5" /> Add Award
                              </Button>
                            </div>

                            {draft.length === 0 && (
                              <p className="text-xs text-muted-foreground py-2">No awards yet. Click "Add Award" to add Golden Boot, Best GK, etc.</p>
                            )}

                            <div className="space-y-2">
                              {draft.map((award: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                  <Input
                                    placeholder="🥇"
                                    value={award.emoji ?? ""}
                                    onChange={e => updateAward(s.season, idx, "emoji", e.target.value)}
                                    className="w-14 bg-background text-center shrink-0"
                                  />
                                  <Input
                                    placeholder="Award title (e.g. Golden Boot)"
                                    value={award.title ?? ""}
                                    onChange={e => updateAward(s.season, idx, "title", e.target.value)}
                                    className="flex-1 bg-background min-w-32"
                                  />
                                  <Input
                                    placeholder="Player name"
                                    value={award.playerName ?? ""}
                                    onChange={e => updateAward(s.season, idx, "playerName", e.target.value)}
                                    className="flex-1 bg-background min-w-32"
                                  />
                                  <Input
                                    placeholder="Team (optional)"
                                    value={award.teamName ?? ""}
                                    onChange={e => updateAward(s.season, idx, "teamName", e.target.value)}
                                    className="flex-1 bg-background min-w-28"
                                  />
                                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0" onClick={() => removeAward(s.season, idx)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-end pt-1">
                              <Button
                                size="sm"
                                className="gap-1.5 bg-primary"
                                onClick={() => saveAwards(s.season)}
                                disabled={awardsSaving[s.season]}
                              >
                                {awardsSaving[s.season] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                {awardsSaving[s.season] ? "Saving…" : "Save Awards"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── WEIGHTS TAB ────────────────────────────────────────────────── */}
        {tab === "weights" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-bold uppercase">Scoring Weights</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Adjust how each factor contributes to the Ballon d'Or score. Changes apply on next calculation.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={resetToDefaults}>
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
                </Button>
                <Button size="sm" className="gap-1.5 bg-primary" onClick={saveWeights} disabled={weightsSaving}>
                  {weightsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {weightsSaving ? "Saving…" : "Save Weights"}
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2">
              {GROUP_ORDER.map(g => (
                <span key={g} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${GROUP_COLORS[g]}`}>{g}</span>
              ))}
            </div>

            {groupedKeys.map(({ group, keys }) => {
              if (keys.length === 0) return null;
              const isOpen = expandedGroups[group] !== false;
              return (
                <div key={group} className={`rounded-xl border ${GROUP_COLORS[group]} overflow-hidden`}>
                  <button
                    onClick={() => setExpandedGroups(prev => ({ ...prev, [group]: !isOpen }))}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4" />
                      <span className="font-bold uppercase text-sm tracking-wider">{group}</span>
                      <span className="text-[10px] opacity-60">({keys.length} weights)</span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {keys.map(key => {
                        const m = meta[key];
                        const defaultVal = defaults[key];
                        const current = weights[key] ?? defaultVal ?? 0;
                        const isDirty = current !== defaultVal;
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-sm font-semibold">{m?.label ?? key}</label>
                              <div className="flex items-center gap-2">
                                {isDirty && (
                                  <span className="text-[10px] text-amber-400 font-bold">modified (default: {defaultVal})</span>
                                )}
                              </div>
                            </div>
                            {m?.description && <p className="text-[11px] text-muted-foreground mb-1.5">{m.description}</p>}
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className={`${INPUT_CLS} ${isDirty ? "border-amber-500/50" : ""}`}
                                value={current}
                                onChange={e => {
                                  const v = parseFloat(e.target.value);
                                  if (!isNaN(v)) setWeights(w => ({ ...w, [key]: v }));
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button className="gap-1.5 bg-primary px-8" onClick={saveWeights} disabled={weightsSaving}>
                {weightsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {weightsSaving ? "Saving…" : "Save All Weights"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
