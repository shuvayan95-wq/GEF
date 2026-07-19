import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-gef-dark" />
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hex_texture.png)` }}
      />
      
      {/* Glitch/Noise Overlay */}
      <motion.div 
        className="absolute inset-0 bg-gef-green/5"
        animate={{ opacity: [0, 0.1, 0, 0.05, 0] }}
        transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror" }}
      />

      <div className="relative z-10 w-full max-w-6xl px-12 grid grid-cols-3 gap-8">
        {/* Stat 1 */}
        <motion.div
          className="flex flex-col items-center justify-center bg-gef-gray/50 backdrop-blur-md border border-white/10 p-12 rounded-xl relative overflow-hidden"
          initial={{ y: 100, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
        >
          <motion.div 
            className="absolute top-0 left-0 w-full h-1 bg-gef-green"
            initial={{ scaleX: 0 }}
            animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
          <h2 className="font-display text-7xl lg:text-9xl text-white mb-2 leading-none">
            239
          </h2>
          <p className="font-body text-2xl tracking-[0.2em] text-gef-green uppercase font-bold">
            Players
          </p>
        </motion.div>

        {/* Stat 2 */}
        <motion.div
          className="flex flex-col items-center justify-center bg-gef-gray/50 backdrop-blur-md border border-white/10 p-12 rounded-xl relative overflow-hidden"
          initial={{ y: 100, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
        >
          <motion.div 
            className="absolute top-0 left-0 w-full h-1 bg-white"
            initial={{ scaleX: 0 }}
            animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
          <h2 className="font-display text-7xl lg:text-9xl text-white mb-2 leading-none">
            14
          </h2>
          <p className="font-body text-2xl tracking-[0.2em] text-white/70 uppercase font-bold">
            Teams
          </p>
        </motion.div>

        {/* Stat 3 */}
        <motion.div
          className="flex flex-col items-center justify-center bg-gef-gray/50 backdrop-blur-md border border-white/10 p-12 rounded-xl relative overflow-hidden"
          initial={{ y: 100, opacity: 0 }}
          animate={phase >= 3 ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
        >
          <motion.div 
            className="absolute top-0 left-0 w-full h-1 bg-gef-green"
            initial={{ scaleX: 0 }}
            animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
          <h2 className="font-display text-7xl lg:text-9xl text-gef-green text-glow mb-2 leading-none">
            1
          </h2>
          <p className="font-body text-2xl tracking-[0.2em] text-white uppercase font-bold">
            Federation
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
