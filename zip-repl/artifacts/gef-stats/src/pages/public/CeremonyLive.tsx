import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useCeremonySocket } from "@/hooks/useCeremony";
import { useCeremonyAudio } from "@/hooks/useCeremonyAudio";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Star, Send, Users, Wifi, WifiOff, Shield, Zap, Building2,
  UserCheck, Award, MessageCircle, X, Volume2, VolumeX,
} from "lucide-react";
import gefTrophy from "@/assets/gef-trophy.png";

/* ─── Per-award trophy/image overrides ──────────────────────
   Runtime overrides come from ceremony.data.awardTrophies
   (set by admin via the Stage tab upload UI).
   Falls back to gefTrophy for any unmapped award id.          */
function getAwardTrophy(awardId: string, awardTrophies?: Record<string, string>): string {
  return awardTrophies?.[awardId] || gefTrophy;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CeremonyStageBackdrop } from "@/components/ceremony/CeremonyStage";
import { CeremonyIntro } from "@/components/ceremony/CeremonyIntro";
import { BackgroundMusicYouTube } from "@/components/ceremony/BackgroundMusicYouTube";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

// UEFA Champions League anthem — looping background score for the
// live ceremony page (matches the Ballon d'Or default).
const UCL_ANTHEM_VIDEO_ID = "EijsH7uon7Q";

/* ─── CSS Animations ────────────────────────────────────── */
const ANIM_STYLE = `
@keyframes goldSweep {
  0%   { transform: translateX(-100%) skewX(-15deg); opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateX(200%) skewX(-15deg); opacity: 0; }
}
@keyframes goldSweep2 {
  0%   { transform: translateX(-100%) skewX(-20deg); opacity: 0; }
  15%  { opacity: 0.7; }
  85%  { opacity: 0.7; }
  100% { transform: translateX(200%) skewX(-20deg); opacity: 0; }
}
@keyframes sparkle {
  0%   { opacity: 0; transform: scale(0) rotate(0deg); }
  30%  { opacity: 1; transform: scale(1.3) rotate(180deg); }
  70%  { opacity: 0.8; transform: scale(0.9) rotate(270deg); }
  100% { opacity: 0; transform: scale(0) rotate(360deg); }
}
@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 0 30px rgba(212,175,55,0.3); }
  50%       { box-shadow: 0 0 80px rgba(212,175,55,0.7), 0 0 120px rgba(212,175,55,0.3); }
}
@keyframes confettiDrop {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes shineSlide {
  0%   { transform: translateX(-100%) rotate(30deg); opacity: 0; }
  40%  { opacity: 0.6; }
  100% { transform: translateX(300%) rotate(30deg); opacity: 0; }
}
@keyframes spotlightSpin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes goldRingPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50%      { transform: scale(1.08); opacity: 0.95; }
}
.pulse-gold       { animation: pulse-gold 2s ease-in-out infinite; }
.gold-ring-pulse  { animation: goldRingPulse 2.4s ease-in-out infinite; }
.spotlight-spin   { animation: spotlightSpin 18s linear infinite; }
@keyframes packRay {
  0%   { opacity: 0; transform: scaleY(0) translateX(-50%); }
  25%  { opacity: 0.9; transform: scaleY(1) translateX(-50%); }
  75%  { opacity: 0.7; transform: scaleY(1) translateX(-50%); }
  100% { opacity: 0; transform: scaleY(1) translateX(-50%); }
}
@keyframes screenFlash {
  0%   { opacity: 0; }
  20%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes cardRock {
  0%,100% { transform: rotate(-2deg) scale(1); }
  50%      { transform: rotate(2deg) scale(1.02); }
}
@keyframes cardGlint {
  0%   { transform: translateX(-150%) rotate(25deg); opacity: 0; }
  40%  { opacity: 0.7; }
  100% { transform: translateX(300%) rotate(25deg); opacity: 0; }
}
@keyframes vsFlicker {
  0%,100% { opacity: 1; filter: drop-shadow(0 0 12px rgba(212,175,55,0.9)); }
  35%      { opacity: 0.6; filter: drop-shadow(0 0 30px rgba(212,175,55,1)); }
  65%      { opacity: 0.9; filter: drop-shadow(0 0 6px rgba(212,175,55,0.5)); }
}
@keyframes statFill {
  from { width: 0%; }
  to   { width: var(--bar-width, 0%); }
}
@keyframes top2SlideL {
  from { transform: translateX(-80px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
@keyframes top2SlideR {
  from { transform: translateX(80px);  opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
@keyframes particleFloat {
  0%   { transform: translateY(0)    scale(1);   opacity: 1; }
  100% { transform: translateY(-90px) scale(0.2); opacity: 0; }
}
.vs-flicker     { animation: vsFlicker 1.6s ease-in-out infinite; }
.card-rock      { animation: cardRock 2.5s ease-in-out infinite; }
`;

function InjectStyles() {
  useEffect(() => {
    const id = "ceremony-anim-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id; s.textContent = ANIM_STYLE;
      document.head.appendChild(s);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);
  return null;
}

/* ─── Spring transitions for framer-motion ─────────────── */
const springReveal = {
  initial: { opacity: 0, y: 50, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: -30, scale: 0.95 },
  transition: { type: "spring" as const, stiffness: 130, damping: 18, mass: 0.9 },
};
const winnerSpring = {
  initial: { opacity: 0, scale: 0.6, rotateX: -15 },
  animate: { opacity: 1, scale: 1, rotateX: 0 },
  exit:    { opacity: 0, scale: 0.9 },
  transition: { type: "spring" as const, stiffness: 110, damping: 14 },
};

/* ─── Golden Sweep Overlay (one-shot) ──────────────────── */
function GoldenSweep({ trigger }: { trigger: number }) {
  const [visible, setVisible] = useState(false);
  const prevTrigger = useRef(trigger);
  useEffect(() => {
    if (prevTrigger.current === trigger) return;
    prevTrigger.current = trigger;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!visible) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <div style={{ position:"absolute",top:0,left:0,right:0,bottom:0,background:"linear-gradient(90deg,transparent 0%,rgba(212,175,55,0.25) 40%,rgba(255,220,80,0.4) 50%,rgba(212,175,55,0.25) 60%,transparent 100%)",animation:"goldSweep 1.0s ease-in-out both",width:"80%" }} />
      <div style={{ position:"absolute",top:"30%",left:0,right:0,height:"2px",background:"linear-gradient(90deg,transparent 0%,rgba(212,175,55,0.9) 40%,rgba(255,240,100,1) 50%,rgba(212,175,55,0.9) 60%,transparent 100%)",animation:"goldSweep2 1.0s 0.08s ease-in-out both",width:"60%" }} />
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ position:"absolute",left:`${10+i*12}%`,top:`${20+(i%3)*25}%`,width:"6px",height:"6px",background:"radial-gradient(circle,#ffe566 0%,#d4af37 60%,transparent 100%)",borderRadius:"50%",animation:`sparkle ${0.6+i*0.07}s ${0.1+i*0.06}s ease-out both` }} />
      ))}
    </div>
  );
}

/* ─── Confetti ──────────────────────────────────────────── */
function Confetti({ colors = ["#d4af37", "#ffe566", "#fff8dc", "#ff6b6b", "#4ecdc4"] }) {
  const particles = [...Array(40)].map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    dur: `${2 + Math.random() * 2}s`,
    color: colors[i % colors.length],
    size: `${4 + Math.random() * 8}px`,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {particles.map(p => (
        <div key={p.id} style={{ position:"absolute",top:"-20px",left:p.left,width:p.size,height:p.size,background:p.color,borderRadius:Math.random()>0.5?"50%":"2px",animation:`confettiDrop ${p.dur} ${p.delay} ease-in both` }} />
      ))}
    </div>
  );
}


/* ─── Waiting Screen ─────────────────────────────────────
   The stage photo behind already shows the trophy on the podium,
   the wall, the banners — everything visual. So the waiting screen
   only adds a small "starting soon" status pinned to the bottom of
   the screen so it doesn't overlap the wall text or the trophy.    */
function WaitingScreen() {
  return (
    <motion.div
      key="waiting"
      className="flex-1 flex flex-col items-end justify-end text-center px-6 pb-8"
      {...springReveal}
    >
      <div className="w-full flex flex-col items-center">
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-black/55 backdrop-blur-md border border-yellow-400/35 shadow-[0_0_24px_rgba(212,175,55,0.35)]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span
            className="text-yellow-200 text-xs sm:text-sm font-semibold uppercase"
            style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.4em" }}
          >
            Ceremony Starting Soon
          </span>
          <div className="flex gap-1 ml-1">
            {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-300/80 animate-bounce" style={{ animationDelay:`${i*0.2}s` }} />)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Intro Screen ────────────────────────────────────────
   Renders only the host's welcome message, anchored to the
   bottom-centre of the screen so it doesn't compete with the
   wall text on the photographed stage.                       */
function IntroScreen({ data }: { data: any }) {
  const message = data?.intro?.message || "Welcome to the GEF Ballon d'Or Award Ceremony!";
  return (
    <motion.div
      key="intro"
      className="flex-1 flex flex-col items-center justify-end text-center px-8 pb-10"
      {...springReveal}
    >
      <motion.div
        className="px-7 py-4 rounded-2xl bg-black/55 backdrop-blur-md border border-yellow-400/30 shadow-[0_0_36px_rgba(212,175,55,0.35)] max-w-3xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <div
          className="text-[10px] sm:text-xs uppercase mb-2"
          style={{
            fontFamily: "'Cinzel', serif",
            letterSpacing: "0.55em",
            color: "rgba(255,225,150,0.7)",
          }}
        >
          A Word From The Host
        </div>
        <p
          className="italic"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(16px, 2vw, 24px)",
            color: "rgba(255,245,220,0.95)",
            letterSpacing: "0.04em",
            lineHeight: 1.4,
          }}
        >
          {message}
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ─── Award Icon Map ─────────────────────────────────────── */
const AWARD_ICON_MAP: Record<string, React.ComponentType<any>> = {
  phenomenal_finisher: Zap,
  best_captain: UserCheck,
  best_team: Building2,
  gk_defense: Shield,
  best_admin: Award,
  gcc_champion: Trophy,
};
const AWARD_COLOR_MAP: Record<string, string> = {
  phenomenal_finisher: "#f59e0b",
  best_captain: "#06b6d4",
  best_team: "#22c55e",
  gk_defense: "#3b82f6",
  best_admin: "#f59e0b",
  gcc_champion: "#d4af37",
  default: "#d4af37",
};

/* ─── Finalist Podium Card ───────────────────────────────── */
function FinalistRevealCard({ award, animKey, awardTrophies }: { award: any; animKey: number; awardTrophies?: Record<string, string> }) {
  const revealIdx: number = award.finalistRevealIndex ?? -1;
  const finalists: any[] = award.finalists || [];
  const color = AWARD_COLOR_MAP[award.id] || AWARD_COLOR_MAP.default;
  const IconComp = AWARD_ICON_MAP[award.id] || Star;

  const getFinalistByRank = (rank: number) => finalists.find(f => f.rank === rank) || finalists[rank - 1];
  const maxRank = finalists.length;

  if (revealIdx < 0) {
    return (
      <motion.div key={animKey} className="flex-1 flex flex-col items-center justify-center px-4" {...springReveal}>
        <motion.div
          style={{ color }}
          className="mb-6"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <IconComp className="w-16 h-16 mx-auto mb-4 opacity-80" style={{ filter:`drop-shadow(0 0 20px ${color})` }} />
        </motion.div>
        <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-3">{award.name}</h2>
        <p className="text-white/40 text-sm">{award.description}</p>
        <div className="mt-8 flex gap-3 items-center">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{ background: color, animationDelay:`${i*0.25}s`, opacity: 0.5 }} />)}
        </div>
        <p className="text-white/25 text-xs uppercase tracking-widest mt-4">Reveal incoming…</p>
      </motion.div>
    );
  }

  const currentFinalist = revealIdx < maxRank ? getFinalistByRank(revealIdx + 1) : getFinalistByRank(maxRank);
  const isWinner = revealIdx >= maxRank - 1;

  if (isWinner) {
    return (
      <>
        <Confetti colors={[color, "#ffe566", "#fff8dc", "#ffd700"]} />
        <motion.div key={animKey} className="flex-1 relative overflow-hidden flex flex-col items-center justify-center px-4 text-center" {...winnerSpring}>
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 100% 50% at 50% 10%, ${color}22 0%, transparent 65%)` }} />
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 50% 35% at 50% 5%, ${color}35 0%, transparent 55%)` }} />
          </div>

          {/* Trophy */}
          <motion.div className="relative shrink-0" initial={{ scale: 0.4, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 100, damping: 16 }}>
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} className="relative">
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle, ${color}80 0%, transparent 65%)`, filter: "blur(25px)", transform: "scale(1.8)", zIndex: 0 }} />
              <img src={getAwardTrophy(award.id, awardTrophies)} alt="GEF Trophy" className="relative w-32 sm:w-40 h-auto" style={{ filter: `drop-shadow(0 0 25px ${color}) drop-shadow(0 0 55px ${color}88)`, zIndex: 1 }} />
            </motion.div>
          </motion.div>

          {/* Award name */}
          <motion.p className="text-xs uppercase tracking-[0.5em] font-bold mt-3 mb-4" style={{ color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            {award.name} — Winner
          </motion.p>

          {/* Player photo */}
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${color}70 0%, transparent 70%)`, filter: "blur(20px)", transform: "scale(1.9)", zIndex: 0 }} />
            {currentFinalist?.image ? (
              <motion.img
                src={currentFinalist.image} alt={currentFinalist.name}
                className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover border-4 mx-auto"
                style={{ borderColor: color, boxShadow: `0 0 0 4px ${color}25, 0 0 55px ${color}90, 0 0 110px ${color}45`, zIndex: 1 }}
                initial={{ scale: 0.5, rotate: -6 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 130, damping: 14 }}
              />
            ) : (
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 mx-auto flex items-center justify-center font-black"
                style={{ borderColor: color, background: `${color}20`, color, fontSize: "clamp(2.5rem,5vw,4rem)", boxShadow: `0 0 55px ${color}65`, zIndex: 1 }}>
                {currentFinalist?.name?.[0] || "?"}
              </div>
            )}
          </div>

          <motion.h1
            className="font-black text-white leading-none mb-2"
            style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)", textShadow: `0 0 40px ${color}80, 0 0 80px ${color}40`, letterSpacing: "-0.01em" }}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 120, damping: 12 }}
          >
            {currentFinalist?.name || "—"}
          </motion.h1>
          <p className="uppercase tracking-[0.4em] text-sm sm:text-base font-semibold mb-4" style={{ color }}>{currentFinalist?.team}</p>
          <div className="w-32 h-px mb-4" style={{ background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }} />
          {currentFinalist?.statLabel && award.id !== "best_captain" && (
            <div className="bg-white/5 border rounded-2xl px-6 py-3 flex items-center gap-3" style={{ borderColor: `${color}40` }}>
              <div className="text-3xl font-black" style={{ color }}>{currentFinalist.statValue}</div>
              <div className="text-xs text-white/40 uppercase tracking-wider">{currentFinalist.statLabel}</div>
            </div>
          )}
        </motion.div>
      </>
    );
  }

  const placeLabel = revealIdx === 0 ? "3rd Place" : "2nd Place";
  const placeMedal = revealIdx === 0 ? "🥉" : "🥈";

  return (
    <motion.div key={animKey} className="flex-1 flex flex-col items-center justify-center px-4" {...springReveal}>
      <div className="w-full max-w-lg">
        <div className="relative rounded-2xl overflow-hidden border" style={{ borderColor:`${color}50`, background:`linear-gradient(to bottom, ${color}08, #000)` }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg, transparent, ${color}, transparent)` }} />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div style={{ position:"absolute",top:0,left:"-50%",width:"30%",height:"100%",background:`linear-gradient(90deg,transparent,${color}20,transparent)`,transform:"rotate(15deg)",animation:"shineSlide 2s ease-out both" }} />
          </div>

          <div className="p-8 text-center">
            <div className="text-xs uppercase tracking-[0.4em] mb-4" style={{ color }}>{award.name}</div>
            <div className="text-5xl mb-4">{placeMedal}</div>
            <div className="text-sm uppercase tracking-widest text-white/40 mb-5">{placeLabel}</div>

            {currentFinalist?.image ? (
              <motion.img
                src={currentFinalist.image} alt={currentFinalist.name}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 mx-auto mb-4"
                style={{ borderColor:`${color}70`, boxShadow:`0 0 0 3px ${color}20, 0 0 45px ${color}60` }}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 150, damping: 12 }}
              />
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 mx-auto mb-4 flex items-center justify-center font-black"
                style={{ borderColor:`${color}50`, background:`${color}18`, color, fontSize: "clamp(2rem,4vw,3rem)" }}>
                {currentFinalist?.name?.[0] || "?"}
              </div>
            )}

            <div className="text-2xl font-black text-white mb-1">{currentFinalist?.name || "—"}</div>
            <div className="text-sm uppercase tracking-wider mb-4" style={{ color, opacity: 0.7 }}>{currentFinalist?.team}</div>

            {currentFinalist?.statLabel && award.id !== "best_captain" && (
              <div className="inline-flex items-center gap-2 bg-white/5 border rounded-xl px-4 py-2" style={{ borderColor:`${color}30` }}>
                <span className="text-xl font-black" style={{ color }}>{currentFinalist.statValue}</span>
                <span className="text-xs text-white/40 uppercase tracking-wider">{currentFinalist.statLabel}</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Best Team Card ─────────────────────────────────────── */
function BestTeamCard({ award, animKey, awardTrophies }: { award: any; animKey: number; awardTrophies?: Record<string, string> }) {
  const revealIdx: number = award.finalistRevealIndex ?? -1;
  const finalists: any[] = award.finalists || [];
  const color = "#22c55e";

  // When finalists are available, use them for staged 3rd/2nd/winner reveals
  if (finalists.length > 0) {
    if (revealIdx < 0) {
      return (
        <motion.div key={animKey} className="flex-1 flex flex-col items-center justify-center px-4" {...springReveal}>
          <motion.div className="mb-6" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
            <Building2 className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-80" style={{ filter:"drop-shadow(0 0 20px #22c55e)" }} />
          </motion.div>
          <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-3">{award.name}</h2>
          <p className="text-white/40 text-sm">{award.description}</p>
          <div className="mt-8 flex gap-3 items-center">
            {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-pulse bg-green-400/50" style={{ animationDelay:`${i*0.25}s` }} />)}
          </div>
          <p className="text-white/25 text-xs uppercase tracking-widest mt-4">Reveal incoming…</p>
        </motion.div>
      );
    }

    const getByRank = (rank: number) => finalists.find(f => f.rank === rank) || finalists[rank - 1];
    const maxRank = finalists.length;
    const current = revealIdx < maxRank ? getByRank(revealIdx + 1) : getByRank(maxRank);
    const isWinner = revealIdx >= maxRank - 1;

    if (isWinner) {
      const teamColor = "#22c55e";
      return (
        <>
          <Confetti colors={["#22c55e", "#4ade80", "#bbf7d0", "#d4af37"]} />
          <motion.div key={animKey} className="flex-1 relative overflow-hidden flex flex-col items-center justify-center px-4 text-center" {...winnerSpring}>
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 100% 50% at 50% 10%, ${teamColor}22 0%, transparent 65%)` }} />
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 50% 35% at 50% 5%, ${teamColor}30 0%, transparent 55%)` }} />
            </div>

            {/* Trophy */}
            <motion.div className="relative shrink-0" initial={{ scale: 0.4, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 100, damping: 16 }}>
              <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} className="relative">
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle, ${teamColor}70 0%, transparent 65%)`, filter: "blur(25px)", transform: "scale(1.8)", zIndex: 0 }} />
                <img src={getAwardTrophy(award.id, awardTrophies)} alt="GEF Trophy" className="relative w-32 sm:w-40 h-auto" style={{ filter: `drop-shadow(0 0 25px ${teamColor}dd) drop-shadow(0 0 55px ${teamColor}66)`, zIndex: 1 }} />
              </motion.div>
            </motion.div>

            <motion.p className="text-xs uppercase tracking-[0.5em] font-bold mt-3 mb-4" style={{ color: teamColor }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              {award.name} — Winner
            </motion.p>

            {/* Team logo/avatar */}
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${teamColor}70 0%, transparent 70%)`, filter: "blur(20px)", transform: "scale(1.9)", zIndex: 0 }} />
              {current?.image ? (
                <motion.img src={current.image} alt={current.name}
                  className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover border-4 mx-auto"
                  style={{ borderColor: teamColor, boxShadow: `0 0 0 4px ${teamColor}25, 0 0 55px ${teamColor}90, 0 0 110px ${teamColor}45`, zIndex: 1 }}
                  initial={{ scale: 0.5, rotate: -6 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type:"spring", stiffness:130, damping:14 }} />
              ) : (
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 mx-auto flex items-center justify-center font-black"
                  style={{ borderColor: teamColor, background: `${teamColor}20`, color: teamColor, fontSize: "clamp(2.5rem,5vw,4rem)", boxShadow: `0 0 55px ${teamColor}65`, zIndex: 1 }}>
                  {current?.name?.[0] || "T"}
                </div>
              )}
            </div>

            <motion.h1
              className="font-black text-white leading-none mb-2"
              style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)", textShadow: `0 0 40px ${teamColor}80, 0 0 80px ${teamColor}40`, letterSpacing: "-0.01em" }}
              initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type:"spring", stiffness:130, damping:12 }}>
              {current?.name || "—"}
            </motion.h1>
            <p className="uppercase tracking-[0.4em] text-sm sm:text-base font-semibold mb-4" style={{ color: teamColor }}>{current?.team}</p>
            <div className="w-32 h-px mb-4" style={{ background: `linear-gradient(90deg, transparent, ${teamColor}80, transparent)` }} />
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { label: "Trophies", val: current?.trophies },
                { label: "Wins",     val: current?.wins },
                { label: "Win %",    val: current?.winRate != null ? `${current.winRate}%` : "—" },
                { label: "Goals",    val: current?.goals },
              ].map(({ label, val }) => (
                <div key={label} className="bg-green-400/10 border border-green-400/30 rounded-2xl px-4 py-3 text-center min-w-[70px]">
                  <div className="text-2xl font-black text-green-400">{val ?? "—"}</div>
                  <div className="text-xs text-white/40 uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      );
    }

    // 3rd or 2nd place reveal
    const placeLabel = revealIdx === 0 ? "3rd Place" : "2nd Place";
    const placeMedal = revealIdx === 0 ? "🥉" : "🥈";
    const placeStats = [
      { label: "Wins",      val: current?.wins },
      { label: "Win %",     val: current?.winRate != null ? `${current.winRate}%` : undefined },
      { label: "Goals",     val: current?.goals },
      { label: "Trophies",  val: current?.trophies },
      { label: "Avg Rating",val: current?.avgRating ?? current?.rating },
      { label: "Clean Sheets", val: current?.cleanSheets },
    ].filter(s => s.val != null);
    return (
      <motion.div key={animKey} className="flex-1 flex flex-col items-center justify-center px-4" {...springReveal}>
        <div className="w-full max-w-lg">
          <div className="relative rounded-2xl overflow-hidden border border-green-400/50" style={{ background:"linear-gradient(to bottom, #22c55e08, #000)" }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background:"linear-gradient(90deg, transparent, #22c55e, transparent)" }} />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div style={{ position:"absolute",top:0,left:"-50%",width:"30%",height:"100%",background:"linear-gradient(90deg,transparent,#22c55e20,transparent)",transform:"rotate(15deg)",animation:"shineSlide 2s ease-out both" }} />
            </div>
            <div className="p-8 text-center">
              <div className="text-xs uppercase tracking-[0.4em] text-green-400/70 mb-4">{award.name}</div>
              <div className="text-5xl mb-4">{placeMedal}</div>
              <div className="text-sm uppercase tracking-widest text-white/40 mb-5">{placeLabel}</div>
              {current?.image ? (
                <motion.img src={current.image} alt={current.name}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-green-400/70 mx-auto mb-4"
                  style={{ boxShadow:"0 0 0 3px rgba(34,197,94,0.15), 0 0 50px rgba(34,197,94,0.55)" }}
                  initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                  transition={{ type:"spring", stiffness:150, damping:12 }} />
              ) : (
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-green-400/50 bg-green-900/20 mx-auto mb-4 flex items-center justify-center font-black text-green-400" style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>
                  {current?.name?.[0] || "T"}
                </div>
              )}
              <div className="text-2xl font-black text-white mb-1">{current?.name || "—"}</div>
              <div className="text-sm uppercase tracking-wider text-green-400/70 mb-4">{current?.team}</div>
              {placeStats.length > 0 && (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                >
                  {placeStats.map(({ label, val }) => (
                    <div key={label} className="bg-green-400/10 border border-green-400/20 rounded-xl px-3 py-2.5 text-center">
                      <div className="text-xl font-black text-green-400">{val}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{label}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Fallback: no finalists configured — show auto-calculated winner only
  const winner = award.winner;
  if (revealIdx < 0 || !winner) {
    return (
      <motion.div key={animKey} className="flex-1 flex flex-col items-center justify-center px-4" {...springReveal}>
        <Building2 className="w-16 h-16 mx-auto mb-6 text-green-400 opacity-80" style={{ filter:"drop-shadow(0 0 20px #22c55e)" }} />
        <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-3">{award.name}</h2>
        <p className="text-white/40 text-sm">{award.description}</p>
        <p className="text-white/25 text-xs uppercase tracking-widest mt-6">Reveal incoming…</p>
      </motion.div>
    );
  }
  const teamColor = "#22c55e";
  return (
    <>
      <Confetti colors={["#22c55e", "#4ade80", "#bbf7d0", "#d4af37"]} />
      <motion.div key={animKey} className="flex-1 relative overflow-hidden flex flex-col items-center justify-center px-4 text-center" {...winnerSpring}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 100% 50% at 50% 10%, ${teamColor}22 0%, transparent 65%)` }} />
        </div>
        <motion.div className="relative shrink-0" initial={{ scale: 0.4, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 100, damping: 16 }}>
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} className="relative">
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle, ${teamColor}70 0%, transparent 65%)`, filter: "blur(25px)", transform: "scale(1.8)", zIndex: 0 }} />
            <img src={getAwardTrophy(award.id, awardTrophies)} alt="GEF Trophy" className="relative w-32 sm:w-40 h-auto" style={{ filter: `drop-shadow(0 0 25px ${teamColor}dd) drop-shadow(0 0 55px ${teamColor}66)`, zIndex: 1 }} />
          </motion.div>
        </motion.div>
        <p className="text-xs uppercase tracking-[0.5em] font-bold mt-3 mb-4 text-green-400/80">{award.name} — Winner</p>
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${teamColor}70 0%, transparent 70%)`, filter: "blur(15px)", transform: "scale(1.9)", zIndex: 0 }} />
          {winner.image ? (
            <img src={winner.image} alt={winner.name} className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover border-4 mx-auto"
              style={{ borderColor: teamColor, boxShadow: `0 0 0 4px ${teamColor}25, 0 0 55px ${teamColor}90`, zIndex: 1 }} />
          ) : (
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 mx-auto flex items-center justify-center font-black"
              style={{ borderColor: teamColor, background: `${teamColor}20`, color: teamColor, fontSize: "clamp(2.5rem,5vw,4rem)", zIndex: 1 }}>
              {winner.name?.[0] || "T"}
            </div>
          )}
        </div>
        <h1 className="font-black text-white leading-none mb-2"
          style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)", textShadow: `0 0 40px ${teamColor}80`, letterSpacing: "-0.01em" }}>
          {winner.name}
        </h1>
      </motion.div>
    </>
  );
}

/* ─── Standard Award Card ────────────────────────────────── */
function AwardCard({ award, animKey, awardTrophies }: { award: any; animKey: number; awardTrophies?: Record<string, string> }) {
  if (award.type === "team_auto") return <BestTeamCard award={award} animKey={animKey} awardTrophies={awardTrophies} />;
  if (award.finalists != null) return <FinalistRevealCard award={award} animKey={animKey} awardTrophies={awardTrophies} />;

  const revealIdx: number = award.finalistRevealIndex ?? -1;
  if (revealIdx < 0 && award.type === "manual") {
    return (
      <motion.div key={animKey} className="flex-1 flex flex-col items-center justify-center px-4" {...springReveal}>
        <Star className="w-16 h-16 mx-auto mb-6 text-yellow-400 opacity-80" />
        <h2 className="text-3xl font-black uppercase tracking-widest text-yellow-400 mb-3">{award.name}</h2>
        <p className="text-white/40 text-sm">{award.description}</p>
        <p className="text-white/25 text-xs uppercase tracking-widest mt-6">Reveal incoming…</p>
      </motion.div>
    );
  }

  const showWinner = revealIdx >= 2 || (award.winner && award.finalistRevealIndex === undefined);

  return (
    <motion.div key={animKey} className="flex-1 flex flex-col items-center justify-center px-4" {...springReveal}>
      {showWinner && award.winner && <Confetti colors={["#d4af37","#ffe566","#fff8dc"]} />}
      <div className="w-full max-w-lg">
        <div className="relative bg-gradient-to-b from-yellow-400/10 to-black border border-yellow-400/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(212,175,55,0.2)] pulse-gold">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
          <div className="bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 px-8 py-5 border-b border-yellow-400/20">
            <div className="flex items-center gap-3 justify-center">
              <Star className="w-5 h-5 text-yellow-400" />
              <h2 className="text-2xl font-black uppercase tracking-widest text-yellow-400">{award.name}</h2>
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-white/50 text-sm text-center mt-1">{award.description}</p>
          </div>
          {showWinner && award.winner ? (
            <div className="p-8 text-center">
              {award.winner.image ? (
                <img src={award.winner.image} alt={award.winner.name}
                  className="w-24 h-24 rounded-full border-2 border-yellow-400/50 mx-auto mb-4 object-cover shadow-[0_0_30px_rgba(212,175,55,0.4)]" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-yellow-400/10 border-2 border-yellow-400/30 mx-auto mb-4 flex items-center justify-center text-yellow-400 text-3xl font-black">
                  {award.winner.name?.[0]}
                </div>
              )}
              <p className="text-3xl font-black text-white mb-1">{award.winner.name}</p>
              <p className="text-yellow-400/70 text-sm uppercase tracking-widest">{award.winner.team}</p>
            </div>
          ) : (
            <div className="p-8 text-center text-white/30 text-sm italic">Reveal incoming…</div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Player Performance Radar ─────────────────────────── */
function PerformanceRadar({ player, color }: { player: any; color: string }) {
  const stats = player.stats || {};
  const radarData = [
    { axis: "Goals",    value: Math.min(100, (stats.goals ?? 0) * 2.5) },
    { axis: "Assists",  value: Math.min(100, (stats.assists ?? 0) * 5) },
    { axis: "Win %",    value: Math.min(100, stats.winRate ?? 0) },
    { axis: "Rating",   value: Math.min(100, stats.rating ?? 0) },
    { axis: "MVPs",     value: Math.min(100, (stats.mvps ?? 0) * 8) },
    { axis: "Trophies", value: Math.min(100, (stats.trophies ?? 0) * 15) },
  ];
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 600 }} />
          <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
          <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.35} strokeWidth={2}
            isAnimationActive animationDuration={1000} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Spotlight Player (Rankings) ────────────────────────── */
function SpotlightCard({ player, animKey, allRankings }: { player: any; animKey: number; allRankings?: any[] }) {
  const rank = player.rank;
  const isTop3 = rank <= 3;
  const isTop10 = rank <= 10;
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const accent = isTop3 ? "#d4af37" : isTop10 ? "#fb923c" : "#94a3b8";
  const borderColor = isTop3 ? "border-yellow-400/70" : isTop10 ? "border-orange-400/40" : "border-white/15";
  const glowShadow = isTop3
    ? "shadow-[0_0_80px_rgba(212,175,55,0.35),0_0_160px_rgba(212,175,55,0.12)]"
    : isTop10
    ? "shadow-[0_0_50px_rgba(251,146,60,0.2)]"
    : "shadow-[0_0_30px_rgba(255,255,255,0.04)]";

  const statItems = [
    { label: "OVR Rating", val: player.stats?.rating   ?? "—", big: true },
    { label: "Goals",      val: player.stats?.goals    ?? "—", big: false },
    { label: "Assists",    val: player.stats?.assists  ?? "—", big: false },
    { label: "Win Rate",   val: player.stats?.winRate  != null ? `${player.stats.winRate}%` : "—", big: false },
    { label: "MVPs",       val: player.stats?.mvps     ?? "—", big: false },
    { label: "Trophies",   val: player.stats?.trophies ?? "—", big: false },
  ];

  return (
    <motion.div
      key={animKey}
      className="w-full"
      initial={{ opacity: 0, y: 50, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
    >
      <div className={`relative rounded-3xl overflow-hidden border ${borderColor} ${glowShadow} ${
        isTop3 ? "bg-gradient-to-br from-yellow-950/50 via-black to-yellow-950/20" : isTop10 ? "bg-gradient-to-br from-orange-950/35 via-black to-black" : "bg-gradient-to-b from-white/5 to-black"
      } ${rank === 1 ? "pulse-gold" : ""}`}>

        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}, ${accent}99, transparent)` }} />

        {/* Subtle corner glow for top 3 */}
        {isTop3 && (
          <>
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${accent}10 0%, transparent 70%)`, transform: "translate(-30%, 30%)" }} />
          </>
        )}

        <div className="relative z-10 p-6 sm:p-8">
          {/* ── Top row: rank badge + points */}
          <div className="flex items-start justify-between mb-6">
            <motion.div
              initial={{ scale: 2.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 14 }}
              className="flex flex-col items-center"
            >
              {rank <= 3 ? (
                <div className="text-6xl sm:text-7xl leading-none">{medals[rank]}</div>
              ) : (
                <div className={`text-center border rounded-2xl px-4 py-2 ${isTop10 ? "border-orange-400/40 bg-orange-400/8" : "border-white/15 bg-white/5"}`}>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-1">Rank</div>
                  <div className={`text-4xl sm:text-5xl font-black leading-none ${isTop10 ? "text-orange-300" : "text-white/60"}`}>#{rank}</div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 150, damping: 12 }}
              className={`text-right border rounded-2xl px-4 py-2 ${isTop3 ? "border-yellow-400/30 bg-yellow-400/8" : isTop10 ? "border-orange-400/25 bg-orange-400/5" : "border-white/10 bg-white/3"}`}
            >
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-1">Ballon d'Or Pts</div>
              <div className={`text-3xl sm:text-4xl font-black leading-none ${isTop3 ? "text-yellow-400" : isTop10 ? "text-orange-400" : "text-white/55"}`}>{player.points ?? "—"}</div>
            </motion.div>
          </div>

          {/* ── Player identity: photo + name + team */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-7">
            <motion.div
              className="relative shrink-0"
              initial={{ scale: 0.5, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 140, damping: 14 }}
            >
              {/* Glow ring */}
              {isTop3 && (
                <div className="absolute inset-0 rounded-full gold-ring-pulse" style={{ background: `radial-gradient(circle, ${accent}50 0%, transparent 70%)`, transform: "scale(1.5)", zIndex: 0 }} />
              )}
              <div className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 z-10 ${
                isTop3 ? "border-yellow-400/80 shadow-[0_0_40px_rgba(212,175,55,0.7)]"
                : isTop10 ? "border-orange-400/50 shadow-[0_0_25px_rgba(251,146,60,0.4)]"
                : "border-white/25 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              }`}>
                {player.image ? (
                  <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-5xl font-black ${isTop3 ? "bg-yellow-900/40 text-yellow-400" : isTop10 ? "bg-orange-900/30 text-orange-400" : "bg-white/10 text-white/50"}`}>
                    {player.name?.[0] || "?"}
                  </div>
                )}
              </div>
            </motion.div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <motion.div
                className="text-[10px] uppercase tracking-[0.35em] mb-2 font-semibold"
                style={{ color: `${accent}99` }}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >{player.team || "GEF"}</motion.div>
              <motion.h2
                className="font-black text-white leading-none mb-1"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3.2rem)",
                  textShadow: isTop3 ? `0 0 50px ${accent}60` : "none",
                  letterSpacing: "-0.01em",
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, type: "spring", stiffness: 130, damping: 14 }}
              >{player.name}</motion.h2>
              {player.position && (
                <motion.div
                  className="text-xs uppercase tracking-widest text-white/30 mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >{player.position}</motion.div>
              )}
            </div>
          </div>

          {/* ── Stats grid */}
          <motion.div
            className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {statItems.map(({ label, val }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.42 + i * 0.06, type: "spring", stiffness: 160, damping: 14 }}
                className={`rounded-2xl p-3 sm:p-4 text-center border ${
                  isTop3 ? "bg-yellow-400/8 border-yellow-400/25" : isTop10 ? "bg-orange-400/7 border-orange-400/20" : "bg-white/5 border-white/10"
                }`}
              >
                <div className="text-xl sm:text-2xl font-black leading-none mb-1" style={{ color: accent }}>{val}</div>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/35 font-medium">{label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* ── Radar chart */}
          <motion.div
            className={`rounded-2xl border p-3 sm:p-4 ${isTop3 ? "border-yellow-400/20 bg-yellow-400/4" : isTop10 ? "border-orange-400/15 bg-orange-400/3" : "border-white/8 bg-white/3"}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2 font-semibold">Performance Profile</div>
            <div className="h-52 sm:h-60">
              <PerformanceRadar player={player} color={accent} />
            </div>
          </motion.div>

          {/* ── Stat bars */}
          {(() => {
            const s = player.stats || {};
            const maxGoals = Math.max(...(allRankings || [player]).map((p: any) => p.stats?.goals ?? 0), 1);
            const maxAssists = Math.max(...(allRankings || [player]).map((p: any) => p.stats?.assists ?? 0), 1);
            const bars = [
              { label: "Goals",   val: s.goals ?? 0,   pct: Math.round((s.goals ?? 0) / maxGoals * 100) },
              { label: "Assists", val: s.assists ?? 0, pct: Math.round((s.assists ?? 0) / maxAssists * 100) },
              { label: "Win %",   val: s.winRate != null ? `${s.winRate}%` : "—", pct: s.winRate ?? 0 },
              { label: "Rating",  val: s.rating ?? "—", pct: Math.min(100, s.rating ?? 0) },
            ].filter(b => b.val !== "—" && b.val !== 0);
            if (bars.length === 0) return null;
            return (
              <motion.div
                className={`rounded-2xl border p-3 sm:p-4 mt-3 ${isTop3 ? "border-yellow-400/20 bg-yellow-400/4" : isTop10 ? "border-orange-400/15 bg-orange-400/3" : "border-white/8 bg-white/3"}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-3 font-semibold">Season Stats</div>
                <div className="space-y-2.5">
                  {bars.map(({ label, val, pct }, bi) => (
                    <div key={label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
                        <span className="text-xs font-black" style={{ color: accent }}>{val}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${accent}99, ${accent})`,
                            animation: `statFill 0.9s cubic-bezier(0.2,0,0.3,1) ${0.85 + bi * 0.12}s both`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })()}

          {/* ── Rivals / Nearby competitors */}
          {(() => {
            if (!allRankings || allRankings.length < 2) return null;
            const nearby = allRankings
              .filter((p: any) => p.rank !== player.rank && Math.abs(p.rank - player.rank) <= 2)
              .sort((a: any, b: any) => a.rank - b.rank)
              .slice(0, 3);
            if (nearby.length === 0) return null;
            return (
              <motion.div
                className={`rounded-2xl border p-3 sm:p-4 mt-3 ${isTop3 ? "border-yellow-400/20 bg-yellow-400/4" : isTop10 ? "border-orange-400/15 bg-orange-400/3" : "border-white/8 bg-white/3"}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.6 }}
              >
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-3 font-semibold">Nearby Rivals</div>
                <div className="space-y-2">
                  {nearby.map((rival: any) => {
                    const isAbove = rival.rank < player.rank;
                    const rivalAccent = rival.rank <= 3 ? "#d4af37" : rival.rank <= 10 ? "#fb923c" : "#94a3b8";
                    const medals: Record<number,string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
                    return (
                      <div key={rival.rank} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${isAbove ? "border-yellow-400/20 bg-yellow-400/5" : "border-white/8 bg-white/3"}`}>
                        <span className="text-sm shrink-0 w-8 text-center font-bold" style={{ color: rivalAccent }}>
                          {rival.rank <= 3 ? medals[rival.rank] : `#${rival.rank}`}
                        </span>
                        {rival.image ? (
                          <img src={rival.image} alt={rival.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/15" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50 shrink-0">{rival.name?.[0]}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white/80 truncate">{rival.name}</div>
                          <div className="text-[9px] text-white/35 uppercase tracking-wider truncate">{rival.team}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs font-black" style={{ color: rivalAccent }}>{rival.points}</div>
                          <div className="text-[8px] text-white/25 uppercase">pts</div>
                        </div>
                        <div className="shrink-0 text-[9px] font-bold" style={{ color: isAbove ? "#d4af37" : "#6b7280" }}>
                          {isAbove ? "▲" : "▼"} {Math.abs(rival.rank - player.rank)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })()}
        </div>

        {/* Bottom shimmer */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }} />
      </div>
    </motion.div>
  );
}

function RevealedRow({ player }: { player: any }) {
  const isTop3 = player.rank <= 3;
  const isTop10 = player.rank <= 10;
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm ${
        isTop3 ? "border-yellow-400/25 bg-yellow-400/6" : isTop10 ? "border-orange-400/20 bg-orange-400/4" : "border-white/8 bg-white/3"
      }`}
    >
      <span className={`w-7 text-center font-bold text-sm shrink-0 ${isTop3 ? "text-yellow-400" : isTop10 ? "text-orange-400" : "text-white/30"}`}>
        {player.rank <= 3 ? medals[player.rank] : `#${player.rank}`}
      </span>
      {player.image ? (
        <img src={player.image} alt={player.name} className="w-7 h-7 rounded-full object-cover shrink-0" style={{ border: `1px solid ${isTop3 ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)"}` }} />
      ) : (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isTop3 ? "bg-yellow-900/40 text-yellow-400" : "bg-white/10 text-white/40"}`}>{player.name?.[0]}</div>
      )}
      <span className={`flex-1 font-semibold truncate ${isTop3 ? "text-yellow-100" : isTop10 ? "text-orange-100/80" : "text-white/60"}`}>{player.name}</span>
      <span className={`font-mono text-xs shrink-0 ${isTop3 ? "text-yellow-400/70" : "text-white/30"}`}>{player.points}p</span>
    </motion.div>
  );
}

/* ─── Rankings Screen ─────────────────────────────────────── */
function RankingsScreen({ state, sweepTrigger }: { state: any; sweepTrigger: number }) {
  const rankings: any[] = state.data?.rankings || [];
  const revealIdx = parseInt(state.revealIndex ?? "0");
  const current = rankings[revealIdx];
  const revealed = rankings.slice(0, revealIdx).reverse();
  const total = rankings.length;
  const rankBeingRevealed = current?.rank ?? (total - revealIdx);
  const ranksRemaining = total - revealIdx - 1;
  const isTop10 = rankBeingRevealed <= 10;
  const isTop3 = rankBeingRevealed <= 3;
  const accent = isTop3 ? "#d4af37" : isTop10 ? "#fb923c" : "#94a3b8";

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Main spotlight (left / full-width if no revealed yet) */}
      <div className={`flex flex-col overflow-hidden transition-all duration-500 ${revealed.length > 0 ? "flex-1 min-w-0" : "w-full"}`}>
        {/* Header bar */}
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-8 py-3 border-b border-white/6">
          <div className="flex items-center gap-3">
            <motion.div
              key={sweepTrigger}
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 15 }}
              className="flex items-center gap-2"
            >
              <span className="text-[11px] uppercase tracking-[0.35em] font-semibold" style={{ color: `${accent}99` }}>
                {isTop3 ? "Top 3 ✦" : isTop10 ? "Top 10" : "Rankings"}
              </span>
              <span className="text-[11px] uppercase tracking-[0.35em] text-white/20">—</span>
              <span className="text-[11px] uppercase tracking-[0.35em] font-black" style={{ color: accent }}>
                #{rankBeingRevealed}
              </span>
            </motion.div>
          </div>
          <div className="flex items-center gap-2">
            {/* Progress dots */}
            <div className="hidden sm:flex gap-1">
              {rankings.slice(0, Math.min(total, 20)).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                  style={{ background: i < revealIdx ? accent : i === revealIdx ? `${accent}cc` : "rgba(255,255,255,0.12)", transform: i === revealIdx ? "scale(1.5)" : "scale(1)" }} />
              ))}
            </div>
            <span className="text-[10px] uppercase tracking-wider text-white/25 ml-2">
              {ranksRemaining > 0 ? `${ranksRemaining} to go` : "Final"}
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 sm:px-6 py-4">
          <AnimatePresence mode="wait">
            {current && <SpotlightCard key={`spot-${sweepTrigger}`} player={current} animKey={sweepTrigger} allRankings={rankings} />}
          </AnimatePresence>
        </ScrollArea>
      </div>

      {/* ── Revealed sidebar (right column, only when players have been revealed) */}
      {revealed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-48 sm:w-56 shrink-0 border-l border-white/6 flex flex-col overflow-hidden"
        >
          <div className="px-3 py-3 border-b border-white/6 shrink-0">
            <div className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-semibold">Already Revealed</div>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1.5">
              {revealed.map((p) => <RevealedRow key={p.rank} player={p} />)}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Top 2 Screen ───────────────────────────────────────── */
function Top2Screen({ state }: { state: any }) {
  const rankings: any[] = state.data?.rankings || [];
  const top2 = rankings.filter(p => p.rank <= 2).sort((a, b) => b.rank - a.rank); // [#2, #1]
  const [showVs, setShowVs] = useState(false);
  const [showCards, setShowCards] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShowCards(true), 300);
    const t2 = setTimeout(() => setShowVs(true), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden px-4 py-6">
      {/* Background rays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />
        {[...Array(16)].map((_, i) => (
          <div key={i} className="absolute pointer-events-none"
            style={{
              left: "50%", top: "50%",
              width: "1px", height: "55vh",
              background: `linear-gradient(to top, rgba(212,175,55,${0.06 + (i % 3) * 0.03}), transparent)`,
              transformOrigin: "bottom center",
              transform: `translateX(-50%) translateY(-100%) rotate(${i * 22.5}deg)`,
              opacity: showVs ? 0.6 : 0,
              transition: `opacity 1s ease ${i * 0.04}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div className="relative z-10 text-center mb-6 sm:mb-8"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="text-[9px] uppercase tracking-[0.7em] text-yellow-400/40 mb-1">GEF Ballon d'Or</div>
        <h2 className="font-black uppercase text-white" style={{ fontSize: "clamp(1.3rem,4vw,2.2rem)", letterSpacing: "0.06em", textShadow: "0 0 40px rgba(212,175,55,0.4)" }}>
          The Final Two
        </h2>
        <div className="text-[10px] uppercase tracking-[0.4em] text-white/25 mt-1">Who takes the Ballon d'Or?</div>
      </motion.div>

      {/* Cards + VS layout */}
      <div className="relative z-10 w-full max-w-3xl flex items-center gap-2 sm:gap-4">
        {top2.map((p, i) => {
          const isLeft = i === 0;
          const statList = [
            { label: "Goals",   val: p.stats?.goals },
            { label: "Assists", val: p.stats?.assists },
            { label: "Win %",   val: p.stats?.winRate != null ? `${p.stats.winRate}%` : null },
            { label: "MVPs",    val: p.stats?.mvps },
          ].filter(s => s.val != null);
          return (
            <div key={p.rank} className="flex-1 min-w-0"
              style={{
                opacity: showCards ? 1 : 0,
                animation: showCards ? `${isLeft ? "top2SlideL" : "top2SlideR"} 0.7s cubic-bezier(0.2,0,0.3,1) ${i * 0.15}s both` : "none",
              }}>
              <div className="relative rounded-3xl overflow-hidden border border-yellow-400/50 flex flex-col items-center pb-5 pt-4 pulse-gold"
                style={{ background: "linear-gradient(170deg, rgba(212,175,55,0.13) 0%, rgba(0,0,0,0.96) 50%, rgba(212,175,55,0.05) 100%)", boxShadow: "0 0 80px rgba(212,175,55,0.2), inset 0 0 30px rgba(212,175,55,0.04)" }}>
                {/* Top shimmer */}
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.9), transparent)" }} />
                {/* Rank badge */}
                <div className="absolute top-3 left-3 z-20 flex flex-col items-center">
                  <div className="bg-black/80 border border-yellow-400/40 rounded-xl px-2 py-0.5">
                    <span className="text-[9px] text-yellow-400/70 uppercase tracking-[0.2em] font-black">#{p.rank}</span>
                  </div>
                </div>
                {/* Corner glow */}
                <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)", transform: "translate(20%,-20%)" }} />
                {/* Photo */}
                <div className="relative mt-3 mb-3">
                  <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.6) 0%, transparent 65%)", filter: "blur(18px)", transform: "scale(1.7)", zIndex: 0 }} />
                  {p.image ? (
                    <img src={p.image} alt={p.name}
                      className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-yellow-400/75 z-10"
                      style={{ boxShadow: "0 0 0 3px rgba(212,175,55,0.2), 0 0 50px rgba(212,175,55,0.7)" }} />
                  ) : (
                    <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-yellow-400/60 z-10 flex items-center justify-center font-black text-yellow-400"
                      style={{ background: "rgba(120,80,0,0.3)", fontSize: "clamp(1.8rem,4vw,2.8rem)", boxShadow: "0 0 50px rgba(212,175,55,0.5)" }}>
                      {p.name?.[0]}
                    </div>
                  )}
                </div>
                {/* Name + team */}
                <h3 className="font-black text-white text-center px-2 leading-tight mb-0.5" style={{ fontSize: "clamp(0.9rem,2vw,1.25rem)" }}>{p.name}</h3>
                <p className="text-yellow-400/50 text-[9px] uppercase tracking-widest text-center px-2 mb-3">{p.team}</p>
                {/* Stats grid */}
                {statList.length > 0 && (
                  <div className="w-full px-3 grid grid-cols-2 gap-1.5">
                    {statList.map(({ label, val }) => (
                      <div key={label} className="bg-yellow-400/6 border border-yellow-400/15 rounded-xl px-2 py-2 text-center">
                        <div className="text-sm font-black text-yellow-300">{val}</div>
                        <div className="text-[8px] text-white/35 uppercase tracking-wider">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Bottom shimmer */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)" }} />
              </div>
            </div>
          );
        })}

        {/* VS divider */}
        <div className="shrink-0 flex flex-col items-center justify-center gap-1 z-20 px-1">
          <div className="w-px h-12 sm:h-20" style={{ background: "linear-gradient(to bottom, transparent, rgba(212,175,55,0.5), transparent)" }} />
          <div className="vs-flicker font-black text-yellow-400 text-center leading-none"
            style={{ fontSize: "clamp(1.4rem,3vw,2rem)", opacity: showVs ? 1 : 0, transition: "opacity 0.5s ease", textShadow: "0 0 20px rgba(212,175,55,0.8)" }}>
            VS
          </div>
          <div className="w-px h-12 sm:h-20" style={{ background: "linear-gradient(to bottom, transparent, rgba(212,175,55,0.5), transparent)" }} />
        </div>
      </div>

      {/* Bottom prompt */}
      <motion.div className="relative z-10 mt-6 text-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
        <div className="text-[9px] uppercase tracking-[0.5em] text-white/20 animate-pulse">The winner will be revealed…</div>
      </motion.div>
    </div>
  );
}

/* ─── Winner Screen ──────────────────────────────────────── */
function WinnerScreen({ state, awardTrophies }: { state: any; awardTrophies?: Record<string, string> }) {
  const winner = state.data?.winner;
  // Phases: flash → card-back → flip-out → flip-in → card-face → reveal
  const [phase, setPhase] = useState<"flash"|"card-back"|"flip-out"|"flip-in"|"card-face"|"reveal">("flash");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const ts = [
      setTimeout(() => setPhase("card-back"),  500),
      setTimeout(() => setPhase("flip-out"),   2700),
      setTimeout(() => setPhase("flip-in"),    3150),
      setTimeout(() => setPhase("card-face"),  3200),
      setTimeout(() => setPhase("reveal"),     5600),
      setTimeout(() => setShowConfetti(true),  5700),
      setTimeout(() => setShowConfetti(false), 18000),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  /* ── Flash intro ── */
  if (phase === "flash") {
    return (
      <div className="flex-1 relative flex items-center justify-center overflow-hidden" style={{ background: "#000" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 50%, rgba(212,175,55,0.85) 0%, transparent 65%)", animation: "screenFlash 0.5s ease-out both" }} />
        <div className="text-[10px] uppercase tracking-[0.6em] text-yellow-400/40 animate-pulse">Opening…</div>
      </div>
    );
  }

  /* ── Card back + flip states ── */
  if (phase === "card-back" || phase === "flip-out" || phase === "flip-in" || phase === "card-face") {
    const isBack = phase === "card-back";
    const isFront = phase === "card-face" || phase === "flip-in";
    const flipOutStyle = phase === "flip-out" ? { transform: "perspective(900px) rotateY(90deg)", transition: "transform 0.45s cubic-bezier(0.4,0,1,1)" } : {};
    const flipInStyle  = phase === "flip-in"  ? { transform: "perspective(900px) rotateY(90deg)" } : {};
    const flipSettleStyle = phase === "card-face" ? { transform: "perspective(900px) rotateY(0deg)", transition: "transform 0.45s cubic-bezier(0,0,0.2,1)" } : {};

    return (
      <div className="flex-1 relative flex items-center justify-center overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.09) 0%, #000 70%)" }}>
        {/* Light rays */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="absolute"
              style={{
                left: "50%", top: "50%",
                width: "1px", height: "50vh",
                background: `linear-gradient(to top, rgba(212,175,55,${0.05 + (i % 4) * 0.03}), transparent)`,
                transformOrigin: "bottom center",
                transform: `translateX(-50%) translateY(-100%) rotate(${i * 20}deg)`,
                opacity: isFront ? 0.8 : 0.3,
                transition: "opacity 0.6s ease",
              }}
            />
          ))}
        </div>

        {/* Glow orb */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, rgba(212,175,55,${isFront ? 0.25 : 0.08}) 0%, transparent 50%)`, transition: "background 0.6s ease" }} />

        {/* The card */}
        <motion.div
          initial={isBack ? { scale: 0.15, rotate: -18, opacity: 0 } : undefined}
          animate={isBack ? { scale: 1, rotate: 0, opacity: 1 } : undefined}
          transition={isBack ? { type: "spring", stiffness: 130, damping: 15 } : undefined}
          className={isBack ? "card-rock" : ""}
          style={{
            width: "clamp(180px,28vw,240px)",
            height: "clamp(252px,39.2vw,336px)",
            borderRadius: "16px",
            overflow: "hidden",
            border: `2px solid rgba(212,175,55,${isFront ? 0.95 : 0.55})`,
            boxShadow: isFront
              ? "0 0 120px rgba(212,175,55,0.7), 0 0 240px rgba(212,175,55,0.3), inset 0 0 40px rgba(255,255,255,0.06)"
              : "0 0 60px rgba(212,175,55,0.35), inset 0 0 20px rgba(212,175,55,0.04)",
            ...flipOutStyle,
            ...flipInStyle,
            ...flipSettleStyle,
          }}
        >
          {isFront ? (
            /* FIFA UT-style gold card face */
            <div className="relative w-full h-full flex flex-col" style={{ background: "linear-gradient(160deg, #b8860b 0%, #d4af37 25%, #ffe57a 48%, #d4af37 72%, #9a6f0a 100%)" }}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 40%, transparent 70%)" }} />
              {/* Card glint */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div style={{ position:"absolute", top:0, left:"-60%", width:"40%", height:"100%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)", animation:"cardGlint 1.2s ease-out 0.2s both" }} />
              </div>
              {/* Top: OVR + position */}
              <div className="relative z-10 flex justify-between items-start px-4 pt-4 shrink-0">
                <div className="text-center">
                  <div className="font-black text-black/80 leading-none" style={{ fontSize: "clamp(1.6rem,5vw,2.2rem)", textShadow: "0 1px 0 rgba(255,255,255,0.3)" }}>
                    {winner?.stats?.rating ?? "—"}
                  </div>
                  <div className="text-[9px] font-black text-black/60 uppercase tracking-wider mt-0.5">{winner?.position || "PLR"}</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-[9px] font-black text-black/60 uppercase tracking-widest">GEF</div>
                  <Trophy className="w-4 h-4 text-black/50" />
                </div>
              </div>
              {/* Player image */}
              <div className="relative flex-1 flex items-end justify-center overflow-hidden">
                {winner?.image ? (
                  <img src={winner.image} alt={winner?.name}
                    className="relative z-10 w-full h-full object-cover object-top"
                    style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.5))", maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" }} />
                ) : (
                  <div className="relative z-10 w-full h-full flex items-center justify-center font-black text-black/50" style={{ fontSize: "clamp(3rem,8vw,5rem)" }}>{winner?.name?.[0] || "?"}</div>
                )}
              </div>
              {/* Bottom: name + mini stats */}
              <div className="relative z-10 px-3 pb-3 pt-2 shrink-0" style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.35))" }}>
                <div className="text-center mb-2">
                  <div className="font-black text-white leading-tight" style={{ fontSize: "clamp(0.75rem,2.5vw,1rem)", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>{winner?.name}</div>
                  <div className="text-[8px] uppercase tracking-widest text-white/60">{winner?.team}</div>
                </div>
                <div className="grid grid-cols-3 gap-0.5 text-center">
                  {[
                    { label: "GOL", val: winner?.stats?.goals ?? "—" },
                    { label: "WIN%", val: winner?.stats?.winRate != null ? `${winner.stats.winRate}` : "—" },
                    { label: "MVP", val: winner?.stats?.mvps ?? "—" },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div className="text-xs font-black text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{val}</div>
                      <div className="text-[7px] text-white/50 uppercase tracking-wider">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Card back */
            <div className="relative w-full h-full flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #120e00 0%, #2e2400 45%, #120e00 100%)" }}>
              <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(212,175,55,0.03) 10px, rgba(212,175,55,0.03) 12px)" }} />
              <Trophy className="w-16 h-16 text-yellow-400/25 relative z-10 mb-2" />
              <div className="text-[9px] uppercase tracking-[0.5em] text-yellow-400/30 relative z-10">GEF</div>
              <div className="text-[8px] uppercase tracking-[0.35em] text-yellow-400/20 relative z-10">Ballon d'Or</div>
            </div>
          )}
        </motion.div>

        {isFront && (
          <motion.div className="absolute bottom-8 text-center z-20" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="text-[10px] uppercase tracking-[0.5em] text-yellow-400/50 animate-pulse">Ballon d'Or Winner</div>
          </motion.div>
        )}
      </div>
    );
  }

  /* ── Full winner reveal ── */
  return (
    <>
      {showConfetti && <Confetti colors={["#d4af37","#ffe566","#fff8dc","#ffd700","#c8a951"]} />}
      <motion.div
        key="winner-reveal"
        className="flex-1 relative overflow-hidden flex flex-col items-center justify-center px-4 text-center"
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
      >
        {/* Layered glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 60% at 50% 10%, rgba(212,175,55,0.18) 0%, transparent 65%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 5%, rgba(212,175,55,0.28) 0%, transparent 55%)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{ background: "linear-gradient(to top, rgba(212,175,55,0.06), transparent)" }} />
        </div>

        {/* Trophy */}
        <motion.div className="relative shrink-0" initial={{ scale: 0.4, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 100, damping: 16 }}>
          <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }} className="relative">
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.65) 0%, transparent 65%)", filter: "blur(30px)", transform: "scale(1.8)", zIndex: 0 }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.35) 0%, transparent 70%)", filter: "blur(55px)", transform: "scale(2.5)", zIndex: 0 }} />
            <img src={getAwardTrophy("ballondor", awardTrophies)} alt="GEF Ballon d'Or Trophy" className="relative w-36 sm:w-48 md:w-56 h-auto" style={{ filter: "drop-shadow(0 0 35px rgba(212,175,55,0.95)) drop-shadow(0 0 70px rgba(212,175,55,0.55))", zIndex: 1 }} />
          </motion.div>
        </motion.div>

        <motion.div className="mt-2 mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.6em] text-yellow-400/50 font-semibold">GEF</div>
          <div className="text-xs sm:text-sm uppercase tracking-[0.5em] text-yellow-400/80 font-bold">Ballon d'Or Winner</div>
        </motion.div>

        {/* Player photo */}
        <motion.div className="relative mb-4 sm:mb-5" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35, type: "spring", stiffness: 120, damping: 14 }}>
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.7) 0%, transparent 70%)", filter: "blur(18px)", transform: "scale(1.9)", zIndex: 0 }} />
          {winner?.image ? (
            <img src={winner.image} alt={winner?.name} className="relative w-40 h-40 sm:w-52 sm:h-52 rounded-full object-cover border-4 border-yellow-400/90"
              style={{ boxShadow: "0 0 0 4px rgba(212,175,55,0.25), 0 0 70px rgba(212,175,55,0.8), 0 0 130px rgba(212,175,55,0.4)", zIndex: 1 }} />
          ) : (
            <div className="relative w-40 h-40 sm:w-52 sm:h-52 rounded-full border-4 border-yellow-400/80 flex items-center justify-center font-black text-yellow-400"
              style={{ background: "rgba(120,80,0,0.35)", fontSize: "clamp(3rem,6vw,5rem)", boxShadow: "0 0 70px rgba(212,175,55,0.7)", zIndex: 1 }}>
              {winner?.name?.[0] || "?"}
            </div>
          )}
        </motion.div>

        <motion.h1 className="font-black text-white leading-none mb-2"
          style={{ fontSize: "clamp(2.4rem, 7vw, 5.5rem)", letterSpacing: "-0.02em", textShadow: "0 0 50px rgba(212,175,55,0.7), 0 0 100px rgba(212,175,55,0.35)" }}
          initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 110, damping: 13 }}>
          {winner?.name || "—"}
        </motion.h1>

        <motion.p className="uppercase tracking-[0.4em] text-yellow-400 text-sm sm:text-base font-semibold mb-4"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          {winner?.team}
        </motion.p>

        <motion.div className="w-40 sm:w-56 h-px mb-5"
          style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.8), transparent)" }}
          initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ delay: 0.75, duration: 0.7 }} />

        {winner?.stats && (
          <motion.div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 max-w-lg w-full mb-4"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            {[
              { label: "OVR",      val: winner.stats.rating },
              { label: "Goals",    val: winner.stats.goals },
              { label: "Win %",    val: winner.stats.winRate != null ? `${winner.stats.winRate}%` : "—" },
              { label: "MVPs",     val: winner.stats.mvps },
              { label: "Trophies", val: winner.stats.trophies },
            ].map(({ label, val }, i) => (
              <motion.div key={label} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.85 + i * 0.07, type: "spring", stiffness: 180, damping: 14 }}
                className="bg-yellow-400/12 border border-yellow-400/35 rounded-2xl px-2 py-3 pulse-gold">
                <div className="text-lg sm:text-xl font-black text-yellow-400">{val ?? "—"}</div>
                <div className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-wider mt-0.5">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {winner?.points && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25 }}
            className="text-xl sm:text-2xl font-bold text-yellow-400/70">
            {winner.points} <span className="text-sm font-medium text-yellow-400/40 uppercase tracking-widest">points</span>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}

/* ─── End Screen ─────────────────────────────────────────── */
function EndScreen({ state }: { state: any }) {
  const awards: any[] = state.data?.awards || [];
  const winner = state.data?.winner;
  return (
    <motion.div key="end" className="flex-1 flex flex-col items-center px-4 py-8 max-w-2xl mx-auto w-full" {...springReveal}>
      <Trophy className="w-16 h-16 text-yellow-400 mb-4 drop-shadow-[0_0_20px_rgba(212,175,55,0.7)]" />
      <h2 className="text-3xl font-black uppercase tracking-widest text-yellow-400 mb-2">Ceremony Complete</h2>
      {winner && (
        <div className="mt-4 mb-6 text-center">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Ballon d'Or Winner</p>
          {winner.image && <img src={winner.image} alt={winner.name} className="w-16 h-16 rounded-full border-2 border-yellow-400/50 mx-auto mb-2 object-cover" />}
          <p className="text-2xl font-black text-white">{winner.name}</p>
          <p className="text-yellow-400/70 text-sm uppercase">{winner.team}</p>
        </div>
      )}
      <div className="w-full space-y-2">
        <p className="text-white/30 text-xs uppercase tracking-widest text-center mb-2">Special Awards</p>
        {awards.filter(a => a.winner?.name || (a.finalists?.length && a.finalistRevealIndex >= 2)).map((a) => {
          const displayWinner = a.winner?.name ? a.winner : a.finalists?.find((f: any) => f.rank === a.finalists.length);
          return (
            <div key={a.id || a.name} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-3">
              <div>
                <div className="font-bold text-white text-sm">{a.name}</div>
                <div className="text-white/40 text-xs">{a.description}</div>
              </div>
              <div className="text-right">
                <div className="text-yellow-400 text-sm font-semibold">{displayWinner?.name || "—"}</div>
                <div className="text-white/40 text-xs">{displayWinner?.team}</div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── Narration Helper ─────────────────────────────────── */
/* Strip leading emoji + extra whitespace from award names so the TTS
   doesn't try to read the emoji code-point. */
function cleanAwardName(name: string): string {
  if (!name) return name;
  return name
    .replace(/[\p{Extended_Pictographic}\u200d\uFE0F]+/gu, "")
    .trim();
}

function buildAwardNarration(award: any, revealIdx: number, awardName: string): string | null {
  if (!award) return null;
  const an = cleanAwardName(awardName);
  if (award.type === "team_auto") {
    const finalists: any[] = award.finalists || [];
    if (finalists.length > 0) {
      // Staged finalist reveals — same pattern as other awards
      const maxRank = finalists.length;
      const get = (rank: number) => finalists.find((f: any) => f.rank === rank) || finalists[rank - 1];
      if (revealIdx < 0) return `Coming up next... the ${an}! Which team will claim this title?`;
      if (revealIdx === 0 && maxRank >= 3) {
        const t = get(1);
        return `In third place for the ${an}... ${t?.name}! A fantastic season from this squad!`;
      }
      if (revealIdx === 1 && maxRank >= 2) {
        const t = get(2);
        return `And in second place... ${t?.name}! So close to glory!`;
      }
      if (revealIdx >= maxRank - 1) {
        const t = get(maxRank);
        return `And the ${an} goes to... ${t?.name}! The best team in the league this season! Congratulations!`;
      }
    }
    // Fallback — no finalists, just winner
    if (revealIdx >= 0 && award.winner) {
      return `Yes! And the ${an} goes to... ${award.winner.name}! The best team in the league!`;
    }
    return `And now... the ${an} award! Here we go!`;
  }
  if (award.finalists?.length) {
    const finalists: any[] = award.finalists;
    const max = finalists.length;
    const get = (rank: number) => finalists.find(f => f.rank === rank) || finalists[rank - 1];
    if (revealIdx < 0) return `Coming up next... the ${an} award! This is huge!`;
    if (revealIdx === 0 && max >= 3) return `In third place... give it up for... ${get(1)?.name}! Take a bow!`;
    if (revealIdx === 1 && max >= 2) return `And in second place... ${get(2)?.name}! What a performance!`;
    if (revealIdx >= max - 1) {
      const w = get(max);
      return `And the winner of the ${an}... is... ${w?.name}! Absolutely brilliant!`;
    }
  }
  if (award.type === "manual") {
    if (revealIdx >= 2 && award.winner) {
      return `And the winner of the ${an}... is... ${award.winner.name}! Take a bow, my friend!`;
    }
    return `Coming up... the ${an} award! Here we go!`;
  }
  return null;
}

/* ─── Main Component ─────────────────────────────────────── */
export function CeremonyLive() {
  const { state, messages, connected, viewerCount, sendMessage } = useCeremonySocket();
  const audio = useCeremonyAudio();
  const [, navigate] = useLocation();
  const [chatMsg, setChatMsg] = useState("");
  const [chatOpen, setChatOpen] = useState(false); // mobile drawer
  const userName = sessionStorage.getItem("ceremony_user") || "";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sweepTrigger, setSweepTrigger] = useState(0);

  /* Cinematic intro: show once on first arrival to a live ceremony,
     and again whenever the admin bumps data.introReplay. */
  const [showIntro, setShowIntro] = useState(false);
  const lastReplayRef = useRef<number>(-1);
  const introShownOnceRef = useRef(false);
  useEffect(() => {
    if (!state) return;
    const replayCounter = (state.data as any)?.introReplay as number | undefined;
    const replayChanged =
      typeof replayCounter === "number" && replayCounter !== lastReplayRef.current;
    if (replayChanged) {
      lastReplayRef.current = replayCounter!;
      if (lastReplayRef.current >= 0) setShowIntro(true);
      return;
    }
    if (
      !introShownOnceRef.current &&
      state.status === "live" &&
      (state.phase === "intro" || state.phase === "waiting")
    ) {
      introShownOnceRef.current = true;
      setShowIntro(true);
    }
  }, [state?.status, state?.phase, (state?.data as any)?.introReplay]);
  const prevRevealRef = useRef<string | null>(null);
  const prevPhaseRef  = useRef<string | null>(null);
  const prevStepRef   = useRef<string | null>(null);
  const prevAwardsRef = useRef<string | null>(null);

  /* Detect changes to drive sweep + audio */
  useEffect(() => {
    if (!state) return;
    const awardsJson = JSON.stringify((state.data as any)?.awards?.map((a: any) => a.finalistRevealIndex));
    const revealChanged = state.revealIndex !== prevRevealRef.current;
    const phaseChanged  = state.phase       !== prevPhaseRef.current;
    const stepChanged   = state.currentStep !== prevStepRef.current;
    const awardsChanged = awardsJson        !== prevAwardsRef.current;

    if (revealChanged || phaseChanged || stepChanged || awardsChanged) {
      prevRevealRef.current = state.revealIndex ?? null;
      prevPhaseRef.current  = state.phase       ?? null;
      prevStepRef.current   = state.currentStep ?? null;
      prevAwardsRef.current = awardsJson;
      setSweepTrigger(n => n + 1);
    }
  }, [state?.revealIndex, state?.phase, state?.currentStep, state?.data]);

  /* Background music: the looping UCL anthem (mounted via
     <BackgroundMusicYouTube> above) is now the bed for the entire
     ceremony, so the synthesised ambient progression is always silenced
     here to avoid two beds competing. The admin "musicMode" override is
     still honoured if the operator explicitly picks a synth track. */
  const setMusicMode = audio.setMusicMode;
  const audioEnabled = audio.enabled;
  const adminMusic = (state?.data as any)?.musicMode as
    | "auto" | "off" | "awards" | "rankings" | "winner" | undefined;
  useEffect(() => {
    if (!state || !audioEnabled) {
      setMusicMode("off");
      return;
    }
    // Honour explicit admin override (anything other than "auto" / "off").
    if (adminMusic && adminMusic !== "auto" && adminMusic !== "off") {
      setMusicMode(adminMusic);
      return;
    }
    // Default = silent synth so the UCL anthem plays cleanly.
    setMusicMode("off");
  }, [state?.phase, state?.status, audioEnabled, setMusicMode, adminMusic]);

  /* Listen for admin-broadcast one-shot FX bursts (sweep / confetti /
     fireworks). The admin increments fxBurst.counter to trigger an
     effect across every connected viewer simultaneously. */
  const fxBurst = (state?.data as any)?.fxBurst as
    { type: "confetti" | "sweep" | "fireworks"; counter: number } | undefined;
  const lastBurstRef = useRef<number>(-1);
  const [adminConfetti, setAdminConfetti] = useState(0);
  const [adminFireworks, setAdminFireworks] = useState(0);
  useEffect(() => {
    if (!fxBurst) return;
    if (fxBurst.counter === lastBurstRef.current) return;
    lastBurstRef.current = fxBurst.counter;
    if (fxBurst.type === "sweep") setSweepTrigger(n => n + 1);
    else if (fxBurst.type === "confetti") setAdminConfetti(n => n + 1);
    else if (fxBurst.type === "fireworks") setAdminFireworks(n => n + 1);
  }, [fxBurst?.counter, fxBurst?.type]);

  /* Drive narration on key state transitions */
  const lastNarrationRef = useRef<string>("");
  const aiCommentaryCache = useRef<Map<string, string>>(new Map());
  const prefetchInProgressRef = useRef(false);
  const speak = audio.speak;

  /* Pre-fetch AI commentary for all players as soon as rankings data is available,
     so there is zero delay when each name is revealed. */
  useEffect(() => {
    if (!state?.data?.rankings?.length) return;
    if (prefetchInProgressRef.current) return;
    const rankings: any[] = state.data.rankings;
    // Skip if all already cached
    const allCached = rankings.every(p => {
      const key = `ai:rank:${p.rank}:${p.name}`;
      return aiCommentaryCache.current.has(key);
    });
    if (allCached) return;
    prefetchInProgressRef.current = true;
    // Sequential pre-fetch with a small gap to avoid hammering the API
    (async () => {
      for (const player of rankings) {
        const key = `ai:rank:${player.rank}:${player.name}`;
        if (aiCommentaryCache.current.has(key)) continue;
        try {
          const res = await fetch("/api/ai/player-commentary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player, allPlayers: rankings }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.commentary) aiCommentaryCache.current.set(key, data.commentary);
          }
        } catch { /* silent */ }
        await new Promise(r => setTimeout(r, 350));
      }
      prefetchInProgressRef.current = false;
    })();
  }, [state?.data?.rankings]);

  useEffect(() => {
    if (!state || !audioEnabled) return;
    if (state.status !== "live") return;

    const phase = state.phase;
    let utterance: string | null = null;
    let key = "";

    if (phase === "intro") {
      const title = cleanAwardName(state.data?.intro?.title || "Ballon d'Or Ceremony");
      utterance = `Ladies and gentlemen... welcome to the ${title}! Tonight, we celebrate the very best of the very best in competitive football!`;
      key = `intro:${title}`;
    } else if (phase === "awards") {
      const awards: any[] = (state.data as any)?.awards || [];
      const idx = parseInt(state.currentStep || "0");
      const award = awards[idx];
      if (award) {
        const revealIdx = award.finalistRevealIndex ?? -1;
        utterance = buildAwardNarration(award, revealIdx, award.name);
        key = `award:${award.id || award.name}:${revealIdx}`;
      }
    } else if (phase === "rankings") {
      const rankings: any[] = state.data?.rankings || [];
      const revealIdx = parseInt(state.revealIndex ?? "0");
      const current = rankings[revealIdx];
      if (current) {
        const rank = current.rank;
        let intro: string;
        if (rank === 1) intro = `And at number one... your Ballon d'Or champion... ${current.name}... of ${current.team}!`;
        else if (rank === 2) intro = `In second place... ${current.name} from ${current.team}!`;
        else if (rank === 3) intro = `On the podium, in third... ${current.name} of ${current.team}!`;
        else if (rank <= 5) intro = `Top five! Number ${rank}... ${current.name}, ${current.team}!`;
        else if (rank <= 10) intro = `Into the top ten... number ${rank}... ${current.name}, ${current.team}!`;
        else intro = `At number ${rank}... ${current.name} of ${current.team}!`;

        utterance = intro;
        key = `rank:${rank}:${current.name}`;

        // After announcing the name, fetch AI broadcaster commentary and queue it
        const aiKey = `ai:${key}`;
        const cached = aiCommentaryCache.current.get(aiKey);
        if (cached) {
          // Already fetched — queue after a brief pause so the name lands first
          setTimeout(() => speak(cached, { id: aiKey }), 200);
        } else {
          // Fetch live from the AI; speak() queues behind current utterance
          fetch("/api/ai/player-commentary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player: current, allPlayers: rankings }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.commentary) {
                aiCommentaryCache.current.set(aiKey, data.commentary);
                speak(data.commentary, { id: aiKey });
              }
            })
            .catch(() => {/* silent fallback */});
        }
      }
    } else if (phase === "top2") {
      utterance = "And here we are! Down to the final two contenders... The wait is almost over. Who will lift the Ballon d'Or tonight?";
      key = "top2";
    } else if (phase === "winner") {
      const w = state.data?.winner;
      if (w?.name) {
        utterance = `Ladies and gentlemen... your Ballon d'Or champion... ${w.name}... of ${w.team}! Yes! What a performer, what a season! Take a bow!`;
        key = `winner:${w.name}`;
      }
    }

    if (utterance && key && key !== lastNarrationRef.current) {
      lastNarrationRef.current = key;
      speak(utterance, { id: key, force: true });
    }
  }, [
    state?.phase, state?.status, state?.currentStep, state?.revealIndex,
    state?.data, audioEnabled, speak,
  ]);

  useEffect(() => { if (!userName) navigate("/ceremony"); }, [userName, navigate]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    await sendMessage(userName, chatMsg.trim());
    setChatMsg("");
  };

  const renderMain = () => {
    if (!state || state.status === "waiting") return <WaitingScreen />;
    if (state.status === "ended") return <EndScreen state={state} />;
    const awardTrophies: Record<string, string> = (state.data as any)?.awardTrophies || {};
    const phase = state.phase;
    if (phase === "intro") return <IntroScreen data={state.data} />;
    if (phase === "awards") {
      const awards: any[] = (state.data as any)?.awards || [];
      const idx = parseInt(state.currentStep || "0");
      const award = awards[idx];
      return award ? <AwardCard award={award} animKey={sweepTrigger} awardTrophies={awardTrophies} /> : <IntroScreen data={state.data} />;
    }
    if (phase === "rankings") return <RankingsScreen state={state} sweepTrigger={sweepTrigger} />;
    if (phase === "top2") return <Top2Screen state={state} />;
    if (phase === "winner") return <WinnerScreen state={state} awardTrophies={awardTrophies} />;
    return <WaitingScreen />;
  };

  const phaseKey =
    !state ? "waiting" :
    state.status === "ended" ? "end" :
    state.status === "waiting" ? "waiting" :
    state.phase === "awards" ? `awards-${state.currentStep || 0}` :
    state.phase === "rankings" ? `rankings-${state.revealIndex || 0}` :
    state.phase || "waiting";

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden relative">
      <InjectStyles />
      {/* Looping Champions League anthem — ducks during voiceover/intro. */}
      <BackgroundMusicYouTube videoId={UCL_ANTHEM_VIDEO_ID} volume={28} />
      <CeremonyStageBackdrop
        style={(state?.data as any)?.stageStyle ?? "dramatic"}
        introActive={showIntro}
        /* Dim the stage whenever a reveal card / ranking / winner is on
           screen so the centre announcement reads cleanly. The intro
           always stays bright (handled inside the component). */
        focusMode={
          !!state &&
          state.status === "live" &&
          (state.phase === "awards" ||
            state.phase === "rankings" ||
            state.phase === "top2" ||
            state.phase === "winner")
        }
      />
      <CeremonyIntro
        show={showIntro}
        onComplete={() => setShowIntro(false)}
        onIntroStart={() => audio.playIntroYouTube?.("o5NzlRqs4zA")}
      />
      <GoldenSweep trigger={sweepTrigger} />
      {adminConfetti > 0 && <Confetti key={`admin-conf-${adminConfetti}`} />}
      {adminFireworks > 0 && (
        <Confetti key={`admin-fw-${adminFireworks}`} colors={["#ff3030", "#ffd700", "#22c55e", "#60a5fa", "#fff"]} />
      )}

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-3 sm:px-4 py-3 border-b border-yellow-400/15 bg-black/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
          <span className="font-black uppercase tracking-wider text-yellow-400 text-sm whitespace-nowrap">GEF Ballon d'Or</span>
          {state?.phase && state.phase !== "waiting" && (
            <span className="text-[10px] uppercase tracking-widest text-white/30 ml-1 sm:ml-2 border border-white/10 rounded px-1.5 py-0.5 hidden xs:inline">
              {state.phase}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {connected && viewerCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 rounded-full px-2 sm:px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-bold tabular-nums">{viewerCount}</span>
              <span className="text-red-400/60 text-[10px] uppercase tracking-wider hidden sm:inline">watching</span>
            </div>
          )}
          <button
            onClick={audio.toggleEnabled}
            title={audio.enabled ? "Mute ceremony audio" : "Enable ceremony audio"}
            className={`p-1.5 rounded-md border transition-colors ${audio.enabled ? "border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10" : "border-white/10 text-white/40 hover:bg-white/5"}`}
          >
            {audio.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {connected ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />}
          <span className="text-white/40 text-xs hidden sm:inline">{userName}</span>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Main stage */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={phaseKey}
              className="flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {renderMain()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Chat sidebar — desktop persistent */}
        <div className="hidden md:flex w-64 border-l border-yellow-400/30 flex-col bg-black shrink-0 relative z-20">
          <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2 shrink-0">
            <Users className="w-4 h-4 text-yellow-400/50" />
            <span className="text-white/50 text-xs uppercase tracking-wider font-bold">Live Chat</span>
          </div>
          <ScrollArea className="flex-1 px-3 py-2">
            <div className="space-y-2">
              {messages.length === 0 && <p className="text-white/20 text-xs text-center pt-4">No messages yet…</p>}
              {messages.map(msg => (
                <div key={msg.id} className="text-sm break-words">
                  <span className="text-yellow-400/80 font-semibold">{msg.userName}: </span>
                  <span className="text-white/60">{msg.message}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <form onSubmit={handleSend} className="p-3 border-t border-white/8 flex gap-2 shrink-0">
            <Input value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Message…"
              className="flex-1 h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-yellow-400/30" maxLength={200} />
            <Button type="submit" size="sm" className="h-8 w-8 p-0 bg-yellow-500 hover:bg-yellow-400 text-black shrink-0">
              <Send className="w-3 h-3" />
            </Button>
          </form>
        </div>
      </div>

      {/* Mobile chat toggle button */}
      <button
        onClick={() => setChatOpen(true)}
        className="md:hidden fixed bottom-4 right-4 z-30 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full p-3 shadow-[0_0_20px_rgba(212,175,55,0.6)] flex items-center gap-2"
        aria-label="Open chat"
      >
        <MessageCircle className="w-5 h-5" />
        {messages.length > 0 && (
          <span className="text-xs font-black bg-black/80 text-yellow-400 rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
            {messages.length > 99 ? "99+" : messages.length}
          </span>
        )}
      </button>

      {/* Mobile chat drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
          >
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-black border-l border-yellow-400/30 flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-yellow-400/20 flex items-center justify-between bg-black/80 shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm uppercase tracking-wider font-bold">Live Chat</span>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-white/60 hover:text-white p-1" aria-label="Close chat">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-2">
                  {messages.length === 0 && <p className="text-white/20 text-xs text-center pt-4">No messages yet…</p>}
                  {messages.map(msg => (
                    <div key={msg.id} className="text-sm break-words">
                      <span className="text-yellow-400/80 font-semibold">{msg.userName}: </span>
                      <span className="text-white/60">{msg.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <form onSubmit={handleSend} className="p-3 border-t border-yellow-400/20 flex gap-2 shrink-0 bg-black/80">
                <Input value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Message…"
                  className="flex-1 h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-yellow-400/30" maxLength={200} />
                <Button type="submit" size="sm" className="h-9 w-9 p-0 bg-yellow-500 hover:bg-yellow-400 text-black shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
