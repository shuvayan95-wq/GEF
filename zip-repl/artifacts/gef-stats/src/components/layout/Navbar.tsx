import { Link, useLocation } from "wouter";
import { useAppAuth } from "@/hooks/use-app-auth";
import { Button } from "@/components/ui/button";
import { Gamepad2, ShieldAlert, LogOut, Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Players" },
  { href: "/teams", label: "Teams" },
  { href: "/taglist", label: "Taglist" },
  { href: "/efootball-world", label: "eFootball World" },
  { href: "/matches", label: "Matches" },
  { href: "/leagues", label: "Leagues" },
  { href: "/trophies", label: "Trophies" },
  { href: "/gcc", label: "Champions Cup" },
  { href: "/ballon-dor", label: "Ballon d'Or" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
  { href: "/transfers", label: "Transfers" },
  { href: "/market", label: "Market" },
  { href: "/ffp", label: "FFP" },
  { href: "/h2h", label: "H2H" },
  { href: "/compare", label: "Compare" },
  { href: "/ai-news", label: "Sports Desk" },
  { href: "/predictions", label: "🔮 Predictions" },
  { href: "/player-of-the-week", label: "⭐ POTW" },
  { href: "/rivalry", label: "⚔️ Rivalry" },
  { href: "/power-rankings", label: "📊 Power Rankings" },
];

export function Navbar() {
  const [location] = useLocation();
  const { isAuthenticated, logout } = useAppAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 scanline-overlay">
      {/* Animated neon bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
        <div
          className="h-full w-full"
          style={{
            background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.0) 20%, hsl(var(--primary)/0.8) 50%, hsl(var(--primary)/0.0) 80%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "energy-sweep 4s linear infinite",
            boxShadow: "0 0 8px hsl(var(--primary)/0.4)",
          }}
        />
      </div>

      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="reticle relative w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary transition-all group-hover:shadow-[0_0_18px_hsl(var(--primary)/0.5)] duration-300">
            <Gamepad2 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-black text-xl tracking-widest text-foreground group-hover:text-primary transition-colors duration-300 glitch">GEF</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-primary font-bold flex items-center gap-1">
              <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-primary live-dot" />
              Stats
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-0.5 overflow-x-auto max-w-full scrollbar-hide">
          {NAV_LINKS.map((link) => {
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href} className="relative px-3 py-2 shrink-0">
                <span className={cn(
                  "relative z-10 font-display font-semibold text-[13px] tracking-wide transition-all duration-200",
                  isActive
                    ? "text-primary neon-text-pulse"
                    : "text-muted-foreground hover:text-foreground"
                )}>
                  {link.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 z-0 rounded-t-md overflow-hidden"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  >
                    <div className="absolute inset-0 bg-primary/8" />
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{
                        background: "hsl(var(--primary))",
                        boxShadow: "0 0 10px hsl(var(--primary)/0.9), 0 0 20px hsl(var(--primary)/0.5), 0 -1px 8px hsl(var(--primary)/0.3)",
                      }}
                    />
                  </motion.div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="gaming" size="sm" className="gap-1.5 text-xs">
                  <ShieldAlert className="w-3.5 h-3.5" /> Admin
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => logout()} title="Logout">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-border/60 hover:border-primary/50 hover:text-primary transition-colors">
                <Zap className="w-3 h-3" /> Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden relative p-2 text-muted-foreground hover:text-primary transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileMenuOpen ? (
              <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Menu className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t border-primary/20 bg-background/95 backdrop-blur-xl"
          >
            {/* Top accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="flex flex-col py-4 px-4 gap-1">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-md font-display font-semibold text-sm tracking-wide transition-all",
                      location === link.href
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {location === link.href && (
                      <span className="w-1 h-1 rounded-full bg-primary shrink-0"
                        style={{ boxShadow: "0 0 6px hsl(var(--primary))" }} />
                    )}
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="h-px bg-border my-2" />
              {isAuthenticated ? (
                <div className="flex flex-col gap-1">
                  <Link href="/admin" className="p-3 rounded-md font-display font-semibold text-sm text-primary hover:bg-primary/10 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <ShieldAlert className="w-4 h-4" /> Admin Dashboard
                  </Link>
                  <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="p-3 rounded-md font-display font-semibold text-sm text-destructive text-left hover:bg-secondary flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              ) : (
                <Link href="/login" className="p-3 rounded-md font-display font-semibold text-sm text-muted-foreground hover:bg-secondary flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <Zap className="w-4 h-4" /> Admin Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
