import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500), // Exit phase
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-gef-darker flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 1.2, opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background Video */}
      <motion.video
        src={`${import.meta.env.BASE_URL}videos/energy_crack.mp4`}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 4, ease: 'linear' }}
      />

      {/* Hex Pattern Overlay */}
      <div className="absolute inset-0 hex-pattern opacity-30" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent to-gef-darker opacity-80" />

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <motion.div
          className="relative"
          initial={{ scale: 0.8, filter: 'blur(20px)', opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, filter: 'blur(0px)', opacity: 1 } : { scale: 0.8, filter: 'blur(20px)', opacity: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
        >
          <h1 className="font-display text-[8vw] leading-none tracking-tight text-white m-0 uppercase flex flex-col items-center">
            <span className="block">Global</span>
            <span className="block text-gef-green text-glow">eFootball</span>
            <span className="block">Federation</span>
          </h1>
          
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[2px] bg-gef-green"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={phase >= 2 ? { scaleX: 1, opacity: 0.7, rotate: -5 } : { scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        <motion.p
          className="font-body text-xl md:text-3xl tracking-[0.3em] text-white/70 uppercase mt-8"
          initial={{ y: 20, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Season 2025/26
        </motion.p>
      </div>
    </motion.div>
  );
}
