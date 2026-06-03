import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2, Trophy, Crown, Star } from "lucide-react";
import { useListTeams, useListPlayers } from "@workspace/api-client-react";

const TROPHY_TYPES = [
  { value: "league_champion", label: "League Champion" },
  { value: "cup_winner", label: "Cup Winner" },
  { value: "golden_boot", label: "Golden Boot" },
  { value: "best_player", label: "Best Player" },
  { value: "top_defender", label: "Top Defender" },
  { value: "team_award", label: "Team Award" },
  { value: "other", label: "Other" },
];

function useLeagues() {
  return useQuery({
    queryKey: ["/api/leagues"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/leagues"), { credentials: "include" });
      return r.json();
    },
  });
}

function useTrophies() {
  return useQuery({
    queryKey: ["/api/trophies"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/trophies"), { credentials: "include" });
      return r.json();
    },
  });
}

export function ManageTrophies() {
  const { data: trophies, isLoading } = useTrophies();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(getApiUrl(`/api/trophies/${id}`), { method: "DELETE", credentials: "include" });
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trophies"] }); toast({ title: "Trophy removed" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
  });

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase">Trophy Cabinet</h1>
          <p className="text-muted-foreground text-sm">Engrave champions into history.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} variant="gaming" size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Trophy
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Trophy</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Season</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Type</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">League</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Winner</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>}
            {(trophies || []).map((t: any) => (
              <tr key={t.id} className="hover:bg-secondary/20">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold">{t.name}</span>
                  </div>
                </td>
                <td className="p-4 text-sm">{t.season}</td>
                <td className="p-4 text-sm text-muted-foreground capitalize">{t.type.replace(/_/g, " ")}</td>
                <td className="p-4 text-sm text-muted-foreground">{t.leagueName || "—"}</td>
                <td className="p-4">
                  {t.winnerTeamName && <div className="flex items-center gap-2 text-sm"><Crown className="w-3 h-3 text-yellow-500" />{t.winnerTeamName}</div>}
                  {t.winnerPlayerName && <div className="flex items-center gap-2 text-sm"><Star className="w-3 h-3 text-primary" />{t.winnerPlayerName}</div>}
                  {!t.winnerTeamName && !t.winnerPlayerName && <span className="text-muted-foreground">—</span>}
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { if (confirm("Remove trophy?")) deleteMutation.mutate(t.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {!isLoading && (trophies || []).length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No trophies yet. Add the first one!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Trophy</DialogTitle>
          </DialogHeader>
          <TrophyForm onSuccess={() => { setIsDialogOpen(false); queryClient.invalidateQueries({ queryKey: ["/api/trophies"] }); }} />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function TrophyForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: leagues } = useLeagues();
  const { data: teams } = useListTeams();
  const { data: players } = useListPlayers();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [type, setType] = useState("league_champion");
  const [leagueId, setLeagueId] = useState("");
  const [winnerTeamId, setWinnerTeamId] = useState("");
  const [winnerPlayerId, setWinnerPlayerId] = useState("");
  const [description, setDescription] = useState("");

  const isPlayerAward = ["golden_boot", "best_player", "top_defender"].includes(type);
  const isTeamAward = !isPlayerAward;

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch(getApiUrl("/api/trophies"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Trophy added" }); onSuccess(); },
    onError: () => toast({ variant: "destructive", title: "Error saving trophy" }),
  });

  const leagueOptions = [{ label: "— No League —", value: "" }, ...(leagues || []).map((l: any) => ({ label: l.name, value: l.id }))];
  const teamOptions = [{ label: "— Select Team —", value: "" }, ...(teams || []).map((t: any) => ({ label: t.name, value: t.id }))];
  const playerOptions = [{ label: "— Select Player —", value: "" }, ...(players || []).map((p: any) => ({ label: p.name + (p.teamName ? ` (${p.teamName})` : " (Free)"), value: p.id }))];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name, season, type,
      leagueId: leagueId ? Number(leagueId) : null,
      winnerTeamId: winnerTeamId ? Number(winnerTeamId) : null,
      winnerPlayerId: winnerPlayerId ? Number(winnerPlayerId) : null,
      description,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Trophy Name *</label>
        <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Division A Champion" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Season *</label>
          <Input required value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. 2024-25" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Type *</label>
          <Select required value={type} onChange={e => setType(e.target.value)} options={TROPHY_TYPES} />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">League (optional)</label>
        <Select value={leagueId} onChange={e => setLeagueId(e.target.value)} options={leagueOptions} />
      </div>
      {isTeamAward && (
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Winner Team</label>
          <Select value={winnerTeamId} onChange={e => setWinnerTeamId(e.target.value)} options={teamOptions} />
        </div>
      )}
      {isPlayerAward && (
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Winner Player</label>
          <Select value={winnerPlayerId} onChange={e => setWinnerPlayerId(e.target.value)} options={playerOptions} />
        </div>
      )}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Description</label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional note" />
      </div>
      <Button type="submit" variant="gaming" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Engrave Trophy
      </Button>
    </form>
  );
}
