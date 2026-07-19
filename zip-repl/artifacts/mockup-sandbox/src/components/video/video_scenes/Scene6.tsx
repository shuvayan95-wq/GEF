import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-gef-darker flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <motion.video
        src={`${import.meta.env.BASE_URL}videos/energy_crack.mp4`}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
        style={{ filter: 'grayscale(100%)' }}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <div className="relative z-10 text-center max-w-4xl px-8 flex flex-col items-center">
        <motion.div className="flex flex-col gap-2 overflow-hidden mb-12">
          <motion.h2 
            className="font-display text-4xl md:text-6xl text-white tracking-widest uppercase leading-tight"
            initial={{ y: "100%", opacity: 0 }}
            animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0 }}
          >
            The Game is <span className="text-white/50 italic">Tracked</span>.
          </motion.h2>
          <motion.h2 
            className="font-display text-5xl md:text-7xl text-gef-green text-glow tracking-widest uppercase leading-tight"
            initial={{ y: "100%", opacity: 0 }}
            animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0 }}
          >
            The Legends are Made.
          </motion.h2>
        </motion.div>

        <motion.div
          className="flex flex-col items-center mt-8 pt-8 border-t border-white/10 w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="font-display text-3xl tracking-[0.5em] text-white flex items-center gap-4">
            GEF<span className="w-1.5 h-1.5 bg-gef-green rounded-full box-glow" />STATS
          </div>
          <p className="font-body text-sm tracking-[0.3em] text-white/50 uppercase mt-4">
            Join the Federation
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
