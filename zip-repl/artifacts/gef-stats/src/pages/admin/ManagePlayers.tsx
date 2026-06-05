import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListPlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer, useListTeams } from "@workspace/api-client-react";
import { useImageUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Upload, Loader2, UserX, UserCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

export function ManagePlayers() {
  const { data: players, isLoading } = useListPlayers();
  const { data: teams } = useListTeams();
  const deleteMutation = useDeletePlayer();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggleStatus = async (player: any) => {
    const newStatus = (player as any).status === "left" ? "active" : "left";
    setTogglingId(player.id);
    try {
      const r = await fetch(getApiUrl(`/api/players/${player.id}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      queryClient.invalidateQueries({ queryKey: ['/api/taglist'] });
      toast({ title: newStatus === "left" ? "Player marked as Left" : "Player marked as Active" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this player permanently?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: ['/api/players'] });
        queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['/api/taglist'] });
        toast({ title: "Player deleted" });
      } catch {
        toast({ variant: "destructive", title: "Failed to delete" });
      }
    }
  };

  const openEdit = (player: any) => { setEditingPlayer(player); setIsDialogOpen(true); };
  const openCreate = () => { setEditingPlayer(null); setIsDialogOpen(true); };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold uppercase">Manage Players</h1>
        <Button onClick={openCreate} variant="gaming" size="sm" className="gap-2"><Plus className="w-4 h-4"/> Add Player</Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">ID</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Player</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Team</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">eFootball ID</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Rank</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">OVR</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={8} className="p-8 text-center">Loading...</td></tr>}
            {players?.map(p => (
              <PlayerRow
                key={p.id}
                player={p}
                isToggling={togglingId === p.id}
                onToggleStatus={handleToggleStatus}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlayer ? 'Edit Player' : 'Create Player'}</DialogTitle>
          </DialogHeader>
          <PlayerForm
            key={editingPlayer?.id ?? 'new'}
            initialData={editingPlayer}
            teams={teams || []}
            onSuccess={() => {
              setIsDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/players'] });
              queryClient.invalidateQueries({ queryKey: ['/api/taglist'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function PlayerForm({ initialData, teams, onSuccess }: { initialData: any, teams: any[], onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    position: initialData?.position || "",
    teamId: initialData?.teamId || "",
    nationality: initialData?.nationality || "",
    imageUrl: initialData?.imageUrl || "",
    efootballId: initialData?.efootballId || "",
    rank: initialData?.rank || "",
    crewName: initialData?.crewName || "",
    salary: initialData?.salary != null ? String(initialData.salary) : "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const uploadMutation = useImageUpload();
  const createMutation = useCreatePlayer();
  const updateMutation = useUpdatePlayer();
  const { toast } = useToast();

  const isPending = uploadMutation.isPending || createMutation.isPending || updateMutation.isPending;

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalImageUrl = formData.imageUrl;
      if (file) {
        const upRes = await uploadMutation.mutateAsync(file);
        finalImageUrl = upRes.url;
      }

      const payload = {
        name: formData.name,
        position: formData.position || null,
        teamId: formData.teamId ? Number(formData.teamId) : null,
        nationality: formData.nationality || null,
        imageUrl: finalImageUrl || null,
        efootballId: formData.efootballId || null,
        rank: formData.rank || null,
        crewName: formData.crewName || null,
        salary: formData.salary ? Number(formData.salary) : null,
      };

      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
        toast({ title: "Player updated" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Player created" });
      }
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error saving player", description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {/* Avatar */}
      <div className="flex gap-4 items-center">
        <div className="w-14 h-14 rounded border border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0">
          {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> :
           formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> :
           <Upload className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Image Upload</label>
          <Input type="file" accept="image/*" onChange={handleFileChange} className="bg-background" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase">Player Name *</label>
        <Input required value={formData.name} onChange={set("name")} placeholder="Player display name" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase">Position</label>
          <Input value={formData.position} onChange={set("position")} placeholder="GK, ST, CM…" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase">Nationality</label>
          <Input value={formData.nationality} onChange={set("nationality")} placeholder="English…" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase">Team Assignment</label>
        <Select
          value={formData.teamId || ""}
          onChange={e => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
          options={[{label: "Free Agent", value: ""}, ...teams.map(t => ({label: t.name, value: t.id}))]}
        />
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">eFootball Identity</p>
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">eFootball ID</label>
            <Input value={formData.efootballId} onChange={set("efootballId")} placeholder="1234567890" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Rank</label>
              <Input value={formData.rank} onChange={set("rank")} placeholder="Legend, Elite…" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Crew Name</label>
              <Input value={formData.crewName} onChange={set("crewName")} placeholder="Alpha FC…" />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Salary</p>
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase">Salary (USD)</label>
          <Input
            type="number"
            value={formData.salary}
            onChange={set("salary")}
            placeholder="10000 (default base)"
            min={0}
            step={500}
          />
          <p className="text-[10px] text-muted-foreground">Leave blank to use base $10,000. Use Salary Management page to auto-calculate from performance.</p>
        </div>
      </div>

      <Button type="submit" variant="gaming" className="w-full mt-2" disabled={isPending}>
        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Player
      </Button>
    </form>
  );
}

function PlayerRow({ player, isToggling, onToggleStatus, onEdit, onDelete }: {
  player: any;
  isToggling: boolean;
  onToggleStatus: (p: any) => void;
  onEdit: (p: any) => void;
  onDelete: (id: number) => void;
}) {
  const isLeft = player.status === "left";
  return (
    <tr className={isLeft ? "hover:bg-secondary/20 opacity-60" : "hover:bg-secondary/20"}>
      <td className="p-4 font-mono text-sm">{player.id}</td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <img src={player.imageUrl || `${import.meta.env.BASE_URL}images/default-avatar.png`} className="w-8 h-8 rounded border border-border object-cover" />
          <span className="font-bold">{player.name}</span>
        </div>
      </td>
      <td className="p-4 text-sm">{player.teamName || '-'}</td>
      <td className="p-4">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${isLeft ? "text-red-400 bg-red-500/10 border-red-500/30" : "text-green-400 bg-green-500/10 border-green-500/30"}`}>
          {isLeft ? "Left" : "Active"}
        </span>
      </td>
      <td className="p-4 text-sm font-mono text-muted-foreground">{player.efootballId || '—'}</td>
      <td className="p-4 text-sm">{player.rank || '—'}</td>
      <td className="p-4 text-right font-bold text-primary">{player.overallRating?.toFixed(1)}</td>
      <td className="p-4 text-right">
        <Button variant="ghost" size="icon" title={isLeft ? "Mark Active" : "Mark as Left"} onClick={() => onToggleStatus(player)} disabled={isToggling}>
          {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : isLeft ? <UserCheck className="w-4 h-4 text-green-400" /> : <UserX className="w-4 h-4 text-amber-400" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onEdit(player)}><Edit className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(player.id)}><Trash2 className="w-4 h-4" /></Button>
      </td>
    </tr>
  );
}
