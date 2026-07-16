import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, TrendingUp, TrendingDown, Settings, BarChart3, Plus, Minus, RefreshCw, Crown, ChevronUp, ChevronDown, Edit3, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API = import.meta.env.VITE_API_URL ?? "";

const DIVISION_ICONS: Record<string, string> = {
  "Local Club": "🏘️",
  "Regional Club": "🏙️",
  "National Club": "🏟️",
  "Elite Club": "⭐",
  "Continental Giant": "🌍",
  "World Giant": "🌐",
  "Global Powerhouse": "👑",
};

const EVENT_LABELS: Record<string, string> = {
  manual: "Admin",
  init: "Init",
  match_win: "Win",
  match_draw: "Draw",
  match_loss: "Loss",
  league_title: "League Title",
  cup_title: "Cup Title",
  gcc_win: "GCC Win",
  gcc_loss: "GCC Loss",
  potw: "POTW",
  star_signing: "Signing",
  star_release: "Release",
  winning_streak: "Streak Bonus",
  losing_streak: "Streak Penalty",
};

function GrowthPill({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-400 text-sm">—</span>;
  const cls = value > 0 ? "text-emerald-400" : "text-red-400";
  return <span className={`${cls} font-semibold text-sm`}>{value > 0 ? "+" : ""}{value.toLocaleString()}</span>;
}

export function ManageFanbase() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "adjust" | "divisions" | "settings">("overview");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustMode, setAdjustMode] = useState<"add" | "set">("add");
  const [initFans, setInitFans] = useState("");
  const [editingDivisions, setEditingDivisions] = useState(false);
  const [divDraft, setDivDraft] = useState<any[]>([]);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<any[]>([]);

  const { data: clubs = [] } = useQuery({
    queryKey: ["fanbase-all"],
    queryFn: async () => { const r = await fetch(`${API}/api/fanbase`, { credentials: "include" }); return r.json(); },
  });
  const { data: divisions = [] } = useQuery({
    queryKey: ["fanbase-divisions"],
    queryFn: async () => { const r = await fetch(`${API}/api/fanbase/divisions`, { credentials: "include" }); return r.json(); },
  });
  const { data: settings = [] } = useQuery({
    queryKey: ["fanbase-settings"],
    queryFn: async () => { const r = await fetch(`${API}/api/fanbase/settings`, { credentials: "include" }); return r.json(); },
  });
  const { data: teamDetail } = useQuery({
    queryKey: ["fanbase-team", selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return null;
      const r = await fetch(`${API}/api/fanbase/${selectedTeamId}`, { credentials: "include" });
      return r.json();
    },
    enabled: !!selectedTeamId,
  });

  const initMut = useMutation({
    mutationFn: async ({ teamId, fans }: { teamId: number; fans: number }) => {
      const r = await fetch(`${API}/api/fanbase/${teamId}/init`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startingFans: fans }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fanbase"] }); toast({ title: "Fanbase initialized" }); setInitFans(""); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const adjustMut = useMutation({
    mutationFn: async ({ teamId, amount, reason, setTo }: any) => {
      const r = await fetch(`${API}/api/fanbase/${teamId}/adjust`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason, setTo }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fanbase"] });
      toast({ title: "Fanbase updated" });
      setAdjustAmount(""); setAdjustReason("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const divisionsMut = useMutation({
    mutationFn: async (divs: any[]) => {
      const r = await fetch(`${API}/api/fanbase/divisions`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ divisions: divs }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fanbase-divisions"] }); toast({ title: "Divisions saved" }); setEditingDivisions(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const settingsMut = useMutation({
    mutationFn: async (s: any[]) => {
      const r = await fetch(`${API}/api/fanbase/settings`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fanbase-settings"] }); toast({ title: "Settings saved" }); setEditingSettings(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleAdjust = () => {
    if (!selectedTeamId) return;
    if (adjustMode === "set") {
      adjustMut.mutate({ teamId: selectedTeamId, reason: adjustReason, setTo: Number(adjustAmount) });
    } else {
      adjustMut.mutate({ teamId: selectedTeamId, amount: Number(adjustAmount), reason: adjustReason });
    }
  };

  const selectedClub = clubs.find((c: any) => c.teamId === selectedTeamId);
  const totalFans = clubs.filter((c: any) => c.initialized).reduce((s: number, c: any) => s + c.currentFans, 0);
  const initializedCount = clubs.filter((c: any) => c.initialized).length;

  const historyChartData = teamDetail?.history
    ? [...teamDetail.history].reverse().slice(-20).map((h: any) => ({
        date: new Date(h.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        fans: h.newTotal,
      }))
    : [];

  const SETTING_LABELS: Record<string, string> = {
    match_win_min: "Match Win — Min fans",
    match_win_max: "Match Win — Max fans",
    match_draw_min: "Match Draw — Min fans",
    match_draw_max: "Match Draw — Max fans",
    match_loss_min: "Match Loss — Min fans",
    match_loss_max: "Match Loss — Max fans",
    cup_win_min: "Cup Match Win — Min",
    cup_win_max: "Cup Match Win — Max",
    league_title_min: "League Title — Min",
    league_title_max: "League Title — Max",
    cup_title_min: "Cup Title — Min",
    cup_title_max: "Cup Title — Max",
    golden_boot: "Golden Boot winner",
    best_goalkeeper: "Best Goalkeeper winner",
    potw: "Player of the Week",
    totw_player: "Team of the Week (per player)",
    star_signing_min: "Star Signing — Min",
    star_signing_max: "Star Signing — Max",
    star_release_min: "Star Release — Min",
    star_release_max: "Star Release — Max",
    streak_win_bonus: "Winning streak bonus",
    streak_loss_penalty: "Losing streak penalty",
    max_gain_per_event: "Max gain per event",
    max_loss_per_event: "Max loss per event",
    auto_growth_enabled: "Auto-growth enabled",
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Users className="text-blue-400" size={28} />
            Fanbase Management
          </h1>
          <p className="text-gray-400 mt-1">Track, adjust and configure every club's supporter base</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="text-gray-400 text-sm mb-1">Total GEF Fans</div>
            <div className="text-3xl font-black text-emerald-400">{totalFans.toLocaleString()}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="text-gray-400 text-sm mb-1">Clubs Initialized</div>
            <div className="text-3xl font-black text-blue-400">{initializedCount} / {clubs.length}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="text-gray-400 text-sm mb-1">Fan Divisions</div>
            <div className="text-3xl font-black text-purple-400">{divisions.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
          {(["overview", "adjust", "divisions", "settings"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_140px_130px_130px_130px_110px] gap-4 px-6 py-3 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>Club</span>
              <span className="text-right">Current Fans</span>
              <span className="text-right">Division</span>
              <span className="text-right">Season Growth</span>
              <span className="text-right">Highest Ever</span>
              <span className="text-right">Status</span>
            </div>
            {clubs.map((c: any) => (
              <div
                key={c.teamId}
                className="grid grid-cols-[1fr_140px_130px_130px_130px_110px] gap-4 px-6 py-3 border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors items-center"
              >
                <div className="flex items-center gap-3">
                  {c.logoUrl ? <img src={c.logoUrl} alt="" className="w-8 h-8 object-contain" /> : <div className="w-8 h-8 rounded-full bg-gray-700" />}
                  <span className="font-medium text-white">{c.teamName}</span>
                </div>
                <div className="text-right font-bold text-white">{c.initialized ? c.currentFans.toLocaleString() : "—"}</div>
                <div className="flex justify-end">
                  {c.initialized && c.division ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: `${c.divisionColor}20`, color: c.divisionColor }}>
                      {DIVISION_ICONS[c.division] ?? "🏆"} {c.division}
                    </span>
                  ) : <span className="text-gray-600 text-xs">—</span>}
                </div>
                <div className="text-right">
                  {c.initialized ? <GrowthPill value={c.seasonGrowth} /> : <span className="text-gray-600 text-xs">—</span>}
                </div>
                <div className="text-right text-gray-400 text-sm">{c.initialized ? c.highestEver.toLocaleString() : "—"}</div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.initialized ? "bg-emerald-900/50 text-emerald-400" : "bg-gray-800 text-gray-500"}`}>
                    {c.initialized ? "Active" : "Not Set"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADJUST TAB */}
        {tab === "adjust" && (
          <div className="grid grid-cols-[300px_1fr] gap-6">
            {/* Club selector */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Club</div>
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {clubs.map((c: any) => (
                  <button
                    key={c.teamId}
                    onClick={() => setSelectedTeamId(c.teamId)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${selectedTeamId === c.teamId ? "bg-blue-600/20 border border-blue-500/40" : "bg-gray-900 border border-gray-800 hover:border-gray-700"}`}
                  >
                    {c.logoUrl ? <img src={c.logoUrl} alt="" className="w-8 h-8 object-contain flex-shrink-0" /> : <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium text-white text-sm truncate">{c.teamName}</div>
                      <div className="text-xs text-gray-400">{c.initialized ? `${c.currentFans.toLocaleString()} fans` : "Not initialized"}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="space-y-5">
              {!selectedTeamId ? (
                <div className="flex items-center justify-center h-48 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500">
                  Select a club to manage
                </div>
              ) : (
                <>
                  {/* Init if not set */}
                  {selectedClub && !selectedClub.initialized && (
                    <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-2xl p-5">
                      <div className="text-yellow-400 font-semibold mb-3">Initialize Fanbase</div>
                      <p className="text-sm text-gray-400 mb-4">Set the starting fanbase for {selectedClub.teamName}.</p>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          value={initFans}
                          onChange={e => setInitFans(e.target.value)}
                          placeholder="e.g. 10000"
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 text-sm"
                        />
                        <button
                          onClick={() => initMut.mutate({ teamId: selectedTeamId, fans: Number(initFans) })}
                          disabled={!initFans || initMut.isPending}
                          className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
                        >
                          Initialize
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Club stats */}
                  {selectedClub?.initialized && teamDetail && (
                    <>
                      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-gray-400 text-sm">Current Fanbase</div>
                            <div className="text-4xl font-black text-white">{teamDetail.currentFans?.toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl mb-1">{DIVISION_ICONS[teamDetail.division] ?? "🏆"}</div>
                            <div className="text-sm font-semibold" style={{ color: teamDetail.divisionColor }}>{teamDetail.division}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { label: "Highest Ever", value: teamDetail.highestEver, color: "text-emerald-400" },
                            { label: "Lowest Ever", value: teamDetail.lowestEver, color: "text-red-400" },
                            { label: "Largest Gain", value: `+${teamDetail.largestGain?.toLocaleString()}`, color: "text-blue-400" },
                            { label: "Largest Loss", value: `-${teamDetail.largestLoss?.toLocaleString()}`, color: "text-orange-400" },
                          ].map(s => (
                            <div key={s.label} className="bg-gray-800 rounded-xl p-3">
                              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                              <div className={`text-sm font-bold ${s.color}`}>{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Fan Growth Chart */}
                      {historyChartData.length > 1 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                          <div className="text-sm font-semibold text-gray-300 mb-3">Fan Growth (recent)</div>
                          <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={historyChartData}>
                              <defs>
                                <linearGradient id="fanGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString()} width={70} />
                              <Tooltip
                                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                                labelStyle={{ color: "#9ca3af" }}
                                formatter={(v: any) => [v.toLocaleString(), "Fans"]}
                              />
                              <Area type="monotone" dataKey="fans" stroke="#3b82f6" fill="url(#fanGrad)" strokeWidth={2} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  )}

                  {/* Adjust form */}
                  {selectedClub?.initialized && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                      <div className="text-sm font-semibold text-gray-300 mb-4">Adjust Fanbase</div>
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => setAdjustMode("add")}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${adjustMode === "add" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                        >
                          Add / Remove
                        </button>
                        <button
                          onClick={() => setAdjustMode("set")}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${adjustMode === "set" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                        >
                          Set Exact Value
                        </button>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="number"
                          value={adjustAmount}
                          onChange={e => setAdjustAmount(e.target.value)}
                          placeholder={adjustMode === "add" ? "e.g. +500 or -200" : "e.g. 50000"}
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                        />
                        <input
                          type="text"
                          value={adjustReason}
                          onChange={e => setAdjustReason(e.target.value)}
                          placeholder="Reason (e.g. Excellent Community Activity)"
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                        />
                        <button
                          onClick={handleAdjust}
                          disabled={!adjustAmount || adjustMut.isPending}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
                        >
                          {adjustMut.isPending ? "Saving..." : "Apply Adjustment"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* History */}
                  {teamDetail?.history?.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-gray-800 text-sm font-semibold text-gray-300">Fan History</div>
                      <div className="divide-y divide-gray-800/50 max-h-[280px] overflow-y-auto">
                        {teamDetail.history.map((h: any) => (
                          <div key={h.id} className="flex items-center justify-between px-5 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm flex-shrink-0 ${h.changeAmount > 0 ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
                                {h.changeAmount > 0 ? "+" : "−"}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm text-white truncate">{h.reason}</div>
                                <div className="text-xs text-gray-500">{EVENT_LABELS[h.eventType] ?? h.eventType} · {new Date(h.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right ml-4">
                              <div className={`font-bold text-sm ${h.changeAmount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {h.changeAmount > 0 ? "+" : ""}{h.changeAmount.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">{h.newTotal.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* DIVISIONS TAB */}
        {tab === "divisions" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-lg font-bold text-white">Fan Division Thresholds</div>
                <div className="text-sm text-gray-400">Configure when clubs are promoted or relegated between divisions</div>
              </div>
              {!editingDivisions ? (
                <button
                  onClick={() => { setDivDraft([...divisions].sort((a: any, b: any) => a.sortOrder - b.sortOrder)); setEditingDivisions(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => divisionsMut.mutate(divDraft)} disabled={divisionsMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-colors">
                    <Save size={14} /> Save
                  </button>
                  <button onClick={() => setEditingDivisions(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-semibold transition-colors">
                    <X size={14} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {!editingDivisions ? (
              <div className="space-y-3">
                {[...divisions].sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((d: any) => (
                  <div key={d.id} className="flex items-center gap-4 bg-gray-800 rounded-xl px-5 py-4">
                    <span className="text-2xl w-8 text-center">{DIVISION_ICONS[d.name] ?? "🏆"}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{d.name}</div>
                      <div className="text-sm text-gray-400">{d.minFans.toLocaleString()}+ supporters</div>
                    </div>
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {divDraft.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                    <input
                      value={d.name}
                      onChange={e => setDivDraft(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Division name"
                    />
                    <input
                      type="number"
                      value={d.minFans}
                      onChange={e => setDivDraft(prev => prev.map((x, j) => j === i ? { ...x, minFans: Number(e.target.value) } : x))}
                      className="w-32 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Min fans"
                    />
                    <input
                      type="color"
                      value={d.color}
                      onChange={e => setDivDraft(prev => prev.map((x, j) => j === i ? { ...x, color: e.target.value } : x))}
                      className="w-10 h-8 rounded-lg border border-gray-600 bg-transparent cursor-pointer"
                    />
                    <button onClick={() => setDivDraft(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setDivDraft(prev => [...prev, { name: "New Division", minFans: 0, color: "#6b7280", sortOrder: prev.length }])}
                  className="w-full py-2.5 bg-gray-800 border border-dashed border-gray-600 rounded-xl text-sm text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors"
                >
                  + Add Division
                </button>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-lg font-bold text-white">Fan Growth Settings</div>
                <div className="text-sm text-gray-400">Configure growth multipliers, event bonuses and limits</div>
              </div>
              {!editingSettings ? (
                <button
                  onClick={() => { setSettingsDraft(settings.map((s: any) => ({ ...s }))); setEditingSettings(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => settingsMut.mutate(settingsDraft)} disabled={settingsMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-colors">
                    <Save size={14} /> Save All
                  </button>
                  <button onClick={() => setEditingSettings(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-semibold transition-colors">
                    <X size={14} /> Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(editingSettings ? settingsDraft : settings).map((s: any, i: number) => (
                <div key={s.key} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-white font-medium">{SETTING_LABELS[s.key] ?? s.key}</div>
                    {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
                  </div>
                  {editingSettings ? (
                    s.value === "true" || s.value === "false" ? (
                      <button
                        onClick={() => setSettingsDraft(prev => prev.map((x, j) => j === i ? { ...x, value: x.value === "true" ? "false" : "true" } : x))}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${s.value === "true" ? "bg-emerald-600 text-white" : "bg-gray-600 text-gray-300"}`}
                      >
                        {s.value === "true" ? "ON" : "OFF"}
                      </button>
                    ) : (
                      <input
                        type="number"
                        value={s.value}
                        onChange={e => setSettingsDraft(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                        className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-blue-500"
                      />
                    )
                  ) : (
                    <span className={`font-bold text-sm flex-shrink-0 ${s.value === "true" ? "text-emerald-400" : s.value === "false" ? "text-red-400" : Number(s.value) < 0 ? "text-red-400" : "text-blue-400"}`}>
                      {s.value === "true" ? "ON" : s.value === "false" ? "OFF" : Number(s.value).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
