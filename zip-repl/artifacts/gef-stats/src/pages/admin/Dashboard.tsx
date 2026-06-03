import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListPlayers, useListTeams, useListMatches } from "@workspace/api-client-react";
import { Users, Shield, Swords, Activity, Download, CheckCircle, Loader2, Medal } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export function Dashboard() {
  const { data: players } = useListPlayers();
  const { data: teams } = useListTeams();
  const { data: matches } = useListMatches();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const { data: gccData } = useQuery({
    queryKey: ["gcc-tournaments-count"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/gcc/tournaments"), { credentials: "include" });
      if (!r.ok) return { tournaments: [] };
      return r.json();
    },
  });
  const gccCount = gccData?.tournaments?.length ?? 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(getApiUrl("/api/export"), { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = `gef-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Backup downloaded successfully" });
    } catch {
      toast({ variant: "destructive", title: "Export failed", description: "Could not download backup" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold uppercase">System Overview</h1>
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          className="gap-2 border-green-500/40 text-green-400 hover:bg-green-500/10 hover:border-green-500/70"
        >
          {exporting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
          ) : (
            <><Download className="w-4 h-4" /> Backup All Data</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashCard
          title="Active Players"
          value={players?.length || 0}
          icon={Users}
          href="/admin/players"
          color="text-primary"
        />
        <DashCard
          title="Registered Teams"
          value={teams?.length || 0}
          icon={Shield}
          href="/admin/teams"
          color="text-blue-500"
        />
        <DashCard
          title="Matches Played"
          value={matches?.length || 0}
          icon={Swords}
          href="/admin/matches"
          color="text-accent"
        />
        <DashCard
          title="Champions Cup"
          value={gccCount}
          icon={Medal}
          href="/admin/gcc"
          color="text-blue-400"
        />
        <DashCard
          title="System Status"
          value="Online"
          icon={Activity}
          href="#"
          color="text-green-500"
        />
      </div>

      <div className="mt-8 bg-green-950/20 border border-green-700/30 rounded-xl p-5 flex items-start gap-4">
        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-green-400 text-sm">Data stored in Supabase — safe forever</p>
          <p className="text-muted-foreground text-xs mt-1">
            All players, matches, leagues, and stats are stored in your Supabase database. Your data is completely independent of Replit and will never be lost even if this project expires. Use <strong className="text-foreground">Backup All Data</strong> above to download a full JSON export at any time.
          </p>
        </div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        <p className="font-display text-xl uppercase">Welcome to GEF Administration</p>
        <p className="mt-2 text-sm">Select a module from the sidebar to manage system data.</p>
      </div>
    </AdminLayout>
  );
}

function DashCard({ title, value, icon: Icon, href, color }: any) {
  return (
    <Link href={href}>
      <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors cursor-pointer group shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-lg bg-secondary ${color} group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div>
          <div className="text-3xl font-display font-bold text-foreground">{value}</div>
          <div className="text-sm font-bold uppercase text-muted-foreground tracking-widest">{title}</div>
        </div>
      </div>
    </Link>
  );
}
