import { useAppAuth } from "@/hooks/use-app-auth";
import { Link, useLocation, Redirect } from "wouter";
import { 
  Users, 
  ShieldAlert, 
  Swords, 
  Trophy,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  Globe,
  Star,
  Scale,
  Award,
  Tv2,
  DatabaseZap,
  ArrowRightLeft,
  Newspaper,
  Medal,
  Wallet,
  Layers,
  Tag,
  Zap,
  FileText,
  Sparkles,
  BarChart2,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAppAuth();
  const [location] = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  
  if (!isAuthenticated) {
    return <Redirect to={`/login?from=${encodeURIComponent(location)}`} />;
  }

  const ADMIN_LINKS = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/cms", icon: Newspaper, label: "Homepage & CMS" },
    { href: "/admin/leagues", icon: Globe, label: "Manage Leagues" },
    { href: "/admin/players", icon: Users, label: "Manage Players" },
    { href: "/admin/taglist", icon: Tag, label: "Taglist IDs" },
    { href: "/admin/teams", icon: ShieldAlert, label: "Manage Teams" },
    { href: "/admin/matches", icon: Swords, label: "Manage Matches" },
    { href: "/admin/awards", icon: Trophy, label: "Manage Awards" },
    { href: "/admin/trophies", icon: Star, label: "Trophy Cabinet" },
    { href: "/admin/transfers", icon: ArrowRightLeft, label: "Transfers" },
    { href: "/admin/ffp", icon: Scale, label: "Financial Fair Play" },
    { href: "/admin/budget", icon: Wallet, label: "Club Budgets" },
    { href: "/admin/gcc", icon: Medal, label: "Champions Cup" },
    { href: "/admin/ballon-dor", icon: Award, label: "Ballon d'Or" },
    { href: "/admin/hall-of-fame", icon: Trophy, label: "Hall of Fame" },
    { href: "/admin/ceremony", icon: Tv2, label: "Live Ceremony" },
    { href: "/admin/efootball-world", icon: Globe, label: "eFootball World" },
    { href: "/admin/cards", icon: Layers, label: "eFootball Cards" },
    { href: "/admin/contracts", icon: FileText, label: "Contracts" },
    { href: "/admin/salaries", icon: DollarSign, label: "Salary Management" },
    { href: "/admin/cups", icon: Trophy, label: "Knockout Cups" },
    { href: "/admin/sports-desk", icon: Zap, label: "AI Sports Desk" },
    { href: "/admin/predictions", icon: Sparkles, label: "AI Predictions" },
    { href: "/admin/potw", icon: Star, label: "Player of the Week" },
    { href: "/admin/power-rankings", icon: BarChart2, label: "Power Rankings" },
    { href: "/admin/import", icon: DatabaseZap, label: "Import Data" },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex-shrink-0 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="font-display font-bold text-xl text-primary tracking-widest">ADMIN PANEL</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {ADMIN_LINKS.map((link) => {
            const isActive = location === link.href || (link.href !== '/admin' && location.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Link href="/">
            <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium text-muted-foreground hover:bg-secondary transition-colors mb-2">
              <ChevronLeft className="w-5 h-5" /> Back to Site
            </button>
          </Link>
          <button 
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="h-16 md:hidden border-b border-border bg-card flex items-center justify-between px-4">
           <span className="font-display font-bold text-primary">ADMIN PANEL</span>
           <Link href="/">
             <button className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors">
               Back to Site
             </button>
           </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
