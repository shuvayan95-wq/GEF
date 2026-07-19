import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-gef-darker flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ scale: 0.8, opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full border-[40px] border-gef-green/10 m-12 rounded-3xl" />
      </div>

      <div className="relative w-full max-w-5xl px-8 flex flex-col gap-6">
        {/* Match 1 */}
        <motion.div
          className="w-full bg-gef-gray/80 backdrop-blur-md border-l-4 border-gef-green rounded-r-xl p-6 flex items-center justify-between shadow-2xl relative overflow-hidden"
          initial={{ x: -100, opacity: 0 }}
          animate={phase >= 1 ? { x: 0, opacity: 1 } : { x: -100, opacity: 0 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
        >
          <motion.div 
            className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-gef-green/10 to-transparent"
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          />

          <div className="flex-1 text-right pr-12">
            <h3 className="font-display text-4xl text-white uppercase tracking-wider">Expendables FC</h3>
          </div>
          
          <div className="flex items-center gap-6 z-10">
            <motion.div 
              className="bg-gef-darker border border-white/20 w-20 h-20 flex items-center justify-center rounded-lg"
              initial={{ scale: 0.5, rotateX: 90 }}
              animate={phase >= 2 ? { scale: 1, rotateX: 0 } : { scale: 0.5, rotateX: 90 }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.5 }}
            >
              <span className="font-display text-5xl text-white">3</span>
            </motion.div>
            <span className="font-body text-gef-green font-bold text-xl uppercase tracking-widest">-</span>
            <motion.div 
              className="bg-gef-green/20 border border-gef-green w-20 h-20 flex items-center justify-center rounded-lg box-glow"
              initial={{ scale: 0.5, rotateX: -90 }}
              animate={phase >= 2 ? { scale: 1, rotateX: 0 } : { scale: 0.5, rotateX: -90 }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.5, delay: 0.1 }}
            >
              <span className="font-display text-5xl text-gef-green">9</span>
            </motion.div>
          </div>

          <div className="flex-1 text-left pl-12">
            <h3 className="font-display text-4xl text-gef-green uppercase tracking-wider text-glow">Moneyball FC</h3>
          </div>
        </motion.div>

        {/* Match 2 */}
        <motion.div
          className="w-full bg-gef-gray/40 backdrop-blur-md border-l-4 border-white/20 rounded-r-xl p-6 flex items-center justify-between relative overflow-hidden"
          initial={{ x: -100, opacity: 0 }}
          animate={phase >= 3 ? { x: 0, opacity: 1 } : { x: -100, opacity: 0 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
        >
          <div className="flex-1 text-right pr-12">
            <h3 className="font-display text-3xl text-white/70 uppercase tracking-wider">Roma Aquilae</h3>
          </div>
          
          <div className="flex items-center gap-6 z-10 opacity-70">
            <motion.div 
              className="bg-gef-darker border border-white/10 w-16 h-16 flex items-center justify-center rounded-lg"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={phase >= 4 ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="font-display text-3xl text-white/70">4</span>
            </motion.div>
            <span className="font-body text-white/30 font-bold text-sm uppercase tracking-widest">-</span>
            <motion.div 
              className="bg-white/5 border border-white/20 w-16 h-16 flex items-center justify-center rounded-lg"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={phase >= 4 ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <span className="font-display text-3xl text-white/90">10</span>
            </motion.div>
          </div>

          <div className="flex-1 text-left pl-12">
            <h3 className="font-display text-3xl text-white/90 uppercase tracking-wider">Eclipse Order</h3>
          </div>
        </motion.div>
        
        {/* Decorative Text */}
        <motion.div
           className="absolute -bottom-20 -right-10 font-display text-[15vw] text-stroke-white opacity-10 leading-none pointer-events-none"
           initial={{ y: 50 }}
           animate={{ y: 0 }}
           transition={{ duration: 2, ease: "easeOut" }}
        >
          RESULTS
        </motion.div>

      </div>
    </motion.div>
  );
}
