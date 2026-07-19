import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden"
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)', scale: 0.9 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Cinematic Stadium BG */}
      <motion.video
        src={`${import.meta.env.BASE_URL}videos/stadium_bg.mp4`}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 5, ease: 'linear' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />

      {/* Trophy Reveal */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center w-full h-full"
      >
        <motion.img 
          src={`${import.meta.env.BASE_URL}images/trophy.png`}
          className="h-[60vh] object-contain drop-shadow-[0_0_30px_rgba(0,255,136,0.3)] mix-blend-screen"
          initial={{ y: 100, opacity: 0, filter: 'blur(20px)', scale: 0.8 }}
          animate={phase >= 1 ? { y: 0, opacity: 1, filter: 'blur(0px)', scale: 1 } : { y: 100, opacity: 0, filter: 'blur(20px)', scale: 0.8 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />

        <div className="absolute bottom-20 text-center w-full px-12">
          <motion.h2 
            className="font-display text-5xl md:text-7xl text-white tracking-widest uppercase mb-4"
            initial={{ y: 30, opacity: 0, scale: 0.9 }}
            animate={phase >= 2 ? { y: 0, opacity: 1, scale: 1 } : { y: 30, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
          >
            Nexus Premier <span className="text-gef-green text-glow block md:inline mt-2 md:mt-0">Championship</span>
          </motion.h2>

          <motion.div
            className="w-24 h-1 bg-gef-green mx-auto mb-4 box-glow"
            initial={{ scaleX: 0 }}
            animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.6 }}
          />
          
          <motion.p
            className="font-body text-xl tracking-[0.3em] text-white/70 uppercase"
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            The Ultimate Glory
          </motion.p>
        </div>
      </motion.div>
      
      {/* Light Sweep Effect */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent w-full h-[200%] -skew-y-12 pointer-events-none"
        initial={{ x: '-150%', y: '-150%' }}
        animate={phase >= 2 ? { x: '150%', y: '150%' } : { x: '-150%', y: '-150%' }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
