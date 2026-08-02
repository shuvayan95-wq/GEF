import { CWCLayout } from "./CWCLayout";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { Shield, ChevronRight, Globe2, Trophy, Star, Swords, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";

// Fake Data
const MATCHES = [
  { id: 1, teamA: "NEXUS", teamB: "INVICTUS", scoreA: 3, scoreB: 1, stage: "QUARTER FINAL", date: "25.05.2025", time: "9:00 PM GMT", status: "FT" },
  { id: 2, teamA: "VANGUARD", teamB: "ROYAL", scoreA: 2, scoreB: 2, stage: "QUARTER FINAL", date: "31.05.2025", time: "9:30 PM GMT", status: "LIVE" },
  { id: 3, teamA: "PHOENIX", teamB: "STORM", scoreA: null, scoreB: null, stage: "QUARTER FINAL", date: "02.06.2025", time: "8:00 PM GMT", status: "UPCOMING" },
];

const NEWS = [
  { id: 1, title: "NEXUS DOMINATES GROUP STAGE, SETS SIGHTS ON THE CROWN", category: "RECAP", date: "MAY 20" },
  { id: 2, title: "THE RISE OF VANGUARD: A TACTICAL MASTERCLASS", category: "ANALYSIS", date: "MAY 22" },
  { id: 3, title: "ROYAL SECURES QUARTER FINAL SPOT IN DRAMATIC FASHION", category: "BREAKING", date: "MAY 24" },
];

const REGIONS = [
  { name: "EUROPE", crews: 8, status: "DOMINATING" },
  { name: "AMERICAS", crews: 6, status: "RISING" },
  { name: "ASIA", crews: 6, status: "CONTENDERS" },
  { name: "MENA", crews: 4, status: "WILD CARD" },
];

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

export function CWCHome() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <CWCLayout>
      <div ref={containerRef} className="pb-24">
        
        {/* HERO SECTION */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-[#0066FF]/20">
          <motion.div style={{ y: yBg }} className="absolute inset-0 z-0">
            {/* Background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
            
            {/* Center glowing orb/globe representation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] max-w-[800px] aspect-square rounded-full border border-white/5 border-dashed flex items-center justify-center">
              <div className="absolute w-[80%] h-[80%] rounded-full border border-[#0066FF]/20 border-dotted animate-[spin_60s_linear_infinite]" />
              <div className="absolute w-[60%] h-[60%] rounded-full border border-[#FFB800]/20 animate-[spin_40s_linear_infinite_reverse]" />
              <div className="w-[40%] h-[40%] rounded-full bg-gradient-to-tr from-[#0066FF]/20 to-[#FFB800]/20 blur-3xl" />
            </div>
          </motion.div>

          <div className="relative z-10 text-center px-4 max-w-5xl mx-auto mt-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-[#0066FF]/30 bg-[#0066FF]/10 backdrop-blur-sm mb-8 text-[#0066FF] font-display text-sm font-bold tracking-widest shadow-[0_0_15px_rgba(0,102,255,0.2)]">
                <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse" />
                OFFICIAL WORLD CHAMPIONSHIP
              </div>
              
              <h1 className="font-display font-black text-6xl md:text-8xl lg:text-[140px] leading-none tracking-tighter mb-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">CONVERGENCE</span>
              </h1>
              
              <p className="font-display text-xl md:text-3xl text-[#FFB800] font-bold tracking-[0.3em] drop-shadow-[0_0_10px_rgba(255,184,0,0.5)] mb-12 uppercase">
                Blue and Gold forces collide on the global stage
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button className="px-8 py-4 bg-[#0066FF] text-white font-display font-bold text-lg tracking-widest hover:bg-[#0052cc] hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all flex items-center gap-2 group">
                  <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  WATCH LIVE
                </button>
                <button className="px-8 py-4 bg-transparent border border-white/20 text-white font-display font-bold text-lg tracking-widest hover:bg-white/5 transition-all">
                  VIEW BRACKET
                </button>
              </div>
            </motion.div>
          </div>
          
          {/* Bottom horizon fade */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] to-transparent z-10" />
        </section>

        {/* THE CLASH (Matches) */}
        <section className="relative z-20 py-24 px-4 container mx-auto">
          <FadeIn>
            <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
              <div>
                <h2 className="font-display font-black text-4xl md:text-5xl tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">THE CLASH</h2>
                <p className="text-[#0066FF] font-display font-bold tracking-widest mt-2">QUARTER FINALS</p>
              </div>
              <Link href="/cwc/matches" className="hidden md:flex items-center gap-2 text-white/50 hover:text-white font-display font-bold tracking-widest transition-colors">
                ALL MATCHES <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {MATCHES.map((match, i) => (
              <FadeIn key={match.id} delay={i * 0.2}>
                <div className={cn(
                  "relative bg-[#0a0a0a] border overflow-hidden group transition-all duration-500",
                  match.status === "LIVE" ? "border-[#FFB800]/50 shadow-[0_0_30px_rgba(255,184,0,0.15)]" : "border-white/10 hover:border-[#0066FF]/50"
                )}>
                  {/* Decorative corner accents */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <span className="font-display text-xs font-bold tracking-widest text-white/40">{match.date} | {match.time}</span>
                      <span className={cn(
                        "font-display text-xs font-black tracking-widest px-2 py-0.5 rounded",
                        match.status === "LIVE" ? "bg-[#FFB800] text-black animate-pulse" :
                        match.status === "FT" ? "bg-white/10 text-white/80" : "bg-[#0066FF]/20 text-[#0066FF]"
                      )}>
                        {match.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Team A */}
                      <div className="flex flex-col items-center gap-3 w-1/3">
                        <div className="w-16 h-16 rounded border border-[#0066FF]/40 bg-[#0066FF]/10 flex items-center justify-center shadow-[0_0_15px_rgba(0,102,255,0.2)]">
                          <Shield className="w-8 h-8 text-[#0066FF]" />
                        </div>
                        <span className="font-display font-bold text-lg tracking-wider text-white text-center">{match.teamA}</span>
                      </div>

                      {/* Score / VS */}
                      <div className="flex flex-col items-center justify-center w-1/3">
                        {match.scoreA !== null ? (
                          <div className="font-display font-black text-5xl tracking-tighter flex items-center gap-3">
                            <span className="text-[#0066FF] drop-shadow-[0_0_10px_rgba(0,102,255,0.5)]">{match.scoreA}</span>
                            <span className="text-white/20 text-2xl">-</span>
                            <span className="text-[#FFB800] drop-shadow-[0_0_10px_rgba(255,184,0,0.5)]">{match.scoreB}</span>
                          </div>
                        ) : (
                          <span className="font-display font-black text-3xl text-white/20 tracking-widest">VS</span>
                        )}
                      </div>

                      {/* Team B */}
                      <div className="flex flex-col items-center gap-3 w-1/3">
                        <div className="w-16 h-16 rounded border border-[#FFB800]/40 bg-[#FFB800]/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,184,0,0.2)]">
                          <Shield className="w-8 h-8 text-[#FFB800]" />
                        </div>
                        <span className="font-display font-bold text-lg tracking-wider text-white text-center">{match.teamB}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* THE GLOBAL STAGE (Regions) */}
        <section className="py-24 bg-[#0a0a0a] border-y border-white/5 relative overflow-hidden">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[800px] opacity-20 pointer-events-none">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,102,255,0.2)_0%,transparent_70%)] mix-blend-screen" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <FadeIn>
              <div className="text-center mb-16">
                <Globe2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h2 className="font-display font-black text-4xl md:text-5xl tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">THE GLOBAL STAGE</h2>
                <p className="text-white/40 font-display font-bold tracking-widest mt-4">EVERY REGION. ONE DESTINATION.</p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {REGIONS.map((region, i) => (
                <FadeIn key={region.name} delay={i * 0.1}>
                  <div className="p-6 border border-white/5 bg-black hover:border-white/20 transition-colors group">
                    <h3 className="font-display font-bold text-2xl tracking-widest text-white group-hover:text-[#0066FF] transition-colors">{region.name}</h3>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                      <div className="flex flex-col">
                        <span className="text-white/40 text-[10px] font-display tracking-widest font-bold">CREWS</span>
                        <span className="text-xl font-display font-black text-white">{region.crews}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-white/40 text-[10px] font-display tracking-widest font-bold">STATUS</span>
                        <span className="text-xs font-display font-bold text-[#FFB800] tracking-wider">{region.status}</span>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* STAR PLAYER MOTM */}
        <section className="py-32 container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <FadeIn>
                <div className="inline-flex items-center gap-2 text-[#FFB800] font-display font-bold tracking-widest text-sm mb-4">
                  <Star className="w-4 h-4 fill-[#FFB800]" /> MATCHDAY 07 MVP
                </div>
                <h2 className="font-display font-black text-5xl md:text-7xl tracking-tighter text-white mb-6 uppercase leading-none">
                  THE ULTIMATE <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066FF] to-blue-400">GLORY</span>
                </h2>
                <p className="text-white/60 font-sans text-lg mb-8 max-w-md">
                  In a tournament where legends are forged, one player rose above the rest. Unmatched vision, lethal precision, absolute dominance.
                </p>
                <button className="px-8 py-4 border border-[#FFB800] text-[#FFB800] font-display font-bold tracking-widest hover:bg-[#FFB800] hover:text-black transition-all">
                  VIEW FULL HIGHLIGHTS
                </button>
              </FadeIn>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <FadeIn delay={0.3} className="relative aspect-[3/4] max-w-sm mx-auto">
                <div className="absolute inset-0 bg-gradient-to-b from-[#FFB800]/20 to-transparent rounded-t-full blur-3xl opacity-50" />
                <div className="relative h-full w-full border border-white/10 bg-gradient-to-b from-[#0a0a0a] to-[#050505] p-2 flex flex-col">
                  {/* Fake Card Graphic */}
                  <div className="flex-1 border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-6">
                    <div className="absolute top-4 left-4 font-display font-black text-4xl text-white">90<span className="text-sm text-[#FFB800] block mt-[-5px]">OVR</span></div>
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#0066FF] to-[#FFB800] blur-xl opacity-30 absolute top-1/4" />
                    
                    <div className="w-full flex-1 flex items-end justify-center pb-8 z-10">
                      {/* Silhouette */}
                      <div className="w-48 h-48 bg-white/5 rounded-t-full border-t border-white/20" />
                    </div>

                    <div className="w-full border-t border-white/10 pt-4 z-10 bg-[#050505]/80 backdrop-blur-sm">
                      <h3 className="font-display font-black text-2xl text-center text-white tracking-widest">CAPTAIN</h3>
                      <p className="font-display font-bold text-sm text-[#FFB800] tracking-[0.2em] text-center mt-1">CWC PLAYER</p>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                        <div>
                          <span className="text-white/40 text-[10px] font-display font-bold tracking-widest">PAC</span>
                          <p className="font-display font-bold text-white text-sm">92</p>
                        </div>
                        <div>
                          <span className="text-white/40 text-[10px] font-display font-bold tracking-widest">SHO</span>
                          <p className="font-display font-bold text-white text-sm">89</p>
                        </div>
                        <div>
                          <span className="text-white/40 text-[10px] font-display font-bold tracking-widest">PAS</span>
                          <p className="font-display font-bold text-white text-sm">91</p>
                        </div>
                        <div>
                          <span className="text-white/40 text-[10px] font-display font-bold tracking-widest">DRI</span>
                          <p className="font-display font-bold text-white text-sm">93</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* NEWS & REVEALS */}
        <section className="py-24 bg-[#0a0a0a] border-t border-white/5">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h2 className="font-display font-black text-4xl md:text-5xl tracking-widest text-white">TRANSMISSIONS</h2>
                  <p className="text-white/40 font-display font-bold tracking-widest mt-2">LATEST CWC INTEL</p>
                </div>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {NEWS.map((item, i) => (
                <FadeIn key={item.id} delay={i * 0.2}>
                  <Link href={`/cwc/news/${item.id}`} className="block group">
                    <div className="aspect-[16/9] bg-black border border-white/5 relative overflow-hidden mb-4 group-hover:border-[#0066FF]/40 transition-colors">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                      <div className="absolute bottom-4 left-4 z-20">
                         <span className="px-2 py-1 bg-[#0066FF] text-white font-display text-[10px] font-bold tracking-widest uppercase">
                           {item.category}
                         </span>
                      </div>
                      <div className="absolute inset-0 bg-white/5 group-hover:scale-105 transition-transform duration-700" />
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-display text-[#FFB800] text-xs font-bold tracking-widest">{item.date}</span>
                    </div>
                    <h3 className="font-display font-bold text-xl text-white group-hover:text-[#0066FF] transition-colors leading-tight">
                      {item.title}
                    </h3>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER CTA */}
        <section className="py-32 relative overflow-hidden flex items-center justify-center text-center">
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,184,0,0.1)_0%,transparent_50%)]" />
           <FadeIn className="relative z-10 max-w-2xl px-4">
             <Trophy className="w-16 h-16 text-[#FFB800] mx-auto mb-8 drop-shadow-[0_0_15px_rgba(255,184,0,0.5)]" />
             <h2 className="font-display font-black text-5xl tracking-widest text-white mb-6">WITNESS HISTORY</h2>
             <p className="text-white/60 font-sans mb-10">The battle for the ultimate crown continues. Join millions of fans worldwide.</p>
             <button className="px-10 py-5 bg-white text-black font-display font-black text-xl tracking-widest hover:bg-[#FFB800] transition-colors">
               ENTER THE ARENA
             </button>
           </FadeIn>
        </section>

      </div>
    </CWCLayout>
  );
}