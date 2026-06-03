import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Eye, EyeOff, Loader2, Plus, X, Save, ChevronDown, ChevronUp, Award, Lock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HofAward { emoji?: string; title: string; playerName: string; teamName?: string; }
interface HallEntry {
  id: number; season: string; winner: any; revealed: boolean;
  totalCandidates: number; calculatedAt: string; notes: string | null; hofAwards: HofAward[];
}

export function ManageHallOfFame() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: seasons = [], isLoading } = useQuery<HallEntry[]>({
    queryKey: ["/api/ballon-dor"],
    queryFn: () => fetch(getApiUrl("/api/ballon-dor"), { credentials: "include" }).then(r => r.json()),
  });

  const [revealLoading, setRevealLoading] = useState<Record<string, boolean>>({});
  const [awardsOpen, setAwardsOpen] = useState<string | null>(null);
  const [awardsDraft, setAwardsDraft] = useState<Record<string, HofAward[]>>({});
  const [awardsSaving, setAwardsSaving] = useState<Record<string, boolean>>({});

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
      qc.invalidateQueries({ queryKey: ["/api/ballon-dor"] });
      toast({
        title: !current ? `Season ${seasonLabel} revealed!` : `Season ${seasonLabel} sealed`,
        description: !current ? "Winner is now visible on the Hall of Fame page." : "Winner is now hidden from Hall of Fame.",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRevealLoading(p => ({ ...p, [seasonLabel]: false }));
    }
  }

  function openAwards(seasonLabel: string, current: HofAward[]) {
    if (awardsOpen === seasonLabel) { setAwardsOpen(null); return; }
    setAwardsDraft(p => ({ ...p, [seasonLabel]: current?.length ? [...current.map(a => ({ ...a }))] : [] }));
    setAwardsOpen(seasonLabel);
  }

  function addAward(seasonLabel: string) {
    setAwardsDraft(p => ({ ...p, [seasonLabel]: [...(p[seasonLabel] ?? []), { emoji: "", title: "", playerName: "", teamName: "" }] }));
  }

  function updateAward(seasonLabel: string, idx: number, field: keyof HofAward, value: string) {
    setAwardsDraft(p => ({ ...p, [seasonLabel]: p[seasonLabel].map((a, i) => i === idx ? { ...a, [field]: value } : a) }));
  }

  function removeAward(seasonLabel: string, idx: number) {
    setAwardsDraft(p => ({ ...p, [seasonLabel]: p[seasonLabel].filter((_, i) => i !== idx) }));
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
      qc.invalidateQueries({ queryKey: ["/api/ballon-dor"] });
      toast({ title: `Awards saved for Season ${seasonLabel}`, description: `${awards.length} award${awards.length !== 1 ? "s" : ""} saved.` });
      setAwardsOpen(null);
    } catch (e: any) {
      toast({ title: "Error saving awards", description: e.message, variant: "destructive" });
    } finally {
      setAwardsSaving(p => ({ ...p, [seasonLabel]: false }));
    }
  }

  const revealedCount = seasons.filter(s => s.revealed).length;

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Hall of Fame
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Control which seasons are visible on the public Hall of Fame page and manage season awards.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { label: "Total Seasons", value: seasons.length, color: "text-primary" },
          { label: "Revealed", value: revealedCount, color: "text-green-400" },
          { label: "Sealed", value: seasons.length - revealedCount, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-sm">
            <span className={cn("font-black text-lg", s.color)}>{s.value}</span>
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : seasons.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-bold">No seasons calculated yet</p>
          <p className="text-sm mt-1 opacity-60">Use the Ballon d'Or admin page to calculate a season first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...seasons].sort((a, b) => b.season.localeCompare(a.season)).map(entry => {
            const winner = entry.winner as any;
            const isOpen = awardsOpen === entry.season;
            const draft = awardsDraft[entry.season] ?? entry.hofAwards ?? [];
            const saving = awardsSaving[entry.season] ?? false;
            const revealing = revealLoading[entry.season] ?? false;

            return (
              <div key={entry.season} className={cn(
                "bg-card border rounded-2xl overflow-hidden transition-all",
                entry.revealed ? "border-yellow-500/30 shadow-lg shadow-yellow-500/5" : "border-border"
              )}>
                {/* Header row */}
                <div className="flex items-center gap-4 p-5">
                  {/* Season + winner info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0",
                      entry.revealed ? "bg-yellow-500/10 border-yellow-500/40" : "bg-secondary/50 border-border"
                    )}>
                      {entry.revealed ? <Trophy className="w-6 h-6 text-yellow-400" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-lg uppercase">Season {entry.season}</span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                          entry.revealed
                            ? "bg-green-500/15 border-green-500/40 text-green-400"
                            : "bg-secondary/50 border-border text-muted-foreground"
                        )}>
                          {entry.revealed ? "Revealed" : "Sealed"}
                        </span>
                      </div>
                      {winner?.name ? (
                        <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold text-yellow-400">{winner.name}</span>
                          {winner.team && <span className="opacity-60">· {winner.team}</span>}
                          {winner.totalPoints != null && <span className="opacity-40">· {Number(winner.totalPoints).toFixed(1)} pts</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground/40 mt-0.5">No winner data</div>
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(entry.calculatedAt).toLocaleDateString()}
                    </div>
                    <div>{entry.totalCandidates} candidates</div>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Award className="w-3 h-3" />
                      {(entry.hofAwards?.length ?? 0)} awards
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Awards toggle */}
                    <button
                      onClick={() => openAwards(entry.season, entry.hofAwards ?? [])}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all",
                        isOpen
                          ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                          : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Award className="w-3.5 h-3.5" />
                      Awards
                      {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {/* Reveal/seal toggle */}
                    <Button
                      onClick={() => toggleReveal(entry.season, entry.revealed)}
                      disabled={revealing}
                      size="sm"
                      className={cn(
                        "flex items-center gap-2 text-xs font-bold",
                        entry.revealed
                          ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30"
                          : "bg-green-600/80 hover:bg-green-600 text-white"
                      )}
                      variant={entry.revealed ? "outline" : "default"}
                    >
                      {revealing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : entry.revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {entry.revealed ? "Seal" : "Reveal"}
                    </Button>
                  </div>
                </div>

                {/* Awards panel */}
                {isOpen && (
                  <div className="border-t border-border/60 p-5 bg-secondary/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        Season Awards
                        <span className="text-[9px] text-muted-foreground font-normal">— shown on the Hall of Fame page</span>
                      </h3>
                      <button
                        onClick={() => addAward(entry.season)}
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 border border-amber-400/30 hover:border-amber-400/60 bg-amber-500/10 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Award
                      </button>
                    </div>

                    {draft.length === 0 ? (
                      <p className="text-sm text-muted-foreground/50 text-center py-6">No awards yet. Click "Add Award" to add one.</p>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {draft.map((award, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-background/60 border border-border rounded-xl p-3">
                            <Input
                              value={award.emoji ?? ""}
                              onChange={e => updateAward(entry.season, idx, "emoji", e.target.value)}
                              placeholder="🏆"
                              className="w-14 text-center text-lg bg-transparent border-border"
                            />
                            <Input
                              value={award.title}
                              onChange={e => updateAward(entry.season, idx, "title", e.target.value)}
                              placeholder="Award Title (e.g. Top Scorer)"
                              className="flex-1 bg-transparent border-border text-sm"
                            />
                            <Input
                              value={award.playerName}
                              onChange={e => updateAward(entry.season, idx, "playerName", e.target.value)}
                              placeholder="Player Name"
                              className="flex-1 bg-transparent border-border text-sm"
                            />
                            <Input
                              value={award.teamName ?? ""}
                              onChange={e => updateAward(entry.season, idx, "teamName", e.target.value)}
                              placeholder="Team (optional)"
                              className="w-32 bg-transparent border-border text-sm"
                            />
                            <button
                              onClick={() => removeAward(entry.season, idx)}
                              className="w-7 h-7 rounded-lg border border-red-400/30 text-red-400/60 hover:text-red-400 hover:border-red-400/60 flex items-center justify-center transition-colors shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <button onClick={() => setAwardsOpen(null)} className="text-xs text-muted-foreground hover:text-foreground px-4 py-2 border border-border rounded-xl transition-colors">
                        Cancel
                      </button>
                      <Button onClick={() => saveAwards(entry.season)} disabled={saving} size="sm" className="bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Awards
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
