import { useQuery } from "@tanstack/react-query";
import { CaptainLayout } from "@/components/layout/CaptainLayout";
import { useCaptainAuth } from "@/hooks/use-captain-auth";
import { getApiUrl } from "@/lib/api";
import { Link } from "wouter";
import {
  Wallet, Users, TrendingUp, Bell, ShieldAlert,
  ArrowRightLeft, FileText, Trophy, Loader2, ChevronRight,
} from "lucide-react";

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

export function CaptainDashboard() {
  const { captain } = useCaptainAuth();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["captain-dashboard"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/captain/dashboard"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <CaptainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
        </div>
      </CaptainLayout>
    );
  }

  const fin = data?.financials;
  const initialBudget = Number(fin?.budget ?? 0);
  const transferBudget = Number(fin?.transferBudget ?? 0);
  const wageBudget = Number(fin?.wageBudget ?? 0);
  const income = Number(fin?.income ?? 0);
  const expenses = Number(fin?.expenses ?? 0);
  // Current spendable balance = initial allocation + income − expenses
  const currentBalance = initialBudget + income - expenses;

  const STAT_CARDS = [
    {
      label: "Current Balance",
      value: fmt(currentBalance),
      icon: Wallet,
      color: "text-green-400",
      bg: "bg-green-950/20 border-green-800/30",
      href: "/captain/budget",
    },
    {
      label: "Transfer Budget",
      value: fmt(transferBudget),
      icon: ArrowRightLeft,
      color: "text-blue-400",
      bg: "bg-blue-950/20 border-blue-800/30",
      href: "/captain/budget",
    },
    {
      label: "Wage Budget",
      value: fmt(wageBudget),
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-950/20 border-purple-800/30",
      href: "/captain/budget",
    },
    {
      label: "Squad Size",
      value: data?.playerCount ?? 0,
      icon: Users,
      color: "text-amber-400",
      bg: "bg-amber-950/20 border-amber-800/30",
      href: "/captain/squad",
    },
    {
      label: "Total Wage Bill",
      value: fmt(data?.totalWageBill ?? 0),
      icon: FileText,
      color: "text-orange-400",
      bg: "bg-orange-950/20 border-orange-800/30",
      href: "/captain/squad",
    },
    {
      label: "Notifications",
      value: data?.unreadNotifications ?? 0,
      icon: Bell,
      color: data?.unreadNotifications > 0 ? "text-red-400" : "text-muted-foreground",
      bg: data?.unreadNotifications > 0 ? "bg-red-950/20 border-red-800/30" : "bg-secondary/30 border-border",
      href: "/captain/notifications",
    },
  ];

  const QUICK_LINKS = [
    { href: "/captain/squad", icon: Users, label: "View Squad", desc: `${data?.playerCount ?? 0} active players` },
    { href: "/captain/transactions", icon: ArrowRightLeft, label: "Transactions", desc: "Financial history" },
    { href: "/captain/violations", icon: ShieldAlert, label: "Violations", desc: "Club disciplinary record" },
    { href: "/captain/contracts", icon: FileText, label: "Contracts", desc: "Player contracts" },
  ];

  return (
    <CaptainLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          {captain?.teamLogoUrl ? (
            <img src={captain.teamLogoUrl} alt="" className="w-14 h-14 rounded-xl border border-border object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wide">{captain?.teamName ?? "My Club"}</h1>
            <p className="text-sm text-muted-foreground">Welcome back, <span className="font-semibold text-foreground">{captain?.name}</span></p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {STAT_CARDS.map(({ label, value, icon: Icon, color, bg, href }) => (
            <Link key={label} href={href}>
              <a className={`block rounded-xl border p-4 hover:brightness-110 transition-all cursor-pointer ${bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
              </a>
            </Link>
          ))}
        </div>

        {/* Budget bar */}
        {totalBudget > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wider">Budget Allocation</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Transfer: <span className="text-blue-400 font-bold font-mono">{fmt(transferBudget)}</span></span>
                <span>Wage: <span className="text-purple-400 font-bold font-mono">{fmt(wageBudget)}</span></span>
                <span>Total: <span className="text-green-400 font-bold font-mono">{fmt(totalBudget)}</span></span>
              </div>
              <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${totalBudget > 0 ? (transferBudget / totalBudget) * 100 : 0}%` }} />
                <div className="h-full bg-purple-500 transition-all" style={{ width: `${totalBudget > 0 ? (wageBudget / totalBudget) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-muted-foreground/60">
                Unallocated: {fmt(Math.max(0, totalBudget - transferBudget - wageBudget))}
              </p>
            </div>
            <Link href="/captain/budget">
              <a className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                Manage allocation <ChevronRight className="w-3 h-3" />
              </a>
            </Link>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_LINKS.map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}>
              <a className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10">
                  <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </Link>
          ))}
        </div>
      </div>
    </CaptainLayout>
  );
}
