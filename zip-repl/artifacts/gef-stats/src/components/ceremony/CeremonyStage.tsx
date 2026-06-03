import { useEffect, useRef } from "react";

const STAGE_STYLE = `
@keyframes ceremonySpotlightSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes ceremonyCounterSpin   { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
@keyframes ceremonyBeamL { 0%,100% { transform: rotate(-18deg); opacity: 0.55; } 50% { transform: rotate(22deg); opacity: 0.85; } }
@keyframes ceremonyBeamR { 0%,100% { transform: rotate(18deg);  opacity: 0.55; } 50% { transform: rotate(-22deg); opacity: 0.85; } }
@keyframes ceremonyBeamC { 0%,100% { transform: rotate(-8deg);  opacity: 0.40; } 50% { transform: rotate(8deg);  opacity: 0.75; } }
@keyframes ceremonyOverheadSweep { 0%,100% { transform: translateX(-50%) rotate(-26deg); opacity: 0.55; } 50% { transform: translateX(-50%) rotate(26deg); opacity: 0.95; } }
@keyframes ceremonyOverheadSweep2 { 0%,100% { transform: translateX(-50%) rotate(20deg); opacity: 0.45; } 50% { transform: translateX(-50%) rotate(-20deg); opacity: 0.85; } }
@keyframes ceremonyFloatUp {
  0%   { transform: translateY(0) translateX(0) scale(0.6); opacity: 0; }
  10%  { opacity: 0.9; }
  90%  { opacity: 0.7; }
  100% { transform: translateY(-110vh) translateX(var(--drift, 20px)) scale(1.1); opacity: 0; }
}
@keyframes ceremonyCurtainSheen { 0%,100% { background-position: 0% 0%; } 50% { background-position: 100% 0%; } }
@keyframes ceremonyFlare { 0%,100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.15); } }
@keyframes ceremonyTrussLight { 0%,100% { opacity: 0.4; box-shadow: 0 0 6px currentColor; } 50% { opacity: 1; box-shadow: 0 0 14px currentColor, 0 0 28px currentColor; } }
@keyframes ceremonyRunwayShine { 0% { transform: translateX(-100%); opacity: 0; } 40% { opacity: 0.5; } 100% { transform: translateX(100%); opacity: 0; } }
@keyframes ceremonyVignette { 0%,100% { opacity: 0.55; } 50% { opacity: 0.85; } }
@keyframes ceremonyBannerGlow { 0%,100% { box-shadow: 0 0 18px rgba(212,175,55,0.35), inset 0 0 22px rgba(212,175,55,0.18); } 50% { box-shadow: 0 0 38px rgba(212,175,55,0.65), inset 0 0 36px rgba(212,175,55,0.3); } }
@keyframes ceremonyPillarPulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes ceremonyPodiumGlint { 0% { transform: translateX(-100%); opacity: 0; } 40% { opacity: 0.8; } 100% { transform: translateX(100%); opacity: 0; } }
@keyframes ceremonyBackdropPulse { 0%,100% { opacity: 0.18; transform: scale(1); } 50% { opacity: 0.32; transform: scale(1.04); } }
@keyframes ceremonyAudienceTwinkle { 0%,100% { opacity: 0.18; } 50% { opacity: 0.55; } }
@keyframes ceremonyStagePushIn {
  0%   { transform: scale(1.14); filter: brightness(0.55) blur(2px); }
  35%  { transform: scale(1.10); filter: brightness(0.70) blur(1px); }
  75%  { transform: scale(1.04); filter: brightness(0.92) blur(0px); }
  100% { transform: scale(1.00); filter: brightness(1.00) blur(0px); }
}
@keyframes ceremonyStageDrift {
  0%,100% { transform: scale(1.015) translate(0px, 0px); }
  50%     { transform: scale(1.015) translate(-6px, -3px); }
}
/* Sharp criss-crossing laser beams from the truss */
@keyframes ceremonyLaserSweepL {
  0%,100% { transform: rotate(-38deg); opacity: 0.0; }
  10%     { opacity: 0.85; }
  50%     { transform: rotate(38deg); opacity: 0.95; }
  90%     { opacity: 0.85; }
}
@keyframes ceremonyLaserSweepR {
  0%,100% { transform: rotate(38deg);  opacity: 0.0; }
  10%     { opacity: 0.85; }
  50%     { transform: rotate(-38deg); opacity: 0.95; }
  90%     { opacity: 0.85; }
}
/* Quick strobe flash bursts (rare, intense) */
@keyframes ceremonyStrobe {
  0%, 4%, 100%   { opacity: 0; }
  1%, 2%, 3%     { opacity: 0.85; }
}
/* Slow color wash that cycles red → gold → blue → magenta */
@keyframes ceremonyColorWash {
  0%   { background: radial-gradient(ellipse 100% 60% at 50% 30%, rgba(255,60,80,0.18), transparent 65%); }
  25%  { background: radial-gradient(ellipse 100% 60% at 50% 30%, rgba(255,200,60,0.22), transparent 65%); }
  50%  { background: radial-gradient(ellipse 100% 60% at 50% 30%, rgba(80,180,255,0.20), transparent 65%); }
  75%  { background: radial-gradient(ellipse 100% 60% at 50% 30%, rgba(220,90,255,0.18), transparent 65%); }
  100% { background: radial-gradient(ellipse 100% 60% at 50% 30%, rgba(255,60,80,0.18), transparent 65%); }
}
/* LED chase along the truss bar */
@keyframes ceremonyChase {
  0%   { transform: translateX(-110%); }
  100% { transform: translateX(110%); }
}
/* Sparks shooting up from the floor */
@keyframes ceremonySpark {
  0%   { transform: translate(0, 0) scale(1); opacity: 0; }
  10%  { opacity: 1; }
  100% { transform: translate(var(--sx, 0px), -45vh) scale(0.2); opacity: 0; }
}
/* Spinning disco-light cone */
@keyframes ceremonyDiscoSpin {
  0%   { transform: translateX(-50%) rotate(0deg); }
  100% { transform: translateX(-50%) rotate(360deg); }
}
/* Subtle screen colour pulse for "crowd flash photography" */
@keyframes ceremonyPaparazzi {
  0%, 95%, 100% { opacity: 0; }
  96%, 97%      { opacity: 0.45; }
}
.ceremony-spotlight-spin    { animation: ceremonySpotlightSpin 18s linear infinite; }
.ceremony-spotlight-counter { animation: ceremonyCounterSpin   24s linear infinite; }
`;

function InjectStageStyles() {
  useEffect(() => {
    const id = "ceremony-stage-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id; s.textContent = STAGE_STYLE;
      document.head.appendChild(s);
    }
  }, []);
  return null;
}

/* ─── Distant rotating overhead spotlights (low alpha, slow) ─ */
function StageSpotlights() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="ceremony-spotlight-spin absolute -top-1/2 left-1/2 -translate-x-1/2 w-[220%] aspect-square">
        <div className="absolute inset-0" style={{
          background: "conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.10) 14deg, transparent 32deg, transparent 170deg, rgba(212,175,55,0.08) 188deg, transparent 210deg, transparent 360deg)",
        }} />
      </div>
      <div className="ceremony-spotlight-counter absolute -top-1/3 left-1/2 -translate-x-1/2 w-[180%] aspect-square">
        <div className="absolute inset-0" style={{
          background: "conic-gradient(from 90deg, transparent 0deg, rgba(255,180,80,0.06) 22deg, transparent 50deg, transparent 230deg, rgba(255,140,60,0.05) 252deg, transparent 280deg, transparent 360deg)",
        }} />
      </div>
    </div>
  );
}

/* ─── Overhead "moving heads" sweeping across centre stage ──── */
function OverheadMovingLights() {
  // Positions across the ceiling truss with their own swept beams.
  const lights = [
    { left: "18%", color: "rgba(255,225,120,0.55)", anim: "ceremonyOverheadSweep 6s ease-in-out infinite", delay: "0s",    width: "9vw" },
    { left: "32%", color: "rgba(255,255,255,0.45)", anim: "ceremonyOverheadSweep2 7s ease-in-out infinite", delay: "0.6s", width: "8vw" },
    { left: "50%", color: "rgba(255,235,150,0.55)", anim: "ceremonyOverheadSweep 5.5s ease-in-out infinite", delay: "1.2s", width: "10vw" },
    { left: "68%", color: "rgba(255,255,255,0.45)", anim: "ceremonyOverheadSweep2 6.5s ease-in-out infinite", delay: "0.3s", width: "8vw" },
    { left: "82%", color: "rgba(255,225,120,0.55)", anim: "ceremonyOverheadSweep 7.5s ease-in-out infinite", delay: "1.8s", width: "9vw" },
  ];
  return (
    <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden z-[2]">
      {lights.map((l, i) => (
        <div key={i} style={{
          position: "absolute", top: "0%", left: l.left,
          transformOrigin: "top center",
          width: l.width, height: "85vh",
          background: `linear-gradient(to bottom, ${l.color} 0%, ${l.color.replace(/[\d.]+\)$/, "0.08)")} 55%, transparent 100%)`,
          filter: "blur(10px)",
          animation: l.anim, animationDelay: l.delay,
          mixBlendMode: "screen",
        }} />
      ))}
    </div>
  );
}

/* ─── Wide spreading colored beams (background depth) ──────── */
function LightBeams() {
  const beams = [
    { left: "8%",  color: "rgba(255,215,90,0.22)",  anim: "ceremonyBeamL 7s ease-in-out infinite",   delay: "0s"   },
    { left: "26%", color: "rgba(255,255,255,0.14)", anim: "ceremonyBeamC 5s ease-in-out infinite",   delay: "1.2s" },
    { left: "44%", color: "rgba(255,180,60,0.18)",  anim: "ceremonyBeamR 6.5s ease-in-out infinite", delay: "0.4s" },
    { left: "58%", color: "rgba(255,255,255,0.13)", anim: "ceremonyBeamC 5.6s ease-in-out infinite", delay: "2s"   },
    { left: "74%", color: "rgba(255,215,90,0.22)",  anim: "ceremonyBeamL 7.4s ease-in-out infinite", delay: "0.8s" },
    { left: "90%", color: "rgba(220,150,255,0.13)", anim: "ceremonyBeamR 8s ease-in-out infinite",   delay: "1.6s" },
  ];
  return (
    <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden">
      {beams.map((b, i) => (
        <div key={i} style={{
          position: "absolute", top: "-10%", left: b.left, width: "12vw", height: "120vh",
          transformOrigin: "top center",
          background: `linear-gradient(to bottom, ${b.color} 0%, ${b.color.replace(/[\d.]+\)$/, "0.05)")} 60%, transparent 100%)`,
          filter: "blur(14px)", animation: b.anim, animationDelay: b.delay, mixBlendMode: "screen",
        }} />
      ))}
    </div>
  );
}

function StageCurtains() {
  const curtainBg =
    "repeating-linear-gradient(90deg," +
    "rgba(70,8,12,0.95) 0px," +
    "rgba(110,15,20,0.9) 14px," +
    "rgba(150,25,35,0.85) 28px," +
    "rgba(110,15,20,0.9) 42px," +
    "rgba(70,8,12,0.95) 56px)";
  return (
    <div className="absolute inset-y-0 left-0 right-0 pointer-events-none z-[1]">
      <div className="absolute top-0 bottom-0 left-0 w-[6vw] min-w-[40px] max-w-[120px]"
        style={{
          background: curtainBg, backgroundSize: "200% 100%",
          animation: "ceremonyCurtainSheen 9s ease-in-out infinite",
          boxShadow: "inset -30px 0 60px rgba(0,0,0,0.85), 4px 0 30px rgba(212,175,55,0.18)",
        }} />
      <div className="absolute top-0 bottom-0 w-[3px]" style={{
        left: "calc(6vw - 1px)",
        background: "linear-gradient(to bottom, transparent 0%, rgba(212,175,55,0.7) 8%, rgba(255,220,100,0.9) 50%, rgba(212,175,55,0.7) 92%, transparent 100%)",
        boxShadow: "0 0 12px rgba(212,175,55,0.6)",
      }} />
      <div className="absolute top-0 bottom-0 right-0 w-[6vw] min-w-[40px] max-w-[120px]"
        style={{
          background: curtainBg, backgroundSize: "200% 100%",
          animation: "ceremonyCurtainSheen 9s ease-in-out infinite reverse",
          boxShadow: "inset 30px 0 60px rgba(0,0,0,0.85), -4px 0 30px rgba(212,175,55,0.18)",
        }} />
      <div className="absolute top-0 bottom-0 w-[3px]" style={{
        right: "calc(6vw - 1px)",
        background: "linear-gradient(to bottom, transparent 0%, rgba(212,175,55,0.7) 8%, rgba(255,220,100,0.9) 50%, rgba(212,175,55,0.7) 92%, transparent 100%)",
        boxShadow: "0 0 12px rgba(212,175,55,0.6)",
      }} />
    </div>
  );
}

/* ─── Side banner pillars with vertical "GEF BALLON D'OR" + trophy mark ─
       Mirrors the layout from the reference image: tall narrow pillars on
       the far left and right with a pulsing gold border, the title text
       running vertically, and a small trophy emblem near the top. */
function StageBannerPillars() {
  const banner = (side: "left" | "right") => (
    <div
      className={`absolute top-[8%] bottom-[18%] ${side === "left" ? "left-[7vw]" : "right-[7vw]"} hidden md:flex flex-col items-center justify-between w-[5.5vw] min-w-[60px] max-w-[110px] pointer-events-none`}
      style={{
        background: "linear-gradient(to bottom, rgba(20,18,28,0.85), rgba(8,8,16,0.9))",
        border: "1px solid rgba(212,175,55,0.45)",
        borderRadius: "4px",
        animation: "ceremonyBannerGlow 5s ease-in-out infinite",
        zIndex: 2,
      }}
    >
      {/* Top trophy emblem */}
      <div className="pt-3 flex flex-col items-center" style={{ color: "#e8c860" }}>
        <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
          <ellipse cx="14" cy="11" rx="9" ry="9" fill="url(#bannerOrb)" stroke="#d4a017" strokeWidth="0.8" />
          <path d="M9 10 L19 10 M9 14 L17 14" stroke="#fff3a0" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M11 20 L11 25 L17 25 L17 20 Z" fill="#d4a017" />
          <rect x="9" y="25" width="10" height="3" rx="0.5" fill="#d4a017" />
          <defs>
            <radialGradient id="bannerOrb" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#3a4a6a" />
              <stop offset="60%" stopColor="#101830" />
              <stop offset="100%" stopColor="#020308" />
            </radialGradient>
          </defs>
        </svg>
        <div className="text-[8px] font-black uppercase tracking-widest mt-1" style={{ color: "#e8c860", textShadow: "0 0 8px rgba(212,175,55,0.6)" }}>GEF</div>
      </div>
      {/* Vertical title text */}
      <div
        className="text-[10px] md:text-xs font-black uppercase whitespace-nowrap"
        style={{
          writingMode: "vertical-rl",
          transform: side === "left" ? "rotate(180deg)" : "none",
          color: "#e8c860",
          letterSpacing: "0.35em",
          textShadow: "0 0 8px rgba(212,175,55,0.55)",
        }}
      >
        BALLON D'OR
      </div>
      <div className="pb-3" />
      {/* Soft inner glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.18) 0%, transparent 70%)",
        animation: "ceremonyPillarPulse 4s ease-in-out infinite",
      }} />
    </div>
  );
  return (
    <>
      {banner("left")}
      {banner("right")}
    </>
  );
}

/* ─── Dim audience silhouette with twinkling lights ──────── */
function AudienceSilhouette() {
  const lights = useRef(
    [...Array(36)].map((_, i) => ({
      left: 5 + (i * 2.5) + (Math.random() * 2 - 1),
      bottom: 2 + Math.random() * 14,
      delay: Math.random() * 4,
      dur: 2 + Math.random() * 3,
      hue: Math.random() > 0.6 ? "#ffd76a" : "#ffffff",
    }))
  ).current;
  return (
    <div className="absolute inset-x-0 bottom-[28vh] h-[18vh] pointer-events-none overflow-hidden z-[1]">
      {/* dark crowd silhouette */}
      <div className="absolute bottom-0 inset-x-0 h-full" style={{
        background:
          "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(8,4,14,0.7) 60%, transparent 100%)",
      }} />
      {/* twinkling phone/light dots */}
      {lights.map((l, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${l.left}%`,
          bottom: `${l.bottom}%`,
          width: "3px", height: "3px", borderRadius: "50%",
          background: l.hue,
          boxShadow: `0 0 6px ${l.hue}`,
          animation: `ceremonyAudienceTwinkle ${l.dur}s ease-in-out infinite`,
          animationDelay: `${l.delay}s`,
        }} />
      ))}
    </div>
  );
}

/* ─── Stage floor with layered podium steps + runway sheen ─ */
function StageFloor() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[32vh] pointer-events-none overflow-hidden z-[2]">
      {/* base floor wash */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(to bottom, transparent 0%, rgba(30,20,8,0.55) 25%, rgba(50,32,10,0.85) 100%)",
      }} />
      {/* perspective floor lines */}
      <div className="absolute inset-0" style={{
        background: "repeating-linear-gradient(to bottom, transparent 0px, transparent 30px, rgba(212,175,55,0.05) 30px, rgba(212,175,55,0.05) 31px)",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 60%, black 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 60%, black 100%)",
      }} />
      {/* Layered curved podium steps (back to front) */}
      {[
        { bottom: 0, h: "9vh", w: "62%", rim: 3, glint: "11s" },
        { bottom: "9vh", h: "7vh", w: "48%", rim: 2.5, glint: "9s" },
        { bottom: "16vh", h: "5vh", w: "34%", rim: 2, glint: "8s" },
      ].map((s, i) => (
        <div key={i}
          className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
          style={{
            bottom: s.bottom as any,
            width: s.w,
            height: s.h,
            borderTopLeftRadius: "999px",
            borderTopRightRadius: "999px",
            background:
              "linear-gradient(to bottom, rgba(40,28,8,0.95) 0%, rgba(20,14,4,0.95) 100%)",
            borderTop: `${s.rim}px solid rgba(212,175,55,0.7)`,
            boxShadow: `0 -4px 16px rgba(212,175,55,0.35), inset 0 ${s.rim}px 0 rgba(255,230,120,0.5)`,
          }}>
          {/* Sliding glint along the podium edge */}
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: `${s.rim + 1}px`,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)",
            animation: `ceremonyPodiumGlint ${s.glint} ease-in-out infinite`,
            mixBlendMode: "screen",
          }} />
        </div>
      ))}
      {/* Runway sheen across the floor */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(90deg, transparent 0%, rgba(255,220,100,0.18) 45%, rgba(255,240,150,0.28) 50%, rgba(255,220,100,0.18) 55%, transparent 100%)",
        animation: "ceremonyRunwayShine 11s ease-in-out infinite",
        mixBlendMode: "screen",
      }} />
    </div>
  );
}

/* ─── Soft central GEF BALLON D'OR backdrop wall mark ──── */
function StageBackdropMark() {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-[6%] w-full max-w-[860px] pointer-events-none flex flex-col items-center text-center z-[1]"
      style={{ animation: "ceremonyBackdropPulse 6s ease-in-out infinite" }}>
      <div className="text-yellow-400/30 font-black uppercase tracking-[0.35em]"
        style={{ fontSize: "clamp(14px, 2.4vw, 28px)", textShadow: "0 0 24px rgba(212,175,55,0.35)" }}>
        GEF
      </div>
      <div className="text-yellow-400/30 font-black uppercase tracking-[0.18em] mt-1"
        style={{ fontSize: "clamp(20px, 4.2vw, 56px)", textShadow: "0 0 30px rgba(212,175,55,0.4)" }}>
        BALLON&nbsp;D'OR
      </div>
      <div className="text-yellow-400/20 uppercase tracking-[0.55em] mt-2"
        style={{ fontSize: "clamp(8px, 1vw, 12px)" }}>
        HONORING THE BEAUTIFUL GAME
      </div>
    </div>
  );
}

function StageTruss() {
  const leds = [
    { color: "#ff3344", left: "8%",  delay: "0s"   },
    { color: "#ffcc44", left: "18%", delay: "0.3s" },
    { color: "#44ddff", left: "28%", delay: "0.6s" },
    { color: "#ffcc44", left: "38%", delay: "0.9s" },
    { color: "#ff3344", left: "48%", delay: "1.2s" },
    { color: "#44ddff", left: "58%", delay: "1.5s" },
    { color: "#ffcc44", left: "68%", delay: "1.8s" },
    { color: "#ff3344", left: "78%", delay: "2.1s" },
    { color: "#44ddff", left: "88%", delay: "2.4s" },
  ];
  return (
    <div className="absolute top-0 inset-x-0 h-6 pointer-events-none z-[3]">
      <div className="absolute top-0 inset-x-0 h-3" style={{
        background: "linear-gradient(to bottom, rgba(20,20,25,0.95) 0%, rgba(40,40,48,0.85) 50%, rgba(15,15,20,0.95) 100%)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.06)",
      }} />
      {leds.map((led, i) => (
        <div key={i} style={{
          position: "absolute", top: "4px", left: led.left,
          width: "5px", height: "5px", borderRadius: "50%",
          background: led.color, color: led.color,
          animation: "ceremonyTrussLight 1.6s ease-in-out infinite",
          animationDelay: led.delay,
        }} />
      ))}
    </div>
  );
}

function FloatingParticles() {
  const particles = useRef(
    [...Array(28)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      dur: 12 + Math.random() * 16,
      delay: Math.random() * -20,
      drift: (Math.random() - 0.5) * 80,
      hue: Math.random() > 0.7 ? "rgba(255,255,255,0.9)" : "rgba(255,215,90,0.85)",
    }))
  ).current;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", bottom: "-10px",
          left: `${p.left}%`, width: `${p.size}px`, height: `${p.size}px`,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${p.hue} 0%, transparent 70%)`,
          ["--drift" as any]: `${p.drift}px`,
          animation: `ceremonyFloatUp ${p.dur}s linear infinite`,
          animationDelay: `${p.delay}s`,
          filter: "blur(0.5px)",
        }} />
      ))}
    </div>
  );
}

function LensFlare() {
  const dots = [
    { top: "12%", left: "15%", size: 90,  color: "rgba(255,215,90,0.18)",  delay: "0s"   },
    { top: "22%", left: "78%", size: 120, color: "rgba(255,180,60,0.15)",  delay: "1.5s" },
    { top: "55%", left: "8%",  size: 70,  color: "rgba(255,255,255,0.12)", delay: "0.8s" },
    { top: "70%", left: "88%", size: 100, color: "rgba(220,150,255,0.13)", delay: "2.2s" },
    { top: "38%", left: "50%", size: 60,  color: "rgba(255,230,120,0.10)", delay: "3s"   },
    { top: "8%",  left: "55%", size: 80,  color: "rgba(120,200,255,0.10)", delay: "1.2s" },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((d, i) => (
        <div key={i} style={{
          position: "absolute", top: d.top, left: d.left,
          width: `${d.size}px`, height: `${d.size}px`, borderRadius: "50%",
          background: `radial-gradient(circle, ${d.color} 0%, transparent 70%)`,
          filter: "blur(8px)",
          animation: `ceremonyFlare ${4 + i * 0.5}s ease-in-out infinite`,
          animationDelay: d.delay,
          mixBlendMode: "screen",
        }} />
      ))}
    </div>
  );
}

/* ─── Sharp criss-crossing laser beams from above ─────────
   Two banks of thin coloured laser lines that sweep across the stage
   in opposite directions. Uses very high contrast colours and minimal
   blur so they read as actual lasers (not soft beams). */
function StageLasers() {
  const lasers = [
    { side: "left",  top: "0%", color: "rgba(80,255,140,0.85)",  dur: "5s",   delay: "0s"   },
    { side: "left",  top: "0%", color: "rgba(255,80,160,0.80)",  dur: "6.4s", delay: "0.8s" },
    { side: "left",  top: "0%", color: "rgba(120,200,255,0.85)", dur: "7.2s", delay: "1.6s" },
    { side: "right", top: "0%", color: "rgba(255,80,160,0.85)",  dur: "5.6s", delay: "0.4s" },
    { side: "right", top: "0%", color: "rgba(80,255,140,0.80)",  dur: "6.8s", delay: "1.2s" },
    { side: "right", top: "0%", color: "rgba(255,220,80,0.85)",  dur: "7.6s", delay: "2.0s" },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[3]">
      {lasers.map((l, i) => (
        <div key={i} style={{
          position: "absolute",
          top: l.top,
          left: l.side === "left" ? "8%" : "92%",
          transformOrigin: "top center",
          width: "2px",
          height: "120vh",
          background: `linear-gradient(to bottom, ${l.color} 0%, ${l.color.replace(/[\d.]+\)$/, "0.4)")} 60%, transparent 100%)`,
          boxShadow: `0 0 8px ${l.color}, 0 0 18px ${l.color}`,
          filter: "blur(0.6px)",
          animation: `${l.side === "left" ? "ceremonyLaserSweepL" : "ceremonyLaserSweepR"} ${l.dur} ease-in-out infinite`,
          animationDelay: l.delay,
          mixBlendMode: "screen",
        }} />
      ))}
    </div>
  );
}

/* ─── Strobe flash bursts ─────────────────────────────────
   Bright white flash that briefly washes the screen. Long off period
   between flashes (period ~6s with only 4% on) so it never feels
   epileptic, just punctuates moments. */
function StageStrobes() {
  return (
    <>
      <div className="absolute inset-0 pointer-events-none z-[4]" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% 25%, rgba(255,255,255,0.9), transparent 70%)",
        animation: "ceremonyStrobe 6s steps(1, end) infinite",
        animationDelay: "2s",
        mixBlendMode: "screen",
      }} />
      <div className="absolute inset-0 pointer-events-none z-[4]" style={{
        background: "radial-gradient(ellipse 60% 40% at 30% 35%, rgba(255,240,200,0.85), transparent 70%)",
        animation: "ceremonyStrobe 9s steps(1, end) infinite",
        animationDelay: "4.5s",
        mixBlendMode: "screen",
      }} />
      <div className="absolute inset-0 pointer-events-none z-[4]" style={{
        background: "radial-gradient(ellipse 60% 40% at 70% 35%, rgba(200,230,255,0.85), transparent 70%)",
        animation: "ceremonyStrobe 11s steps(1, end) infinite",
        animationDelay: "7s",
        mixBlendMode: "screen",
      }} />
    </>
  );
}

/* ─── Slow color wash over the whole stage ──────────────── */
function StageColorWash() {
  return (
    <div className="absolute inset-0 pointer-events-none z-[1]" style={{
      animation: "ceremonyColorWash 20s ease-in-out infinite",
      mixBlendMode: "screen",
    }} />
  );
}

/* ─── Spinning disco light cones from a downstage centre source ── */
function StageDiscoCones() {
  const cones = [
    { color: "rgba(255,210,90,0.18)",  dur: "12s", dir: "normal"  },
    { color: "rgba(120,200,255,0.16)", dur: "14s", dir: "reverse" },
    { color: "rgba(255,120,180,0.16)", dur: "16s", dir: "normal"  },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
      {cones.map((c, i) => (
        <div key={i} style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          width: "200vw",
          height: "200vh",
          background: `conic-gradient(from 0deg, transparent 0deg, ${c.color} 8deg, transparent 18deg, transparent 180deg, ${c.color.replace(/[\d.]+\)$/, "0.10)")} 188deg, transparent 200deg, transparent 360deg)`,
          animation: `ceremonyDiscoSpin ${c.dur} linear infinite`,
          animationDirection: c.dir as any,
          mixBlendMode: "screen",
          filter: "blur(2px)",
        }} />
      ))}
    </div>
  );
}

/* ─── LED chase strip across the truss ─────────────────── */
function StageLEDChase() {
  return (
    <div className="absolute top-[6px] inset-x-0 h-[3px] pointer-events-none overflow-hidden z-[4]">
      <div style={{
        position: "absolute",
        top: 0, left: 0,
        width: "30%", height: "100%",
        background: "linear-gradient(90deg, transparent 0%, rgba(255,220,90,0.95) 30%, rgba(255,255,255,1) 50%, rgba(255,220,90,0.95) 70%, transparent 100%)",
        boxShadow: "0 0 8px rgba(255,220,90,0.9), 0 0 14px rgba(255,220,90,0.6)",
        animation: "ceremonyChase 4s linear infinite",
      }} />
      <div style={{
        position: "absolute",
        top: 0, left: 0,
        width: "20%", height: "100%",
        background: "linear-gradient(90deg, transparent 0%, rgba(120,200,255,0.9) 50%, transparent 100%)",
        boxShadow: "0 0 8px rgba(120,200,255,0.9)",
        animation: "ceremonyChase 6s linear infinite",
        animationDelay: "1.5s",
      }} />
    </div>
  );
}

/* ─── Sparks shooting up from the front of the stage ──── */
function StageSparks() {
  const sparks = useRef(
    [...Array(40)].map((_, i) => ({
      id: i,
      left: 8 + Math.random() * 84,
      sx: (Math.random() - 0.5) * 60,
      dur: 2.4 + Math.random() * 2.6,
      delay: Math.random() * -8,
      hue: Math.random() > 0.5 ? "rgba(255,210,80,1)" : "rgba(255,170,40,1)",
      size: 2 + Math.random() * 2,
    }))
  ).current;
  return (
    <div className="absolute inset-x-0 bottom-[28vh] h-[55vh] pointer-events-none overflow-hidden z-[2]">
      {sparks.map(s => (
        <div key={s.id} style={{
          position: "absolute",
          bottom: 0,
          left: `${s.left}%`,
          width: `${s.size}px`,
          height: `${s.size}px`,
          borderRadius: "50%",
          background: s.hue,
          boxShadow: `0 0 6px ${s.hue}, 0 0 12px ${s.hue}`,
          ["--sx" as any]: `${s.sx}px`,
          animation: `ceremonySpark ${s.dur}s ease-out infinite`,
          animationDelay: `${s.delay}s`,
        }} />
      ))}
    </div>
  );
}

/* ─── Crowd "paparazzi" flash specks across the audience area ── */
function StagePaparazzi() {
  const flashes = useRef(
    [...Array(18)].map((_, i) => ({
      id: i,
      left: 4 + Math.random() * 92,
      bottom: 2 + Math.random() * 18,
      dur: 4 + Math.random() * 5,
      delay: Math.random() * -6,
    }))
  ).current;
  return (
    <div className="absolute inset-x-0 bottom-[24vh] h-[18vh] pointer-events-none overflow-hidden z-[3]">
      {flashes.map(f => (
        <div key={f.id} style={{
          position: "absolute",
          left: `${f.left}%`,
          bottom: `${f.bottom}%`,
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,250,210,0.7) 35%, transparent 70%)",
          boxShadow: "0 0 14px rgba(255,255,255,0.95)",
          animation: `ceremonyPaparazzi ${f.dur}s ease-in-out infinite`,
          animationDelay: `${f.delay}s`,
          mixBlendMode: "screen",
        }} />
      ))}
    </div>
  );
}

/* ─── Public composite stage backdrop ────────────────────── */
export type StageStyle = "subtle" | "normal" | "dramatic" | "max";

const STYLE_PRESETS: Record<StageStyle, {
  beams: boolean; particles: boolean; flare: boolean; truss: boolean;
  curtains: boolean; pillars: boolean; backdropMark: boolean; overhead: boolean;
  audience: boolean; podium: boolean;
  // New animated lighting layers
  lasers: boolean; strobes: boolean; colorWash: boolean;
  disco: boolean; ledChase: boolean; sparks: boolean; paparazzi: boolean;
  opacity: number;
}> = {
  subtle:   { beams: false, particles: true,  flare: true,  truss: false, curtains: false, pillars: false, backdropMark: false, overhead: false, audience: false, podium: false, lasers: false, strobes: false, colorWash: false, disco: false, ledChase: false, sparks: false, paparazzi: false, opacity: 0.55 },
  normal:   { beams: true,  particles: true,  flare: true,  truss: true,  curtains: true,  pillars: true,  backdropMark: true,  overhead: true,  audience: true,  podium: true,  lasers: true,  strobes: false, colorWash: true,  disco: false, ledChase: true,  sparks: false, paparazzi: true,  opacity: 0.85 },
  dramatic: { beams: true,  particles: true,  flare: true,  truss: true,  curtains: true,  pillars: true,  backdropMark: true,  overhead: true,  audience: true,  podium: true,  lasers: true,  strobes: true,  colorWash: true,  disco: true,  ledChase: true,  sparks: true,  paparazzi: true,  opacity: 1.0  },
  max:      { beams: true,  particles: true,  flare: true,  truss: true,  curtains: true,  pillars: true,  backdropMark: true,  overhead: true,  audience: true,  podium: true,  lasers: true,  strobes: true,  colorWash: true,  disco: true,  ledChase: true,  sparks: true,  paparazzi: true,  opacity: 1.0  },
};

export function CeremonyStageBackdrop({
  style = "dramatic",
  introActive = false,
  focusMode = false,
}: {
  style?: StageStyle;
  introActive?: boolean;
  /**
   * When true, the stage smoothly dims down so foreground reveal cards
   * read clearly. The brightest / most distracting layers (lasers,
   * strobes, paparazzi flashes) are also disabled so they can't draw
   * the eye away from the centre announcement. The intro still always
   * gets the full bright stage — `introActive` overrides this.
   */
  focusMode?: boolean;
} = {}) {
  const p = STYLE_PRESETS[style] ?? STYLE_PRESETS.dramatic;
  // While a reveal is on screen, dim the entire stage to ~22% so the
  // foreground reveal text/cards stand out clearly. Smooth-transition
  // it so the lights "fade down" like a real ceremony cue.
  const dimmed = focusMode && !introActive;
  const wrapStyle: any = {
    transition: "opacity 700ms ease-out, filter 700ms ease-out",
    ...(style === "max" ? { filter: "brightness(1.15) saturate(1.1)" } : {}),
  };
  if (dimmed) {
    wrapStyle.filter = `${wrapStyle.filter ? wrapStyle.filter + " " : ""}brightness(0.42) saturate(0.85)`;
  }
  const effectiveOpacity = dimmed ? Math.min(p.opacity, 0.32) : p.opacity;
  // Resolve image URL with the artifact base path so it works whether the
  // app is served at "/" or under a "/gef-stats" path.
  const base = (import.meta as any).env?.BASE_URL || "/";
  const stageImg = `${base}stage-bg.png`;
  // While the intro plays, the stage photo "pushes in" cinematically
  // (scale 1.14 → 1.0 with brightness/blur ramp). When the intro ends
  // it settles into a slow ambient drift so the photo never feels static.
  // Re-key on intro activation so the animation restarts on every replay.
  const stageAnim = introActive
    ? "ceremonyStagePushIn 7.5s cubic-bezier(0.22, 1, 0.36, 1) forwards"
    : "ceremonyStageDrift 22s ease-in-out infinite";
  return (
    <>
    {/* When a reveal is on screen we paint a strong dark scrim plus a
        warm centre spotlight ON TOP of (and outside) the dimmed stage
        wrapper, so the spotlight itself stays bright while everything
        behind it goes nearly black. This is what makes the centre
        announcement card "pop" the way a real ceremony cue does. */}
    {dimmed && (
      <div
        className="absolute inset-0 md:right-64 overflow-hidden pointer-events-none z-[5]"
        style={{ transition: "opacity 700ms ease-out" }}
      >
        {/* Dark scrim everywhere except the centre. */}
        <div className="absolute inset-0" style={{
          background:
            "radial-gradient(ellipse 38% 48% at 50% 48%, transparent 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)",
        }} />
        {/* Warm centre spotlight halo behind the reveal card. */}
        <div className="absolute inset-0" style={{
          background:
            "radial-gradient(ellipse 30% 38% at 50% 48%, rgba(255,220,120,0.28) 0%, rgba(255,200,80,0.12) 35%, transparent 70%)",
          mixBlendMode: "screen",
        }} />
        {/* Subtle slow flicker so the spotlight feels alive (not a static gradient). */}
        <div className="absolute inset-0" style={{
          background:
            "radial-gradient(ellipse 22% 30% at 50% 48%, rgba(255,235,180,0.10) 0%, transparent 70%)",
          mixBlendMode: "screen",
          animation: "ceremonyVignette 4s ease-in-out infinite",
        }} />
      </div>
    )}
    {/* `md:right-64` makes the stage stop before the 16rem (w-64) chat
        sidebar on desktop so the photo's trophy aligns with the centre of
        the main area (where overlay cards / titles also sit). */}
    <div
      className="absolute inset-0 md:right-64 overflow-hidden pointer-events-none"
      style={{ opacity: effectiveOpacity, ...wrapStyle }}
    >
      <InjectStageStyles />

      {/* ── REAL stage photo as the actual backdrop ──
          Cover the viewport, anchor centre. A flat black layer underneath
          guarantees no body colour shows through if the image is loading. */}
      <div className="absolute inset-0" style={{ background: "#000" }} />
      <div
        key={introActive ? "intro" : "ambient"}
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${stageImg}")`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          transformOrigin: "50% 55%",
          willChange: "transform, filter",
          animation: stageAnim,
        }}
      />

      {/* Subtle moving overlays on top of the real stage to bring it to
          life. Everything below uses screen / overlay blend so the image
          remains clearly visible. */}
      <StageSpotlights />
      {p.colorWash && !dimmed && <StageColorWash />}
      {p.disco && !dimmed && <StageDiscoCones />}
      {p.beams && <LightBeams />}
      {p.overhead && <OverheadMovingLights />}
      {p.lasers && !dimmed && <StageLasers />}
      {p.particles && <FloatingParticles />}
      {p.sparks && !dimmed && <StageSparks />}
      {p.paparazzi && !dimmed && <StagePaparazzi />}
      {p.flare && <LensFlare />}
      {p.ledChase && <StageLEDChase />}
      {p.strobes && !dimmed && <StageStrobes />}

      {/* Soft warm key glow at the top so the stage feels lit live. */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 90% 50% at 50% -10%, rgba(212,175,55,0.12) 0%, transparent 60%)",
        mixBlendMode: "screen",
      }} />
      {/* Very gentle edge vignette to focus the eye toward centre stage. */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 90%, rgba(0,0,0,0.6) 100%)",
        animation: "ceremonyVignette 10s ease-in-out infinite",
      }} />
    </div>
    </>
  );
}
