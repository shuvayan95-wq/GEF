import { CWCLayout } from "./CWCLayout";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ChevronRight, Trophy, Star, Swords, PlayCircle } from "lucide-react";
import { useRef } from "react";

// Fake Data
const NEWS = [
  { id: 1, title: "NEXUS DOMINATES GROUP STAGE, SETS SIGHTS ON THE CROWN", category: "RECAP", date: "MAY 20" },
  { id: 2, title: "THE RISE OF VANGUARD: A TACTICAL MASTERCLASS", category: "ANALYSIS", date: "MAY 22" },
  { id: 3, title: "ROYAL SECURES QUARTER FINAL SPOT IN DRAMATIC FASHION", category: "BREAKING", date: "MAY 24" },
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
            
            {/* CWC Logo — blended behind text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] max-w-[680px] aspect-square pointer-events-none select-none">
              <img
                src="/cwc-logo.png"
                alt=""
                className="w-full h-full object-contain"
                style={{ opacity: 0.18, filter: "blur(1px) drop-shadow(0 0 60px rgba(0,102,255,0.4)) drop-shadow(0 0 40px rgba(255,184,0,0.3))", mixBlendMode: "luminosity" }}
              />
              {/* Radial fade so edges dissolve into black */}
              <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, #050505 100%)" }} />
            </div>

            {/* Subtle spin rings on top of logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] max-w-[800px] aspect-square rounded-full flex items-center justify-center">
              <div className="absolute w-[80%] h-[80%] rounded-full border border-[#0066FF]/15 border-dotted animate-[spin_60s_linear_infinite]" />
              <div className="absolute w-[60%] h-[60%] rounded-full border border-[#FFB800]/15 animate-[spin_40s_linear_infinite_reverse]" />
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

          <FadeIn delay={0.2}>
            <div className="border border-white/5 bg-[#0a0a0a] py-20 flex flex-col items-center justify-center gap-4">
              <Swords className="w-10 h-10 text-white/10" />
              <p className="font-display font-bold tracking-widest text-white/20 text-sm">FIXTURES WILL APPEAR HERE AS THE TOURNAMENT BEGINS</p>
            </div>
          </FadeIn>
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