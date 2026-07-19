import { useQuery } from "@tanstack/react-query";
import { CaptainLayout } from "@/components/layout/CaptainLayout";
import { getApiUrl } from "@/lib/api";
import { Loader2, FileText } from "lucide-react";

function fmt(n: number | null) { return n != null ? "$" + Math.round(n).toLocaleString() : "—"; }

export function CaptainContracts() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["captain-contracts"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/captain/contracts"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const now = new Date();
  const expiringIn90 = data.filter(({ contract: c }) => {
    if (!c.endDate || c.status !== "active") return false;
    const end = new Date(c.endDate);
    const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 90;
  });

  return (
    <CaptainLayout>
      <div className="space-y-5 max-w-5xl">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wide">Player Contracts</h1>
          <p className="text-sm text-muted-foreground">{data.length} contracts · {expiringIn90.length} expiring within 90 days</p>
        </div>

        {expiringIn90.length > 0 && (
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-4 text-sm text-amber-400">
            ⚠️ <strong>{expiringIn90.length} contract{expiringIn90.length > 1 ? "s" : ""}</strong> expiring in the next 90 days:{" "}
            {expiringIn90.map(r => r.player.name).join(", ")}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No contracts found</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Player</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Start</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">End</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Salary</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Bonus</th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map(({ contract: c, player: p }) => {
                  const isExpiringSoon = (() => {
                    if (!c.endDate || c.status !== "active") return false;
                    const end = new Date(c.endDate);
                    const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                    return diff >= 0 && diff <= 90;
                  })();
                  return (
                    <tr key={c.id} className={`hover:bg-secondary/20 transition-colors ${isExpiringSoon ? "bg-amber-950/10" : ""}`}>
                      <td className="px-4 py-3 font-semibold">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{c.startDate}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={isExpiringSoon ? "text-amber-400 font-bold" : "text-muted-foreground"}>{c.endDate}</span>
                        {isExpiringSoon && <span className="ml-1 text-[10px] text-amber-400">(soon)</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-green-400">{fmt(c.salaryAmount != null ? Number(c.salaryAmount) : null)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(c.bonusAmount != null ? Number(c.bonusAmount) : null)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${c.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-secondary text-muted-foreground border-border"}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CaptainLayout>
  );
}
