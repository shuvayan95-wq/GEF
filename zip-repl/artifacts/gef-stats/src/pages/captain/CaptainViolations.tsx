import { useQuery } from "@tanstack/react-query";
import { CaptainLayout } from "@/components/layout/CaptainLayout";
import { getApiUrl } from "@/lib/api";
import { Loader2, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  late_submission: "Late Submission",
  rule_violation: "Rule Violation",
  walkover: "Walkover",
  financial_penalty: "Financial Penalty",
  disciplinary: "Disciplinary",
};

const TYPE_COLORS: Record<string, string> = {
  late_submission: "text-yellow-400 bg-yellow-950/20 border-yellow-800/30",
  rule_violation: "text-orange-400 bg-orange-950/20 border-orange-800/30",
  walkover: "text-red-400 bg-red-950/20 border-red-800/30",
  financial_penalty: "text-red-400 bg-red-950/20 border-red-800/30",
  disciplinary: "text-purple-400 bg-purple-950/20 border-purple-800/30",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-red-400 bg-red-500/10 border-red-500/20",
  resolved: "text-green-400 bg-green-500/10 border-green-500/20",
  appealing: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

function fmt(n: number) { return "$" + Math.round(n).toLocaleString(); }

export function CaptainViolations() {
  const { data: violations = [], isLoading } = useQuery<any[]>({
    queryKey: ["captain-violations"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/captain/violations"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const active = violations.filter(v => v.status === "active");
  const resolved = violations.filter(v => v.status === "resolved");

  return (
    <CaptainLayout>
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wide">Violations</h1>
            <p className="text-sm text-muted-foreground">Disciplinary and compliance record for your club</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-red-950/20 border border-red-800/30 rounded-lg px-4 py-2 text-center">
              <p className="text-lg font-black text-red-400">{active.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active</p>
            </div>
            <div className="bg-green-950/20 border border-green-800/30 rounded-lg px-4 py-2 text-center">
              <p className="text-lg font-black text-green-400">{resolved.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Resolved</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : violations.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-60" />
            <p className="font-bold text-lg">No Violations</p>
            <p className="text-muted-foreground text-sm">Your club has a clean record.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {violations.map(v => (
              <div key={v.id} className={`bg-card border rounded-xl p-5 space-y-3 ${v.status === "active" ? "border-red-800/30" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${TYPE_COLORS[v.type] ?? "text-muted-foreground bg-secondary border-border"}`}>
                        {TYPE_LABELS[v.type] ?? v.type}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[v.status] ?? "text-muted-foreground bg-secondary border-border"}`}>
                        {v.status}
                      </span>
                    </div>
                    <p className="font-bold text-sm">{v.reason}</p>
                  </div>
                  <div className="text-right">
                    {v.penaltyAmount && (
                      <p className="font-black font-mono text-red-400 text-lg">{fmt(Number(v.penaltyAmount))}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{v.issuedDate}</p>
                  </div>
                </div>

                {v.penaltyDescription && (
                  <p className="text-sm text-muted-foreground border-t border-border pt-2">{v.penaltyDescription}</p>
                )}
                {v.adminNote && (
                  <div className="bg-secondary/40 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">Admin Note: </span>{v.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </CaptainLayout>
  );
}
