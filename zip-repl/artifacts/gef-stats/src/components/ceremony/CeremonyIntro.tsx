import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TAGLINE = "AWARD CEREMONY · 2026";

type Stage =
  | "embers"
  | "converge"
  | "burst"
  | "rise"
  | "ignite"
  | "reveal"
  | "hold"
  | "done";

interface Props {
  show: boolean;
  onComplete: () => void;
  /** Called when the intro mounts/replays so the parent can sync the
   *  dramatic ~8 s soundtrack. */
  onIntroStart?: () => void;
}

/**
 * Cinematic GEF Ballon d'Or intro — broadcast-grade beat structure.
 *
 *   0.0  embers    pitch black, faint gold ember pulses + low stars
 *   0.8  converge  light streaks shoot in radially from screen edges
 *   1.8  burst     huge bloom flash, stage backdrop fades up from black
 *   2.4  rise      trophy rises from below on a column of light
 *   4.2  ignite    impact flash + lens-flare sweep + god-rays + dust
 *   4.8  reveal    trophy holds; tagline opens with letter-spacing
 *   6.5  hold      gentle fade-out begins
 *   7.5  onComplete fires
 *
 * The trophy is the supplied PNG (no SVG approximation). The intro
 * paints its own copy of the stage photo so underlying ceremony
 * screens can't bleed through. The wall in the stage photo already
 * reads "GEF · BALLON D'OR · HONORING THE BEAUTIFUL GAME" so we never
 * duplicate that text in the overlay.
 */
export function CeremonyIntro({ show, onComplete, onIntroStart }: Props) {
  const [stage, setStage] = useState<Stage>("embers");
  const startedKeyRef = useRef(0);

  useEffect(() => {
    if (!show) return;
    startedKeyRef.current += 1;
    setStage("embers");
    onIntroStart?.();
    const t1 = setTimeout(() => setStage("converge"), 800);
    const t2 = setTimeout(() => setStage("burst"),    1800);
    const t3 = setTimeout(() => setStage("rise"),     2400);
    const t4 = setTimeout(() => setStage("ignite"),   4200);
    const t5 = setTimeout(() => setStage("reveal"),   4800);
    const t6 = setTimeout(() => setStage("hold"),     6500);
    const t7 = setTimeout(() => { setStage("done"); onComplete(); }, 7500);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); clearTimeout(t7);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const base = (import.meta as any).env?.BASE_URL || "/";
  const trophySrc = `${base}trophy.png`;
  const stageSrc  = `${base}stage-bg.png`;

  // Brightness/blur of the stage backdrop layer per stage.
  const backdropAnim =
    stage === "embers"   ? { opacity: 0,    scale: 1.22, filter: "brightness(0.0) blur(6px)" } :
    stage === "converge" ? { opacity: 0.15, scale: 1.20, filter: "brightness(0.15) blur(5px)" } :
    stage === "burst"    ? { opacity: 1,    scale: 1.12, filter: "brightness(0.85) blur(2px)" } :
    stage === "rise"     ? { opacity: 1,    scale: 1.06, filter: "brightness(0.9) blur(0.5px)" } :
    stage === "ignite"   ? { opacity: 1,    scale: 1.03, filter: "brightness(1.05) blur(0px)" } :
    stage === "reveal"   ? { opacity: 1,    scale: 1.0,  filter: "brightness(1.0) blur(0px)" } :
                            { opacity: 1,   scale: 0.99, filter: "brightness(0.95) blur(0px)" };

  return (
    <AnimatePresence>
      {show && stage !== "done" && (
        <motion.div
          key={`intro-${startedKeyRef.current}`}
          className="fixed inset-0 z-[100] overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* ── Black base so nothing leaks through during the embers stage. */}
          <div className="absolute inset-0" style={{ background: "#000" }} />

          {/* ── Faint ambient star/ember field (always present, very subtle). */}
          <EmberField />

          {/* ── Stage photo backdrop with cinematic push-in. */}
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${stageSrc}")`,
              backgroundSize: "cover",
              backgroundPosition: "center 55%",
              backgroundRepeat: "no-repeat",
              transformOrigin: "50% 60%",
              willChange: "transform, filter, opacity",
            }}
            initial={{ opacity: 0, scale: 1.22, filter: "brightness(0.0) blur(6px)" }}
            animate={backdropAnim}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* ── Converge stage: radial light streaks shooting inward. */}
          <AnimatePresence>
            {stage === "converge" && <ConvergeStreaks />}
          </AnimatePresence>

          {/* ── Burst stage: big bloom flash that reveals the backdrop. */}
          <AnimatePresence>
            {stage === "burst" && (
              <motion.div
                key="burst"
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 55%, rgba(255,250,225,1) 0%, rgba(255,220,140,0.85) 18%, rgba(255,200,100,0.35) 40%, rgba(0,0,0,0) 70%)",
                  mixBlendMode: "screen",
                }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: [0, 1, 0.55, 0], scale: [0.2, 1.4, 1.8, 2.2] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* ── Warm ambient glow at the top of the stage. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,200,100,0.18) 0%, transparent 60%)",
              mixBlendMode: "screen",
            }}
          />

          {/* ── Vertical column of light landing on the podium spot. */}
          <motion.div
            className="absolute"
            style={{
              left: "50%",
              top: 0,
              transform: "translateX(-50%)",
              width: "30vw",
              height: "85vh",
              background:
                "linear-gradient(to bottom, rgba(255,236,180,0) 0%, rgba(255,220,140,0.35) 35%, rgba(255,236,180,0.55) 70%, rgba(255,220,140,0.25) 100%)",
              filter: "blur(14px)",
              mixBlendMode: "screen",
            }}
            initial={{ opacity: 0, scaleY: 0.6 }}
            animate={
              stage === "embers"   ? { opacity: 0,    scaleY: 0.6 } :
              stage === "converge" ? { opacity: 0.4,  scaleY: 0.85 } :
              stage === "burst"    ? { opacity: 1.2,  scaleY: 1.0 } :
              stage === "rise"     ? { opacity: 1.4,  scaleY: 1.1 } :
              stage === "ignite"   ? { opacity: 1.6,  scaleY: 1.15 } :
              stage === "reveal"   ? { opacity: 0.55, scaleY: 1.0 } :
                                      { opacity: 0,   scaleY: 0.9 }
            }
            transition={{ duration: 0.9, ease: "easeOut" }}
          />

          {/* ── Ground glow on the podium spot. */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: "8vh",
              width: "60vw",
              height: "32vh",
              background:
                "radial-gradient(ellipse at center, rgba(255,220,140,0.55) 0%, rgba(255,180,80,0.25) 35%, transparent 70%)",
              filter: "blur(20px)",
              mixBlendMode: "screen",
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={
              stage === "embers"   ? { opacity: 0,   scale: 0.6 } :
              stage === "converge" ? { opacity: 0.5, scale: 0.9 } :
              stage === "burst"    ? { opacity: 1.0, scale: 1.1 } :
              stage === "rise"     ? { opacity: 1.4, scale: 1.2 } :
              stage === "ignite"   ? { opacity: 1.8, scale: 1.45 } :
              stage === "reveal"   ? { opacity: 0.7, scale: 1.05 } :
                                      { opacity: 0.4, scale: 1.0 }
            }
            transition={{ duration: 0.7, ease: "easeOut" }}
          />

          {/* ── Particle trail rising along the trophy's path. */}
          <ParticleTrail active={stage === "rise" || stage === "ignite"} />

          {/* ── Continuous gold dust drifting down from the top after ignition. */}
          <FallingDust active={stage === "ignite" || stage === "reveal" || stage === "hold"} />

          {/* ── Big ignition: flash + god-rays + lens flare sweep. */}
          <AnimatePresence>
            {stage === "ignite" && (
              <>
                {/* Bright bloom flash */}
                <motion.div
                  key="flash"
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 55%, rgba(255,250,220,0.98) 0%, rgba(255,220,140,0.6) 22%, rgba(255,236,180,0) 60%)",
                    mixBlendMode: "screen",
                  }}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.4, 1.7, 2.1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
                {/* Conic god-rays radiating from the trophy */}
                <motion.div
                  key="rays"
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    bottom: "12vh",
                    width: "120vw",
                    height: "85vh",
                    background:
                      "conic-gradient(from 0deg at 50% 100%, transparent 0deg, rgba(255,236,180,0.45) 8deg, transparent 16deg, transparent 32deg, rgba(255,236,180,0.35) 40deg, transparent 48deg, transparent 80deg, rgba(255,236,180,0.45) 88deg, transparent 96deg, transparent 264deg, rgba(255,236,180,0.45) 272deg, transparent 280deg, transparent 312deg, rgba(255,236,180,0.35) 320deg, transparent 328deg, transparent 344deg, rgba(255,236,180,0.45) 352deg, transparent 360deg)",
                    filter: "blur(6px)",
                    mixBlendMode: "screen",
                  }}
                  initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
                  animate={{ opacity: [0, 0.95, 0], scale: [0.6, 1.15, 1.25], rotate: 18 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.3, ease: "easeOut" }}
                />
                {/* Horizontal lens-flare sweep across the trophy */}
                <motion.div
                  key="lensflare"
                  className="absolute"
                  style={{
                    left: 0,
                    right: 0,
                    top: "48%",
                    height: "8vh",
                    background:
                      "linear-gradient(to right, transparent 0%, transparent 30%, rgba(255,250,220,0.85) 50%, transparent 70%, transparent 100%)",
                    filter: "blur(8px)",
                    mixBlendMode: "screen",
                    transform: "translateX(-100%)",
                  }}
                  animate={{ x: ["-50vw", "50vw"], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </>
            )}
          </AnimatePresence>

          {/* ── THE TROPHY (real PNG, rises from below). ── */}
          <motion.div
            className="absolute left-1/2"
            style={{
              bottom: "8vh",
              transformOrigin: "50% 100%",
              width: "min(36vw, 320px)",
              translateX: "-50%",
            }}
            initial={{ y: "105vh", opacity: 0, scale: 0.7, filter: "blur(8px)" }}
            animate={
              stage === "embers" || stage === "converge" || stage === "burst"
                ? { y: "105vh", opacity: 0, scale: 0.7, filter: "blur(8px)" }
                : stage === "rise"
                ? { y: "0vh", opacity: 1, scale: 1.0, filter: "blur(0px)" }
                : stage === "ignite"
                ? { y: "-2vh", opacity: 1, scale: 1.07, filter: "blur(0px)" }
                : stage === "reveal"
                ? { y: "0vh", opacity: 1, scale: 1.0, filter: "blur(0px)" }
                : { y: "0vh", opacity: 0, scale: 0.95, filter: "blur(2px)" }
            }
            transition={
              stage === "rise"
                ? { duration: 1.7, ease: [0.16, 1, 0.3, 1] }
                : stage === "ignite"
                ? { duration: 0.25, ease: "easeOut" }
                : stage === "reveal"
                ? { duration: 0.45, ease: [0.34, 1.4, 0.64, 1] }
                : { duration: 0.7, ease: "easeOut" }
            }
          >
            {/* Pulsing radial halo behind trophy */}
            <motion.div
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(circle at 50% 35%, rgba(255,220,140,0.55) 0%, rgba(212,175,55,0.25) 35%, transparent 70%)",
                filter: "blur(40px)",
                transform: "scale(1.5)",
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* The trophy itself */}
            <motion.img
              src={trophySrc}
              alt="GEF Ballon d'Or trophy"
              draggable={false}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                filter:
                  "drop-shadow(0 18px 30px rgba(0,0,0,0.7)) drop-shadow(0 0 38px rgba(212,175,55,0.55)) drop-shadow(0 0 12px rgba(255,236,180,0.45))",
                userSelect: "none",
              }}
              animate={
                stage === "reveal" || stage === "ignite" || stage === "hold"
                  ? { y: [0, -6, 0] }
                  : { y: 0 }
              }
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Reflection/contact shadow underneath */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                bottom: "-18px",
                width: "70%",
                height: "20px",
                background:
                  "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, transparent 70%)",
                filter: "blur(6px)",
              }}
            />
          </motion.div>

          {/* ── Final tagline at the bottom — letter-spacing opens elegantly. */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: "3vh",
              fontFamily: "'Cinzel', serif",
              fontSize: "clamp(10px, 1.05vw, 14px)",
              color: "rgba(255,232,180,0.92)",
              textShadow: "0 0 14px rgba(212,175,55,0.55), 0 2px 6px rgba(0,0,0,0.85)",
              whiteSpace: "nowrap",
              willChange: "letter-spacing, opacity, transform",
            }}
            initial={{ opacity: 0, y: 14, letterSpacing: "0.2em" }}
            animate={
              stage === "hold"
                ? { opacity: 0, y: -10, letterSpacing: "0.65em" }
                : stage === "reveal" || stage === "ignite"
                ? { opacity: 1, y: 0, letterSpacing: "0.55em" }
                : { opacity: 0, y: 14, letterSpacing: "0.2em" }
            }
            transition={{ delay: stage === "hold" ? 0 : 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {TAGLINE}
          </motion.div>

          {/* ── Vignette so the eye stays centred. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 90%, rgba(0,0,0,0.7) 100%)",
            }}
          />

          {/* ── Subtle film-grain overlay for cinematic texture. */}
          <FilmGrain />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Light streaks shooting in from the screen edges toward centre. This is
   the "convergence" beat — feels like energy gathering before the burst.
   ───────────────────────────────────────────────────────────────────── */
function ConvergeStreaks() {
  const streaks = useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {streaks.map((i) => {
        const angle = (i / 14) * 360 + (Math.random() * 12 - 6);
        const dist = 60 + Math.random() * 30; // start distance in vmax
        const delay = Math.random() * 0.35;
        const dur = 0.7 + Math.random() * 0.4;
        const len = 28 + Math.random() * 22;
        const thick = 1.5 + Math.random() * 2;
        return (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "55%",
              width: `${len}vmax`,
              height: `${thick}px`,
              background:
                "linear-gradient(to right, rgba(255,250,220,0) 0%, rgba(255,236,180,0.95) 60%, rgba(255,250,220,1) 100%)",
              filter: "blur(0.6px)",
              boxShadow: "0 0 12px rgba(255,220,140,0.85)",
              mixBlendMode: "screen",
              transformOrigin: "100% 50%",
              transform: `rotate(${angle}deg) translateX(-${dist}vmax)`,
            }}
            initial={{ opacity: 0, scaleX: 0.2 }}
            animate={{
              opacity: [0, 1, 0.9, 0],
              x: [0, `${dist}vmax`],
              scaleX: [0.2, 1, 0.4],
            }}
            transition={{ duration: dur, delay, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Particle trail — small gold sparks rising from below to the trophy
   spot, suggesting the energy lifting the trophy into place.
   ───────────────────────────────────────────────────────────────────── */
function ParticleTrail({ active }: { active: boolean }) {
  const particles = useMemo(() => Array.from({ length: 28 }, (_, i) => i), []);
  if (!active) return null;
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ bottom: 0, width: "40vw", height: "90vh" }}
    >
      {particles.map((i) => {
        const left = 5 + Math.random() * 90;
        const delay = Math.random() * 1.2;
        const dur = 1.2 + Math.random() * 1.4;
        const size = 3 + Math.random() * 5;
        const drift = (Math.random() - 0.5) * 24;
        return (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              bottom: "0%",
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,245,200,1) 0%, rgba(255,200,100,0.7) 40%, transparent 70%)",
              filter: "blur(1px)",
              boxShadow: "0 0 8px rgba(255,220,140,0.85)",
              mixBlendMode: "screen",
            }}
            initial={{ y: 0, opacity: 0, x: 0 }}
            animate={{ y: -700, opacity: [0, 1, 0.8, 0], x: drift }}
            transition={{ duration: dur, delay, ease: "easeOut", repeat: Infinity, repeatDelay: 0.2 }}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Falling gold dust — appears after the ignition flash and gently drifts
   down across the entire frame for a "celebratory" finish.
   ───────────────────────────────────────────────────────────────────── */
function FallingDust({ active }: { active: boolean }) {
  const dust = useMemo(() => Array.from({ length: 35 }, (_, i) => i), []);
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dust.map((i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 2.5;
        const dur = 3.5 + Math.random() * 2.5;
        const size = 2 + Math.random() * 3.5;
        const drift = (Math.random() - 0.5) * 80;
        return (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              top: "-4%",
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,236,180,0.95) 0%, rgba(212,175,55,0.5) 50%, transparent 75%)",
              filter: "blur(0.5px)",
              boxShadow: "0 0 6px rgba(255,220,140,0.65)",
              mixBlendMode: "screen",
            }}
            initial={{ y: 0, opacity: 0, x: 0 }}
            animate={{
              y: ["0vh", "115vh"],
              opacity: [0, 1, 0.85, 0],
              x: [0, drift, drift * 0.3],
            }}
            transition={{ duration: dur, delay, ease: "easeIn", repeat: Infinity, repeatDelay: 0.4 }}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Faint ambient ember/star field — subtle pulsing dots so the early
   "embers" beat doesn't feel completely empty.
   ───────────────────────────────────────────────────────────────────── */
function EmberField() {
  const stars = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.map((i) => {
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const size = 1.5 + Math.random() * 2.5;
        const delay = Math.random() * 3;
        const dur = 2.5 + Math.random() * 3;
        return (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: "50%",
              background: "rgba(255,236,180,0.85)",
              boxShadow: "0 0 5px rgba(255,220,140,0.7)",
              filter: "blur(0.3px)",
              mixBlendMode: "screen",
            }}
            animate={{ opacity: [0.15, 0.85, 0.15] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Subtle film grain overlay — cinematic texture, kept very low opacity.
   ───────────────────────────────────────────────────────────────────── */
function FilmGrain() {
  // SVG turbulence noise rendered as a data URL — cheap, no external asset.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.45 0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#n)'/>
  </svg>`;
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `url("${url}")`,
        backgroundSize: "160px 160px",
        opacity: 0.07,
        mixBlendMode: "overlay",
      }}
    />
  );
}
