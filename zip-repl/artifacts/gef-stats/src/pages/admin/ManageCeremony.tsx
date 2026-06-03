import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useCeremonySocket, type CeremonyData } from "@/hooks/useCeremony";
import { useCeremonyAudio, humanizeForSpeech } from "@/hooks/useCeremonyAudio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy, Play, SkipForward, SkipBack, Pause, Eye, Users, Trash2,
  Plus, Save, Wifi, WifiOff, RefreshCw, Star, Crown, Download,
  Zap, Shield, Building2, UserCheck, Award, ChevronRight,
  Volume2, VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

/* Small inline button that speaks the player's name through the same
   TTS pipeline the live page uses, so admins can preview pronunciation
   before going on stage. */
function TestNameButton({ name, speak }: { name: string; speak: (text: string) => void }) {
  if (!name?.trim()) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); speak(name); }}
      title={`Test pronunciation: "${humanizeForSpeech(name)}"`}
      className="text-yellow-400/70 hover:text-yellow-300 hover:bg-yellow-400/10 rounded p-1 transition-colors"
      aria-label={`Test pronunciation of ${name}`}
    >
      <Volume2 className="w-3.5 h-3.5" />
    </button>
  );
}

const SPEED_OPTS = ["slow", "normal", "fast"] as const;

const AWARD_ICONS: Record<string, any> = {
  phenomenal_finisher: Zap,
  best_captain: UserCheck,
  best_team: Building2,
  gk_defense: Shield,
  best_admin: Award,
  gcc_champion: Trophy,
};

const FINALIST_LABELS = ["3rd Place", "2nd Place", "🏆 Winner"];

function PhaseTag({ phase }: { phase: string }) {
  const colours: Record<string, string> = {
    intro: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    awards: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    rankings: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    top2: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    winner: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${colours[phase] || "bg-white/10 text-white/60 border-white/20"}`}>
      {phase}
    </span>
  );
}

/* ─── Award Trophy Image Uploader ─── */
const TROPHY_AWARD_SLOTS = [
  { id: "ballondor",            label: "🏆 Ballon d'Or (Winner Screen)" },
  { id: "phenomenal_finisher",  label: "⚡ Phenomenal Finisher" },
  { id: "best_captain",         label: "🦁 Best Captain" },
  { id: "best_team",            label: "🏟️ Best Team" },
  { id: "gk_defense",           label: "🧤 GK Directing Defense" },
  { id: "best_admin",           label: "🎩 Best Admin" },
  { id: "gcc_champion",         label: "🏆 GCC Champion" },
];

function AwardTrophyUploader({ state, apply }: { state: any; apply: (u: Record<string, any>) => Promise<void> }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<string | null>(null);
  const awardTrophies: Record<string, string> = (state?.data as any)?.awardTrophies || {};

  const uploadTrophy = async (awardId: string, file: File) => {
    setUploading(awardId);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = { ...awardTrophies, [awardId]: data.url };
      await apply({ data: { ...(state?.data || {}), awardTrophies: updated } });
      toast({ title: "Trophy image updated", description: "Visible to all viewers instantly." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload failed", description: e.message });
    } finally {
      setUploading(null);
    }
  };

  const removeTrophy = async (awardId: string) => {
    const updated = { ...awardTrophies };
    delete updated[awardId];
    await apply({ data: { ...(state?.data || {}), awardTrophies: updated } });
    toast({ title: "Trophy image removed", description: "Reverted to default." });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Award Trophy Images</h3>
      </div>
      <p className="text-xs text-white/40">Upload a custom trophy/image for each award. Changes appear instantly on all viewer screens.</p>
      <div className="space-y-2">
        {TROPHY_AWARD_SLOTS.map(({ id, label }) => {
          const current = awardTrophies[id];
          const isUploading = uploading === id;
          return (
            <div key={id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-3 py-2">
              {current ? (
                <img src={current} alt={label} className="w-9 h-9 rounded object-contain bg-black/40 border border-white/10 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/20 shrink-0 text-xs">—</div>
              )}
              <span className="flex-1 text-sm text-white/80 truncate">{label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  id={`trophy-upload-${id}`}
                  className="hidden"
                  onChange={e => e.target.files?.[0] && uploadTrophy(id, e.target.files[0])}
                />
                <label
                  htmlFor={`trophy-upload-${id}`}
                  className="cursor-pointer text-xs px-2 py-1 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/25 transition-colors"
                >
                  {isUploading ? "Uploading…" : current ? "Replace" : "Upload"}
                </label>
                {current && (
                  <button
                    onClick={() => removeTrophy(id)}
                    className="text-xs px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ManageCeremony() {
  const { state, messages, connected, viewerCount, updateState } = useCeremonySocket();
  const audio = useCeremonyAudio();
  const { toast } = useToast();
  const [testingAll, setTestingAll] = useState(false);

  /* Speak a player name through the same TTS pipeline the live page
     uses. We pass no `id` so the speak() cache doesn't dedupe repeat
     clicks, and we always force-cancel any prior utterance. */
  const testName = (name: string) => {
    if (!name?.trim()) return;
    if (!audio.enabled) audio.toggleEnabled();
    audio.speak(name, { force: true });
  };

  /* Walk through every name in a list with ~1.6s between each so
     admins can hear the whole roster in one go. */
  const testAllNames = async (names: string[]) => {
    const list = names.filter(n => n?.trim());
    if (!list.length) return;
    if (!audio.enabled) audio.toggleEnabled();
    setTestingAll(true);
    try {
      for (const name of list) {
        audio.speak(name, { force: true });
        await new Promise(r => setTimeout(r, 1700));
      }
    } finally {
      setTestingAll(false);
    }
  };
  const [editData, setEditData] = useState<CeremonyData | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingSpecial, setImportingSpecial] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [section, setSection] = useState<"control" | "special" | "stage" | "edit" | "chat">("control");

  // Best Captain picker
  const [captainSearch, setCaptainSearch] = useState("");
  const [captainFinalists, setCaptainFinalists] = useState<any[]>([]);

  // Best Admin form
  const [adminForm, setAdminForm] = useState({ name: "", image: "", note: "" });
  const [adminFinalists, setAdminFinalists] = useState<any[]>([]);
  const [uploadingAdminImg, setUploadingAdminImg] = useState(false);

  // Custom award pickers
  const [rankedData, setRankedData] = useState<any>(null);
  const [loadingRanks, setLoadingRanks] = useState(false);
  const slotsInitialized = useRef(false);
  const [customSlots, setCustomSlots] = useState<Record<string, (any | null)[]>>({
    phenomenal_finisher: [null, null, null],
    gk_defense: [null, null, null],
    best_team: [null, null, null],
  });
  const [savingAward, setSavingAward] = useState<string | null>(null);

  const { data: bdSeasons = [] } = useQuery<string[]>({
    queryKey: ["ceremony-bd-seasons"],
    queryFn: async () => {
      const r = await fetch("/api/ceremony/ballon-dor-seasons", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load seasons");
      return r.json();
    },
    staleTime: 30000,
  });

  const { data: allPlayers = [] } = useQuery<any[]>({
    queryKey: ["players-list"],
    queryFn: async () => {
      const r = await fetch("/api/players", { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (state?.data && !editData) setEditData(state.data as CeremonyData);
  }, [state?.data, editData]);

  // Restore captain/admin finalists from ceremony state
  useEffect(() => {
    if (!state?.data) return;
    const awards: any[] = (state.data as any).awards || [];
    const cap = awards.find((a: any) => a.id === "best_captain");
    if (cap?.finalists) setCaptainFinalists(cap.finalists);
    const adm = awards.find((a: any) => a.id === "best_admin");
    if (adm?.finalists) setAdminFinalists(adm.finalists);
  }, [state?.data]);

  // Restore custom slots from existing ceremony state (once on first load)
  useEffect(() => {
    if (!state?.data || slotsInitialized.current) return;
    const awds: any[] = (state.data as any).awards || [];
    const newSlots: Record<string, (any | null)[]> = {
      phenomenal_finisher: [null, null, null],
      gk_defense: [null, null, null],
      best_team: [null, null, null],
    };
    for (const awardId of ["phenomenal_finisher", "gk_defense", "best_team"]) {
      const award = awds.find((a: any) => a.id === awardId);
      if (award?.finalists?.length >= 1) {
        const slots: (any | null)[] = [null, null, null];
        award.finalists.forEach((f: any) => {
          const idx = (f.rank || 1) - 1;
          if (idx >= 0 && idx < 3) slots[idx] = f;
        });
        newSlots[awardId] = slots;
      }
    }
    setCustomSlots(newSlots);
    slotsInitialized.current = true;
  }, [state?.data]);

  const apply = async (updates: Record<string, any>) => {
    try {
      await updateState(updates);
    } catch {
      toast({ variant: "destructive", title: "Update failed" });
    }
  };

  const handleImport = async () => {
    if (!selectedSeason) return;
    setImporting(true);
    try {
      const res = await fetch("/api/ceremony/import-ballondor", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season: selectedSeason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setEditData(null);
      toast({ title: `Imported ${data.imported} players from season "${selectedSeason}"` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Import failed", description: e.message });
    } finally {
      setImporting(false);
    }
  };

  const handleImportSpecial = async () => {
    if (!selectedSeason) return;
    setImportingSpecial(true);
    try {
      const res = await fetch("/api/ceremony/import-special-awards", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season: selectedSeason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setEditData(null);
      toast({ title: "GCC Champion imported!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Import failed", description: e.message });
    } finally {
      setImportingSpecial(false);
    }
  };

  const loadRanked = async () => {
    if (!selectedSeason) return;
    setLoadingRanks(true);
    try {
      const res = await fetch(`/api/ceremony/calculate-special-awards?season=${encodeURIComponent(selectedSeason)}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRankedData(data);
      toast({ title: "Rankings loaded", description: "Now pick your finalists from the lists below." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load failed", description: e.message });
    } finally {
      setLoadingRanks(false);
    }
  };

  const saveAwardFinalists = async (awardId: string) => {
    const slots = customSlots[awardId];
    if (!slots || slots.some(s => s === null)) return;
    setSavingAward(awardId);
    try {
      const finalists = slots.map((s, i) => ({ ...s, rank: i + 1 }));
      const res = await fetch("/api/ceremony/save-award-finalists", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awardId, finalists }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Finalists saved!", description: `${awardId} updated.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    } finally {
      setSavingAward(null);
    }
  };

  const revealFinalist = async (awardId: string, idx: number) => {
    try {
      const res = await fetch("/api/ceremony/award-finalist-reveal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awardId, finalistRevealIndex: idx }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: `${FINALIST_LABELS[idx + 1] || FINALIST_LABELS[idx]} revealed` });
    } catch {
      toast({ variant: "destructive", title: "Reveal failed" });
    }
  };

  const saveData = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      await updateState({ data: editData });
      toast({ title: "Ceremony data saved" });
    } catch {
      toast({ variant: "destructive", title: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset the entire ceremony? This will clear all messages and attendees.")) return;
    await fetch("/api/ceremony/reset", { method: "POST", credentials: "include" });
    setEditData(null);
    setCaptainFinalists([]);
    setAdminFinalists([]);
    toast({ title: "Ceremony reset" });
  };

  const rankings: any[] = (editData || (state?.data as any))?.rankings || [];
  const awards: any[] = (editData || (state?.data as any))?.awards || [];
  const currentAwardIdx = parseInt(state?.currentStep || "0");
  const revealIdx = parseInt(state?.revealIndex || "0");
  const currentAward = awards[currentAwardIdx];

  const nextRank = async () => {
    const maxIdx = Math.max(0, rankings.length - 1);
    await apply({ revealIndex: String(Math.min(revealIdx + 1, maxIdx)) });
  };

  const prevRank = async () => {
    await apply({ revealIndex: String(Math.max(revealIdx - 1, 0)) });
  };

  const revealTop10 = async () => {
    const idx = rankings.findIndex((r) => r.rank === 10);
    if (idx >= 0) {
      await apply({ phase: "rankings", status: "live", revealIndex: String(idx) });
    } else if (rankings.length > 0) {
      // fewer than 50 players — start from beginning
      await apply({ phase: "rankings", status: "live", revealIndex: "0" });
    }
  };

  // Captain: save finalists into ceremony data
  const saveCaptainFinalists = async (finalists: any[]) => {
    const currentData: any = state?.data || {};
    const existingAwards: any[] = currentData.awards || [];
    const updated = existingAwards.map((a: any) =>
      a.id === "best_captain" ? { ...a, finalists } : a
    );
    await apply({ data: { ...currentData, awards: updated } });
  };

  const addCaptainFinalist = async (player: any) => {
    if (captainFinalists.length >= 3) {
      toast({ variant: "destructive", title: "Max 3 finalists" });
      return;
    }
    if (captainFinalists.find(f => f.name === player.name)) return;
    const rank = captainFinalists.length + 1;
    const newFinalist = { name: player.name, image: player.imageUrl || "", team: player.teamName || "", rank, statLabel: "Wins", statValue: player.wins || 0 };
    const updated = [...captainFinalists, newFinalist];
    setCaptainFinalists(updated);
    await saveCaptainFinalists(updated);
    toast({ title: `${player.name} added as finalist #${rank}` });
  };

  const removeCaptainFinalist = async (idx: number) => {
    const updated = captainFinalists.filter((_, i) => i !== idx).map((f, i) => ({ ...f, rank: i + 1 }));
    setCaptainFinalists(updated);
    await saveCaptainFinalists(updated);
  };

  // Admin: upload image
  const uploadAdminImage = async (file: File) => {
    setUploadingAdminImg(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdminForm(f => ({ ...f, image: data.url }));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload failed", description: e.message });
    } finally {
      setUploadingAdminImg(false);
    }
  };

  const saveAdminFinalists = async (finalists: any[]) => {
    const currentData: any = state?.data || {};
    const existingAwards: any[] = currentData.awards || [];
    const updated = existingAwards.map((a: any) =>
      a.id === "best_admin" ? { ...a, finalists } : a
    );
    await apply({ data: { ...currentData, awards: updated } });
  };

  const addAdminFinalist = async () => {
    if (!adminForm.name.trim()) return;
    if (adminFinalists.length >= 3) { toast({ variant: "destructive", title: "Max 3 entries" }); return; }
    const rank = adminFinalists.length + 1;
    const entry = { name: adminForm.name, image: adminForm.image, team: adminForm.note, rank, statLabel: "Admin", statValue: "" };
    const updated = [...adminFinalists, entry];
    setAdminFinalists(updated);
    await saveAdminFinalists(updated);
    setAdminForm({ name: "", image: "", note: "" });
    toast({ title: `${entry.name} added` });
  };

  const removeAdminFinalist = async (idx: number) => {
    const updated = adminFinalists.filter((_, i) => i !== idx).map((f, i) => ({ ...f, rank: i + 1 }));
    setAdminFinalists(updated);
    await saveAdminFinalists(updated);
  };

  const filteredPlayers = allPlayers.filter(p =>
    p.name?.toLowerCase().includes(captainSearch.toLowerCase())
  ).slice(0, 10);

  // Get current award's finalists reveal state
  const getAwardFinalistIdx = (awardId: string): number => {
    const award = awards.find(a => a.id === awardId);
    return award?.finalistRevealIndex ?? -1;
  };

  const updateAward = (i: number, field: string, val: any) => {
    const updated = [...awards];
    if (field.startsWith("winner.")) {
      updated[i] = { ...updated[i], winner: { ...(updated[i].winner || {}), [field.replace("winner.", "")]: val } };
    } else {
      updated[i] = { ...updated[i], [field]: val };
    }
    setEditData((d) => d ? { ...d, awards: updated } : d);
  };

  const updateRanking = (i: number, field: string, val: any) => {
    const updated = [...rankings];
    if (field.startsWith("stats.")) {
      updated[i] = { ...updated[i], stats: { ...(updated[i].stats || {}), [field.replace("stats.", "")]: Number(val) } };
    } else if (field === "points" || field === "rank") {
      updated[i] = { ...updated[i], [field]: Number(val) };
    } else {
      updated[i] = { ...updated[i], [field]: val };
    }
    setEditData((d) => d ? { ...d, rankings: updated } : d);
  };

  const updateWinner = (field: string, val: any) => {
    setEditData((d) => {
      if (!d) return d;
      if (field.startsWith("stats.")) {
        return { ...d, winner: { ...(d.winner || {}), stats: { ...(d.winner?.stats || {}), [field.replace("stats.", "")]: Number(val) } } };
      }
      if (field === "points") return { ...d, winner: { ...(d.winner || {}), points: Number(val) } };
      return { ...d, winner: { ...(d.winner || {}), [field]: val } };
    });
  };

  const addAward = () => {
    setEditData((d) => d ? {
      ...d,
      awards: [...(d.awards || []), { id: `award_${Date.now()}`, name: "New Award", description: "", type: "manual", finalists: null, finalistRevealIndex: -1, winner: null }],
    } : d);
  };

  const removeAward = (i: number) => {
    setEditData((d) => d ? { ...d, awards: d.awards.filter((_, idx) => idx !== i) } : d);
  };

  const removeRanking = (i: number) => {
    setEditData((d) => d ? { ...d, rankings: d.rankings.filter((_, idx) => idx !== i) } : d);
  };

  const addRanking = () => {
    const next = rankings.length + 1;
    setEditData((d) => d ? {
      ...d,
      rankings: [...(d.rankings || []), { name: "Player Name", team: "Team", rank: next, points: 0, image: "", stats: { goals: 0, wins: 0, trophies: 0, rating: 0, mvps: 0, winRate: 0 } }],
    } : d);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h1 className="text-2xl font-display font-bold uppercase">Ceremony Control</h1>
          {state && <PhaseTag phase={state.phase} />}
        </div>
        <div className="flex items-center gap-3">
          {connected && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-bold tabular-nums">{viewerCount}</span>
              <span className="text-red-400/60 text-[10px] uppercase tracking-wider">watching</span>
            </div>
          )}
          {connected
            ? <span className="flex items-center gap-1 text-xs text-green-400"><Wifi className="w-3 h-3" /> Live</span>
            : <span className="flex items-center gap-1 text-xs text-red-400"><WifiOff className="w-3 h-3" /> Offline</span>
          }
          <Button size="sm" variant="destructive" onClick={handleReset} className="gap-1 text-xs">
            <RefreshCw className="w-3 h-3" /> Reset
          </Button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-4 flex-wrap">
        {(["control", "special", "stage", "edit", "chat"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-4 py-1.5 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors ${section === s ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30" : "text-muted-foreground hover:text-foreground"}`}
          >
            {s === "control" ? "Control"
              : s === "special" ? "🏅 Awards"
              : s === "stage" ? "🎭 Stage & FX"
              : s === "edit" ? "Edit Data"
              : `Chat (${messages.length})`}
          </button>
        ))}
      </div>

      {/* ─── CONTROL TAB ─── */}
      {section === "control" && (
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Status & Phase</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-500 text-white"
                onClick={() => apply({ status: "live", phase: "intro" })}>
                <Play className="w-4 h-4" /> Start Ceremony
              </Button>
              <Button size="sm" variant="outline" className="gap-1"
                onClick={() => apply({ isPaused: !state?.isPaused })}>
                <Pause className="w-4 h-4" /> {state?.isPaused ? "Resume" : "Pause"}
              </Button>
              <Button size="sm" variant="destructive" className="gap-1"
                onClick={() => apply({ status: "ended", phase: "end" })}>
                End Ceremony
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "📖 Intro", phase: "intro" },
                { label: "🏅 Awards", phase: "awards" },
              ].map(({ label, phase }) => (
                <Button key={label} size="sm" variant="outline" className="text-xs"
                  onClick={() => apply({ phase, status: "live" })}>
                  {label}
                </Button>
              ))}
              <Button size="sm" variant="outline" className="text-xs"
                onClick={() => apply({ phase: "rankings", status: "live", revealIndex: "0" })}>
                📊 Rankings
              </Button>
            </div>
          </div>

          {/* Awards navigation */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Awards Navigation</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Award {currentAwardIdx + 1} / {awards.length}</span>
              <span className="text-sm font-bold text-yellow-400">{currentAward?.name || "—"}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="gap-1"
                onClick={() => apply({ currentStep: String(Math.max(0, currentAwardIdx - 1)), phase: "awards", status: "live" })}>
                <SkipBack className="w-4 h-4" /> Prev Award
              </Button>
              <Button size="sm" className="gap-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                onClick={() => apply({ currentStep: String(Math.min(awards.length - 1, currentAwardIdx + 1)), phase: "awards", status: "live" })}>
                <SkipForward className="w-4 h-4" /> Next Award
              </Button>
            </div>
            {/* Finalist reveal for current award */}
            {currentAward && (currentAward.finalists || currentAward.type === "team_auto" || currentAward.type === "manual") && (
              <div className="border border-yellow-400/20 bg-yellow-400/5 rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-yellow-400 mb-2">
                  Reveal Controls — {currentAward.name}
                </div>
                {(currentAward.type === "team_auto" || currentAward.type === "manual") && !currentAward.finalists?.length ? (
                  <Button size="sm" className="gap-1 bg-yellow-500 text-black hover:bg-yellow-400 font-bold"
                    onClick={() => revealFinalist(currentAward.id, 2)}>
                    <Crown className="w-4 h-4" /> Reveal Winner
                  </Button>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {[0, 1, 2].map((idx) => {
                      const currentIdx = getAwardFinalistIdx(currentAward.id);
                      const isActive = currentIdx >= idx;
                      return (
                        <Button key={idx} size="sm"
                          className={`gap-1 text-xs ${isActive ? "bg-yellow-500/30 text-yellow-400 border border-yellow-500/40" : "bg-white/5 text-white/60 border border-white/10"}`}
                          onClick={() => revealFinalist(currentAward.id, idx)}>
                          {idx === 2 ? <Crown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {FINALIST_LABELS[idx]}
                        </Button>
                      );
                    })}
                    <Button size="sm" variant="outline" className="text-xs text-red-400"
                      onClick={() => revealFinalist(currentAward.id, -1)}>
                      Hide All
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rankings reveal */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Rankings Reveal</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Revealed:</span>
              <span className="text-sm font-bold text-orange-400">
                #{rankings[revealIdx]?.rank || "—"} — {rankings[revealIdx]?.name || "—"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={prevRank}>
                <SkipBack className="w-4 h-4" /> Prev
              </Button>
              <Button size="sm" className="gap-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30" onClick={nextRank}>
                <SkipForward className="w-4 h-4" /> Reveal Next
              </Button>
              <Button size="sm" className="gap-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 font-bold" onClick={revealTop10}>
                <Eye className="w-3 h-3 mr-1" /> 🔥 Start Top 10 Reveal
              </Button>
            </div>
          </div>

          {/* Climax */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Climax</h3>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" className="gap-1 bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30"
                onClick={() => apply({ phase: "top2" })}>
                <Star className="w-4 h-4" /> Reveal Top 2
              </Button>
              <Button size="sm" className="gap-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 text-sm font-bold"
                onClick={() => apply({ phase: "winner", status: "live" })}>
                <Crown className="w-4 h-4" /> Reveal Ballon d'Or Winner 🏆
              </Button>
            </div>
          </div>

          {/* Speed */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Animation Speed:</span>
            {SPEED_OPTS.map((s) => (
              <button key={s} onClick={() => apply({ animationSpeed: s })}
                className={`text-xs px-3 py-1 rounded border capitalize font-bold transition-colors ${state?.animationSpeed === s ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-400" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── SPECIAL AWARDS TAB ─── */}
      {section === "special" && (
        <div className="space-y-6">
          {/* Season selector */}
          <div className="bg-gradient-to-r from-yellow-950/40 to-yellow-900/20 border border-yellow-400/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-400">Load Season Rankings</h3>
            </div>
            <p className="text-xs text-white/50">Select a season, load the rankings, then manually pick 3rd / 2nd / 1st for each award.</p>
            {bdSeasons.length === 0 ? (
              <p className="text-xs text-orange-400">No seasons found — calculate a Ballon d'Or season first.</p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}
                  className="flex-1 h-9 rounded-lg bg-black/40 border border-yellow-400/20 text-white text-sm px-3 min-w-0">
                  <option value="">Select season…</option>
                  {bdSeasons.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button onClick={loadRanked} disabled={!selectedSeason || loadingRanks}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold gap-2 shrink-0">
                  <RefreshCw className={`w-4 h-4 ${loadingRanks ? "animate-spin" : ""}`} />
                  {loadingRanks ? "Loading…" : "Load Rankings"}
                </Button>
                <Button onClick={handleImportSpecial} disabled={!selectedSeason || importingSpecial}
                  variant="outline" className="gap-2 shrink-0 text-xs border-yellow-400/30 text-yellow-400">
                  <Trophy className="w-3 h-3" />
                  {importingSpecial ? "Importing…" : "Auto-Import GCC Champion"}
                </Button>
              </div>
            )}
          </div>

          {/* Phenomenal Finisher */}
          <StatAwardPicker
            awardId="phenomenal_finisher"
            title="⚡ Phenomenal Finisher"
            icon={<Zap className="w-4 h-4 text-yellow-400" />}
            color="#f59e0b"
            rankedList={rankedData?.phenomenalRanked || []}
            slots={customSlots.phenomenal_finisher}
            onSlotChange={(s) => setCustomSlots(p => ({ ...p, phenomenal_finisher: s }))}
            onSave={() => saveAwardFinalists("phenomenal_finisher")}
            isSaving={savingAward === "phenomenal_finisher"}
            currentRevealIdx={getAwardFinalistIdx("phenomenal_finisher")}
            onReveal={revealFinalist}
            onNavigate={() => { const i = awards.findIndex(a => a.id === "phenomenal_finisher"); if (i >= 0) apply({ currentStep: String(i), phase: "awards", status: "live" }); }}
          />

          {/* GK Defense */}
          <StatAwardPicker
            awardId="gk_defense"
            title="🧤 GK Directing Defense"
            icon={<Shield className="w-4 h-4 text-blue-400" />}
            color="#3b82f6"
            rankedList={rankedData?.gkRanked || []}
            slots={customSlots.gk_defense}
            onSlotChange={(s) => setCustomSlots(p => ({ ...p, gk_defense: s }))}
            onSave={() => saveAwardFinalists("gk_defense")}
            isSaving={savingAward === "gk_defense"}
            currentRevealIdx={getAwardFinalistIdx("gk_defense")}
            onReveal={revealFinalist}
            onNavigate={() => { const i = awards.findIndex(a => a.id === "gk_defense"); if (i >= 0) apply({ currentStep: String(i), phase: "awards", status: "live" }); }}
          />

          {/* Best Team */}
          <StatAwardPicker
            awardId="best_team"
            title="🏟️ Best Team"
            icon={<Building2 className="w-4 h-4 text-green-400" />}
            color="#22c55e"
            rankedList={rankedData?.bestTeamRanked || []}
            slots={customSlots.best_team}
            onSlotChange={(s) => setCustomSlots(p => ({ ...p, best_team: s }))}
            onSave={() => saveAwardFinalists("best_team")}
            isSaving={savingAward === "best_team"}
            currentRevealIdx={getAwardFinalistIdx("best_team")}
            onReveal={revealFinalist}
            onNavigate={() => { const i = awards.findIndex(a => a.id === "best_team"); if (i >= 0) apply({ currentStep: String(i), phase: "awards", status: "live" }); }}
          />

          {/* GCC Champion — auto */}
          {(() => {
            const award = awards.find(a => a.id === "gcc_champion");
            const finalist = award?.finalists?.[0];
            return (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold text-white">🏆 GCC Champion</span>
                    <span className="text-xs text-white/30">(auto from tournament)</span>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs"
                    onClick={() => { const i = awards.findIndex(a => a.id === "gcc_champion"); if (i >= 0) apply({ currentStep: String(i), phase: "awards", status: "live" }); }}>
                    Show on Screen
                  </Button>
                </div>
                {finalist ? (
                  <div className="flex items-center gap-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3">
                    {finalist.image && <img src={finalist.image} alt={finalist.name} className="w-10 h-10 rounded-full object-cover border border-yellow-400/30" />}
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{finalist.name}</span>
                        <TestNameButton name={finalist.name} speak={testName} />
                      </div>
                      <div className="text-xs text-yellow-400">{finalist.team}</div>
                      {finalist.statLabel && <div className="text-xs text-white/40 mt-0.5">{finalist.statLabel}: {finalist.statValue}</div>}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/30 italic">Not imported yet — use the Auto-Import GCC Champion button above.</p>
                )}
                {finalist && (
                  <Button size="sm" className="gap-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                    onClick={() => revealFinalist("gcc_champion", 2)}>
                    <Crown className="w-3 h-3" /> Reveal Winner
                  </Button>
                )}
              </div>
            );
          })()}

          {/* Best Captain */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">🦁 Best Captain</span>
                <span className="text-xs text-white/30">(manual — you pick finalists)</span>
              </div>
              <Button size="sm" variant="outline" className="text-xs"
                onClick={() => { const i = awards.findIndex(a => a.id === "best_captain"); if (i >= 0) apply({ currentStep: String(i), phase: "awards", status: "live" }); }}>
                Show on Screen
              </Button>
            </div>

            {/* Current finalists */}
            {captainFinalists.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-white/40 uppercase tracking-wider">Finalists (drag order = reveal order)</div>
                {captainFinalists.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <span className="text-xs text-white/30 w-6">{i + 1}.</span>
                    {f.image && <img src={f.image} alt={f.name} className="w-7 h-7 rounded-full object-cover" />}
                    <span className="flex-1 text-sm text-white font-medium">{f.name}</span>
                    <span className="text-xs text-white/30">{f.team}</span>
                    <TestNameButton name={f.name} speak={testName} />
                    <button onClick={() => removeCaptainFinalist(i)} className="text-red-400 hover:text-red-300 text-xs ml-2">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Finalist reveal buttons */}
            {captainFinalists.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2].filter(i => i < captainFinalists.length).map(idx => (
                  <Button key={idx} size="sm"
                    className={`text-xs gap-1 ${getAwardFinalistIdx("best_captain") >= idx ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-white/50 border border-white/10"}`}
                    onClick={() => revealFinalist("best_captain", idx)}>
                    {idx === 2 ? <Crown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {FINALIST_LABELS[idx]}
                  </Button>
                ))}
                <Button size="sm" variant="outline" className="text-xs text-red-400"
                  onClick={() => revealFinalist("best_captain", -1)}>
                  Hide
                </Button>
              </div>
            )}

            {/* Search players */}
            {captainFinalists.length < 3 && (
              <div className="space-y-2">
                <div className="text-xs text-white/40 uppercase tracking-wider">Add finalist from players</div>
                <Input value={captainSearch} onChange={e => setCaptainSearch(e.target.value)}
                  placeholder="Search player…" className="h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                {captainSearch && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {filteredPlayers.map(p => (
                      <button key={p.id} onClick={() => { addCaptainFinalist(p); setCaptainSearch(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left transition-colors">
                        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-7 h-7 rounded-full object-cover" />}
                        <div className="flex-1">
                          <div className="text-sm text-white font-medium">{p.name}</div>
                          <div className="text-xs text-white/30">{p.teamName}</div>
                        </div>
                        <Plus className="w-4 h-4 text-white/30" />
                      </button>
                    ))}
                    {filteredPlayers.length === 0 && <p className="text-xs text-white/30 px-3 py-2">No players found</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Best Admin */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">🎩 Best Admin</span>
                <span className="text-xs text-white/30">(manual entry)</span>
              </div>
              <Button size="sm" variant="outline" className="text-xs"
                onClick={() => { const i = awards.findIndex(a => a.id === "best_admin"); if (i >= 0) apply({ currentStep: String(i), phase: "awards", status: "live" }); }}>
                Show on Screen
              </Button>
            </div>

            {adminFinalists.length > 0 && (
              <div className="space-y-2">
                {adminFinalists.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <span className="text-xs text-white/30 w-6">{i + 1}.</span>
                    {f.image && <img src={f.image} alt={f.name} className="w-7 h-7 rounded-full object-cover" />}
                    <span className="flex-1 text-sm text-white font-medium">{f.name}</span>
                    <TestNameButton name={f.name} speak={testName} />
                    <span className="text-xs text-white/30">{f.team}</span>
                    <button onClick={() => removeAdminFinalist(i)} className="text-red-400 hover:text-red-300 text-xs ml-2">✕</button>
                  </div>
                ))}
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2].filter(i => i < adminFinalists.length).map(idx => (
                    <Button key={idx} size="sm"
                      className={`text-xs gap-1 ${getAwardFinalistIdx("best_admin") >= idx ? "bg-amber-500/30 text-amber-300 border border-amber-500/40" : "bg-white/5 text-white/50 border border-white/10"}`}
                      onClick={() => revealFinalist("best_admin", idx)}>
                      {idx === 2 ? <Crown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      {FINALIST_LABELS[idx]}
                    </Button>
                  ))}
                  <Button size="sm" variant="outline" className="text-xs text-red-400"
                    onClick={() => revealFinalist("best_admin", -1)}>Hide</Button>
                </div>
              </div>
            )}

            {adminFinalists.length < 3 && (
              <div className="space-y-3">
                <div className="text-xs text-white/40 uppercase tracking-wider">Add entry</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={adminForm.name} onChange={e => setAdminForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Admin name" className="h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  <Input value={adminForm.note} onChange={e => setAdminForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="Note / role" className="h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <div className="flex gap-2">
                  <input type="file" accept="image/*" id="admin-img-upload" className="hidden"
                    onChange={e => e.target.files?.[0] && uploadAdminImage(e.target.files[0])} />
                  <label htmlFor="admin-img-upload"
                    className="flex-1 h-8 flex items-center justify-center gap-1 text-xs rounded-md bg-white/5 border border-white/10 text-white/50 cursor-pointer hover:bg-white/10 transition-colors">
                    {uploadingAdminImg ? "Uploading…" : adminForm.image ? "✓ Image set" : "Upload photo"}
                  </label>
                  <Button size="sm" onClick={addAdminFinalist} disabled={!adminForm.name}
                    className="gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Import Ballon d'Or */}
          <div className="bg-gradient-to-r from-yellow-950/30 to-transparent border border-yellow-400/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest">Import Ballon d'Or Rankings</h3>
            </div>
            <p className="text-xs text-white/40">Auto-populates all rankings with stats and sets the Ballon d'Or winner.</p>
            {bdSeasons.length > 0 && (
              <div className="flex gap-3">
                <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}
                  className="flex-1 h-9 rounded-lg bg-black/40 border border-yellow-400/20 text-white text-sm px-3">
                  <option value="">Select season…</option>
                  {bdSeasons.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button onClick={handleImport} disabled={!selectedSeason || importing}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold gap-2 shrink-0">
                  <Download className="w-4 h-4" />
                  {importing ? "Importing…" : "Import Rankings"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── STAGE & FX TAB ─── */}
      {section === "stage" && (
        <div className="space-y-6">
          {/* Stage style */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Stage Backdrop</h3>
              <a
                href="/ceremony/live"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-wider text-yellow-400 hover:text-yellow-300 underline-offset-4 hover:underline flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> Open Live View
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose how dramatic the on-stage visuals look for every viewer.
              Changes apply instantly across all connected screens.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["subtle", "normal", "dramatic", "max"] as const).map((opt) => {
                const active = ((state?.data as any)?.stageStyle ?? "dramatic") === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => apply({ data: { ...(state?.data || {}), stageStyle: opt } })}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${
                      active
                        ? "bg-yellow-400/20 text-yellow-300 border-yellow-400/40"
                        : "bg-black/30 border-white/10 text-white/70 hover:text-white hover:border-white/30"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Music control */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Background Music</h3>
            <p className="text-xs text-muted-foreground">
              "Auto" follows the current phase. Pick a specific track to override.
              Viewers must have audio enabled on their own device.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(["auto", "off", "awards", "rankings", "winner"] as const).map((opt) => {
                const active = ((state?.data as any)?.musicMode ?? "auto") === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => apply({ data: { ...(state?.data || {}), musicMode: opt } })}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${
                      active
                        ? "bg-yellow-400/20 text-yellow-300 border-yellow-400/40"
                        : "bg-black/30 border-white/10 text-white/70 hover:text-white hover:border-white/30"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
              <span className="text-[11px] uppercase tracking-wider text-white/40 mr-2">Local audio:</span>
              <Button size="sm" variant="outline" onClick={audio.toggleEnabled} className="gap-1.5">
                {audio.enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                {audio.enabled ? "On" : "Off"} (preview)
              </Button>
              <Button size="sm" variant="outline" onClick={() => audio.speak("Welcome to the GEF Ballon d'Or ceremony! Tonight we celebrate the very best!")} className="gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Test Narration
              </Button>
            </div>
          </div>

          {/* One-shot FX */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Live Effects</h3>
            <p className="text-xs text-muted-foreground">
              Trigger a one-shot effect on every viewer's screen right now.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { type: "sweep" as const, label: "✨ Golden Sweep", help: "Light wipes across stage" },
                { type: "confetti" as const, label: "🎊 Confetti Burst", help: "Gold confetti rain" },
                { type: "fireworks" as const, label: "🎆 Fireworks", help: "Multi-color celebration" },
              ]).map(({ type, label, help }) => (
                <button
                  key={type}
                  onClick={() => {
                    const cur = (state?.data as any)?.fxBurst?.counter ?? 0;
                    apply({ data: { ...(state?.data || {}), fxBurst: { type, counter: cur + 1 } } });
                    toast({ title: `${label} fired`, description: "Sent to all viewers" });
                  }}
                  className="px-3 py-3 rounded-lg border border-white/10 bg-black/30 text-left hover:border-yellow-400/40 hover:bg-yellow-400/5 transition-colors"
                >
                  <div className="text-sm font-bold text-white">{label}</div>
                  <div className="text-[11px] text-white/50 mt-0.5">{help}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Award Trophy Images */}
          <AwardTrophyUploader state={state} apply={apply} />

          {/* Cinematic intro replay */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Cinematic Intro</h3>
            <p className="text-xs text-muted-foreground">
              Plays the full logo build → whoosh → stage reveal sequence
              (~8 seconds) on every viewer's screen. Use it at the very start
              or whenever you want a dramatic reset.
            </p>
            <Button
              size="lg"
              onClick={() => {
                const cur = (state?.data as any)?.introReplay ?? 0;
                apply({ data: { ...(state?.data || {}), introReplay: cur + 1 } });
                toast({ title: "🎬 Intro replay sent", description: "Playing on all viewers" });
              }}
              className="gap-2 bg-yellow-400 text-black hover:bg-yellow-300"
            >
              <Play className="w-4 h-4" /> Play Cinematic Intro Now
            </Button>
          </div>
        </div>
      )}

      {/* ─── EDIT DATA TAB ─── */}
      {section === "edit" && editData && (
        <div className="space-y-8">
          {/* Intro */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Intro</h3>
            <Input value={editData.intro?.title || ""} onChange={(e) => setEditData((d) => d ? { ...d, intro: { ...d.intro, title: e.target.value } } : d)} placeholder="Ceremony title" />
            <Textarea value={editData.intro?.message || ""} onChange={(e) => setEditData((d) => d ? { ...d, intro: { ...d.intro, message: e.target.value } } : d)} placeholder="Welcome message" rows={2} />
          </div>

          {/* Ballon d'Or Winner */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Ballon d'Or Winner</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Name" value={editData.winner?.name || ""} onChange={(e) => updateWinner("name", e.target.value)} />
              <Input placeholder="Team" value={editData.winner?.team || ""} onChange={(e) => updateWinner("team", e.target.value)} />
              <Input placeholder="Image URL" value={editData.winner?.image || ""} onChange={(e) => updateWinner("image", e.target.value)} />
              <Input type="number" placeholder="Points" value={editData.winner?.points || ""} onChange={(e) => updateWinner("points", e.target.value)} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["goals", "wins", "trophies", "rating", "mvps", "winRate"].map((f) => (
                <div key={f}>
                  <label className="text-xs text-muted-foreground capitalize mb-1 block">{f}</label>
                  <Input type="number" placeholder="0" value={(editData.winner?.stats as any)?.[f] ?? ""} onChange={(e) => updateWinner(`stats.${f}`, e.target.value)} className="h-8 text-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Awards */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Awards ({awards.length})</h3>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={addAward}><Plus className="w-3 h-3" /> Add</Button>
            </div>
            {awards.map((a, i) => (
              <div key={i} className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-yellow-400">{a.name || `Award ${i + 1}`}</span>
                  <button onClick={() => removeAward(i)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Award name" value={a.name || ""} onChange={(e) => updateAward(i, "name", e.target.value)} className="h-8 text-sm" />
                  <Input placeholder="Description" value={a.description || ""} onChange={(e) => updateAward(i, "description", e.target.value)} className="h-8 text-sm" />
                  <Input placeholder="Winner name" value={a.winner?.name || ""} onChange={(e) => updateAward(i, "winner.name", e.target.value)} className="h-8 text-sm" />
                  <Input placeholder="Winner team" value={a.winner?.team || ""} onChange={(e) => updateAward(i, "winner.team", e.target.value)} className="h-8 text-sm" />
                  <Input placeholder="Winner image URL" value={a.winner?.image || ""} onChange={(e) => updateAward(i, "winner.image", e.target.value)} className="h-8 text-sm col-span-2" />
                </div>
              </div>
            ))}
          </div>

          {/* Rankings */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Rankings ({rankings.length})</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  disabled={testingAll || rankings.length === 0}
                  onClick={() => testAllNames([...rankings].sort((a, b) => a.rank - b.rank).map(r => r.name))}
                  title="Hear how every name will be announced (≈1.7s per name)"
                >
                  {testingAll ? <VolumeX className="w-3 h-3 animate-pulse" /> : <Volume2 className="w-3 h-3" />}
                  {testingAll ? "Testing…" : "Test All Names"}
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={addRanking}><Plus className="w-3 h-3" /> Add</Button>
              </div>
            </div>
            <ScrollArea className="max-h-96">
              <div className="space-y-3 pr-2">
                {[...rankings].sort((a, b) => a.rank - b.rank).map((r, i) => {
                  const realIdx = rankings.findIndex(rr => rr === r);
                  return (
                    <div key={i} className="border border-border rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-orange-400 flex items-center gap-2">
                          #{r.rank} {r.name}
                          <TestNameButton name={r.name} speak={testName} />
                        </span>
                        <button onClick={() => removeRanking(realIdx)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input type="number" placeholder="Rank" value={r.rank ?? ""} onChange={(e) => updateRanking(realIdx, "rank", e.target.value)} className="h-7 text-xs" />
                        <Input placeholder="Name" value={r.name || ""} onChange={(e) => updateRanking(realIdx, "name", e.target.value)} className="h-7 text-xs" />
                        <Input placeholder="Team" value={r.team || ""} onChange={(e) => updateRanking(realIdx, "team", e.target.value)} className="h-7 text-xs" />
                        <Input type="number" placeholder="Points" value={r.points ?? ""} onChange={(e) => updateRanking(realIdx, "points", e.target.value)} className="h-7 text-xs" />
                        <Input placeholder="Image URL" value={r.image || ""} onChange={(e) => updateRanking(realIdx, "image", e.target.value)} className="h-7 text-xs col-span-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <Button className="w-full gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold" onClick={saveData} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save All Data"}
          </Button>
        </div>
      )}

      {/* ─── CHAT TAB ─── */}
      {section === "chat" && (
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold">Live Chat ({messages.length})</span>
            </div>
            <Button size="sm" variant="outline" className="gap-1 text-xs"
              onClick={async () => { await fetch("/api/ceremony/messages", { method: "DELETE", credentials: "include" }); toast({ title: "Messages cleared" }); }}>
              <Trash2 className="w-3 h-3" /> Clear
            </Button>
          </div>
          <ScrollArea className="h-80 px-5 py-3">
            <div className="space-y-2">
              {messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No messages yet</p>}
              {messages.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-semibold text-yellow-400">{m.userName}: </span>
                  <span className="text-white/70">{m.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </AdminLayout>
  );
}

/* ─── Stat Award Picker (manual finalist selection) ─── */
function StatAwardPicker({
  awardId, title, icon, color, rankedList, slots, onSlotChange, onSave, isSaving, currentRevealIdx, onReveal, onNavigate,
}: {
  awardId: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  rankedList: any[];
  slots: (any | null)[];
  onSlotChange: (slots: (any | null)[]) => void;
  onSave: () => void;
  isSaving: boolean;
  currentRevealIdx: number;
  onReveal: (id: string, idx: number) => void;
  onNavigate: () => void;
}) {
  const placeLabels = ["🥉 3rd Place", "🥈 2nd Place", "🥇 1st Place"];
  const placeColors = ["#cd7f32", "#c0c0c0", "#d4af37"];

  const getSlotIdx = (item: any) =>
    slots.findIndex(s => s && (
      (item.playerId != null && s.playerId === item.playerId) ||
      (item.teamId != null && s.teamId === item.teamId) ||
      s.name === item.name
    ));

  const assignToNext = (item: any) => {
    const nextEmpty = slots.findIndex(s => s === null);
    if (nextEmpty === -1) return;
    const updated = [...slots];
    updated[nextEmpty] = item;
    onSlotChange(updated);
  };

  const removeSlot = (idx: number) => {
    const updated = [...slots];
    updated[idx] = null;
    onSlotChange(updated);
  };

  const allFilled = slots.every(s => s !== null);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold text-white">{title}</span>
        </div>
        <Button size="sm" variant="outline" className="text-xs" onClick={onNavigate}>Show on Screen</Button>
      </div>

      {/* Three slots */}
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot, i) => (
          <div key={i} className={`rounded-xl border p-3 text-center relative min-h-[90px] flex flex-col items-center justify-center transition-colors ${slot ? "border-white/20 bg-white/5" : "border-dashed border-white/10 bg-white/2"}`}>
            <div className="text-xs font-bold mb-2" style={{ color: placeColors[i] }}>{placeLabels[i]}</div>
            {slot ? (
              <>
                {slot.image && (
                  <img src={slot.image} alt={slot.name} className="w-9 h-9 rounded-full object-cover mx-auto mb-1 border border-white/20" />
                )}
                <div className="text-xs font-bold text-white truncate w-full text-center">{slot.name}</div>
                <div className="text-xs text-white/40 truncate w-full text-center">{slot.team}</div>
                <div className="text-xs mt-0.5 font-semibold" style={{ color }}>{slot.statValue}</div>
                <div className="text-[10px] text-white/30">{slot.statSub}</div>
                <button onClick={() => removeSlot(i)} className="absolute top-1.5 right-1.5 w-4 h-4 text-red-400 hover:text-red-300 text-xs flex items-center justify-center">✕</button>
              </>
            ) : (
              <div className="text-xs text-white/20 italic">Pick below</div>
            )}
          </div>
        ))}
      </div>

      {/* Ranked list */}
      {rankedList.length === 0 ? (
        <p className="text-xs text-white/30 italic text-center py-3">Load rankings above to see the list.</p>
      ) : (
        <div className="space-y-1">
          <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Ranked List — click to assign to next empty slot</div>
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {rankedList.map((item, i) => {
              const slotIdx = getSlotIdx(item);
              const isAssigned = slotIdx >= 0;
              return (
                <button key={i} disabled={isAssigned || allFilled}
                  onClick={() => assignToNext(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors text-left
                    ${isAssigned ? "border-yellow-400/30 bg-yellow-400/8 cursor-default" :
                      allFilled ? "opacity-40 border-white/5 cursor-not-allowed bg-white/2" :
                      "border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer"}`}>
                  <span className="text-xs text-white/30 w-5 shrink-0 font-mono">#{item.rank}</span>
                  {item.image && <img src={item.image} alt={item.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{item.name}</div>
                    <div className="text-xs text-white/40 truncate">{item.team}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold" style={{ color }}>{item.statValue}</div>
                    <div className="text-[10px] text-white/30">{item.statSub}</div>
                  </div>
                  {isAssigned && (
                    <span className="text-xs font-bold shrink-0 ml-1" style={{ color: placeColors[slotIdx] }}>{["3rd", "2nd", "1st"][slotIdx]}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Save + reveal controls */}
      <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-white/10">
        <Button size="sm" onClick={onSave} disabled={isSaving || !allFilled}
          className="gap-1 bg-yellow-500 text-black hover:bg-yellow-400 font-bold">
          <Save className="w-3 h-3" /> {isSaving ? "Saving…" : "Save Finalists"}
        </Button>
        <span className="text-xs text-white/20 hidden sm:inline">|</span>
        {[0, 1, 2].map(idx => (
          <Button key={idx} size="sm"
            className={`text-xs gap-1 ${currentRevealIdx >= idx ? "bg-yellow-500/30 text-yellow-400 border border-yellow-500/40" : "bg-white/5 text-white/50 border border-white/10"}`}
            onClick={() => onReveal(awardId, idx)}>
            <ChevronRight className="w-3 h-3" />
            {FINALIST_LABELS[idx]}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="text-xs text-red-400" onClick={() => onReveal(awardId, -1)}>
          Hide
        </Button>
      </div>
    </div>
  );
}

/* ─── Award Finalist Card (reusable) ─── */
function AwardFinalistCard({
  awards, awardId, icon, onReveal, onNavigate,
}: {
  awards: any[];
  awardId: string;
  icon: React.ReactNode;
  onReveal: (id: string, idx: number) => void;
  onNavigate: (idx: number) => void;
}) {
  const award = awards.find(a => a.id === awardId);
  const currentIdx = award?.finalistRevealIndex ?? -1;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold text-white">{award?.name || awardId}</span>
          {award?.description && <span className="text-xs text-white/30 hidden sm:block">— {award.description}</span>}
        </div>
        <Button size="sm" variant="outline" className="text-xs" onClick={() => onNavigate(0)}>
          Show on Screen
        </Button>
      </div>

      {award?.finalists?.length ? (
        <div className="space-y-2">
          <div className="text-xs text-white/40 uppercase tracking-wider">Finalists (3rd → 2nd → 1st)</div>
          {[...award.finalists].reverse().map((f: any, i: number) => {
            const revealIdx = award.finalists.length - 1 - i;
            return (
              <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2 border transition-colors ${currentIdx >= revealIdx ? "bg-yellow-400/10 border-yellow-400/30" : "bg-white/3 border-white/10"}`}>
                <span className="text-xs text-white/30 w-6 shrink-0">{f.rank === award.finalists.length ? "🥇" : f.rank === award.finalists.length - 1 ? "🥈" : "🥉"}</span>
                {f.image && <img src={f.image} alt={f.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{f.name}</div>
                  <div className="text-xs text-white/30 truncate">{f.team} • {f.statLabel}: {f.statValue}</div>
                </div>
                {currentIdx >= revealIdx && <span className="text-yellow-400 text-xs font-bold shrink-0">Revealed</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-white/30 italic">Not calculated yet — use the auto-calculate button above.</p>
      )}

      {award?.finalists?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2].filter(i => i < award.finalists.length).map(idx => (
            <Button key={idx} size="sm"
              className={`text-xs gap-1 ${currentIdx >= idx ? "bg-yellow-500/30 text-yellow-400 border border-yellow-500/40" : "bg-white/5 text-white/50 border border-white/10"}`}
              onClick={() => onReveal(awardId, idx)}>
              <ChevronRight className="w-3 h-3" />
              {FINALIST_LABELS[idx]}
            </Button>
          ))}
          <Button size="sm" variant="outline" className="text-xs text-red-400" onClick={() => onReveal(awardId, -1)}>
            Hide All
          </Button>
        </div>
      )}
    </div>
  );
}
