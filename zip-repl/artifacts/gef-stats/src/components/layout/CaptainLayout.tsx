import { useCaptainAuth } from "@/hooks/use-captain-auth";
import { Link, useLocation, Redirect } from "wouter";
import {
  LayoutDashboard, Users, FileText, Wallet, ArrowRightLeft,
  ShieldAlert, Bell, LogOut, ChevronLeft, Shield, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  { href: "/captain/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/captain/squad", icon: Users, label: "My Squad" },
  { href: "/captain/contracts", icon: FileText, label: "Contracts" },
  { href: "/captain/budget", icon: Wallet, label: "Budget" },
  { href: "/captain/transactions", icon: ArrowRightLeft, label: "Transactions" },
  { href: "/captain/violations", icon: ShieldAlert, label: "Violations" },
  { href: "/captain/notifications", icon: Bell, label: "Notifications" },
];

export function CaptainLayout({ children }: { children: React.ReactNode }) {
  const { captain, isAuthenticated, isLoading, logout } = useCaptainAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-muted-foreground text-sm">Loading portal…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to={`/captain/login?from=${encodeURIComponent(location)}`} />;
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Club header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3 mb-1">
          {captain?.teamLogoUrl ? (
            <img src={captain.teamLogoUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-sm truncate leading-tight">{captain?.teamName ?? "My Club"}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Captain Portal</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-2">{captain?.name}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = location === href || location.startsWith(href + "/");
          return (
            <Link key={href} href={href}>
              <a
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-1">
        <Link href="/">
          <a className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to GEF Hub
          </a>
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-border bg-card flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-card border-r border-border flex flex-col z-10">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">{captain?.teamName ?? "Captain Portal"}</span>
          <div className="w-8" />
        </div>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
