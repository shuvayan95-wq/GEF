import { useState, useMemo } from "react";
import { CWCLayout } from "./CWCLayout";
import { useGetCwcCrews } from "@/hooks/use-cwc";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Trophy, Users, Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CWCCrewsList() {
  const { data: crews, isLoading } = useGetCwcCrews();

  return (
    <CWCLayout>
      <div className="min-h-screen bg-[#050505] relative overflow-hidden py-24">
        {/* Ambient background */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#0066FF]/10 to-transparent pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center max-w-3xl mx-auto"
          >
            <h1 className="font-display font-black text-6xl md:text-8xl tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] uppercase">
              REGISTERED <span className="text-[#FFB800] drop-shadow-[0_0_30px_rgba(255,184,0,0.5)]">CREWS</span>
            </h1>
            <p className="font-display text-[#0066FF] text-xl font-bold tracking-[0.3em] uppercase drop-shadow-[0_0_10px_rgba(0,102,255,0.8)]">
              The elite forces competing for world domination
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-16 h-16 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !crews || crews.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="border border-white/5 bg-[#0a0a0a] py-32 flex flex-col items-center justify-center gap-6 text-center"
            >
              <Trophy className="w-16 h-16 text-white/10" />
              <div>
                <h3 className="font-display font-black text-2xl tracking-widest text-white mb-2">NO CREWS REGISTERED</h3>
                <p className="text-white/40 font-sans">The tournament bracket is awaiting its contenders.</p>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {crews.map((crew, idx) => (
                <motion.div
                  key={crew.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Link href={`/cwc/crews/${crew.slug}`} className="block h-full group">
                    <div className="h-full border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-sm relative overflow-hidden transition-all duration-500 group-hover:border-[#0066FF]/50 group-hover:shadow-[0_0_30px_rgba(0,102,255,0.15)] flex flex-col">
                      
                      {/* Banner / Header area */}
                      <div className="h-32 bg-[#050505] relative overflow-hidden flex-shrink-0">
                        {crew.bannerUrl ? (
                          <img src={crew.bannerUrl} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#0066FF]/20 to-[#FFB800]/10" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                        
                        {crew.powerRanking && (
                          <div className="absolute top-4 right-4 bg-[#FFB800] text-black font-display font-bold text-xs tracking-widest px-2 py-1 rounded shadow-[0_0_10px_rgba(255,184,0,0.5)] z-10 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-black" /> RANK #{crew.powerRanking}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6 pt-0 relative flex-1 flex flex-col">
                        {/* Logo overlapping banner */}
                        <div className="w-20 h-20 rounded bg-[#050505] border border-white/20 p-2 mb-4 -mt-10 relative z-10 shadow-xl group-hover:border-[#FFB800]/50 transition-colors bg-gradient-to-b from-[#111] to-[#050505]">
                          {crew.logoUrl ? (
                            <img src={crew.logoUrl} alt={crew.name} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-display font-black text-2xl text-white/20">
                              {crew.name.substring(0,2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <h2 className="font-display font-black text-2xl text-white tracking-widest mb-1 group-hover:text-[#0066FF] transition-colors line-clamp-1">{crew.name}</h2>
                        
                        {crew.region && (
                          <div className="font-display text-[#FFB800] text-xs font-bold tracking-widest mb-4 uppercase">
                            {crew.region} {crew.country ? `• ${crew.country}` : ''}
                          </div>
                        )}

                        <p className="text-white/50 text-sm mb-6 line-clamp-2 flex-1">
                          {crew.tagline || (crew.story ? crew.story : "No tagline provided.")}
                        </p>

                        <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-auto">
                          <div className="flex items-center gap-2 text-white/40 text-sm font-display font-bold tracking-widest">
                            <Users className="w-4 h-4" /> {crew.rosterSize || 0} PLAYERS
                          </div>
                          <ArrowRight className="w-5 h-5 text-[#0066FF] group-hover:translate-x-1 group-hover:text-[#FFB800] transition-all" />
                        </div>

                        {/* Hover flare */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#0066FF]/0 to-[#0066FF]/0 group-hover:from-[#0066FF]/5 group-hover:to-transparent pointer-events-none transition-colors duration-500" />
                      </div>

                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CWCLayout>
  );
}
