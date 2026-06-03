import { useState, useMemo, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Globe2, Layers, Lightbulb, HelpCircle, ChevronDown,
  Search, Filter, SlidersHorizontal, ShieldCheck, Swords,
  TrendingUp, Star, Zap, Users, Pin, Image, RefreshCw,
  MessageSquare, Trophy, Pencil, X,
} from "lucide-react";
import { PlayerCard } from "@/components/PlayerCard";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EfwFormation {
  id: number; formationCode: string; title: string;
  description: string | null; pros: string | null; cons: string | null;
  bestFor: string | null; style: string | null;
}
interface EfwTip { id: number; category: string | null; title: string; content: string | null; }
interface EfwQna { id: number; question: string; answer: string | null; category: string | null; }
interface EfCard {
  id: number; name: string; imageUrl: string | null; position: string | null;
  nationality: string | null; clubName: string | null; cardOvr: number | null;
  cardType: string | null; playingStyle: string | null;
  cardPace: number | null; cardShooting: number | null; cardPassing: number | null;
  cardDribbling: number | null; cardDefending: number | null; cardPhysical: number | null;
}
interface EfwPost {
  id: number; authorName: string; postType: string; title: string;
  content: string | null; imageUrl: string | null;
  formationCode: string | null; formationPlayers: string | null;
  isPinned: boolean; createdAt: string;
}

// ── Formation Helpers ─────────────────────────────────────────────────────────

function getRowLabel(rowIdx: number, totalRows: number, count: number): string[] {
  if (rowIdx === 0) return ["GK"];
  if (rowIdx === totalRows - 1) {
    if (count === 1) return ["ST"];
    if (count === 2) return ["SS", "SS"];
    if (count === 3) return ["LW", "ST", "RW"];
    return Array(count).fill("FW");
  }
  if (count === 1) return ["CAM"];
  if (count === 2) return ["CDM", "CDM"];
  if (count === 3) return ["LM", "CM", "RM"];
  if (count === 4) return ["LM", "CM", "CM", "RM"];
  return Array(count).fill("MF");
}

function getPositions(code: string, W: number, H: number) {
  const parsed = code.split("-").map(Number).filter(n => !isNaN(n));
  if (!parsed.length) return [];
  const rows = [1, ...parsed];
  const totalRows = rows.length;
  const positions: { x: number; y: number; label: string; rowIdx: number; colIdx: number }[] = [];
  rows.forEach((count, rowIdx) => {
    const labels = getRowLabel(rowIdx, totalRows, count);
    const yPct = rowIdx / (totalRows - 1 || 1);
    const y = H - 18 - yPct * (H - 38);
    for (let colIdx = 0; colIdx < count; colIdx++) {
      const x = count === 1 ? W / 2 : 18 + (colIdx / (count - 1)) * (W - 36);
      positions.push({ x, y, label: labels[colIdx] || "", rowIdx, colIdx });
    }
  });
  return positions;
}

function getShortName(full: string) {
  const t = full.trim();
  if (!t) return "";
  const parts = t.split(" ");
  const last = parts[parts.length - 1];
  return last.length <= 8 ? last : last.slice(0, 7);
}

// ── Pitch SVG ─────────────────────────────────────────────────────────────────

function PitchSVG({ code, playerNames, W = 220, H = 300, showNames = false }:
  { code: string; playerNames?: string[]; W?: number; H?: number; showNames?: boolean }) {
  const positions = getPositions(code, W, H);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <radialGradient id={`pg${W}`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0d1b3e" />
          <stop offset="100%" stopColor="#080f23" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width={W - 4} height={H - 4} rx="6" fill={`url(#pg${W})`} stroke="#1e3464" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <rect key={i} x="2" y={2 + i * ((H - 4) / 6)} width={W - 4} height={(H - 4) / 6}
          fill={i % 2 === 0 ? "rgba(96,165,250,0.025)" : "transparent"} />
      ))}
      <circle cx={W / 2} cy={H / 2} r="32" fill="none" stroke="#1e3a6e" strokeWidth="1" strokeDasharray="4 2" />
      <circle cx={W / 2} cy={H / 2} r="2" fill="#1e3a6e" />
      <line x1="10" y1={H / 2} x2={W - 10} y2={H / 2} stroke="#1e3a6e" strokeWidth="0.8" />
      <rect x={W / 2 - 36} y="8" width="72" height="36" rx="2" fill="none" stroke="#1e3a6e" strokeWidth="0.8" />
      <rect x={W / 2 - 36} y={H - 44} width="72" height="36" rx="2" fill="none" stroke="#1e3a6e" strokeWidth="0.8" />
      <rect x={W / 2 - 16} y="4" width="32" height="6" rx="1" fill="none" stroke="#2a4a8e" strokeWidth="1" />
      <rect x={W / 2 - 16} y={H - 10} width="32" height="6" rx="1" fill="none" stroke="#2a4a8e" strokeWidth="1" />
      {positions.map((p, idx) => {
        const isGK = p.rowIdx === 0;
        const totalRows = getPositions(code, W, H).filter(x => x.colIdx === 0).length;
        const isFWD = p.rowIdx === (getPositions(code, W, H).reduce((m, x) => Math.max(m, x.rowIdx), 0));
        const color = isGK ? "#a78bfa" : isFWD ? "#f97316" : "#60a5fa";
        const name = playerNames?.[idx];
        const short = name ? getShortName(name) : "";
        const r = showNames ? 12 : 9;
        return (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r={r} fill={`${color}22`} stroke={color} strokeWidth="1.5"
              style={{ filter: `drop-shadow(0 0 6px ${color}bb)` }} />
            <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize={showNames && short ? "5" : "5.5"} fontWeight="bold" fill={color} fontFamily="monospace">
              {showNames && short ? short : p.label}
            </text>
            {showNames && !short && (
              <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="5.5" fontWeight="bold" fill={`${color}60`} fontFamily="monospace">{p.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Formation Card ─────────────────────────────────────────────────────────────

function FormationCard({ f }: { f: EfwFormation }) {
  const styleColor: Record<string, string> = {
    "Attacking": "text-orange-400 border-orange-400/30 bg-orange-400/10",
    "Defensive": "text-violet-400 border-violet-400/30 bg-violet-400/10",
    "Balanced": "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  };
  const sc = f.style ? (styleColor[f.style] ?? "text-blue-400 border-blue-400/30 bg-blue-400/10") : null;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-blue-500/40 transition-all duration-300 group">
      <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-500/70 to-transparent" />
      <div className="p-5 flex flex-col sm:flex-row gap-5">
        <div className="shrink-0 flex flex-col items-center gap-2 w-full sm:w-36">
          <PitchSVG code={f.formationCode} W={220} H={300} />
          <div className="text-center">
            <div className="font-display font-black text-2xl tracking-widest text-blue-400"
              style={{ textShadow: "0 0 20px #3b82f680" }}>{f.formationCode}</div>
            {f.style && sc && <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border mt-1 inline-block", sc)}>{f.style}</span>}
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h3 className="font-display font-bold uppercase text-lg leading-tight group-hover:text-blue-400 transition-colors">{f.title}</h3>
            {f.bestFor && (
              <div className="flex items-center gap-1.5 mt-1">
                <TrendingUp className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="text-xs text-cyan-400/80 font-medium">{f.bestFor}</span>
              </div>
            )}
          </div>
          {f.description && <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {f.pros && (
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5"><ShieldCheck className="w-3 h-3 text-cyan-400" /><span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400">Strengths</span></div>
                <ul className="space-y-1">{f.pros.split("\n").filter(Boolean).map((p, i) => <li key={i} className="text-xs text-cyan-300/80 flex items-start gap-1.5"><span className="text-cyan-400 mt-0.5 shrink-0">+</span>{p.trim()}</li>)}</ul>
              </div>
            )}
            {f.cons && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5"><Swords className="w-3 h-3 text-orange-400" /><span className="text-[9px] font-bold uppercase tracking-widest text-orange-400">Weaknesses</span></div>
                <ul className="space-y-1">{f.cons.split("\n").filter(Boolean).map((c, i) => <li key={i} className="text-xs text-orange-300/80 flex items-start gap-1.5"><span className="text-orange-400 mt-0.5 shrink-0">−</span>{c.trim()}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Tips ─────────────────────────────────────────────────────────────────────

const TIP_CAT_COLORS: Record<string, string> = {
  "Offense": "bg-orange-500/10 border-orange-400/30 text-orange-300",
  "Defense": "bg-violet-500/10 border-violet-400/30 text-violet-300",
  "Midfield": "bg-cyan-500/10 border-cyan-400/30 text-cyan-300",
  "Mental": "bg-pink-500/10 border-pink-400/30 text-pink-300",
  "General": "bg-blue-500/10 border-blue-400/30 text-blue-300",
};
const TIP_ICONS: Record<string, React.ElementType> = { Offense: Swords, Defense: ShieldCheck, Midfield: Globe2, Mental: Star, General: Lightbulb };

function TipCard({ tip, i }: { tip: EfwTip; i: number }) {
  const cat = tip.category ?? "General";
  const catColor = TIP_CAT_COLORS[cat] ?? TIP_CAT_COLORS["General"];
  const Icon = TIP_ICONS[cat] ?? Lightbulb;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.5) }}
      className="bg-card border border-border rounded-2xl p-4 hover:border-blue-500/20 transition-all group relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", catColor)}><Icon className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-bold text-sm uppercase">{tip.title}</h4>
            <span className={cn("text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border", catColor)}>{cat}</span>
          </div>
          {tip.content && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{tip.content}</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Q&A ──────────────────────────────────────────────────────────────────────

function QnaItem({ q, i }: { q: EfwQna; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}
      className={cn("border rounded-2xl overflow-hidden transition-all duration-200",
        open ? "border-violet-400/40 bg-violet-500/5" : "border-border bg-card hover:border-blue-500/20")}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-4 text-left">
        <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-all",
          open ? "bg-violet-500/20 border-violet-400/50 text-violet-400" : "bg-secondary border-border text-muted-foreground")}>
          <HelpCircle className="w-3.5 h-3.5" />
        </div>
        <span className="flex-1 font-medium text-sm">{q.question}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-4 pt-0 border-t border-violet-500/10">
              <div className="flex gap-3 pt-3">
                <div className="w-0.5 bg-gradient-to-b from-violet-400 to-blue-400 rounded-full shrink-0 self-stretch opacity-60" />
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{q.answer || "Answer coming soon."}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Formation Builder ─────────────────────────────────────────────────────────

const PRESETS = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "5-3-2", "4-1-2-1-2", "3-4-3", "4-3-2-1", "4-5-1"];

const ROW_META = (rowIdx: number, maxRow: number) => {
  if (rowIdx === 0)       return { label: "Goalkeeper", accent: "#a78bfa", ring: "border-violet-400/50", text: "text-violet-300", bg: "bg-violet-500/10 border-violet-400/20", dot: "bg-violet-400" };
  if (rowIdx === maxRow)  return { label: "Forwards",   accent: "#f97316", ring: "border-orange-400/50", text: "text-orange-300", bg: "bg-orange-500/10 border-orange-400/20", dot: "bg-orange-400" };
  if (rowIdx === 1)       return { label: "Defenders",  accent: "#34d399", ring: "border-emerald-400/50", text: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-400/20", dot: "bg-emerald-400" };
  return { label: "Midfielders", accent: "#60a5fa", ring: "border-blue-400/50", text: "text-blue-300", bg: "bg-blue-500/10 border-blue-400/20", dot: "bg-blue-400" };
};

function getPositionsPct(code: string) {
  const parsed = code.split("-").map(Number).filter(n => !isNaN(n));
  if (!parsed.length || parsed.reduce((s, n) => s + n, 0) + 1 !== 11) return [];
  const rows = [1, ...parsed];
  const totalRows = rows.length;
  const positions: { leftPct: number; bottomPct: number; label: string; rowIdx: number; colIdx: number }[] = [];
  rows.forEach((count, rowIdx) => {
    const labels = getRowLabel(rowIdx, totalRows, count);
    const bottomPct = 6 + (rowIdx / (totalRows - 1)) * 74;
    for (let colIdx = 0; colIdx < count; colIdx++) {
      const leftPct = count === 1 ? 50 : 9 + (colIdx / (count - 1)) * 82;
      positions.push({ leftPct, bottomPct, label: labels[colIdx] || "", rowIdx, colIdx });
    }
  });
  return positions;
}

// ── HTML Pitch (card-based) ───────────────────────────────────────────────────

function HtmlPitch({
  formationCode, slots, maxRow, onSlotClick,
}: {
  formationCode: string;
  slots: (EfCard | null)[];
  maxRow: number;
  onSlotClick: (idx: number) => void;
}) {
  const positions = getPositionsPct(formationCode);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        aspectRatio: "0.65",
        background: "linear-gradient(180deg, #0b2e18 0%, #0f3d20 35%, #0e3a1e 65%, #0a2b14 100%)",
        boxShadow: "0 0 60px rgba(16,185,129,0.12), inset 0 0 80px rgba(0,0,0,0.4)",
      }}>

      {/* Grass stripes */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="absolute w-full pointer-events-none"
          style={{ top: `${i * 10}%`, height: "10%", background: i % 2 === 0 ? "rgba(0,0,0,0.06)" : "transparent" }} />
      ))}

      {/* Pitch lines */}
      <div className="absolute inset-[3%] border border-white/[0.12] rounded-sm pointer-events-none" />
      <div className="absolute left-[3%] right-[3%] h-px bg-white/[0.12] pointer-events-none" style={{ top: "50%" }} />

      {/* Center circle */}
      <div className="absolute rounded-full border border-white/[0.12] pointer-events-none"
        style={{ width: "28%", aspectRatio: "1", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
      <div className="absolute w-1.5 h-1.5 rounded-full bg-white/20 pointer-events-none"
        style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />

      {/* Top penalty box */}
      <div className="absolute border border-white/[0.12] pointer-events-none"
        style={{ top: "3%", left: "22%", right: "22%", height: "17%" }} />
      <div className="absolute border border-white/[0.08] pointer-events-none"
        style={{ top: "3%", left: "36%", right: "36%", height: "7%" }} />

      {/* Bottom penalty box */}
      <div className="absolute border border-white/[0.12] pointer-events-none"
        style={{ bottom: "3%", left: "22%", right: "22%", height: "17%" }} />
      <div className="absolute border border-white/[0.08] pointer-events-none"
        style={{ bottom: "3%", left: "36%", right: "36%", height: "7%" }} />

      {/* Player slots */}
      {positions.map((pos, idx) => {
        const card = slots[idx] ?? null;
        const meta = ROW_META(pos.rowIdx, maxRow);
        return (
          <button key={idx} onClick={() => onSlotClick(idx)}
            className="absolute flex flex-col items-center gap-0.5 group focus:outline-none"
            style={{
              left: `${pos.leftPct}%`, bottom: `${pos.bottomPct}%`,
              transform: "translate(-50%, 50%)",
              zIndex: 10,
            }}>
            {card ? (
              <>
                <div className="relative transition-transform duration-150 group-hover:scale-110 group-hover:-translate-y-0.5"
                  style={{ filter: `drop-shadow(0 4px 12px ${meta.accent}66)` }}>
                  <div className="w-11 h-11 rounded-full border-2 overflow-hidden bg-black/40"
                    style={{ borderColor: meta.accent }}>
                    <img
                      src={card.imageUrl || "/images/default-avatar.png"}
                      alt={card.name}
                      className="w-full h-full object-cover object-top"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = "/images/default-avatar.png"; }}
                    />
                  </div>
                  {card.cardOvr != null && (
                    <div className="absolute -top-1 -right-1 text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-lg"
                      style={{ background: meta.accent, color: "#000" }}>
                      {card.cardOvr}
                    </div>
                  )}
                </div>
                <span className="text-[8px] font-bold text-white/90 max-w-[52px] text-center leading-tight truncate"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
                  {card.name.split(" ").pop()?.slice(0, 9)}
                </span>
              </>
            ) : (
              <>
                <div className="w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-150 group-hover:scale-110"
                  style={{ borderColor: `${meta.accent}55`, background: `${meta.accent}10` }}>
                  <span className="text-[9px] font-black uppercase" style={{ color: `${meta.accent}99` }}>
                    {pos.label}
                  </span>
                </div>
                <span className="text-[7px] font-bold text-white/30 uppercase tracking-wider"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>tap</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Player Picker Modal ───────────────────────────────────────────────────────

const POS_GROUPS: Record<string, string[]> = {
  GK: ["GK"],
  DEF: ["CB", "LB", "RB", "LWB", "RWB", "SW"],
  MID: ["CDM", "CM", "CAM", "LM", "RM", "DM", "AMF"],
  FWD: ["CF", "ST", "LW", "RW", "SS"],
};

function PlayerPickerModal({
  open, slotLabel, onClose, onSelect, allCards,
}: {
  open: boolean;
  slotLabel: string;
  onClose: () => void;
  onSelect: (card: EfCard) => void;
  allCards: EfCard[];
}) {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("All");

  const filtered = useMemo(() => {
    return allCards.filter(c => {
      const q = search.toLowerCase().trim();
      const matchQ = !q || c.name.toLowerCase().includes(q) || (c.position?.toLowerCase().includes(q) ?? false) || (c.clubName?.toLowerCase().includes(q) ?? false);
      const matchPos = posFilter === "All" || (c.position && POS_GROUPS[posFilter]?.some(p => c.position!.toUpperCase().includes(p)));
      return matchQ && matchPos;
    });
  }, [allCards, search, posFilter]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <div className="p-5 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Pick player for
              <span className="text-blue-400 font-black uppercase tracking-widest text-sm border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 rounded-lg">{slotLabel}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, club…"
                className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-400/50" />
            </div>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {["All", "GK", "DEF", "MID", "FWD"].map(p => (
              <button key={p} onClick={() => setPosFilter(p)}
                className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all",
                  posFilter === p ? "bg-blue-500/20 border-blue-400/50 text-blue-300" : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                )}>{p}</button>
            ))}
            <span className="ml-auto text-[9px] text-muted-foreground self-center">{filtered.length} cards</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {allCards.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">No eFootball cards yet</p>
              <p className="text-xs mt-1 opacity-60">Add cards from Admin → eFootball Cards first</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No cards match your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {filtered.map(card => {
                const typeColors: Record<string, string> = {
                  "Black Ball": "border-yellow-500/60 bg-yellow-500/10",
                  "Iconic": "border-amber-400/60 bg-amber-500/10",
                  "Featured": "border-blue-400/50 bg-blue-500/10",
                  "Matchday": "border-green-400/50 bg-green-500/10",
                };
                const cardStyle = typeColors[card.cardType ?? ""] ?? "border-border bg-card";
                return (
                  <button key={card.id} onClick={() => { onSelect(card); onClose(); }}
                    className={cn("rounded-xl border overflow-hidden hover:scale-105 hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/20 transition-all text-left group", cardStyle)}>
                    <div className="relative aspect-[3/4] bg-black/20">
                      <img
                        src={card.imageUrl || "/images/default-avatar.png"}
                        alt={card.name}
                        className="w-full h-full object-cover object-top"
                        onError={e => { (e.currentTarget as HTMLImageElement).src = "/images/default-avatar.png"; }}
                      />
                      <div className="absolute top-1 left-1 text-[9px] font-black px-1 py-0.5 rounded bg-black/70 text-yellow-300">
                        {card.cardOvr ?? "—"}
                      </div>
                      {card.position && (
                        <div className="absolute top-1 right-1 text-[8px] font-black px-1 py-0.5 rounded bg-black/70 text-white/80">
                          {card.position}
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent pt-4 pb-1.5 px-1.5">
                        <div className="text-[9px] font-bold text-white leading-tight truncate">{card.name}</div>
                        {card.clubName && <div className="text-[7px] text-white/50 truncate">{card.clubName}</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Builder Tab ───────────────────────────────────────────────────────────────

function BuilderTab() {
  const [formationCode, setFormationCode] = useState("4-3-3");
  const [customCode, setCustomCode] = useState("4-3-3");
  const [selectedCards, setSelectedCards] = useState<(EfCard | null)[]>(Array(11).fill(null));
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: allCards = [] } = useQuery<EfCard[]>({
    queryKey: ["/api/ef-cards"],
    queryFn: () => fetch(getApiUrl("/api/ef-cards")).then(r => r.json()),
  });

  const positions = useMemo(() => getPositionsPct(formationCode), [formationCode]);
  const isValid = positions.length === 11;
  const maxRow = useMemo(() => positions.reduce((m, p) => Math.max(m, p.rowIdx), 0), [positions]);

  const rowGroups = useMemo(() => {
    const map = new Map<number, typeof positions>();
    positions.forEach(pos => {
      if (!map.has(pos.rowIdx)) map.set(pos.rowIdx, []);
      map.get(pos.rowIdx)!.push(pos);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [positions]);

  const handleCodeChange = useCallback((code: string) => {
    setCustomCode(code);
    const parsed = code.split("-").map(Number).filter(n => !isNaN(n));
    const total = parsed.reduce((s, n) => s + n, 0) + 1;
    if (total === 11 && parsed.length >= 2) {
      setFormationCode(code);
      setSelectedCards(Array(11).fill(null));
    }
  }, []);

  const pickingPos = pickingSlot !== null ? positions[pickingSlot] : null;

  const postMutation = useMutation({
    mutationFn: (data: any) => fetch(getApiUrl("/api/efw/posts"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/efw/posts"] });
      setShareOpen(false);
      toast({ title: "Formation shared to Community!" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to share" }),
  });

  return (
    <div className="space-y-5">
      {/* Preset bar */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Formation</span>
          {PRESETS.map(p => (
            <button key={p} onClick={() => handleCodeChange(p)}
              className={cn(
                "font-display font-black text-sm px-3.5 py-2 rounded-xl border transition-all duration-150",
                formationCode === p
                  ? "bg-blue-500/25 border-blue-400/60 text-blue-200 shadow-lg shadow-blue-500/20"
                  : "bg-secondary/30 border-border text-muted-foreground hover:border-blue-400/30 hover:text-blue-300"
              )}>{p}</button>
          ))}
          <div className="ml-auto flex items-center gap-2 bg-secondary/30 border border-border rounded-xl px-3 py-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Custom</span>
            <input value={customCode} onChange={e => handleCodeChange(e.target.value)}
              placeholder="e.g. 4-3-3" maxLength={12}
              className="bg-transparent text-sm w-20 focus:outline-none font-display font-black text-blue-300 text-center" />
          </div>
        </div>
      </div>

      {!isValid ? (
        <div className="text-center py-14 bg-card border border-dashed border-blue-500/20 rounded-2xl text-muted-foreground">
          <Globe2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-bold">Enter a valid formation (11 players total)</p>
          <p className="text-sm mt-1 opacity-60">e.g. 4-3-3, 4-2-3-1, 3-5-2</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">

          {/* Left: pitch */}
          <div className="flex flex-col gap-3">
            <HtmlPitch
              formationCode={formationCode}
              slots={selectedCards}
              maxRow={maxRow}
              onSlotClick={idx => setPickingSlot(idx)}
            />
            <div className="flex items-center justify-between px-1">
              <span className="font-display font-black text-3xl text-emerald-400 tracking-widest"
                style={{ textShadow: "0 0 20px rgba(52,211,153,0.5)" }}>{formationCode}</span>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedCards(Array(11).fill(null)); toast({ title: "Formation cleared" }); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-1.5 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
                <button onClick={() => setShareOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-xl hover:opacity-90 shadow-lg shadow-blue-600/30 transition-opacity">
                  <Users className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>
          </div>

          {/* Right: slot list grouped by row */}
          <div className="space-y-3">
            {rowGroups.map(([rowIdx, rowPositions]) => {
              const meta = ROW_META(rowIdx, maxRow);
              return (
                <div key={rowIdx} className={cn("rounded-2xl border p-4", meta.bg)}>
                  <div className={cn("text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2", meta.text)}>
                    <span className={cn("w-2 h-2 rounded-full", meta.dot)} />
                    {meta.label}
                  </div>
                  <div className="space-y-2">
                    {rowPositions.map(pos => {
                      const globalIdx = positions.indexOf(pos);
                      const card = selectedCards[globalIdx];
                      return (
                        <div key={globalIdx} className="flex items-center gap-3 bg-background/40 border border-white/5 rounded-xl px-3 py-2">
                          <span className={cn("text-[9px] font-black uppercase tracking-widest w-8 shrink-0", meta.text)}>
                            {pos.label}
                          </span>
                          {card ? (
                            <>
                              <div className="w-8 h-8 rounded-full overflow-hidden border shrink-0"
                                style={{ borderColor: meta.accent }}>
                                <img src={card.imageUrl || "/images/default-avatar.png"} alt={card.name}
                                  className="w-full h-full object-cover object-top"
                                  onError={e => { (e.currentTarget as HTMLImageElement).src = "/images/default-avatar.png"; }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold truncate">{card.name}</div>
                                <div className="text-[9px] text-muted-foreground flex items-center gap-1.5">
                                  {card.cardOvr != null && <span className="font-black text-yellow-400">{card.cardOvr}</span>}
                                  {card.position && <span>{card.position}</span>}
                                  {card.cardType && card.cardType !== "Standard" && <span className="opacity-60">{card.cardType}</span>}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => setPickingSlot(globalIdx)}
                                  className="text-[9px] font-bold text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1 transition-colors">
                                  Change
                                </button>
                                <button onClick={() => setSelectedCards(prev => { const n = [...prev]; n[globalIdx] = null; return n; })}
                                  className="text-[9px] font-bold text-red-400/70 hover:text-red-400 border border-red-400/20 rounded-lg px-2 py-1 transition-colors">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-full border-2 border-dashed shrink-0 flex items-center justify-center"
                                style={{ borderColor: `${meta.accent}40` }}>
                                <span className="text-[8px]" style={{ color: `${meta.accent}60` }}>?</span>
                              </div>
                              <span className="flex-1 text-xs text-muted-foreground/50 italic">No player selected</span>
                              <button onClick={() => setPickingSlot(globalIdx)}
                                className={cn("text-[9px] font-bold uppercase tracking-wider border rounded-lg px-3 py-1 transition-all", meta.ring, meta.text, "hover:opacity-90")}>
                                + Pick
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground/40 text-center">
              Tap a slot on the pitch or click Pick to assign a player card
            </p>
          </div>
        </div>
      )}

      {/* Player picker */}
      <PlayerPickerModal
        open={pickingSlot !== null}
        slotLabel={pickingPos?.label ?? ""}
        onClose={() => setPickingSlot(null)}
        onSelect={card => {
          if (pickingSlot === null) return;
          setSelectedCards(prev => { const n = [...prev]; n[pickingSlot] = card; return n; });
          setPickingSlot(null);
        }}
        allCards={allCards}
      />

      {/* Share modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Share Formation to Community</DialogTitle></DialogHeader>
          <BuilderShareForm
            formationCode={formationCode}
            selectedCards={selectedCards}
            onSubmit={d => postMutation.mutate(d)}
            saving={postMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BuilderShareForm({ formationCode, selectedCards, onSubmit, saving }: {
  formationCode: string; selectedCards: (EfCard | null)[]; onSubmit: (d: any) => void; saving: boolean;
}) {
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState(`My ${formationCode}`);
  const [notes, setNotes] = useState("");
  const playerNames = selectedCards.map(c => c?.name ?? "");
  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSubmit({
        authorName: author, postType: "formation", title,
        content: notes || null,
        formationCode,
        formationPlayers: playerNames.join(","),
      });
    }} className="space-y-3 mt-3">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Your Name *</label>
        <Input required value={author} onChange={e => setAuthor(e.target.value)} placeholder="GEF_Pro99" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Title *</label>
        <Input required value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder="Describe your formation strategy…"
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400/50 resize-none" />
      </div>
      <div className="bg-secondary/30 rounded-xl p-3">
        <p className="text-[9px] font-bold uppercase text-muted-foreground mb-2">Squad ({selectedCards.filter(Boolean).length}/11 selected)</p>
        <div className="flex flex-wrap gap-1">
          {selectedCards.map((card, i) => card ? (
            <span key={i} className="text-[9px] bg-blue-500/10 border border-blue-400/20 text-blue-300 px-1.5 py-0.5 rounded-md font-medium">
              {card.name.split(" ").pop()?.slice(0, 8)}
            </span>
          ) : null)}
        </div>
      </div>
      <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold" disabled={saving}>
        {saving ? "Sharing…" : "Share to Community"}
      </Button>
    </form>
  );
}

// ── Community ─────────────────────────────────────────────────────────────────

const POST_TYPES = ["All", "formation", "card", "moment", "highlight", "other"] as const;
type PostType = typeof POST_TYPES[number];

const POST_TYPE_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  formation: { label: "Formation",  color: "bg-blue-500/15 border-blue-400/40 text-blue-300",   icon: Globe2 },
  card:      { label: "Card",       color: "bg-yellow-500/15 border-yellow-400/40 text-yellow-300", icon: Layers },
  moment:    { label: "Moment",     color: "bg-orange-500/15 border-orange-400/40 text-orange-300", icon: Star },
  highlight: { label: "Highlight",  color: "bg-cyan-500/15 border-cyan-400/40 text-cyan-300",   icon: Trophy },
  other:     { label: "Other",      color: "bg-secondary border-border text-muted-foreground",  icon: MessageSquare },
};

function PostCard({ post, i }: { post: EfwPost; i: number }) {
  const meta = POST_TYPE_META[post.postType] ?? POST_TYPE_META["other"];
  const Icon = meta.icon;
  const players = post.formationPlayers ? post.formationPlayers.split(",") : [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.5) }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-blue-500/20 transition-all group relative">
      {post.isPinned && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-400/40 rounded-full px-2 py-0.5">
            <Pin className="w-2.5 h-2.5 text-yellow-400" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-yellow-400">Pinned</span>
          </div>
        </div>
      )}

      {/* Image */}
      {post.imageUrl && (
        <div className="aspect-video overflow-hidden bg-secondary">
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => (e.currentTarget.style.display = "none")} />
        </div>
      )}

      {/* Formation mini pitch */}
      {post.postType === "formation" && post.formationCode && (
        <div className="flex justify-center pt-4 px-4 bg-gradient-to-b from-[#080f23]/60 to-transparent">
          <div className="w-28">
            <PitchSVG code={post.formationCode} playerNames={players} W={140} H={190} showNames={players.some(p => p)} />
          </div>
          <div className="flex items-center ml-3">
            <span className="font-display font-black text-3xl text-blue-400" style={{ textShadow: "0 0 15px #3b82f680" }}>
              {post.formationCode}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", meta.color)}>
            <Icon className="w-2.5 h-2.5" />{meta.label}
          </span>
          <span className="text-[9px] text-muted-foreground font-medium">{post.authorName}</span>
          <span className="text-[9px] text-muted-foreground ml-auto">
            {new Date(post.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        </div>
        <h4 className="font-bold text-sm leading-snug">{post.title}</h4>
        {post.content && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{post.content}</p>}

        {/* Player list for formations */}
        {post.postType === "formation" && players.some(p => p) && (
          <div className="flex flex-wrap gap-1 pt-1">
            {players.filter(p => p).map((p, idx) => (
              <span key={idx} className="text-[8px] bg-blue-500/10 border border-blue-400/20 text-blue-300 px-1.5 py-0.5 rounded-md font-medium">{p}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PostFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [d, setD] = useState({ authorName: "", postType: "moment", title: "", content: "", imageUrl: "" });
  const f = (k: string) => (v: string) => setD(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: any) => fetch(getApiUrl("/api/efw/posts"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/efw/posts"] });
      toast({ title: "Post shared!" });
      onClose();
      setD({ authorName: "", postType: "moment", title: "", content: "", imageUrl: "" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to post" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Share to Community</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(d); }} className="space-y-4 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Your Name *</label>
              <Input required value={d.authorName} onChange={e => f("authorName")(e.target.value)} placeholder="GEF_Pro99" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Post Type *</label>
              <select value={d.postType} onChange={e => f("postType")(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400/50">
                <option value="card">Card Showcase</option>
                <option value="moment">Moment</option>
                <option value="highlight">Highlight</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">Title *</label>
            <Input required value={d.title} onChange={e => f("title")(e.target.value)} placeholder="My best moment this season…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
            <textarea value={d.content} onChange={e => f("content")(e.target.value)} rows={4}
              placeholder="Tell the community about it…"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400/50 resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Image className="w-3 h-3" /> Image URL (optional)
            </label>
            <Input value={d.imageUrl} onChange={e => f("imageUrl")(e.target.value)} placeholder="https://i.imgur.com/…" />
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold" disabled={mutation.isPending}>
            {mutation.isPending ? "Posting…" : "Post to Community"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CommunityTab() {
  const { data: posts, isLoading } = useQuery<EfwPost[]>({
    queryKey: ["/api/efw/posts"],
    queryFn: () => fetch(getApiUrl("/api/efw/posts")).then(r => r.json()),
  });
  const [typeFilter, setTypeFilter] = useState<PostType>("All");
  const [searchQ, setSearchQ] = useState("");
  const [postOpen, setPostOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!posts) return [];
    return posts.filter(p => {
      const matchType = typeFilter === "All" || p.postType === typeFilter;
      const q = searchQ.toLowerCase().trim();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q) || (p.content?.toLowerCase().includes(q) ?? false);
      return matchType && matchSearch;
    });
  }, [posts, typeFilter, searchQ]);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search posts…"
              className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400/50" />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {POST_TYPES.map(t => {
              const meta = t === "All" ? null : POST_TYPE_META[t];
              return (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all",
                    typeFilter === t
                      ? (meta?.color ?? "bg-blue-500/15 border-blue-400/40 text-blue-300")
                      : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                  )}>
                  {t === "All" ? "All" : (meta?.label ?? t)}
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={() => setPostOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold uppercase tracking-wider text-xs px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shrink-0">
          <Pencil className="w-3.5 h-3.5" /> New Post
        </button>
      </div>

      {/* Posts grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-20 bg-card border border-dashed border-blue-500/20 rounded-2xl text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-display uppercase text-lg">{!posts?.length ? "No posts yet" : "No posts match your filters"}</p>
          <p className="text-sm mt-2 opacity-60">{!posts?.length ? "Be the first to share — click New Post above" : "Try a different filter."}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((post, i) => <PostCard key={post.id} post={post} i={i} />)}
          </AnimatePresence>
        </div>
      )}

      <PostFormModal open={postOpen} onClose={() => setPostOpen(false)} />
    </div>
  );
}

// ── Cards Section ─────────────────────────────────────────────────────────────

const CARD_TYPES = ["All", "Black Ball", "Iconic", "Featured", "Matchday", "Standard"];
const TYPE_ORDER: Record<string, number> = { "Black Ball": 0, "Iconic": 1, "Featured": 2, "Matchday": 3, "Standard": 4 };

function CardsSection() {
  const { data: allCards, isLoading } = useQuery<EfCard[]>({
    queryKey: ["/api/ef-cards"],
    queryFn: () => fetch(getApiUrl("/api/ef-cards")).then(r => r.json()),
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("ovr");

  const cards = useMemo(() => {
    if (!allCards) return [];
    return allCards
      .filter(c => typeFilter === "All" || c.cardType === typeFilter)
      .filter(c => {
        const q = search.toLowerCase().trim();
        return !q || c.name.toLowerCase().includes(q) || (c.clubName?.toLowerCase().includes(q) ?? false)
          || (c.playingStyle?.toLowerCase().includes(q) ?? false) || (c.nationality?.toLowerCase().includes(q) ?? false);
      })
      .sort((a, b) => {
        const key = sortBy === "ovr" ? "cardOvr" : `card${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`;
        const aVal = (a as any)[key] ?? 0; const bVal = (b as any)[key] ?? 0;
        if (bVal !== aVal) return bVal - aVal;
        return (TYPE_ORDER[a.cardType ?? "Standard"] ?? 4) - (TYPE_ORDER[b.cardType ?? "Standard"] ?? 4);
      });
  }, [allCards, typeFilter, search, sortBy]);

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by player, club, playing style, nationality…"
            className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400/50 placeholder:text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {CARD_TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all",
                  typeFilter === t
                    ? t === "Black Ball" ? "bg-yellow-500/20 border-yellow-500/60 text-yellow-300"
                      : t === "Iconic" ? "bg-amber-500/20 border-amber-400/60 text-amber-300"
                      : t === "Featured" ? "bg-violet-500/20 border-violet-400/50 text-violet-300"
                      : t === "Matchday" ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                      : "bg-blue-500/15 border-blue-400/40 text-blue-300"
                    : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                )}>{t}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs focus:outline-none text-foreground">
              {["ovr","pace","shooting","passing","dribbling","defending","physical"].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[2/3] bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-display uppercase text-lg">{!allCards?.length ? "No cards yet" : "No cards match your filters"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <AnimatePresence mode="popLayout">
            {cards.map((card, i) => (
              <motion.div key={card.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: Math.min(i * 0.03, 0.4) }} className="group">
                <div className="transition-transform duration-200 group-hover:-translate-y-1 group-hover:drop-shadow-2xl">
                  <PlayerCard player={{ name: card.name, imageUrl: card.imageUrl, position: card.position, nationality: card.nationality, cardOvr: card.cardOvr, cardType: card.cardType, cardPace: card.cardPace, cardShooting: card.cardShooting, cardPassing: card.cardPassing, cardDribbling: card.cardDribbling, cardDefending: card.cardDefending, cardPhysical: card.cardPhysical, cardPlayingStyle: card.playingStyle }} size="md" className="w-full" />
                </div>
                <div className="mt-2 text-center">
                  <div className="text-xs font-bold truncate">{card.name}</div>
                  {card.clubName && <div className="text-[9px] uppercase tracking-widest text-muted-foreground truncate">{card.clubName}</div>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────────────────────

type Tab = "formations" | "tips" | "qna" | "builder" | "community" | "cards";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "formations", label: "Formations",    icon: Globe2 },
  { key: "tips",       label: "Tips & Tricks", icon: Lightbulb },
  { key: "qna",        label: "Q&A",           icon: HelpCircle },
  { key: "builder",    label: "Builder",       icon: Pencil },
  { key: "community",  label: "Community",     icon: Users },
  { key: "cards",      label: "Card Gallery",  icon: Layers },
];

const TAB_COLORS: Record<Tab, string> = {
  formations: "text-blue-400 border-blue-400",
  tips:        "text-cyan-400 border-cyan-400",
  qna:         "text-violet-400 border-violet-400",
  builder:     "text-green-400 border-green-400",
  community:   "text-pink-400 border-pink-400",
  cards:       "text-orange-400 border-orange-400",
};

const SECTION_TITLES: Record<Tab, { title: string; sub: string; color: string }> = {
  formations: { title: "Formation Guide",   sub: "Learn the best formations and when to use them",  color: "text-blue-400" },
  tips:        { title: "Tips & Tricks",    sub: "Pro advice to sharpen your game",                 color: "text-cyan-400" },
  qna:         { title: "Q & A",            sub: "Common questions about GEF and eFootball answered", color: "text-violet-400" },
  builder:     { title: "Formation Builder",sub: "Design your own formation and share it with the community", color: "text-green-400" },
  community:   { title: "Community",        sub: "Cards, moments, formations and highlights from GEF players", color: "text-pink-400" },
  cards:       { title: "Card Gallery",     sub: "Browse eFootball in-game cards curated by GEF",   color: "text-orange-400" },
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export function EfootballWorld() {
  const [tab, setTab] = useState<Tab>("formations");
  const { data: formations, isLoading: loadF } = useQuery<EfwFormation[]>({ queryKey: ["/api/efw/formations"], queryFn: () => fetch(getApiUrl("/api/efw/formations")).then(r => r.json()) });
  const { data: tips, isLoading: loadT } = useQuery<EfwTip[]>({ queryKey: ["/api/efw/tips"], queryFn: () => fetch(getApiUrl("/api/efw/tips")).then(r => r.json()) });
  const { data: qna, isLoading: loadQ } = useQuery<EfwQna[]>({ queryKey: ["/api/efw/qna"], queryFn: () => fetch(getApiUrl("/api/efw/qna")).then(r => r.json()) });
  const { data: posts } = useQuery<EfwPost[]>({ queryKey: ["/api/efw/posts"], queryFn: () => fetch(getApiUrl("/api/efw/posts")).then(r => r.json()) });

  const tipCategories = useMemo(() => ["All", ...Array.from(new Set(tips?.map(t => t.category ?? "General")))], [tips]);
  const qnaCategories = useMemo(() => ["All", ...Array.from(new Set(qna?.map(q => q.category ?? "General")))], [qna]);
  const [tipFilter, setTipFilter] = useState("All");
  const [qnaFilter, setQnaFilter] = useState("All");

  const filteredTips = useMemo(() => tips?.filter(t => tipFilter === "All" || (t.category ?? "General") === tipFilter) ?? [], [tips, tipFilter]);
  const filteredQna = useMemo(() => qna?.filter(q => qnaFilter === "All" || (q.category ?? "General") === qnaFilter) ?? [], [qna, qnaFilter]);

  const { title: sTitle, sub: sSub, color: sColor } = SECTION_TITLES[tab];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse 90% 70% at 50% -20%, rgba(124,58,237,0.22) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 15% 60%, rgba(59,130,246,0.14) 0%, transparent 50%), radial-gradient(ellipse 50% 50% at 85% 60%, rgba(6,182,212,0.10) 0%, transparent 50%)" }} />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.8) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
        </div>
        <div className="relative z-10 container mx-auto px-4 pt-14 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 border" style={{ background: "rgba(124,58,237,0.12)", borderColor: "rgba(139,92,246,0.35)" }}>
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-violet-300">GEF Knowledge Hub</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-display font-black uppercase tracking-tight leading-none mb-3">
            <span className="text-foreground">eFootball</span><br />
            <span style={{ background: "linear-gradient(135deg, #60a5fa 0%, #818cf8 40%, #a78bfa 70%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 30px rgba(96,165,250,0.5))" }}>World</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">Formation guides, pro tips, Q&amp;A, build your own formation, community posts and the full card gallery.</p>
          <div className="flex justify-center gap-4 mt-5 flex-wrap">
            {[
              { k: "builder", label: "Build Formation", icon: Pencil, color: "from-green-600/30 to-blue-600/30 border-green-400/40 text-green-300" },
              { k: "community", label: "Community", icon: Users, color: "from-pink-600/30 to-violet-600/30 border-pink-400/40 text-pink-300" },
            ].map(({ k, label, icon: Icon, color }) => (
              <button key={k} onClick={() => setTab(k as Tab)}
                className={cn("flex items-center gap-2 bg-gradient-to-r border text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all hover:opacity-90", color)}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {TABS.map(t => {
              const isActive = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={cn("flex items-center gap-2 px-4 py-4 text-sm font-display font-bold uppercase tracking-wide shrink-0 transition-all relative border-b-2",
                    isActive ? `${TAB_COLORS[t.key]} ` : "text-muted-foreground border-transparent hover:text-foreground"
                  )}>
                  <t.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden text-[10px]">{t.label.split(" ")[0]}</span>
                  {/* community post count badge */}
                  {t.key === "community" && posts && posts.length > 0 && (
                    <span className="ml-0.5 bg-pink-500/20 border border-pink-400/30 text-pink-300 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                      {posts.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className={cn("text-2xl font-display font-bold uppercase", sColor)}
            style={{ textShadow: "0 0 20px currentColor" }}>
            {sTitle}
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">{sSub}</p>
        </div>

        <AnimatePresence mode="wait">
          {tab === "formations" && (
            <motion.div key="f" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loadF ? <Skeletons h="h-48" /> : !formations?.length
                ? <EmptyState icon={Globe2} title="No formations yet" desc="Admin can add via Admin → eFootball World." color="border-blue-500/20" />
                : <div className="space-y-4">{formations.map(f => <FormationCard key={f.id} f={f} />)}</div>}
            </motion.div>
          )}
          {tab === "tips" && (
            <motion.div key="t" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {tipCategories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {tipCategories.map(c => <button key={c} onClick={() => setTipFilter(c)} className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all", tipFilter === c ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-400" : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground")}>{c}</button>)}
                </div>
              )}
              {loadT ? <Skeletons h="h-24" /> : !filteredTips.length
                ? <EmptyState icon={Lightbulb} title="No tips yet" desc="Admin can add via Admin → eFootball World." color="border-cyan-500/20" />
                : <div className="grid sm:grid-cols-2 gap-3">{filteredTips.map((t, i) => <TipCard key={t.id} tip={t} i={i} />)}</div>}
            </motion.div>
          )}
          {tab === "qna" && (
            <motion.div key="q" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {qnaCategories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {qnaCategories.map(c => <button key={c} onClick={() => setQnaFilter(c)} className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all", qnaFilter === c ? "bg-violet-500/15 border-violet-400/40 text-violet-400" : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground")}>{c}</button>)}
                </div>
              )}
              {loadQ ? <Skeletons h="h-16" /> : !filteredQna.length
                ? <EmptyState icon={HelpCircle} title="No Q&A yet" desc="Admin can add via Admin → eFootball World." color="border-violet-500/20" />
                : <div className="space-y-2 max-w-3xl">{filteredQna.map((q, i) => <QnaItem key={q.id} q={q} i={i} />)}</div>}
            </motion.div>
          )}
          {tab === "builder" && (
            <motion.div key="b" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <BuilderTab />
            </motion.div>
          )}
          {tab === "community" && (
            <motion.div key="c" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CommunityTab />
            </motion.div>
          )}
          {tab === "cards" && (
            <motion.div key="ca" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CardsSection />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Skeletons({ h }: { h: string }) {
  return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className={cn("bg-card rounded-2xl animate-pulse border border-border", h)} />)}</div>;
}

function EmptyState({ icon: Icon, title, desc, color }: { icon: React.ElementType; title: string; desc: string; color: string }) {
  return (
    <div className={cn("text-center py-24 bg-card border border-dashed rounded-2xl text-muted-foreground", color)}>
      <Icon className="w-14 h-14 mx-auto mb-4 opacity-20" />
      <p className="font-display uppercase text-xl">{title}</p>
      <p className="text-sm mt-2 opacity-60 max-w-xs mx-auto">{desc}</p>
    </div>
  );
}
