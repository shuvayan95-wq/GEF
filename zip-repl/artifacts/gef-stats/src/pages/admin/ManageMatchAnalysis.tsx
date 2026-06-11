import { useState, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Loader2, Zap, ChevronRight, Upload, X, FileImage, Eye,
  BarChart2, Swords, Star, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

interface MatchItem {
  id: number; date: string;
  team1Name: string; team1LogoUrl: string | null;
  team2Name: string; team2LogoUrl: string | null;
  team1Score: number; team2Score: number;
  leagueName?: string | null;
  matchType?: string;
  superCupLeg?: number | null;
  playerMatchups: {
    id: number;
    player1Id: number; player1Name: string; player1ImageUrl: string | null;
    player2Id: number; player2Name: string; player2ImageUrl: string | null;
    player1Goals: number; player2Goals: number;
    mvpPlayerId: number | null;
  }[];
}

interface MatchupInput {
  notes: string;
  imageBase64: string | null;
  imageMime: string | null;
  imagePreview: string | null;
}

function useMatches() {
  return useQuery<MatchItem[]>({
    queryKey: ["/api/matches"],
    queryFn: () => fetch(getApiUrl("/api/matches"), { credentials: "include" }).then(r => r.json()),
  });
}

function useAnalysis(matchId: number | null) {
  return useQuery<any>({
    queryKey: ["/api/ai/match-analysis", matchId],
    queryFn: () => fetch(getApiUrl(`/api/ai/match-analysis/${matchId}`), { credentials: "include" }).then(r => r.json()),
    enabled: matchId !== null,
    retry: false,
  });
}

function ImageUploadCell({
  index, value, onChange,
}: {
  index: number;
  value: MatchupInput;
  onChange: (idx: number, update: Partial<MatchupInput>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const [header, b64] = dataUrl.split(",");
      const mime = header.match(/data:(.+);base64/)?.[1] ?? "image/jpeg";
      onChange(index, { imageBase64: b64, imageMime: mime, imagePreview: dataUrl });
    };
    reader.readAsDataURL(file);
  }, [index, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-2">
      {value.imagePreview ? (
        <div className="relative rounded-lg overflow-hidden border border-border group">
          <img src={value.imagePreview} alt="Match screenshot" className="w-full h-28 object-cover" />
          <button
            type="button"
            onClick={() => onChange(index, { imageBase64: null, imageMime: null, imagePreview: null })}
            className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white px-2 py-1 flex items-center gap-1">
            <FileImage className="w-2.5 h-2.5" /> Screenshot uploaded
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-border/50 rounded-lg h-20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Upload SS</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

export function ManageMatchAnalysis() {
  const { data: matches = [], isLoading } = useMatches();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [contextNotes, setContextNotes] = useState("");
  const [matchupInputs, setMatchupInputs] = useState<MatchupInput[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: existingAnalysis } = useAnalysis(selectedMatch?.id ?? null);

  const filteredMatches = matches.filter(m => {
    const q = searchQuery.toLowerCase();
    return !q || m.team1Name.toLowerCase().includes(q) || m.team2Name.toLowerCase().includes(q) ||
      (m.leagueName ?? "").toLowerCase().includes(q);
  }).slice(0, 30);

  const handleSelectMatch = (m: MatchItem) => {
    setSelectedMatch(m);
    setContextNotes("");
    setGeneratedReport(null);
    setMatchupInputs(m.playerMatchups.map(() => ({ notes: "", imageBase64: null, imageMime: null, imagePreview: null })));
  };

  const updateMatchupInput = useCallback((idx: number, update: Partial<MatchupInput>) => {
    setMatchupInputs(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...update };
      return next;
    });
  }, []);

  const handleGenerate = async () => {
    if (!selectedMatch) return;
    setGenerating(true);
    try {
      const payload = {
        matchId: selectedMatch.id,
        contextNotes,
        matchups: matchupInputs.map(m => ({
          notes: m.notes,
          imageBase64: m.imageBase64 ?? undefined,
          imageMime: m.imageMime ?? undefined,
        })),
      };
      const res = await fetch(getApiUrl("/api/ai/match-analysis/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Generation failed");
      }
      const data = await res.json();
      setGeneratedReport(data.report);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/match-analysis", selectedMatch.id] });
      toast({
        title: "Analysis generated!",
        description: `Model: ${data.model}${data.supportsVision ? " (with vision)" : " (text only)"}`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Generation failed", description: err?.message });
    } finally {
      setGenerating(false);
    }
  };

  const reportToShow = generatedReport ?? (existingAnalysis?.report && !existingAnalysis.error ? existingAnalysis.report : null);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary" /> AI Match Analysis
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a match, upload screenshots + add notes per matchup, then generate a full AI analysis report.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
        {/* LEFT: Match selector */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Select Match</p>
              <input
                type="text"
                placeholder="Search by team or league..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
              ) : filteredMatches.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No matches found</div>
              ) : (
                filteredMatches.map(m => {
                  const isSelected = selectedMatch?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMatch(m)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 text-left transition-colors hover:bg-secondary/20",
                        isSelected && "bg-primary/10 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span className="truncate">{m.team1Name}</span>
                          <span className={cn("shrink-0 font-display font-black", m.team1Score > m.team2Score ? "text-primary" : "text-muted-foreground")}>
                            {m.team1Score}
                          </span>
                          <span className="text-muted-foreground/40">—</span>
                          <span className={cn("shrink-0 font-display font-black", m.team2Score > m.team1Score ? "text-primary" : "text-muted-foreground")}>
                            {m.team2Score}
                          </span>
                          <span className="truncate">{m.team2Name}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          {m.leagueName && <span>{m.leagueName}</span>}
                          {m.leagueName && <span>·</span>}
                          {m.date && <span>{format(new Date(m.date), "MMM d, yyyy")}</span>}
                          <span>·</span>
                          <span>{m.playerMatchups.length} games</span>
                        </div>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 shrink-0 text-muted-foreground transition-colors", isSelected && "text-primary")} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Analysis form */}
        {!selectedMatch ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Swords className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-display uppercase font-bold">Select a match to analyze</p>
            <p className="text-sm mt-1">Pick a match from the list and upload screenshots for each game</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Match header */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-3 flex-1 justify-end">
                  {selectedMatch.team1LogoUrl && <img src={selectedMatch.team1LogoUrl} className="w-10 h-10 rounded object-contain" />}
                  <span className="font-display font-bold uppercase text-lg">{selectedMatch.team1Name}</span>
                </div>
                <div className="text-center shrink-0">
                  <div className="font-display font-black text-4xl text-primary">
                    {selectedMatch.team1Score} — {selectedMatch.team2Score}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {selectedMatch.leagueName ?? "Friendly"} · {selectedMatch.date ? format(new Date(selectedMatch.date), "MMM d, yyyy") : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-display font-bold uppercase text-lg">{selectedMatch.team2Name}</span>
                  {selectedMatch.team2LogoUrl && <img src={selectedMatch.team2LogoUrl} className="w-10 h-10 rounded object-contain" />}
                </div>
              </div>
            </div>

            {/* Existing analysis note */}
            {existingAnalysis && !existingAnalysis.error && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-3 text-sm text-green-400">
                <Eye className="w-4 h-4 shrink-0" />
                Analysis already exists for this match. Generating again will overwrite it.
                <Link href={`/match-analysis/${selectedMatch.id}`} className="ml-auto text-xs underline hover:text-green-300">
                  View public report →
                </Link>
              </div>
            )}

            {/* Per-matchup section */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Individual Games ({selectedMatch.playerMatchups.length} matchups)
              </p>
              {selectedMatch.playerMatchups.map((mu, i) => {
                const input = matchupInputs[i] ?? { notes: "", imageBase64: null, imageMime: null, imagePreview: null };
                const p1Win = mu.player1Goals > mu.player2Goals;
                const p2Win = mu.player2Goals > mu.player1Goals;
                return (
                  <div key={mu.id} className="bg-card border border-border rounded-xl p-4">
                    {/* Game header */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30 px-2 py-0.5 rounded shrink-0">
                        G{i + 1}
                      </span>
                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <img src={mu.player1ImageUrl || `${import.meta.env.BASE_URL}images/default-avatar.png`}
                          className="w-6 h-6 rounded-full object-cover border border-border shrink-0" />
                        <span className={cn("font-bold text-sm truncate", p1Win ? "text-foreground" : "text-muted-foreground")}>
                          {mu.player1Name}
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className={cn("font-display font-black text-xl tabular-nums", p1Win ? "text-primary" : "text-muted-foreground")}>
                          {mu.player1Goals}
                        </span>
                        <span className="text-muted-foreground/40">—</span>
                        <span className={cn("font-display font-black text-xl tabular-nums", p2Win ? "text-primary" : "text-muted-foreground")}>
                          {mu.player2Goals}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={cn("font-bold text-sm truncate", p2Win ? "text-foreground" : "text-muted-foreground")}>
                          {mu.player2Name}
                        </span>
                        <img src={mu.player2ImageUrl || `${import.meta.env.BASE_URL}images/default-avatar.png`}
                          className="w-6 h-6 rounded-full object-cover border border-border shrink-0" />
                      </div>
                      {mu.mvpPlayerId && (
                        <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" title="MVP" />
                      )}
                    </div>

                    {/* Image upload + notes */}
                    <div className="grid grid-cols-[160px_1fr] gap-3">
                      <ImageUploadCell index={i} value={input} onChange={updateMatchupInput} />
                      <textarea
                        value={input.notes}
                        onChange={e => updateMatchupInput(i, { notes: e.target.value })}
                        placeholder={`Notes for Game ${i + 1}...\nPossession, shots, tactics, what happened, key moments...`}
                        rows={3}
                        className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall context */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                Match Context / Lore (optional)
              </label>
              <textarea
                value={contextNotes}
                onChange={e => setContextNotes(e.target.value)}
                placeholder="Give the AI additional context... team rivalry, what was at stake, recent form, tactical setup, anything extra you want it to know..."
                rows={4}
                className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 text-sm resize-none outline-none focus:border-primary/50 placeholder:text-muted-foreground/50 rounded-xl"
              />
            </div>

            {/* Generate button */}
            <Button
              variant="gaming"
              size="lg"
              className="w-full gap-2 text-base h-12"
              onClick={handleGenerate}
              disabled={generating || selectedMatch.playerMatchups.length === 0}
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analysing match data and screenshots...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate AI Match Analysis
                </>
              )}
            </Button>

            {/* Report preview */}
            <AnimatePresence>
              {reportToShow && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-primary/20 rounded-xl overflow-hidden"
                >
                  <div className="bg-primary/5 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm text-primary">Analysis Generated</span>
                    </div>
                    <Link
                      href={`/match-analysis/${selectedMatch.id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View full report
                    </Link>
                  </div>
                  <div className="p-5 space-y-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Headline</p>
                      <p className="font-display font-bold uppercase text-lg mt-0.5">{reportToShow.headline}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Opening</p>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{reportToShow.openingStatement}</p>
                    </div>
                    {reportToShow.mvpOfTheMatch && (
                      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">
                          MVP of the Match: {reportToShow.mvpOfTheMatch}
                        </span>
                      </div>
                    )}
                    {reportToShow.finalCall && (
                      <div className="bg-secondary/30 rounded-lg px-4 py-3 border border-border">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Final Call</p>
                        <p className="text-sm italic text-foreground">"{reportToShow.finalCall}"</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
