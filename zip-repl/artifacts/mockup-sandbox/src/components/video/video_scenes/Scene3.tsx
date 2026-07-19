import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1300),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full overflow-hidden bg-gef-darker"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ x: '-100%', filter: 'blur(10px)' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient from-gef-green/10 to-transparent opacity-50" />
      
      {/* Big Background Typography */}
      <motion.div
        className="absolute -right-20 top-1/2 -translate-y-1/2 font-display text-[25vw] text-stroke-white opacity-20 leading-none pointer-events-none select-none"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 0.1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        ROSTER
      </motion.div>

      <div className="relative w-full h-full flex items-center justify-center perspective-[1000px]">
        {/* Card 1 (Back left) */}
        <motion.div
          className="absolute z-10 w-64 h-96 bg-gradient-to-b from-gef-gray to-gef-dark border-2 border-white/10 rounded-2xl p-4 flex flex-col items-center shadow-2xl overflow-hidden"
          initial={{ x: -300, y: 100, rotateY: -30, rotateZ: -10, opacity: 0, scale: 0.8 }}
          animate={phase >= 2 ? { x: -250, y: 0, rotateY: 15, rotateZ: -5, opacity: 0.6, scale: 0.9 } : { x: -300, y: 100, rotateY: -30, rotateZ: -10, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </motion.div>

        {/* Card 2 (Front Center) */}
        <motion.div
          className="absolute z-30 w-80 h-[28rem] bg-gradient-to-br from-gef-gray to-gef-darker border-2 border-gef-green/50 rounded-2xl overflow-hidden box-glow"
          initial={{ y: 200, scale: 0.8, opacity: 0, rotateX: 20 }}
          animate={phase >= 1 ? { y: 0, scale: 1, opacity: 1, rotateX: 0 } : { y: 200, scale: 0.8, opacity: 0, rotateX: 20 }}
          transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gef-green/20 blur-3xl rounded-full" />
          
          {/* OVR Rating */}
          <div className="absolute top-4 left-4 z-10 flex flex-col items-center bg-black/40 backdrop-blur p-2 rounded-lg border border-gef-green/30">
            <span className="font-display text-4xl text-gef-green leading-none">74.5</span>
            <span className="font-body text-xs text-white/70 uppercase font-bold tracking-widest">OVR</span>
          </div>

          <div className="w-full h-2/3 bg-gef-dark relative">
             <img 
               src={`${import.meta.env.BASE_URL}images/player_bunty.png`}
               className="w-full h-full object-cover object-top mix-blend-luminosity opacity-80"
               alt="Player"
             />
             <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-gef-darker to-transparent" />
          </div>

          <div className="p-6 text-center">
            <h3 className="font-display text-4xl text-white uppercase tracking-wider">Bunty</h3>
            <p className="font-body text-gef-green font-semibold uppercase tracking-widest text-sm mt-1">Expendables FC</p>
            
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/10">
               <div className="text-center">
                 <div className="text-white font-display text-xl">42</div>
                 <div className="text-white/50 text-[10px] uppercase tracking-wider">W</div>
               </div>
               <div className="text-center">
                 <div className="text-white font-display text-xl">12</div>
                 <div className="text-white/50 text-[10px] uppercase tracking-wider">D</div>
               </div>
               <div className="text-center">
                 <div className="text-white font-display text-xl">8</div>
                 <div className="text-white/50 text-[10px] uppercase tracking-wider">L</div>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Card 3 (Back Right) */}
        <motion.div
          className="absolute z-20 w-72 h-[26rem] bg-gradient-to-b from-gef-gray to-gef-dark border-2 border-white/20 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          initial={{ x: 300, y: 100, rotateY: 30, rotateZ: 10, opacity: 0, scale: 0.8 }}
          animate={phase >= 3 ? { x: 250, y: 20, rotateY: -15, rotateZ: 5, opacity: 0.8, scale: 0.9 } : { x: 300, y: 100, rotateY: 30, rotateZ: 10, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.2 }}
        >
          {/* OVR Rating */}
          <div className="absolute top-4 left-4 z-10 flex flex-col items-center bg-black/40 backdrop-blur p-2 rounded-lg border border-white/20">
            <span className="font-display text-3xl text-white leading-none">68.3</span>
            <span className="font-body text-xs text-white/50 uppercase font-bold tracking-widest">OVR</span>
          </div>

          <div className="w-full h-2/3 relative">
             <img 
               src={`${import.meta.env.BASE_URL}images/player_arif.png`}
               className="w-full h-full object-cover object-top mix-blend-luminosity opacity-60"
               alt="Player"
             />
             <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-gef-dark to-transparent" />
          </div>
          <div className="p-4 text-center">
            <h3 className="font-display text-3xl text-white/90 uppercase tracking-wider">Arif</h3>
            <p className="font-body text-white/60 font-semibold uppercase tracking-widest text-xs mt-1">Moneyball FC</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
