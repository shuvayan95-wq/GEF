import { useQuery } from "@tanstack/react-query";
import { CaptainLayout } from "@/components/layout/CaptainLayout";
import { getApiUrl } from "@/lib/api";
import { Loader2, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

function fmt(n: number) { return "$" + Math.round(n).toLocaleString(); }

export function CaptainSquad() {
  const [search, setSearch] = useState("");

  const { data: players = [], isLoading } = useQuery<any[]>({
    queryKey: ["captain-squad"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/captain/squad"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const filtered = players.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.nationality?.toLowerCase().includes(search.toLowerCase())
  );

  const active = players.filter(p => p.status === "active");
  const totalWageBill = active.reduce((s, p) => s + Number(p.salary || 10000), 0);

  return (
    <CaptainLayout>
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wide">My Squad</h1>
            <p className="text-sm text-muted-foreground">{active.length} active players · Total wage bill: <span className="text-foreground font-bold font-mono">{fmt(totalWageBill)}</span></p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players…" className="pl-9 bg-background" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? "No players match your search" : "No players in squad"}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">#</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Player</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Nationality</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">OVR</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Position</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Salary</th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p, i) => (
                  <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.nationality ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold font-mono text-primary">{p.cardOvr ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.lineupRole ?? p.teamRole ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-green-400">
                      {fmt(Number(p.salary || 10000))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-secondary text-muted-foreground border border-border"}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CaptainLayout>
  );
}
