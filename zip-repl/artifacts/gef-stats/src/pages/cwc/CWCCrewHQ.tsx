import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useInView } from "framer-motion";
import { CWCLayout } from "./CWCLayout";
import { useGetCwcCrewHQ } from "@/hooks/use-cwc";
import { Trophy, Shield, Star, Crown, ChevronLeft, ChevronRight, Activity, Calendar, Globe, MapPin, Medal, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper for Animated Numbers
function AnimatedNumber({ value }: { value: number | string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 50, damping: 20 });
  const [display, setDisplay] = useState("0");

  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;
  const isNumeric = !isNaN(numericValue);

  useEffect(() => {
    if (isInView && isNumeric) {
      motionValue.set(numericValue);
    }
  }, [isInView, isNumeric, numericValue, motionValue]);

  useEffect(() => {
    if (isNumeric) {
      return springValue.on("change", (latest) => {
        if (ref.current) {
          // Keep same format if it was a string initially
          let formatted = Math.floor(latest).toString();
          if (typeof value === 'string') {
             formatted = value.replace(/[0-9.,]+/, formatted);
          }
          ref.current.textContent = formatted;
        }
      });
    }
  }, [springValue, isNumeric, value]);

  if (!isNumeric) return <span>{value || '-'}</span>;

  return <span ref={ref}>{display}</span>;
}


export function CWCCrewHQ() {
  const [, params] = useRoute("/cwc/crews/:slug");
  const slug = params?.slug || "";
  const { data, isLoading, error } = useGetCwcCrewHQ(slug);
  
  const [introPlayed, setIntroPlayed] = useState(false);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);

  // Play intro once per crew slug
  useEffect(() => {
    if (!slug) return;
    const skipPreview = new URLSearchParams(window.location.search).get("preview");
    if (skipPreview) { setIntroPlayed(true); return; }
    const sessionKey = `cwc_hq_intro_${slug}`;
    if (!sessionStorage.getItem(sessionKey)) {
      setIntroPlayed(false);
      const timer = setTimeout(() => {
        sessionStorage.setItem(sessionKey, "true");
        setIntroPlayed(true);
      }, 3500); // 3.5s cinematic intro
      return () => clearTimeout(timer);
    } else {
      setIntroPlayed(true);
    }
  }, [slug]);

  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  if (isLoading) {
    return (
      <CWCLayout>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_#0066FF]" />
        </div>
      </CWCLayout>
    );
  }

  if (error || !data) {
    return (
      <CWCLayout>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-red-500 mb-4">CREW NOT FOUND</h2>
            <Link href="/cwc/crews" className="text-[#0066FF] hover:text-white underline font-display tracking-widest uppercase">RETURN TO CREWS</Link>
          </div>
        </div>
      </CWCLayout>
    );
  }

  const { crew, players, trophies, awards } = data;

  const nextPlayer = () => {
    if (!players || players.length === 0) return;
    setCurrentPlayerIdx((prev) => (prev + 1) % players.length);
  };

  const prevPlayer = () => {
    if (!players || players.length === 0) return;
    setCurrentPlayerIdx((prev) => (prev - 1 + players.length) % players.length);
  };

  const player = players && players.length > 0 ? players[currentPlayerIdx] : null;
  const nextPlayerObj = players && players.length > 1 ? players[(currentPlayerIdx + 1) % players.length] : null;
  const prevPlayerObj = players && players.length > 1 ? players[(currentPlayerIdx - 1 + players.length) % players.length] : null;

  return (
    <CWCLayout>
      <AnimatePresence>
        {!introPlayed && (
          <motion.div
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden"
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {/* Cinematic sweep */}
            <motion.div 
              initial={{ x: "-100%", skewX: "-20deg" }}
              animate={{ x: "200%", skewX: "-20deg" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-y-0 w-1/2 bg-[#0066FF] blur-[100px] opacity-40 z-0"
            />
            <motion.div 
              initial={{ x: "-100%", skewX: "-20deg" }}
              animate={{ x: "200%", skewX: "-20deg" }}
              transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
              className="absolute inset-y-0 w-1/3 bg-[#FFB800] blur-[80px] opacity-50 z-0"
            />

            <motion.div
              initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 1.2, opacity: 0, filter: "blur(20px)" }}
              transition={{ duration: 1.2, delay: 0.8 }}
              className="relative z-10 flex flex-col items-center"
            >
              {crew.logoUrl && (
                <img src={crew.logoUrl} alt="" className="w-48 h-48 object-contain mb-8 drop-shadow-[0_0_30px_rgba(0,102,255,0.6)]" />
              )}
              <h1 className="font-display font-black text-5xl md:text-7xl tracking-[0.2em] text-white uppercase text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                {crew.name}
              </h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#050505] min-h-screen relative font-sans text-white overflow-x-hidden">
        
        {/* ========================================================================= */}
        {/* SECTION 1: CREW PROFILE HERO */}
        {/* ========================================================================= */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden">
          
          {/* Layer 1-6 Backgrounds */}
          <motion.div style={{ y: yBg }} className="absolute inset-0 z-0 pointer-events-none">
            {/* Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
            
            {/* Huge translucent logo */}
            {crew.logoUrl && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[1000px] aspect-square opacity-[0.04] mix-blend-luminosity">
                <img src={crew.logoUrl} alt="" className="w-full h-full object-contain blur-[2px]" />
              </div>
            )}
            
            {/* Radial glows */}
            <div className="absolute top-1/4 left-0 w-1/2 h-1/2 bg-[#0066FF]/10 blur-[150px] rounded-full" />
            <div className="absolute bottom-1/4 right-0 w-1/2 h-1/2 bg-[#FFB800]/10 blur-[150px] rounded-full" />

            {/* Particles */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={`p-${i}`}
                className="absolute w-1 h-1 rounded-full bg-white/30"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  boxShadow: `0 0 10px ${i % 2 === 0 ? "#0066FF" : "#FFB800"}`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.2, 0.8, 0.2],
                }}
                transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </motion.div>

          <div className="container mx-auto px-4 relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              
              {/* LEFT: Text Info */}
              <div className="relative">
                <div className="absolute -left-10 -top-20 text-[200px] font-display font-black text-white/[0.03] leading-none select-none tracking-tighter whitespace-nowrap">
                  {crew.name.substring(0,3).toUpperCase()}
                </div>
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-[#FFB800]/30 bg-[#FFB800]/10 text-[#FFB800] text-xs font-display font-bold tracking-widest rounded-sm">
                    <Globe className="w-3 h-3" /> {crew.region || "GLOBAL"}
                  </div>
                  <h1 className="font-display font-black text-5xl md:text-7xl uppercase leading-[0.9] tracking-tight text-white mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    {crew.name}
                  </h1>
                  {crew.tagline && (
                    <p className="font-display text-xl text-[#0066FF] font-bold tracking-[0.2em] uppercase mb-8 drop-shadow-[0_0_10px_rgba(0,102,255,0.5)]">
                      "{crew.tagline}"
                    </p>
                  )}
                  {crew.story && (
                    <p className="text-white/60 font-sans text-sm max-w-md leading-relaxed mb-8 line-clamp-4">
                      {crew.story}
                    </p>
                  )}
                </motion.div>
              </div>

              {/* CENTER: Logo & Rings */}
              <div className="flex items-center justify-center relative py-12 lg:py-0">
                <motion.div 
                  className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center"
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 rounded-full border border-[#0066FF]/20 animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-4 rounded-full border border-dashed border-[#FFB800]/20 animate-[spin_15s_linear_infinite_reverse]" />
                  
                  {crew.logoUrl ? (
                    <img src={crew.logoUrl} alt={crew.name} className="w-56 h-56 md:w-72 md:h-72 object-contain drop-shadow-[0_0_40px_rgba(0,102,255,0.5)]" />
                  ) : (
                    <div className="w-48 h-48 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-display font-black text-5xl text-white/30 shadow-[0_0_30px_rgba(0,102,255,0.3)]">
                      {crew.name.substring(0,2).toUpperCase()}
                    </div>
                  )}
                </motion.div>
              </div>

              {/* RIGHT: Crew Information Table */}
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="flex flex-col gap-1">
                <h3 className="font-display font-bold text-sm tracking-[0.2em] text-[#FFB800] mb-4 border-b border-white/10 pb-2">CREW DATA</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm border-l border-[#0066FF]/30 pl-4 py-2">
                  <div className="text-white/40 font-display tracking-wider text-xs">FOUNDED</div>
                  <div className="font-medium text-right text-white">{crew.founded || "-"}</div>
                  
                  <div className="text-white/40 font-display tracking-wider text-xs">COUNTRY</div>
                  <div className="font-medium text-right text-white">{crew.country || "-"}</div>

                  <div className="text-white/40 font-display tracking-wider text-xs">CAPTAIN</div>
                  <div className="font-medium text-right text-white">{crew.captain || "-"}</div>

                  <div className="text-white/40 font-display tracking-wider text-xs">MANAGER</div>
                  <div className="font-medium text-right text-white">{crew.manager || "-"}</div>

                  <div className="text-white/40 font-display tracking-wider text-xs">INVESTOR</div>
                  <div className="font-medium text-right text-white line-clamp-1">{crew.ownerInvestor || "-"}</div>

                  <div className="text-white/40 font-display tracking-wider text-xs">DIVISION</div>
                  <div className="font-medium text-right text-[#0066FF] drop-shadow-[0_0_5px_#0066FF]">{crew.currentDivision || "-"}</div>
                  
                  <div className="text-white/40 font-display tracking-wider text-xs">POWER RANK</div>
                  <div className="font-medium text-right text-[#FFB800] drop-shadow-[0_0_5px_#FFB800]">#{crew.powerRanking || "-"}</div>
                  
                  <div className="text-white/40 font-display tracking-wider text-xs">ROSTER SIZE</div>
                  <div className="font-medium text-right text-white">{crew.rosterSize || "-"}</div>
                  
                  <div className="text-white/40 font-display tracking-wider text-xs">FANBASE</div>
                  <div className="font-medium text-right text-white">{crew.currentFanbase ? crew.currentFanbase.toLocaleString() : "-"}</div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* TROPHY CABINET */}
        {trophies && trophies.length > 0 && (
          <section className="py-16 bg-[#0a0a0a] border-y border-white/5 relative z-10">
            <div className="container mx-auto px-4">
              <h2 className="font-display font-black text-3xl tracking-widest text-center text-white mb-12 uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                HONOURS & TROPHIES
              </h2>
              <div className="flex flex-wrap justify-center gap-6">
                {trophies.map((trophy, i) => {
                  let Icon = Trophy;
                  if (trophy.iconType === 'shield') Icon = Shield;
                  if (trophy.iconType === 'star') Icon = Star;
                  if (trophy.iconType === 'crown') Icon = Crown;
                  if (trophy.iconType === 'medal') Icon = Medal;

                  return (
                    <motion.div 
                      key={trophy.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="w-48 bg-[#050505] border border-white/10 rounded p-6 flex flex-col items-center text-center hover:border-[#FFB800]/50 hover:shadow-[0_0_20px_rgba(255,184,0,0.15)] transition-all group"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#FFB800]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,184,0,0.2)]">
                        <Icon className="w-8 h-8 text-[#FFB800]" />
                      </div>
                      <h4 className="font-display font-bold text-sm tracking-widest text-white mb-2 leading-tight uppercase">{trophy.name}</h4>
                      <div className="text-2xl font-display font-black text-[#0066FF] drop-shadow-[0_0_8px_rgba(0,102,255,0.8)]">
                        x{trophy.timesWon}
                      </div>
                      {trophy.winningSeasons && trophy.winningSeasons.length > 0 && (
                        <p className="text-[10px] text-white/40 mt-3 uppercase tracking-wider line-clamp-2">
                          {trophy.winningSeasons.join(", ")}
                        </p>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>
        )}


        {/* ========================================================================= */}
        {/* SECTION 2: PLAYER SHOWCASE (Man Utd / Paul Pogba style) */}
        {/* ========================================================================= */}
        <section className="relative min-h-screen bg-black flex flex-col pb-24 overflow-hidden border-t border-[#0066FF]/20">
          
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0066FF]/10 to-transparent pointer-events-none" />
          
          <div className="container mx-auto px-4 py-8 flex-1 flex flex-col">
            <h2 className="font-display font-black text-3xl tracking-[0.3em] text-[#0066FF] text-center mb-16 uppercase drop-shadow-[0_0_10px_rgba(0,102,255,0.3)]">
              ACTIVE ROSTER
            </h2>

            {players && players.length > 0 && player ? (
              <div className="flex-1 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -50, filter: "blur(10px)" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex flex-col lg:flex-row h-full w-full items-center lg:items-stretch relative z-10"
                  >
                    
                    {/* LEFT: Huge Number + Name */}
                    <div className="w-full lg:w-1/3 flex flex-col justify-center relative lg:pl-10 order-2 lg:order-1 pt-8 lg:pt-0 z-20">
                      {player.jerseyNumber !== null && (
                        <div className="absolute left-0 lg:-left-20 top-1/2 -translate-y-1/2 text-[150px] lg:text-[300px] font-display font-black text-white opacity-[0.12] select-none leading-none z-0">
                          {player.jerseyNumber}
                        </div>
                      )}
                      
                      <div className="relative z-10">
                        {crew.logoUrl && (
                          <img src={crew.logoUrl} alt="" className="w-8 h-8 md:w-12 md:h-12 mb-4 opacity-50 grayscale" />
                        )}
                        <h2 className="font-display font-black text-5xl md:text-7xl uppercase leading-[0.85] tracking-tight text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                          {player.realName.split(" ").map((part, i, arr) => (
                            <span key={i} className={i === arr.length - 1 ? "block text-[#0066FF] drop-shadow-[0_0_10px_#0066FF]" : "block"}>
                              {part}
                            </span>
                          ))}
                        </h2>
                        <div className="flex items-center gap-4 mt-4">
                          <span className="font-display font-bold text-lg tracking-[0.3em] text-[#FFB800] uppercase">
                            {player.position || "PLAYER"}
                          </span>
                          {player.ign && (
                            <span className="px-2 py-1 bg-white/10 text-white text-xs font-mono rounded">
                              "{player.ign}"
                            </span>
                          )}
                        </div>
                        {player.nationality && (
                          <div className="mt-4 text-white/50 text-sm font-display tracking-widest uppercase flex items-center gap-2">
                            <Globe className="w-4 h-4" /> {player.nationality}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CENTER: Player Image */}
                    <div className="w-full lg:w-1/3 flex items-end justify-center relative order-1 lg:order-2 h-[50vh] lg:h-auto min-h-[400px]">
                      {/* Background accent ring for image */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] aspect-square rounded-full border border-white/5 bg-gradient-to-b from-[#0066FF]/5 to-transparent z-0 blur-md" />
                      
                      {player.imageUrl ? (
                        <motion.img 
                          src={player.imageUrl} 
                          alt={player.realName} 
                          className="h-[85%] lg:h-[90%] w-auto max-w-none object-contain relative z-10 bottom-0 filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                          animate={{ y: [-5, 5, -5] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                      ) : (
                        <motion.div 
                          className="w-[80%] max-w-[300px] aspect-[3/4] bg-white/5 border border-white/10 rounded-t-[100px] relative z-10 flex items-center justify-center"
                          animate={{ y: [-5, 5, -5] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Activity className="w-24 h-24 text-white/20" />
                        </motion.div>
                      )}
                    </div>

                    {/* RIGHT: Stats Table */}
                    <div className="w-full lg:w-1/3 flex flex-col justify-center order-3 pt-12 lg:pt-0 lg:pr-10 z-20">
                      <div className="bg-[#050505]/80 backdrop-blur-xl border border-white/10 p-1 w-full max-w-md ml-auto">
                        <div className="flex justify-between items-center bg-white/5 px-4 py-2 border-b border-white/10 mb-1">
                          <span className="font-display font-bold text-xs tracking-[0.2em] text-white/60">STATISTICS</span>
                          <span className="font-display font-bold text-xs tracking-[0.2em] text-[#FFB800]">
                            OVR: {player.playerRating || "-"}
                          </span>
                        </div>
                        
                        <div className="space-y-[1px]">
                           {[
                             { label: "AGE", value: player.age },
                             { label: "JOINED", value: player.joinedCrew },
                             { label: "CONTRACT", value: player.contractUntil },
                             { label: "GOALS CONCEDED", value: player.goalsConceded },
                             { label: "APPEARANCES", value: player.matchesPlayed },
                             { label: "WIN RATE", value: player.matchesPlayed && player.matchesPlayed > 0 && player.wins !== null 
                                ? `${Math.round((player.wins / player.matchesPlayed)*100)}%` 
                                : "-" },
                             { label: "GOALS", value: player.goalsScored },
                             { label: "FORM", value: player.currentForm }
                           ].map((stat, i) => (
                             <div key={i} className="flex justify-between items-center bg-[#0a0a0a] px-4 py-3 hover:bg-white/5 transition-colors">
                               <span className="font-display text-xs tracking-[0.2em] text-white/40 uppercase">{stat.label}</span>
                               <span className="font-display font-bold text-sm text-white uppercase"><AnimatedNumber value={stat.value as string|number} /></span>
                             </div>
                           ))}
                        </div>
                      </div>

                      {/* Awards small section */}
                      {awards && awards.filter(a => a.playerId === player.id).length > 0 && (
                        <div className="mt-8 max-w-md ml-auto w-full flex flex-wrap gap-2 justify-end">
                          {awards.filter(a => a.playerId === player.id).map(aw => (
                            <div key={aw.id} className="px-3 py-1.5 border border-[#FFB800]/30 bg-[#FFB800]/10 text-[#FFB800] text-[10px] font-display font-bold tracking-widest rounded flex items-center gap-1">
                              <Star className="w-3 h-3 fill-[#FFB800]" /> {aw.awardName} (x{aw.timesWon})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </motion.div>
                </AnimatePresence>

                {/* BOTTOM PREV/NEXT NAV BAR */}
                {players.length > 1 && (
                  <div className="absolute bottom-[-60px] left-0 right-0 h-16 border-t-2 border-[#0066FF] flex items-stretch z-30">
                    <button 
                      onClick={prevPlayer}
                      className="w-1/2 flex items-center px-6 gap-4 group hover:bg-white/5 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] text-[#0066FF] font-display font-bold tracking-[0.2em]">PREVIOUS PLAYER</span>
                        <span className="font-display font-bold text-lg text-white uppercase tracking-widest group-hover:text-[#FFB800] transition-colors line-clamp-1">{prevPlayerObj?.realName}</span>
                      </div>
                    </button>
                    
                    <div className="w-px bg-white/10" />

                    <button 
                      onClick={nextPlayer}
                      className="w-1/2 flex items-center justify-end px-6 gap-4 group hover:bg-white/5 transition-colors"
                    >
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-[#0066FF] font-display font-bold tracking-[0.2em]">NEXT PLAYER</span>
                        <span className="font-display font-bold text-lg text-white uppercase tracking-widest group-hover:text-[#FFB800] transition-colors line-clamp-1">{nextPlayerObj?.realName}</span>
                      </div>
                      <ChevronRight className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                <Users className="w-16 h-16 text-white/20 mb-4" />
                <p className="font-display font-bold tracking-widest text-lg text-white uppercase">No players have been registered for this crew yet.</p>
              </div>
            )}

          </div>
        </section>

      </div>
    </CWCLayout>
  );
}
