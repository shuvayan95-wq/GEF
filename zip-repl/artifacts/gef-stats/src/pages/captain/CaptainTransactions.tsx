import { useQuery } from "@tanstack/react-query";
import { CaptainLayout } from "@/components/layout/CaptainLayout";
import { getApiUrl } from "@/lib/api";
import { Loader2, ArrowRightLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  prize_money: "Prize Money",
  wages: "Wages",
  penalty: "Penalty",
  operational: "Operational",
  sponsorship: "Sponsorship",
  grant: "Grant",
  other: "Other",
};

function fmt(n: number) { return "$" + Math.abs(Math.round(n)).toLocaleString(); }

export function CaptainTransactions() {
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");

  const { data: transactions = [], isLoading } = useQuery<any[]>({
    queryKey: ["captain-transactions"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/captain/transactions"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const filtered = transactions.filter(t => typeFilter === "all" || t.type === typeFilter);
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <CaptainLayout>
      <div className="space-y-5 max-w-4xl">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wide">Transactions</h1>
          <p className="text-sm text-muted-foreground">All financial activity for your club</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Income</span>
            </div>
            <p className="text-xl font-black font-mono text-green-400">{fmt(totalIncome)}</p>
          </div>
          <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Expenses</span>
            </div>
            <p className="text-xl font-black font-mono text-red-400">{fmt(totalExpense)}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "income", "expense"] as const).map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${typeFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No transactions found</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Season</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(t => {
                  const isIncome = t.type === "income";
                  return (
                    <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${isIncome ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{t.description || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.season}</td>
                      <td className={`px-4 py-3 text-right font-bold font-mono ${isIncome ? "text-green-400" : "text-red-400"}`}>
                        {isIncome ? "+" : "-"}{fmt(Number(t.amount))}
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
