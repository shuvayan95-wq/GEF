import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Shield, CheckCircle2, XCircle, Clock, Ban, RefreshCw,
  Loader2, ChevronDown, UserCheck, History, Send, Eye,
  KeyRound, AlertTriangle, Search,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",     color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  active:      { label: "Active",      color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  rejected:    { label: "Rejected",    color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  suspended:   { label: "Suspended",   color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  deactivated: { label: "Deactivated", color: "text-muted-foreground", bg: "bg-secondary border-border" },
};

export function ManageCaptains() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialogs
  const [approveDialog, setApproveDialog] = useState<any>(null);
  const [approveTeamId, setApproveTeamId] = useState("");
  const [rejectDialog, setRejectDialog] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendDialog, setSuspendDialog] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [notifyDialog, setNotifyDialog] = useState<any>(null);
  const [notifyForm, setNotifyForm] = useState({ title: "", body: "", type: "announcement", isImportant: false });
  const [resetPwDialog, setResetPwDialog] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [historyDialog, setHistoryDialog] = useState<any>(null);
  const [auditDialog, setAuditDialog] = useState<any>(null);

  // Data
  const { data: captains = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-captains"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/admin/captains"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/teams"), { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: loginHistory = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["captain-login-history", historyDialog?.captain?.id],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/admin/captains/${historyDialog.captain.id}/login-history`), { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!historyDialog,
  });

  const { data: auditLog = [], isLoading: auditLoading } = useQuery<any[]>({
    queryKey: ["captain-audit", auditDialog?.captain?.id],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/admin/captains/${auditDialog.captain.id}/audit`), { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!auditDialog,
  });

  function apiMutation(fn: () => Promise<any>, successMsg: string, onDone?: () => void) {
    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        toast({ title: successMsg });
        queryClient.invalidateQueries({ queryKey: ["admin-captains"] });
        onDone?.();
      },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  }

  const approveMutation = apiMutation(async () => {
    const res = await fetch(getApiUrl(`/api/admin/captains/${approveDialog.captain.id}/approve`), {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: Number(approveTeamId) }),
    });
    const d = await res.json(); if (!res.ok) throw new Error(d.error);
  }, "Captain approved", () => { setApproveDialog(null); setApproveTeamId(""); });

  const rejectMutation = apiMutation(async () => {
    const res = await fetch(getApiUrl(`/api/admin/captains/${rejectDialog.captain.id}/reject`), {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    const d = await res.json(); if (!res.ok) throw new Error(d.error);
  }, "Captain rejected", () => { setRejectDialog(null); setRejectReason(""); });

  const suspendMutation = apiMutation(async () => {
    const res = await fetch(getApiUrl(`/api/admin/captains/${suspendDialog.captain.id}/suspend`), {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: suspendReason }),
    });
    const d = await res.json(); if (!res.ok) throw new Error(d.error);
  }, "Captain suspended", () => { setSuspendDialog(null); setSuspendReason(""); });

  const reactivateMutation = apiMutation(async (id: number) => {
    const res = await fetch(getApiUrl(`/api/admin/captains/${id}/reactivate`), {
      method: "PATCH", credentials: "include",
    });
    const d = await res.json(); if (!res.ok) throw new Error(d.error);
  }, "Captain reactivated");

  const notifyMutation = apiMutation(async () => {
    const res = await fetch(getApiUrl(`/api/admin/captains/${notifyDialog.captain.id}/notify`), {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...notifyForm, teamId: notifyDialog.captain.teamId }),
    });
    const d = await res.json(); if (!res.ok) throw new Error(d.error);
  }, "Notification sent", () => { setNotifyDialog(null); setNotifyForm({ title: "", body: "", type: "announcement", isImportant: false }); });

  const resetPwMutation = apiMutation(async () => {
    const res = await fetch(getApiUrl(`/api/admin/captains/${resetPwDialog.captain.id}/reset-password`), {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const d = await res.json(); if (!res.ok) throw new Error(d.error);
  }, "Password reset", () => { setResetPwDialog(null); setNewPassword(""); });

  // Filter
  const filtered = captains.filter(({ captain: c, team }) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (team?.name ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCount = captains.filter(c => c.captain.status === "pending").length;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wide flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Captain Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {captains.length} captains · {pendingCount > 0 && <span className="text-yellow-400 font-bold">{pendingCount} pending approval</span>}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, club…" className="pl-9 bg-background" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", "pending", "active", "suspended", "rejected", "deactivated"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {s}{s === "pending" && pendingCount > 0 && ` (${pendingCount})`}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No captains found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(({ captain: c, team }) => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
              return (
                <div key={c.id} className={`bg-card border rounded-xl p-5 ${c.status === "pending" ? "border-yellow-800/40" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold">{c.name}</h3>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                      <p className="text-sm">
                        {team
                          ? <span className="font-medium">{team.name}</span>
                          : <span className="text-muted-foreground italic">No club assigned</span>}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Registered {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        {c.lastLoginAt && ` · Last login ${new Date(c.lastLoginAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {c.status === "pending" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white" onClick={() => setApproveDialog({ captain: c, team })}>
                          <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Approve
                        </Button>
                      )}
                      {c.status === "pending" && (
                        <Button size="sm" variant="destructive" onClick={() => setRejectDialog({ captain: c })}>
                          <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                        </Button>
                      )}
                      {c.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => setSuspendDialog({ captain: c })}>
                          <Ban className="w-3.5 h-3.5 mr-1.5" /> Suspend
                        </Button>
                      )}
                      {(c.status === "suspended" || c.status === "deactivated") && (
                        <Button size="sm" variant="outline" onClick={() => reactivateMutation.mutate(c.id)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reactivate
                        </Button>
                      )}
                      {c.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => setNotifyDialog({ captain: c })}>
                          <Send className="w-3.5 h-3.5 mr-1.5" /> Notify
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setResetPwDialog({ captain: c })}>
                        <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Reset PW
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setHistoryDialog({ captain: c })}>
                        <History className="w-3.5 h-3.5 mr-1.5" /> Login History
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAuditDialog({ captain: c })}>
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> Audit Log
                      </Button>
                    </div>
                  </div>

                  {c.status === "rejected" && c.rejectionReason && (
                    <p className="mt-2 text-xs text-red-400 border-t border-border pt-2">Rejection reason: {c.rejectionReason}</p>
                  )}
                  {c.status === "suspended" && c.suspendReason && (
                    <p className="mt-2 text-xs text-orange-400 border-t border-border pt-2">Suspend reason: {c.suspendReason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Approve Dialog ── */}
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Captain</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Approving <strong>{approveDialog?.captain?.name}</strong>. Select the club to assign.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assign Club</label>
              <select
                value={approveTeamId}
                onChange={e => setApproveTeamId(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select a club…</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-500 text-white"
                onClick={() => approveMutation.mutate()}
                disabled={!approveTeamId || approveMutation.isPending}>
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve & Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ── */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Captain</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Reject <strong>{rejectDialog?.captain?.name}</strong>?</p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason (Optional)</label>
              <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection…" className="bg-background" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Suspend Dialog ── */}
      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspend Captain</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Suspend <strong>{suspendDialog?.captain?.name}</strong>? They will lose portal access immediately.</p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason</label>
              <Input value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension…" className="bg-background" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSuspendDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => suspendMutation.mutate()} disabled={suspendMutation.isPending}>
                {suspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suspend"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Notify Dialog ── */}
      <Dialog open={!!notifyDialog} onOpenChange={() => setNotifyDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Send to <strong>{notifyDialog?.captain?.name}</strong> ({notifyDialog?.captain?.team?.name ?? "no club"})</p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</label>
              <Input value={notifyForm.title} onChange={e => setNotifyForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title…" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Message</label>
              <textarea
                value={notifyForm.body}
                onChange={e => setNotifyForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Notification message…"
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</label>
                <select value={notifyForm.type} onChange={e => setNotifyForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                  {["announcement", "budget_change", "player_update", "violation", "transfer", "contract", "reward", "penalty", "custom"].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-4">
                <input type="checkbox" checked={notifyForm.isImportant} onChange={e => setNotifyForm(f => ({ ...f, isImportant: e.target.checked }))} />
                Important
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNotifyDialog(null)}>Cancel</Button>
              <Button onClick={() => notifyMutation.mutate()} disabled={!notifyForm.title || !notifyForm.body || notifyMutation.isPending}>
                {notifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ── */}
      <Dialog open={!!resetPwDialog} onOpenChange={() => setResetPwDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Set a new password for <strong>{resetPwDialog?.captain?.name}</strong>. Share it with them securely.</p>
            <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8 chars)" className="bg-background" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setResetPwDialog(null)}>Cancel</Button>
              <Button onClick={() => resetPwMutation.mutate()} disabled={newPassword.length < 8 || resetPwMutation.isPending}>
                {resetPwMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Login History Dialog ── */}
      <Dialog open={!!historyDialog} onOpenChange={() => setHistoryDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Login History — {historyDialog?.captain?.name}</DialogTitle></DialogHeader>
          {historyLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {loginHistory.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No login history</p> : loginHistory.map(l => (
                <div key={l.id} className="flex items-center justify-between text-xs bg-secondary/30 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground">{new Date(l.createdAt).toLocaleString("en-GB")}</span>
                  <span className="font-mono text-primary">{l.ipAddress}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Audit Log Dialog ── */}
      <Dialog open={!!auditDialog} onOpenChange={() => setAuditDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Audit Log — {auditDialog?.captain?.name}</DialogTitle></DialogHeader>
          {auditLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
            <div className="max-h-96 overflow-y-auto space-y-1.5">
              {auditLog.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No audit entries</p> : auditLog.map(l => (
                <div key={l.id} className="flex items-start justify-between text-xs bg-secondary/30 rounded-lg px-3 py-2 gap-3">
                  <div>
                    <span className="font-bold text-foreground">{l.action}</span>
                    {l.details && <span className="text-muted-foreground ml-2">{l.details}</span>}
                  </div>
                  <div className="text-right flex-shrink-0 text-muted-foreground/70">
                    <p>{new Date(l.createdAt).toLocaleString("en-GB")}</p>
                    {l.ipAddress && <p className="font-mono">{l.ipAddress}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
