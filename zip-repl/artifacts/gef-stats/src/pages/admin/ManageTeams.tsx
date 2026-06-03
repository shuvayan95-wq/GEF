import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListTeams, useCreateTeam, useUpdateTeam, useDeleteTeam } from "@workspace/api-client-react";
import { useImageUpload } from "@/hooks/use-upload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Upload, Loader2, Shield, Crown, Star, LogOut, LogIn, ChevronDown, ChevronRight } from "lucide-react";

function useLeagues() {
  return useQuery({
    queryKey: ["/api/leagues"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/leagues"), { credentials: "include" });
      return r.json();
    },
  });
}

function useToggleTeamStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(getApiUrl(`/api/teams/${id}/status`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
    },
  });
}

function useSetPlayerRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, teamRole }: { id: number; teamRole: string | null }) =>
      fetch(getApiUrl(`/api/players/${id}/role`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamRole }),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
    },
  });
}

function TeamRow({ t }: { t: any }) {
  const [expanded, setExpanded] = useState(false);
  const toggleStatus = useToggleTeamStatus();
  const setRole = useSetPlayerRole();
  const { toast } = useToast();
  const qc = useQueryClient();
  const deleteMutation = useDeleteTeam();

  const handleStatusToggle = async () => {
    const newStatus = t.status === "active" ? "left" : "active";
    try {
      await toggleStatus.mutateAsync({ id: t.id, status: newStatus });
      toast({ title: `${t.name} marked as ${newStatus}` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  };

  const handleRole = async (playerId: number, currentRole: string | null, newRole: string) => {
    const roleToSet = currentRole === newRole ? null : newRole;
    try {
      await setRole.mutateAsync({ id: playerId, teamRole: roleToSet });
      toast({ title: roleToSet ? `Role set to ${roleToSet}` : "Role removed" });
    } catch {
      toast({ variant: "destructive", title: "Failed to set role" });
    }
  };

  const handleDelete = async () => {
    if (confirm("Delete this team?")) {
      try {
        await deleteMutation.mutateAsync({ id: t.id });
        qc.invalidateQueries({ queryKey: ["/api/teams"] });
        toast({ title: "Team deleted" });
      } catch {
        toast({ variant: "destructive", title: "Failed to delete" });
      }
    }
  };

  return (
    <>
      <tr className={`hover:bg-secondary/20 ${t.status === "left" ? "opacity-60" : ""}`}>
        <td className="p-4 font-mono text-sm">{t.id}</td>
        <td className="p-4">
          {t.logoUrl ? <img src={t.logoUrl} className="w-10 h-10 object-contain" /> : <Shield className="w-6 h-6 text-muted-foreground" />}
        </td>
        <td className="p-4 font-bold uppercase">
          <div className="flex items-center gap-2">
            {t.name}
            {t.status === "left" && (
              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">Left</span>
            )}
          </div>
        </td>
        <td className="p-4 text-right">{t.players?.length || 0}</td>
        <td className="p-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleStatusToggle}
              disabled={toggleStatus.isPending}
              title={t.status === "active" ? "Mark as Left" : "Mark as Active"}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors text-xs ${
                t.status === "active"
                  ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                  : "border-green-500/30 text-green-400 hover:bg-green-500/10"
              }`}
            >
              {toggleStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : t.status === "active" ? <LogOut className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              title="Manage captain/VC roles"
              className="w-7 h-7 rounded-lg border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 flex items-center justify-center transition-colors"
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            <Button variant="ghost" size="icon" onClick={() => {
              qc.getQueryData(["/api/teams"]);
              window.dispatchEvent(new CustomEvent("editTeam", { detail: t }));
            }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && t.players && t.players.length > 0 && (
        <tr>
          <td colSpan={5} className="bg-secondary/10 px-6 pb-4 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <Crown className="w-3 h-3 text-yellow-400" /> Roles — click to assign/remove
            </div>
            <div className="space-y-1">
              {(t.players as any[]).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0">
                  <img
                    src={p.imageUrl || "/images/default-avatar.png"}
                    className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
                    alt={p.name}
                  />
                  <span className="text-xs font-bold flex-1 truncate">{p.name}</span>
                  {p.teamRole && (
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${p.teamRole === "captain" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" : "bg-blue-500/15 text-blue-400 border-blue-500/30"}`}>
                      {p.teamRole === "captain" ? "C" : "VC"}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRole(p.id, p.teamRole, "captain")}
                      disabled={setRole.isPending}
                      title="Toggle Captain"
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${p.teamRole === "captain" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" : "border-border text-muted-foreground hover:border-yellow-500/40 hover:text-yellow-400"}`}
                    >
                      <Crown className="w-2.5 h-2.5" /> C
                    </button>
                    <button
                      onClick={() => handleRole(p.id, p.teamRole, "vice_captain")}
                      disabled={setRole.isPending}
                      title="Toggle Vice Captain"
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${p.teamRole === "vice_captain" ? "bg-blue-500/20 text-blue-400 border-blue-500/40" : "border-border text-muted-foreground hover:border-blue-500/40 hover:text-blue-400"}`}
                    >
                      <Star className="w-2.5 h-2.5" /> VC
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ManageTeams() {
  const { data: teams, isLoading } = useListTeams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);

  const openEdit = (team: any) => {
    setEditingTeam(team);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingTeam(null);
    setIsDialogOpen(true);
  };

  // Listen for edit events from table rows
  useState(() => {
    const handler = (e: any) => openEdit(e.detail);
    window.addEventListener("editTeam", handler);
    return () => window.removeEventListener("editTeam", handler);
  });

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold uppercase">Manage Teams</h1>
        <Button onClick={openCreate} variant="gaming" size="sm" className="gap-2"><Plus className="w-4 h-4"/> Add Team</Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">ID</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Logo</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Name</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">Roster</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>}
            {teams?.map(t => (
              <TeamRow key={t.id} t={t} />
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create Team'}</DialogTitle>
          </DialogHeader>
          <TeamForm 
            initialData={editingTeam} 
            onSuccess={() => {
              setIsDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function TeamForm({ initialData, onSuccess }: { initialData: any, onSuccess: () => void }) {
  const [name, setName] = useState(initialData?.name || "");
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || "");
  const [leagueId, setLeagueId] = useState(initialData?.leagueId?.toString() || "");
  const [file, setFile] = useState<File | null>(null);
  
  const { data: leagues } = useLeagues();
  const uploadMutation = useImageUpload();
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();
  const { toast } = useToast();

  const isPending = uploadMutation.isPending || createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalLogoUrl = logoUrl;
      if (file) {
        const upRes = await uploadMutation.mutateAsync(file);
        finalLogoUrl = upRes.url;
      }

      const payload = { name, logoUrl: finalLogoUrl, leagueId: leagueId ? Number(leagueId) : undefined } as any;

      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
        toast({ title: "Team updated" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Team created" });
      }
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error saving team", description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="flex gap-4 items-center mb-4">
        <div className="w-16 h-16 rounded border border-border bg-secondary flex items-center justify-center overflow-hidden">
          {file ? <img src={URL.createObjectURL(file)} className="w-full h-full object-contain p-1"/> : 
           logoUrl ? <img src={logoUrl} className="w-full h-full object-contain p-1"/> :
           <Upload className="w-6 h-6 text-muted-foreground" />}
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Logo Upload</label>
          <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase">Team Name</label>
        <Input required value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase">League / Division</label>
        <Select
          value={leagueId}
          onChange={e => setLeagueId(e.target.value)}
          options={[{ label: "— No League —", value: "" }, ...(leagues || []).map((l: any) => ({ label: l.name + (l.season ? ` (${l.season})` : ""), value: l.id }))]}
        />
        <p className="text-xs text-muted-foreground">Assign this team to a league for league-based stats.</p>
      </div>

      <Button type="submit" variant="gaming" className="w-full mt-6" disabled={isPending}>
        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Team
      </Button>
    </form>
  );
}
