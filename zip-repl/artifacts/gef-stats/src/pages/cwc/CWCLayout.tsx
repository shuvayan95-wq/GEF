import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CWC_LINKS = [
  { href: "/cwc", label: "HOME" },
  { href: "/cwc/crews", label: "CREWS" },
  { href: "/cwc/matches", label: "MATCHES" },
  { href: "/cwc/news", label: "NEWS" },
  { href: "/cwc/highlights", label: "HIGHLIGHTS" },
];

export function CWCLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [showIntro, setShowIntro] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const skip = new URLSearchParams(window.location.search).get("preview");
    const hasPlayed = sessionStorage.getItem("cwc_intro_played");
    if (!hasPlayed && !skip) {
      setShowIntro(true);
    }
  }, []);

  const handleSkipIntro = () => {
    setShowIntro(false);
    sessionStorage.setItem("cwc_intro_played", "true");
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem("cwc_intro_played", "true");
  };

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white font-sans selection:bg-[#0066FF]/30 selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0066FF]/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFB800]/10 blur-[120px]" />
      </div>

      <AnimatePresence>
        {showIntro && (
          <motion.div
            className="fixed inset-0 z-[100] bg-[#000000] flex flex-col items-center justify-center overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            onAnimationComplete={handleIntroComplete}
          >
            {/* Particles */}
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  background: i % 2 === 0 ? "#0066FF" : "#FFB800",
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  boxShadow: `0 0 10px ${i % 2 === 0 ? "#0066FF" : "#FFB800"}`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [0, -50],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 1,
                  repeat: Infinity,
                }}
              />
            ))}

            <motion.div
              initial={{ scale: 0.9, opacity: 0, filter: "blur(10px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
              className="text-center z-10"
            >
              <h1 className="font-display font-black text-5xl md:text-7xl lg:text-8xl tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] uppercase">
                GEF <span className="text-[#FFB800] drop-shadow-[0_0_30px_rgba(255,184,0,0.5)]">CREW</span><br />
                WORLD CUP
              </h1>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 1.8 }}
                className="mt-6"
              >
                <p className="font-display text-[#0066FF] font-bold tracking-[0.4em] text-sm md:text-lg drop-shadow-[0_0_10px_rgba(0,102,255,0.8)]">
                  ONE CREW. ONE FLAG. ONE WORLD.
                </p>
              </motion.div>
            </motion.div>

            {/* Auto-advance timer logic simulated with a hidden element */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1, delay: 3.5 }}
              onAnimationComplete={handleIntroComplete}
            />

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              onClick={handleSkipIntro}
              className="absolute bottom-8 right-8 text-white/50 hover:text-white font-display text-sm tracking-widest uppercase z-20"
            >
              Skip Intro
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CWC Navbar */}
      <header className="sticky top-0 z-50 w-full bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <Link href="/" className="text-white/50 hover:text-white transition-colors group flex items-center gap-2 text-sm font-display tracking-wider">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              BACK TO GEF
            </Link>
            
            <div className="hidden md:block w-px h-6 bg-white/10" />

            <Link href="/cwc" className="flex flex-col leading-none shrink-0 group">
              <span className="font-display font-black text-xl tracking-widest text-[#FFB800] group-hover:drop-shadow-[0_0_15px_rgba(255,184,0,0.6)] transition-all">GEF</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white font-bold font-display">
                CREW WORLD CUP
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {CWC_LINKS.map(link => {
              const isActive = location === link.href || (link.href !== "/cwc" && location.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href} className="relative px-4 py-2 group">
                  <span className={cn(
                    "relative z-10 font-display font-bold text-sm tracking-widest transition-colors",
                    isActive ? "text-white" : "text-white/60 group-hover:text-white"
                  )}>
                    {link.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="cwc-nav"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-[#0066FF] shadow-[0_0_10px_rgba(0,102,255,0.8)]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-[#0a0a0a] border-b border-white/10 overflow-hidden"
            >
              <div className="flex flex-col py-4 px-4 gap-2">
                {CWC_LINKS.map(link => {
                  const isActive = location === link.href || (link.href !== "/cwc" && location.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "p-3 rounded font-display font-bold text-sm tracking-widest flex items-center gap-3 transition-colors",
                        isActive ? "bg-[#0066FF]/10 text-white border border-[#0066FF]/30" : "text-white/60 hover:bg-white/5"
                      )}
                    >
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] shadow-[0_0_8px_rgba(0,102,255,1)]" />}
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10">
        {children}
      </main>

    </div>
  );
}
