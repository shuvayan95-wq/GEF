import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Trophy, Plus, Trash2, Settings, Play, RotateCcw, ChevronDown, ChevronRight, Check, PlusCircle, Flag } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { getApiUrl } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  league: "League Phase", playoff: "Playoff Round",
  r16: "Round of 16", qf: "Quarter-Finals", sf: "Semi-Finals", final: "Final",
};

export function ManageGCC() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [tab, setTab] = useState<"setup"|"entries"|"draw"|"fixtures"|"knockout"|"addmatch"|"finalize">("setup");

  // Create tournament form
  const [form, setForm] = useState({
    name: "", season: "", numPots: "4",
    matchRules: '{"1":2,"2":2,"3":2,"4":2}',
    directQualifiers: "8", playoffSpots: "8",
  });

  // Entry form
  const [entryForm, setEntryForm] = useState({ teamId: "", pot: "1" });
  // Result form
  const [resultForms, setResultForms] = useState<Record<number, { homeScore: string; awayScore: string }>>({});
  // Per-fixture matchup rows for inline result entry
  const emptyFixtureMatchupRow = () => ({ player1Id: "", player2Id: "", player1Goals: "0", player2Goals: "0", mvpPlayerId: "" });
  const [fixtureMatchupRows, setFixtureMatchupRows] = useState<Record<number, Array<ReturnType<typeof emptyFixtureMatchupRow>>>>({}); 
  const [expandedFixtureId, setExpandedFixtureId] = useState<number | null>(null);

  // Add Match form (for direct past-season entry)
  const [addMatchForm, setAddMatchForm] = useState({
    homeTeamId: "", awayTeamId: "", homeScore: "", awayScore: "",
    stage: "league", round: "1", leg: "1",
  });
  const [addMatchError, setAddMatchError] = useState("");

  const emptyMatchupRow = () => ({ player1Id: "", player2Id: "", player1Goals: "0", player2Goals: "0", mvpPlayerId: "" });
  const [matchupRows, setMatchupRows] = useState<Array<ReturnType<typeof emptyMatchupRow>>>(
    Array.from({ length: 5 }, emptyMatchupRow)
  );
  // Knockout generation
  const [knockoutForm, setKnockoutForm] = useState({ stage: "r16", seeded: false });

  // Finalize results
  const emptyFinalize = () => ({
    leagueEliminated: [] as number[],
    playoffEliminated: [] as number[],
    r16Eliminated: [] as number[],
    qfEliminated: [] as number[],
    sfEliminated: [] as number[],
    runnerUp: null as number | null,
    champion: null as number | null,
  });
  const [finalizeForm, setFinalizeForm] = useState(emptyFinalize());

  const { data: tourneysData } = useQuery({
    queryKey: ["gcc-tournaments"],
    queryFn: async () => { const r = await fetch("/api/gcc/tournaments"); return r.json(); },
  });

  const { data: tData, refetch: refetchTournament } = useQuery({
    queryKey: ["gcc-tournament", selectedTournament],
    queryFn: async () => {
      if (!selectedTournament) return null;
      const r = await fetch(`/api/gcc/tournaments/${selectedTournament}`);
      return r.json();
    },
    enabled: !!selectedTournament,
    refetchInterval: 5000,
  });

  const { data: allTeamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => { const r = await fetch("/api/teams"); return r.json(); },
  });

  const { data: finalizedResultsData } = useQuery({
    queryKey: ["gcc-finalized-results", selectedTournament],
    queryFn: async () => {
      if (!selectedTournament) return null;
      const r = await fetch(getApiUrl(`/api/gcc/tournaments/${selectedTournament}/finalized-results`), { credentials: "include" });
      return r.json();
    },
    enabled: !!selectedTournament,
    onSuccess: (d: any) => {
      if (d?.finalizedResults) {
        setFinalizeForm({
          leagueEliminated: d.finalizedResults.leagueEliminated ?? [],
          playoffEliminated: d.finalizedResults.playoffEliminated ?? [],
          r16Eliminated: d.finalizedResults.r16Eliminated ?? [],
          qfEliminated: d.finalizedResults.qfEliminated ?? [],
          sfEliminated: d.finalizedResults.sfEliminated ?? [],
          runnerUp: d.finalizedResults.runnerUp ?? null,
          champion: d.finalizedResults.champion ?? null,
        });
      } else {
        setFinalizeForm(emptyFinalize());
      }
    },
  } as any);

  const allTeams: any[] = Array.isArray(allTeamsData) ? allTeamsData : (allTeamsData?.teams ?? []);
  const tournaments: any[] = tourneysData?.tournaments ?? [];
  const tournament = tData?.tournament;
  const entries: any[] = tData?.entries ?? [];
  const fixtures: any[] = tData?.fixtures ?? [];
  const drawState = (tournament?.drawState as any) ?? {};

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      let rules: any;
      try { rules = JSON.parse(form.matchRules); } catch { rules = {}; }
      const r = await fetch("/api/gcc/tournaments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, matchRules: rules, numPots: Number(form.numPots), directQualifiers: Number(form.directQualifiers), playoffSpots: Number(form.playoffSpots) }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["gcc-tournaments"] });
      setSelectedTournament(d.tournament.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/gcc/tournaments/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gcc-tournaments"] });
      if (selectedTournament) setSelectedTournament(null);
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${selectedTournament}/entries`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: Number(entryForm.teamId), pot: Number(entryForm.pot) }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] }); setEntryForm({ teamId: "", pot: "1" }); },
  });

  const removeEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      await fetch(`/api/gcc/tournaments/${selectedTournament}/entries/${entryId}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] }),
  });

  const drawMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${selectedTournament}/draw`, { method: "POST" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] }),
  });

  const revealMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${selectedTournament}/draw/reveal`, { method: "POST" });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] }),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/gcc/tournaments/${selectedTournament}/draw/complete`, { method: "POST" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/gcc/tournaments/${selectedTournament}/draw/reset`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] }),
  });

  const resultMutation = useMutation({
    mutationFn: async ({ fixtureId, homeScore, awayScore, playerMatchups }: { fixtureId: number; homeScore: number; awayScore: number; playerMatchups?: any[] }) => {
      const r = await fetch(`/api/gcc/tournaments/${selectedTournament}/fixtures/${fixtureId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore, awayScore, played: true, playerMatchups }),
      });
      return r.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] });
      setExpandedFixtureId(null);
      setFixtureMatchupRows(prev => { const n = {...prev}; delete n[vars.fixtureId]; return n; });
    },
  });

  const knockoutMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(getApiUrl(`/api/gcc/tournaments/${selectedTournament}/generate-knockout`), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(knockoutForm),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] }),
  });

  const addMatchMutation = useMutation({
    mutationFn: async () => {
      setAddMatchError("");
      const validMatchups = matchupRows.filter(r => r.player1Id && r.player2Id);
      const r = await fetch(getApiUrl(`/api/gcc/tournaments/${selectedTournament}/fixtures/add`), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          homeTeamId: Number(addMatchForm.homeTeamId),
          awayTeamId: Number(addMatchForm.awayTeamId),
          homeScore: addMatchForm.homeScore !== "" ? Number(addMatchForm.homeScore) : undefined,
          awayScore: addMatchForm.awayScore !== "" ? Number(addMatchForm.awayScore) : undefined,
          stage: addMatchForm.stage,
          round: Number(addMatchForm.round),
          leg: Number(addMatchForm.leg),
          playerMatchups: validMatchups.map(m => ({
            player1Id: Number(m.player1Id),
            player2Id: Number(m.player2Id),
            player1Goals: Number(m.player1Goals),
            player2Goals: Number(m.player2Goals),
            mvpPlayerId: m.mvpPlayerId ? Number(m.mvpPlayerId) : null,
          })),
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] });
      qc.invalidateQueries({ queryKey: ["gcc-tournaments"] });
      setAddMatchForm(f => ({ ...f, homeTeamId: "", awayTeamId: "", homeScore: "", awayScore: "" }));
      setMatchupRows(Array.from({ length: 5 }, emptyMatchupRow));
    },
    onError: (e: any) => setAddMatchError(e.message ?? "Failed to add match"),
  });

  const deleteFixtureMutation = useMutation({
    mutationFn: async (fid: number) => {
      await fetch(getApiUrl(`/api/gcc/tournaments/${selectedTournament}/fixtures/${fid}`), {
        method: "DELETE", credentials: "include",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] }),
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(getApiUrl(`/api/gcc/tournaments/${selectedTournament}/finalized-results`), {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(finalizeForm),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gcc-finalized-results", selectedTournament] });
      qc.invalidateQueries({ queryKey: ["gcc-tournament", selectedTournament] });
    },
  });

  const inputClass = "w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/60 transition-colors";
  const btnPrimary = "px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50";
  const btnSecondary = "px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-colors border border-white/10 disabled:opacity-50";
  const btnDanger = "px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-400 text-xs font-semibold transition-colors";

  const leagueFixtures = fixtures.filter(f => f.stage === "league");
  const knockoutFixtures = fixtures.filter(f => f.stage !== "league");

  return (
    <AdminLayout>
    <div className="min-h-screen bg-gray-950 text-white -m-4 md:-m-8 px-4 md:px-8 py-8">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-7 h-7 text-blue-400" />
          <h1 className="text-3xl font-black">GEF Champions Cup — Admin</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Tournament list + create */}
          <div className="lg:col-span-1 space-y-4">
            {/* Create new */}
            <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Create Tournament</h2>
              <input className={inputClass} placeholder="Name (e.g. GEF Champions Cup)" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              <input className={inputClass} placeholder="Season (e.g. 2024-25)" value={form.season} onChange={e => setForm(f => ({...f, season: e.target.value}))} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Pots</label>
                  <input className={inputClass} type="number" min="2" max="8" value={form.numPots} onChange={e => setForm(f => ({...f, numPots: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Direct Qs</label>
                  <input className={inputClass} type="number" min="1" value={form.directQualifiers} onChange={e => setForm(f => ({...f, directQualifiers: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Playoff spots</label>
                <input className={inputClass} type="number" min="0" value={form.playoffSpots} onChange={e => setForm(f => ({...f, playoffSpots: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Match Rules (JSON) — opponents per pot</label>
                <input className={inputClass} value={form.matchRules} onChange={e => setForm(f => ({...f, matchRules: e.target.value}))}
                  placeholder='{"1":2,"2":2,"3":2,"4":2}' />
                <p className="text-xs text-gray-600 mt-1">Each team plays this many opponents from each pot</p>
              </div>
              <button className={btnPrimary} onClick={() => createMutation.mutate()} disabled={!form.name || !form.season || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Tournament"}
              </button>
              {createMutation.isError && <p className="text-red-400 text-xs">{(createMutation.error as Error).message}</p>}
            </div>

            {/* Tournament list */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Tournaments</h2>
              {tournaments.length === 0 && <p className="text-gray-600 text-sm text-center py-4">None yet</p>}
              {tournaments.map((t: any) => (
                <div key={t.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedTournament === t.id ? "bg-blue-500/20 border border-blue-500/40" : "hover:bg-white/5 border border-transparent"}`}
                  onClick={() => { setSelectedTournament(t.id); setTab("setup"); }}>
                  <Trophy className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.season} · {t.status}</div>
                  </div>
                  <button className="text-red-500 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    onClick={e => { e.stopPropagation(); if (confirm("Delete?")) deleteMutation.mutate(t.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Management panel */}
          <div className="lg:col-span-2">
            {!selectedTournament ? (
              <div className="h-full flex items-center justify-center text-gray-600 py-20">
                <div className="text-center">
                  <Settings className="w-12 h-12 mx-auto mb-3 text-gray-800" />
                  <p>Select or create a tournament to manage</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Tabs */}
                <div className="flex overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {[
                    { id: "setup", label: "Setup" },
                    { id: "entries", label: "Teams" },
                    { id: "draw", label: "Draw" },
                    { id: "fixtures", label: "Fixtures" },
                    { id: "knockout", label: "Knockout" },
                    { id: "addmatch", label: "➕ Add Match" },
                    { id: "finalize", label: "🏆 Finalize" },
                  ].map(({ id: t, label }) => (
                    <button key={t} onClick={() => setTab(t as any)}
                      className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${tab === t
                        ? t === "addmatch" ? "text-green-400 border-b-2 border-green-400"
                          : t === "finalize" ? "text-yellow-400 border-b-2 border-yellow-400"
                          : "text-blue-400 border-b-2 border-blue-400"
                        : "text-gray-500 hover:text-gray-300"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {/* SETUP TAB */}
                  {tab === "setup" && tournament && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-white">{tournament.name}</h2>
                          <p className="text-gray-400 text-sm">Season {tournament.season} · Status: <span className="text-blue-400 font-semibold">{tournament.status}</span></p>
                        </div>
                        <div className="flex gap-2">
                          <a href={`/gcc/${selectedTournament}`} target="_blank" rel="noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm underline">View public →</a>
                          <button className={btnDanger} onClick={() => { if (confirm("Reset all fixtures?")) resetMutation.mutate(); }}>
                            <RotateCcw className="w-3 h-3 inline mr-1" />Reset
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Teams enrolled", value: entries.length },
                          { label: "Direct qualifiers", value: tournament.directQualifiers },
                          { label: "Playoff spots", value: tournament.playoffSpots },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="text-2xl font-black text-white">{value}</div>
                            <div className="text-xs text-gray-500">{label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-xs text-gray-500 mb-1">Match Rules (opponents per pot)</p>
                        <pre className="text-sm text-green-400">{JSON.stringify(tournament.matchRules, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {/* ENTRIES TAB */}
                  {tab === "entries" && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold text-white">Team Enrollment</h2>

                      <div className="flex gap-3">
                        <select className={inputClass + " flex-1"} value={entryForm.teamId} onChange={e => setEntryForm(f => ({...f, teamId: e.target.value}))}>
                          <option value="">Select team...</option>
                          {allTeams.filter(t => !entries.some((e: any) => e.teamId === t.id)).map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <select className={inputClass + " w-28"} value={entryForm.pot} onChange={e => setEntryForm(f => ({...f, pot: e.target.value}))}>
                          {[1,2,3,4].filter(p => p <= Number(tournament?.numPots ?? 4)).map(p => (
                            <option key={p} value={p}>Pot {p}</option>
                          ))}
                        </select>
                        <button className={btnPrimary} onClick={() => addEntryMutation.mutate()} disabled={!entryForm.teamId || addEntryMutation.isPending}>
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Entries by pot */}
                      {[1,2,3,4].filter(p => p <= Number(tournament?.numPots ?? 4)).map(pot => {
                        const potEntries = entries.filter((e: any) => e.pot === pot);
                        if (potEntries.length === 0) return null;
                        return (
                          <div key={pot}>
                            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Pot {pot} ({potEntries.length} teams)</h3>
                            <div className="space-y-1">
                              {potEntries.map((e: any) => (
                                <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                  style={{ background: "rgba(255,255,255,0.04)" }}>
                                  {e.team?.logoUrl
                                    ? <img src={e.team.logoUrl} alt="" className="w-6 h-6 rounded-full object-contain" />
                                    : <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400">{e.team?.name?.[0] ?? "?"}</div>}
                                  <span className="text-sm text-white flex-1">{e.team?.name ?? `Team ${e.teamId}`}</span>
                                  <button className={btnDanger} onClick={() => removeEntryMutation.mutate(e.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* DRAW TAB */}
                  {tab === "draw" && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold text-white">Draw Management</h2>
                      <p className="text-gray-500 text-sm">
                        Generate all match pairings via the draw algorithm, then reveal them one-by-one on the live draw screen.
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg p-4 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div className="text-2xl font-black text-white">{(drawState.pairs ?? []).length}</div>
                          <div className="text-xs text-gray-500">Total pairs</div>
                        </div>
                        <div className="rounded-lg p-4 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div className="text-2xl font-black text-white">{drawState.revealed ?? 0}</div>
                          <div className="text-xs text-gray-500">Revealed</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button className={btnPrimary + " w-full py-3 text-base"} onClick={() => drawMutation.mutate()} disabled={drawMutation.isPending || entries.length < 2}>
                          <Play className="w-4 h-4 inline mr-2" />
                          {drawMutation.isPending ? "Generating draw..." : tournament?.status === "draw" ? "Re-run Draw" : "Generate Draw"}
                        </button>
                        {drawMutation.isError && <p className="text-red-400 text-sm">{(drawMutation.error as Error).message}</p>}

                        <button className={btnSecondary + " w-full"} onClick={() => revealMutation.mutate()} disabled={tournament?.status !== "draw" || (drawState.revealed ?? 0) >= (drawState.pairs ?? []).length}>
                          Reveal Next Pair ({(drawState.pairs ?? []).length - (drawState.revealed ?? 0)} left)
                        </button>

                        <button
                          className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${drawState.complete ? "bg-green-700 hover:bg-green-600 text-white" : "bg-white/5 text-gray-600 cursor-not-allowed"}`}
                          onClick={() => completeMutation.mutate()}
                          disabled={!drawState.complete || completeMutation.isPending}>
                          <Check className="w-4 h-4 inline mr-2" />
                          {completeMutation.isPending ? "Generating fixtures..." : "Complete Draw & Generate Fixtures"}
                        </button>
                        {completeMutation.isError && <p className="text-red-400 text-sm">{(completeMutation.error as Error).message}</p>}

                        <button className={btnDanger + " w-full py-2"} onClick={() => resetMutation.mutate()}>
                          <RotateCcw className="w-3 h-3 inline mr-1" />Reset Draw
                        </button>
                      </div>

                      <a href={`/gcc/${selectedTournament}/draw`} target="_blank" rel="noreferrer"
                        className="block text-center text-blue-400 hover:text-blue-300 text-sm underline mt-4">
                        Open Live Draw Screen →
                      </a>
                    </div>
                  )}

                  {/* FIXTURES TAB */}
                  {tab === "fixtures" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white">League Fixtures</h2>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">{leagueFixtures.filter(f => f.played).length}/{leagueFixtures.length} played</span>
                          <button
                            className="px-2.5 py-1 rounded-lg bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 text-xs font-semibold hover:bg-yellow-600/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                            disabled={completeMutation.isPending}
                            title="Re-runs the round scheduler using the existing drawn pairs. Clears unplayed fixtures and redistributes them into balanced matchdays."
                            onClick={() => {
                              if (!confirm("This will regenerate the fixture schedule from the existing draw pairs — all UNPLAYED fixtures will be replaced. Played results are kept. Continue?")) return;
                              completeMutation.mutate();
                            }}>
                            {completeMutation.isPending ? "⏳ Regenerating…" : "⟳ Regenerate Fixtures"}
                          </button>
                        </div>
                      </div>

                      {leagueFixtures.length === 0 ? (
                        <p className="text-gray-600 text-sm text-center py-8">No league fixtures yet. Complete the draw first.</p>
                      ) : (
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                          {(() => {
                            const byRound = new Map<number, any[]>();
                            for (const f of leagueFixtures) {
                              if (!byRound.has(f.round)) byRound.set(f.round, []);
                              byRound.get(f.round)!.push(f);
                            }
                            return [...byRound.keys()].sort().map(round => (
                              <div key={round}>
                                <h3 className="text-xs text-gray-600 uppercase tracking-wider py-2 px-1">Matchday {round}</h3>
                                {(byRound.get(round) ?? []).map((f: any) => {
                                  const rf = resultForms[f.id] ?? { homeScore: "", awayScore: "" };
                                  const isExpanded = expandedFixtureId === f.id;
                                  const matchupRows = fixtureMatchupRows[f.id] ?? Array.from({ length: 5 }, emptyFixtureMatchupRow);
                                  return (
                                    <div key={f.id} className="rounded-lg mb-1"
                                      style={{ background: f.played ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.04)", border: f.played ? "1px solid rgba(34,197,94,0.15)" : "1px solid rgba(255,255,255,0.06)" }}>
                                      <div className="flex items-center gap-3 p-3">
                                        <span className="text-xs text-white font-medium flex-1 text-right">{f.homeTeam?.name ?? f.homeTeamId}</span>
                                        {f.played ? (
                                          <span className="text-sm font-black text-green-400 px-2">{f.homeScore} - {f.awayScore}</span>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            <input type="number" min="0" value={rf.homeScore} onChange={e => setResultForms(prev => ({...prev, [f.id]: {...rf, homeScore: e.target.value}}))}
                                              className="w-12 text-center bg-white/10 border border-white/10 rounded px-1 py-0.5 text-sm text-white" />
                                            <span className="text-gray-600">-</span>
                                            <input type="number" min="0" value={rf.awayScore} onChange={e => setResultForms(prev => ({...prev, [f.id]: {...rf, awayScore: e.target.value}}))}
                                              className="w-12 text-center bg-white/10 border border-white/10 rounded px-1 py-0.5 text-sm text-white" />
                                            <button
                                              className="ml-1 px-2 py-0.5 rounded bg-gray-700 text-gray-300 text-xs font-semibold hover:bg-gray-600 transition-colors"
                                              title="Enter player matchups"
                                              onClick={() => {
                                                if (!fixtureMatchupRows[f.id]) setFixtureMatchupRows(prev => ({...prev, [f.id]: Array.from({ length: 5 }, emptyFixtureMatchupRow)}));
                                                setExpandedFixtureId(isExpanded ? null : f.id);
                                              }}>
                                              {isExpanded ? "▲" : "▼"}
                                            </button>
                                            <button
                                              className="ml-1 px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50"
                                              disabled={rf.homeScore === "" || rf.awayScore === "" || resultMutation.isPending}
                                              onClick={() => {
                                                const validMatchups = matchupRows.filter(r => r.player1Id && r.player2Id).map(r => ({
                                                  player1Id: Number(r.player1Id), player2Id: Number(r.player2Id),
                                                  player1Goals: Number(r.player1Goals), player2Goals: Number(r.player2Goals),
                                                  mvpPlayerId: r.mvpPlayerId ? Number(r.mvpPlayerId) : null,
                                                }));
                                                resultMutation.mutate({ fixtureId: f.id, homeScore: Number(rf.homeScore), awayScore: Number(rf.awayScore), playerMatchups: validMatchups });
                                              }}>
                                              Save
                                            </button>
                                          </div>
                                        )}
                                        <span className="text-xs text-white font-medium flex-1">{f.awayTeam?.name ?? f.awayTeamId}</span>
                                      </div>

                                      {/* Inline matchup form — expanded when ▼ clicked */}
                                      {!f.played && isExpanded && (
                                        <div className="px-3 pb-3 border-t border-white/5 pt-3 space-y-2">
                                          <p className="text-xs text-gray-500 mb-1">Player Matchups ({f.homeTeam?.name ?? "Home"} vs {f.awayTeam?.name ?? "Away"})</p>
                                          {matchupRows.map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-[1fr_auto_auto_1fr_auto] gap-1 items-center text-xs">
                                              <select className={inputClass + " text-xs"} value={row.player1Id}
                                                onChange={e => setFixtureMatchupRows(prev => { const rows = [...(prev[f.id] ?? matchupRows)]; rows[idx] = {...rows[idx], player1Id: e.target.value, mvpPlayerId: ""}; return {...prev, [f.id]: rows}; })}>
                                                <option value="">Home player…</option>
                                                {(allTeams.find((t: any) => t.id === f.homeTeamId)?.players ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                              </select>
                                              <input type="number" min="0" max="20" value={row.player1Goals}
                                                onChange={e => setFixtureMatchupRows(prev => { const rows = [...(prev[f.id] ?? matchupRows)]; rows[idx] = {...rows[idx], player1Goals: e.target.value}; return {...prev, [f.id]: rows}; })}
                                                className="w-10 text-center bg-white/10 border border-white/10 rounded px-1 py-0.5 text-xs text-white" />
                                              <input type="number" min="0" max="20" value={row.player2Goals}
                                                onChange={e => setFixtureMatchupRows(prev => { const rows = [...(prev[f.id] ?? matchupRows)]; rows[idx] = {...rows[idx], player2Goals: e.target.value}; return {...prev, [f.id]: rows}; })}
                                                className="w-10 text-center bg-white/10 border border-white/10 rounded px-1 py-0.5 text-xs text-white" />
                                              <select className={inputClass + " text-xs"} value={row.player2Id}
                                                onChange={e => setFixtureMatchupRows(prev => { const rows = [...(prev[f.id] ?? matchupRows)]; rows[idx] = {...rows[idx], player2Id: e.target.value, mvpPlayerId: ""}; return {...prev, [f.id]: rows}; })}>
                                                <option value="">Away player…</option>
                                                {(allTeams.find((t: any) => t.id === f.awayTeamId)?.players ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                              </select>
                                              <select className={inputClass + " text-xs w-20"} value={row.mvpPlayerId}
                                                onChange={e => setFixtureMatchupRows(prev => { const rows = [...(prev[f.id] ?? matchupRows)]; rows[idx] = {...rows[idx], mvpPlayerId: e.target.value}; return {...prev, [f.id]: rows}; })}>
                                                <option value="">MVP?</option>
                                                {row.player1Id && <option value={row.player1Id}>H</option>}
                                                {row.player2Id && <option value={row.player2Id}>A</option>}
                                              </select>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* KNOCKOUT TAB */}
                  {tab === "knockout" && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-bold text-white">Knockout Stage</h2>

                      {/* Generate round */}
                      <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <h3 className="text-sm font-bold text-gray-300">Generate Knockout Fixtures</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Stage</label>
                            <select className={inputClass} value={knockoutForm.stage} onChange={e => setKnockoutForm(f => ({...f, stage: e.target.value}))}>
                              {["playoff","r16","qf","sf","final"].map(s => (
                                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={knockoutForm.seeded} onChange={e => setKnockoutForm(f => ({...f, seeded: e.target.checked}))} className="w-4 h-4 accent-blue-500" />
                              <span className="text-sm text-gray-400">Seeded draw</span>
                            </label>
                          </div>
                        </div>
                        <button className={btnPrimary + " w-full py-3"} onClick={() => knockoutMutation.mutate()} disabled={knockoutMutation.isPending}>
                          {knockoutMutation.isPending ? "Generating..." : `Generate ${STAGE_LABELS[knockoutForm.stage]} Fixtures`}
                        </button>
                        {knockoutMutation.isError && <p className="text-red-400 text-sm">{(knockoutMutation.error as Error).message}</p>}
                        {knockoutMutation.isSuccess && <p className="text-green-400 text-sm">✓ Fixtures generated!</p>}
                      </div>

                      {/* Knockout results */}
                      {knockoutFixtures.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold text-gray-300 mb-3">Knockout Results</h3>
                          <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {["playoff","r16","qf","sf","final"].map(stage => {
                              const sf = knockoutFixtures.filter(f => f.stage === stage);
                              if (sf.length === 0) return null;
                              return (
                                <div key={stage}>
                                  <h4 className="text-xs text-gray-600 uppercase tracking-wider mb-2">{STAGE_LABELS[stage]}</h4>
                                  {sf.map((f: any) => {
                                    const rf = resultForms[f.id] ?? { homeScore: "", awayScore: "" };
                                    return (
                                      <div key={f.id} className="rounded-lg p-3 mb-1"
                                        style={{ background: f.played ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.04)", border: f.played ? "1px solid rgba(168,85,247,0.3)" : "1px solid rgba(255,255,255,0.06)" }}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs text-gray-600">Leg {f.leg}</span>
                                          {f.pairKey && <span className="text-xs text-gray-700">· {f.pairKey}</span>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-white flex-1 text-right">{f.homeTeam?.name ?? f.homeTeamId}</span>
                                          {f.played ? (
                                            <span className="text-sm font-black text-purple-400 px-2">{f.homeScore} - {f.awayScore}</span>
                                          ) : (
                                            <div className="flex items-center gap-1">
                                              <input type="number" min="0" value={rf.homeScore} onChange={e => setResultForms(prev => ({...prev, [f.id]: {...rf, homeScore: e.target.value}}))}
                                                className="w-10 text-center bg-white/10 border border-white/10 rounded px-1 py-0.5 text-xs text-white" />
                                              <span className="text-gray-600 text-xs">-</span>
                                              <input type="number" min="0" value={rf.awayScore} onChange={e => setResultForms(prev => ({...prev, [f.id]: {...rf, awayScore: e.target.value}}))}
                                                className="w-10 text-center bg-white/10 border border-white/10 rounded px-1 py-0.5 text-xs text-white" />
                                              <button className="ml-1 px-2 py-0.5 rounded bg-purple-700 text-white text-xs hover:bg-purple-600 transition-colors disabled:opacity-50"
                                                disabled={rf.homeScore === "" || rf.awayScore === "" || resultMutation.isPending}
                                                onClick={() => resultMutation.mutate({ fixtureId: f.id, homeScore: Number(rf.homeScore), awayScore: Number(rf.awayScore) })}>
                                                Save
                                              </button>
                                            </div>
                                          )}
                                          <span className="text-xs text-white flex-1">{f.awayTeam?.name ?? f.awayTeamId}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* ADD MATCH TAB */}
                  {tab === "addmatch" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <PlusCircle className="w-5 h-5 text-green-400" /> Add Match Directly
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                          Use this for Season 1 or any completed tournament — enter results directly without running the draw algorithm.
                        </p>
                      </div>

                      {/* Quick-add form */}
                      <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider">New Match</h3>

                        {/* Stage + Round + Leg */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Stage</label>
                            <select className={inputClass} value={addMatchForm.stage}
                              onChange={e => setAddMatchForm(f => ({...f, stage: e.target.value}))}>
                              {Object.entries(STAGE_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              {addMatchForm.stage === "league" ? "Matchday" : "Round"}
                            </label>
                            <input type="number" min="1" className={inputClass} value={addMatchForm.round}
                              onChange={e => setAddMatchForm(f => ({...f, round: e.target.value}))} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Leg</label>
                            <select className={inputClass} value={addMatchForm.leg}
                              onChange={e => setAddMatchForm(f => ({...f, leg: e.target.value}))}>
                              <option value="1">Leg 1</option>
                              <option value="2">Leg 2</option>
                            </select>
                          </div>
                        </div>

                        {/* Teams + Score */}
                        <div className="grid grid-cols-5 gap-3 items-end">
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block">Home Team</label>
                            <select className={inputClass} value={addMatchForm.homeTeamId}
                              onChange={e => setAddMatchForm(f => ({...f, homeTeamId: e.target.value}))}>
                              <option value="">Select home team...</option>
                              {(entries.length > 0 ? entries.map((e: any) => e.team ?? { id: e.teamId, name: `Team ${e.teamId}` }) : allTeams).map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="text-center">
                            <label className="text-xs text-gray-500 mb-1 block">Score</label>
                            <div className="flex items-center gap-1">
                              <input type="number" min="0" placeholder="0" className={inputClass + " text-center px-1"}
                                value={addMatchForm.homeScore}
                                onChange={e => setAddMatchForm(f => ({...f, homeScore: e.target.value}))} />
                              <span className="text-gray-600 font-bold">–</span>
                              <input type="number" min="0" placeholder="0" className={inputClass + " text-center px-1"}
                                value={addMatchForm.awayScore}
                                onChange={e => setAddMatchForm(f => ({...f, awayScore: e.target.value}))} />
                            </div>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block">Away Team</label>
                            <select className={inputClass} value={addMatchForm.awayTeamId}
                              onChange={e => setAddMatchForm(f => ({...f, awayTeamId: e.target.value}))}>
                              <option value="">Select away team...</option>
                              {(entries.length > 0 ? entries.map((e: any) => e.team ?? { id: e.teamId, name: `Team ${e.teamId}` }) : allTeams).filter((t: any) => String(t.id) !== addMatchForm.homeTeamId).map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Player matchups section */}
                        {addMatchForm.homeTeamId && addMatchForm.awayTeamId && (() => {
                          const homeTeam = allTeams.find((t: any) => String(t.id) === addMatchForm.homeTeamId);
                          const awayTeam = allTeams.find((t: any) => String(t.id) === addMatchForm.awayTeamId);
                          const homePlayers: any[] = homeTeam?.players ?? [];
                          const awayPlayers: any[] = awayTeam?.players ?? [];

                          return (
                            <div className="space-y-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Player Matchups (1v1)</p>
                                <span className="text-xs text-gray-600">{matchupRows.filter(r => r.player1Id && r.player2Id).length}/5 set</span>
                              </div>

                              {/* Header */}
                              <div className="grid gap-1 text-[10px] text-gray-600 uppercase tracking-wider px-1"
                                style={{ gridTemplateColumns: "1fr 36px 16px 36px 1fr 60px" }}>
                                <span>{homeTeam?.name}</span>
                                <span className="text-center">G</span>
                                <span />
                                <span className="text-center">G</span>
                                <span>{awayTeam?.name}</span>
                                <span className="text-center">MVP</span>
                              </div>

                              {matchupRows.map((row, i) => (
                                <div key={i} className="grid gap-1 items-center"
                                  style={{ gridTemplateColumns: "1fr 36px 16px 36px 1fr 60px" }}>
                                  <select
                                    className="bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/60"
                                    value={row.player1Id}
                                    onChange={e => setMatchupRows(rows => rows.map((r, j) => j === i ? { ...r, player1Id: e.target.value } : r))}>
                                    <option value="">— player —</option>
                                    {homePlayers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                  <input type="number" min="0" max="99"
                                    className="bg-gray-800 border border-white/10 rounded px-1 py-1.5 text-white text-xs text-center focus:outline-none focus:border-blue-500/60 w-full"
                                    value={row.player1Goals}
                                    onChange={e => setMatchupRows(rows => rows.map((r, j) => j === i ? { ...r, player1Goals: e.target.value } : r))} />
                                  <span className="text-gray-600 text-xs text-center">v</span>
                                  <input type="number" min="0" max="99"
                                    className="bg-gray-800 border border-white/10 rounded px-1 py-1.5 text-white text-xs text-center focus:outline-none focus:border-blue-500/60 w-full"
                                    value={row.player2Goals}
                                    onChange={e => setMatchupRows(rows => rows.map((r, j) => j === i ? { ...r, player2Goals: e.target.value } : r))} />
                                  <select
                                    className="bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/60"
                                    value={row.player2Id}
                                    onChange={e => setMatchupRows(rows => rows.map((r, j) => j === i ? { ...r, player2Id: e.target.value } : r))}>
                                    <option value="">— player —</option>
                                    {awayPlayers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                  <select
                                    className="bg-gray-800 border border-white/10 rounded px-1 py-1.5 text-yellow-400 text-xs focus:outline-none focus:border-yellow-500/60"
                                    value={row.mvpPlayerId}
                                    onChange={e => setMatchupRows(rows => rows.map((r, j) => j === i ? { ...r, mvpPlayerId: e.target.value } : r))}>
                                    <option value="">—</option>
                                    {row.player1Id && homePlayers.find((p: any) => String(p.id) === row.player1Id) &&
                                      <option value={row.player1Id}>⭐ {homePlayers.find((p: any) => String(p.id) === row.player1Id)?.name}</option>}
                                    {row.player2Id && awayPlayers.find((p: any) => String(p.id) === row.player2Id) &&
                                      <option value={row.player2Id}>⭐ {awayPlayers.find((p: any) => String(p.id) === row.player2Id)?.name}</option>}
                                  </select>
                                </div>
                              ))}
                              <p className="text-xs text-gray-600">Player matchups update individual player stats and OVR ratings.</p>
                            </div>
                          );
                        })()}

                        {addMatchError && <p className="text-red-400 text-sm">{addMatchError}</p>}

                        <button
                          className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          disabled={!addMatchForm.homeTeamId || !addMatchForm.awayTeamId || addMatchMutation.isPending}
                          onClick={() => addMatchMutation.mutate()}>
                          <PlusCircle className="w-4 h-4" />
                          {addMatchMutation.isPending ? "Saving..." : "Add Match Result"}
                        </button>
                        {addMatchMutation.isSuccess && (
                          <p className="text-green-400 text-sm text-center">✓ Match added successfully!</p>
                        )}
                      </div>

                      {/* All fixtures list with delete */}
                      {fixtures.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">
                            All Matches ({fixtures.length})
                          </h3>
                          <div className="space-y-1 max-h-[500px] overflow-y-auto">
                            {["league", "playoff", "r16", "qf", "sf", "final"].map(stage => {
                              const sf = fixtures.filter((f: any) => f.stage === stage);
                              if (sf.length === 0) return null;
                              return (
                                <div key={stage} className="mb-4">
                                  <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 px-1">{STAGE_LABELS[stage]}</p>
                                  {sf.map((f: any) => (
                                    <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1 group"
                                      style={{ background: f.played ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                      <span className="text-[10px] text-gray-600 w-6">MD{f.round}</span>
                                      <span className="text-sm text-white flex-1 text-right font-medium">{f.homeTeam?.name ?? `#${f.homeTeamId}`}</span>
                                      <span className={`text-sm font-black px-3 tabular-nums ${f.played ? "text-green-400" : "text-gray-700"}`}>
                                        {f.played ? `${f.homeScore} – ${f.awayScore}` : "vs"}
                                      </span>
                                      <span className="text-sm text-white flex-1 font-medium">{f.awayTeam?.name ?? `#${f.awayTeamId}`}</span>
                                      <button
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-red-500 hover:text-red-400 hover:bg-red-900/20"
                                        onClick={() => { if (confirm("Delete this match?")) deleteFixtureMutation.mutate(f.id); }}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {fixtures.length === 0 && (
                        <div className="text-center py-12 text-gray-600">
                          <p>No matches yet. Add your first match above.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* FINALIZE TAB */}
                  {tab === "finalize" && (() => {
                    const tournamentTeams = entries.length > 0
                      ? entries.map((e: any) => e.team ?? { id: e.teamId, name: `Team ${e.teamId}`, logoUrl: null })
                      : allTeams;

                    const isFinalized = !!(finalizedResultsData as any)?.finalizedResults;

                    const toggleEliminated = (field: keyof typeof finalizeForm, teamId: number) => {
                      const arr = finalizeForm[field] as number[];
                      setFinalizeForm(f => ({
                        ...f,
                        [field]: arr.includes(teamId) ? arr.filter(id => id !== teamId) : [...arr, teamId],
                      }));
                    };

                    const allAssigned = new Set<number>([
                      ...finalizeForm.leagueEliminated,
                      ...finalizeForm.playoffEliminated,
                      ...finalizeForm.r16Eliminated,
                      ...finalizeForm.qfEliminated,
                      ...finalizeForm.sfEliminated,
                      ...(finalizeForm.runnerUp ? [finalizeForm.runnerUp] : []),
                      ...(finalizeForm.champion ? [finalizeForm.champion] : []),
                    ]);

                    const EliminationGroup = ({ label, field, color }: { label: string; field: keyof typeof finalizeForm; color: string }) => {
                      const selected = finalizeForm[field] as number[];
                      return (
                        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${color}`} />
                            <h3 className="text-sm font-bold text-white">{label}</h3>
                            {selected.length > 0 && <span className="text-xs text-gray-500">({selected.length} teams)</span>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {tournamentTeams.map((t: any) => {
                              const isSel = selected.includes(t.id);
                              const isElsewhere = !isSel && allAssigned.has(t.id);
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => toggleEliminated(field, t.id)}
                                  disabled={isElsewhere}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    isSel ? `${color.replace("bg-", "bg-").replace("500", "900/60")} border border-current text-white` :
                                    isElsewhere ? "opacity-30 cursor-not-allowed bg-white/5 text-gray-600 border border-transparent" :
                                    "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                                  }`}
                                  style={isSel ? { background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.3)" } : {}}>
                                  {t.logoUrl && <img src={t.logoUrl} alt="" className="w-4 h-4 rounded-full object-contain" />}
                                  {t.name}
                                  {isSel && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-5">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Flag className="w-5 h-5 text-yellow-400" />
                            <h2 className="text-lg font-bold text-white">Finalize Tournament Results</h2>
                            {isFinalized && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/40 text-green-400 border border-green-500/30">Saved</span>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm">
                            Select which teams were eliminated at each stage. This directly affects Ballon d'Or scoring — teams knocked out early get a scoring penalty, advancing teams get a bonus.
                          </p>
                        </div>

                        <EliminationGroup label="❌ Eliminated at League Stage" field="leagueEliminated" color="bg-red-500" />
                        <EliminationGroup label="❌ Eliminated at Playoff Round" field="playoffEliminated" color="bg-orange-500" />
                        <EliminationGroup label="❌ Eliminated at Round of 16" field="r16Eliminated" color="bg-yellow-600" />
                        <EliminationGroup label="❌ Eliminated at Quarter-Finals" field="qfEliminated" color="bg-yellow-500" />
                        <EliminationGroup label="❌ Eliminated at Semi-Finals" field="sfEliminated" color="bg-blue-500" />

                        {/* Runner-up & Champion */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.25)" }}>
                            <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">🥈 Runner-up (Finalist)</h3>
                            <select
                              className={inputClass}
                              value={finalizeForm.runnerUp ?? ""}
                              onChange={e => setFinalizeForm(f => ({ ...f, runnerUp: e.target.value ? Number(e.target.value) : null }))}>
                              <option value="">— Select team —</option>
                              {tournamentTeams.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                            {finalizeForm.runnerUp && (
                              <div className="flex items-center gap-2 text-sm text-purple-300">
                                {tournamentTeams.find((t: any) => t.id === finalizeForm.runnerUp)?.logoUrl &&
                                  <img src={tournamentTeams.find((t: any) => t.id === finalizeForm.runnerUp)?.logoUrl} className="w-5 h-5 rounded-full object-contain" alt="" />}
                                <span className="font-semibold">{tournamentTeams.find((t: any) => t.id === finalizeForm.runnerUp)?.name}</span>
                              </div>
                            )}
                          </div>

                          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.35)" }}>
                            <h3 className="text-sm font-bold text-yellow-300 flex items-center gap-2">🏆 Champion (Winner)</h3>
                            <select
                              className={inputClass}
                              value={finalizeForm.champion ?? ""}
                              onChange={e => setFinalizeForm(f => ({ ...f, champion: e.target.value ? Number(e.target.value) : null }))}>
                              <option value="">— Select team —</option>
                              {tournamentTeams.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                            {finalizeForm.champion && (
                              <div className="flex items-center gap-2 text-sm text-yellow-300">
                                {tournamentTeams.find((t: any) => t.id === finalizeForm.champion)?.logoUrl &&
                                  <img src={tournamentTeams.find((t: any) => t.id === finalizeForm.champion)?.logoUrl} className="w-5 h-5 rounded-full object-contain" alt="" />}
                                <span className="font-semibold">{tournamentTeams.find((t: any) => t.id === finalizeForm.champion)?.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ballon d'Or Score Impact Summary</h3>
                          {[
                            { label: "League Stage exit", teams: finalizeForm.leagueEliminated, factor: "−8% multiplier", color: "text-red-400" },
                            { label: "Playoff exit", teams: finalizeForm.playoffEliminated, factor: "−4% multiplier", color: "text-orange-400" },
                            { label: "R16 exit", teams: finalizeForm.r16Eliminated, factor: "Neutral", color: "text-gray-400" },
                            { label: "QF exit", teams: finalizeForm.qfEliminated, factor: "+3% multiplier", color: "text-blue-400" },
                            { label: "SF exit", teams: finalizeForm.sfEliminated, factor: "+7% multiplier", color: "text-blue-300" },
                            { label: "Finalist", teams: finalizeForm.runnerUp ? [finalizeForm.runnerUp] : [], factor: "+12% multiplier", color: "text-purple-400" },
                            { label: "Champion", teams: finalizeForm.champion ? [finalizeForm.champion] : [], factor: "+18% multiplier", color: "text-yellow-400" },
                          ].map(({ label, teams, factor, color }) => (
                            teams.length > 0 && (
                              <div key={label} className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">{label}:</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-white text-xs">
                                    {(Array.isArray(teams) ? teams : [teams]).map(tid =>
                                      tournamentTeams.find((t: any) => t.id === tid)?.name ?? `Team ${tid}`
                                    ).join(", ")}
                                  </span>
                                  <span className={`text-xs font-bold ${color}`}>{factor}</span>
                                </div>
                              </div>
                            )
                          ))}
                        </div>

                        <button
                          className="w-full py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          onClick={() => finalizeMutation.mutate()}
                          disabled={finalizeMutation.isPending}>
                          <Flag className="w-4 h-4" />
                          {finalizeMutation.isPending ? "Saving..." : isFinalized ? "Update Finalized Results" : "Save Finalized Results"}
                        </button>
                        {finalizeMutation.isSuccess && (
                          <p className="text-green-400 text-sm text-center">✓ Results saved! Recalculate the Ballon d'Or to apply changes.</p>
                        )}
                        {finalizeMutation.isError && (
                          <p className="text-red-400 text-sm text-center">{(finalizeMutation.error as Error).message}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
