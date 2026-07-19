import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CaptainLayout } from "@/components/layout/CaptainLayout";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

function fmt(n: number) { return "$" + Math.round(n).toLocaleString(); }

export function CaptainBudget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fin, isLoading } = useQuery<any>({
    queryKey: ["captain-budget"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/captain/budget"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30_000,
  });

  const [transfer, setTransfer] = useState("");
  const [wage, setWage] = useState("");

  useEffect(() => {
    if (fin) {
      setTransfer(String(Math.round(Number(fin.transferBudget ?? 0))));
      setWage(String(Math.round(Number(fin.wageBudget ?? 0))));
    }
  }, [fin]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/captain/budget/allocation"), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferBudget: Number(transfer), wageBudget: Number(wage) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Budget Updated", description: "Allocation saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["captain-budget"] });
      queryClient.invalidateQueries({ queryKey: ["captain-dashboard"] });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const initialBudget = Number(fin?.budget ?? 0);
  const income = Number(fin?.income ?? 0);
  const expenses = Number(fin?.expenses ?? 0);
  // Current spendable balance = initial allocation + income earned − expenses incurred
  const currentBalance = initialBudget + income - expenses;
  const tb = Number(transfer) || 0;
  const wb = Number(wage) || 0;
  const allocated = tb + wb;
  const unallocated = currentBalance - allocated;
  const isOver = allocated > currentBalance;
  const pctTransfer = currentBalance > 0 ? Math.min((tb / currentBalance) * 100, 100) : 0;
  const pctWage = currentBalance > 0 ? Math.min((wb / currentBalance) * 100, 100) : 0;

  if (isLoading) {
    return <CaptainLayout><div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CaptainLayout>;
  }

  return (
    <CaptainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wide">Budget Allocation</h1>
          <p className="text-sm text-muted-foreground mt-1">Split your current balance between transfers and wages. Your balance reflects your initial budget plus any income earned and minus expenses incurred.</p>
        </div>

        {/* Current balance (read-only) */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Balance · Read Only</span>
          </div>
          <p className="font-display text-3xl font-black text-green-400 font-mono">{fmt(currentBalance)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Initial budget {fmt(initialBudget)}
            {income > 0 && <> + income {fmt(income)}</>}
            {expenses > 0 && <> − expenses {fmt(expenses)}</>}
          </p>
        </div>

        {/* Visual bar */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Allocation</h3>
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${pctTransfer}%` }} />
            <div className="h-full bg-purple-500 transition-all" style={{ width: `${pctWage}%` }} />
          </div>
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Transfer: <strong className="font-mono">{fmt(tb)}</strong></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" /> Wage: <strong className="font-mono">{fmt(wb)}</strong></span>
          </div>
          <div className={`text-xs font-bold font-mono px-3 py-1.5 rounded-lg flex items-center gap-2 ${isOver ? "bg-red-950/30 border border-red-800/40 text-red-400" : "bg-green-950/20 border border-green-800/30 text-green-400"}`}>
            {isOver ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isOver
              ? `Over by ${fmt(allocated - currentBalance)} — reduce allocations`
              : `Unallocated: ${fmt(unallocated)}`}
          </div>
        </div>

        {/* Edit form */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider">Adjust Allocation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> Transfer Budget
              </label>
              <Input
                type="number"
                min={0}
                value={transfer}
                onChange={e => setTransfer(e.target.value)}
                className="bg-background font-mono"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-purple-500 inline-block" /> Wage Budget
              </label>
              <Input
                type="number"
                min={0}
                value={wage}
                onChange={e => setWage(e.target.value)}
                className="bg-background font-mono"
                placeholder="0"
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || isOver || (tb === Number(fin?.transferBudget) && wb === Number(fin?.wageBudget))}
          >
            {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save Allocation"}
          </Button>
        </div>
      </div>
    </CaptainLayout>
  );
}
