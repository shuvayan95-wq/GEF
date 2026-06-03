import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListMatches,
  useDeleteMatch,
  useListTeams,
  useListPlayers,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function useLeagues() {
  return useQuery({
    queryKey: ["/api/leagues"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/leagues"), {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to load leagues");
      return r.json();
    },
  });
}

export function ManageMatches() {
  const { data: matches, isLoading } = useListMatches();
  const deleteMutation = useDeleteMatch();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async (id: number) => {
    if (confirm("Delete this match? This will affect stats and H2H records.")) {
      try {
        await deleteMutation.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/players"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/h2h"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
        toast({ title: "Match deleted" });
      } catch {
        toast({ variant: "destructive", title: "Failed to delete" });
      }
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase">
            Manage Matches
          </h1>
          <p className="text-muted-foreground text-sm">
            Add matches carefully. Stats are updated automatically.
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          variant="gaming"
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Record Match
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">
                Date
              </th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">
                Matchup
              </th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-center">
                Score
              </th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-center">
                Games
              </th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  Loading...
                </td>
              </tr>
            )}
            {matches?.map((m: any) => (
              <tr key={m.id} className="hover:bg-secondary/20">
                <td className="p-4 text-sm">
                  {new Date(m.date).toLocaleDateString()}
                </td>
                <td className="p-4 font-bold">
                  {m.team1Name} vs {m.team2Name}
                </td>
                <td className="p-4 text-center font-mono font-bold text-primary">
                  {m.team1Score} - {m.team2Score}
                </td>
                <td className="p-4 text-center text-muted-foreground text-sm">
                  {m.playerMatchups?.length || 0}/5
                </td>
                <td className="p-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(m.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record New Match</DialogTitle>
            <DialogDescription>
              Enter the team score and the individual 5v5 matchups.
            </DialogDescription>
          </DialogHeader>
          <MatchForm
            onSuccess={() => {
              setIsDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
              queryClient.invalidateQueries({ queryKey: ["/api/players"] });
              queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
              queryClient.invalidateQueries({ queryKey: ["/api/h2h"] });
              queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function MatchForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: teams } = useListTeams();
  const { data: players } = useListPlayers();
  const { data: leagues } = useLeagues();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [leagueId, setLeagueId] = useState("");
  const [t1Id, setT1Id] = useState("");
  const [t2Id, setT2Id] = useState("");
  const [t1Score, setT1Score] = useState(0);
  const [t2Score, setT2Score] = useState(0);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const teamOptions =
    teams?.map((t: any) => ({ label: t.name, value: t.id })) || [];

  const team1PlayerOptions =
    players
      ?.filter((p: any) => t1Id && p.teamId === Number(t1Id))
      .map((p: any) => ({ label: p.name, value: p.id })) || [];

  const team2PlayerOptions =
    players
      ?.filter((p: any) => t2Id && p.teamId === Number(t2Id))
      .map((p: any) => ({ label: p.name, value: p.id })) || [];

  const handleTeamChange = (which: 1 | 2, val: string) => {
    if (which === 1) setT1Id(val);
    else setT2Id(val);

    setMatchups((prev) =>
      prev.map((m) => ({
        ...m,
        ...(which === 1 ? { p1: "", mvp: "" } : { p2: "", mvp: "" }),
      })),
    );
  };

  const addMatchup = () => {
    setMatchups([...matchups, { p1: "", p2: "", s1: 0, s2: 0, mvp: "" }]);
  };

  const updateM = (idx: number, field: string, val: any) => {
    const newM = [...matchups];
    newM[idx][field] = val;
    setMatchups(newM);
  };

  const removeM = (idx: number) => {
    setMatchups(matchups.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!t1Id || !t2Id || !leagueId) {
      return toast({
        variant: "destructive",
        title: "Select both teams and a league",
      });
    }

    if (Number(t1Id) === Number(t2Id)) {
      return toast({
        variant: "destructive",
        title: "Teams must be different",
      });
    }

    const formattedMatchups = matchups.map((m) => ({
      player1Id: Number(m.p1),
      player2Id: Number(m.p2),
      player1Goals: Number(m.s1),
      player2Goals: Number(m.s2),
      mvpPlayerId: m.mvp ? Number(m.mvp) : null,
    }));

    try {
      setIsSubmitting(true);

      const payload = {
        date: new Date(date).toISOString(),
        team1Id: Number(t1Id),
        team2Id: Number(t2Id),
        team1Score: Number(t1Score),
        team2Score: Number(t2Score),
        leagueId: Number(leagueId),
        playerMatchups: formattedMatchups,
      };

      const res = await fetch(getApiUrl("/api/matches"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }

      if (!res.ok) {
        throw new Error(parsed?.error || text || `HTTP ${res.status}`);
      }

      toast({ title: "Match recorded successfully" });

      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/h2h"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });

      onSuccess();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error saving match",
        description: err?.message || "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-secondary/30 p-4 rounded-lg border border-border">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">
            Date
          </label>
          <Input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">
            League / Division
          </label>
          <Select
            required
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            options={[
              { label: "Select League", value: "" },
              ...(leagues || []).map((l: any) => ({
                label: l.name + (l.season ? ` (${l.season})` : ""),
                value: l.id,
              })),
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-end bg-card p-4 rounded-lg border border-border">
        <div>
          <label className="text-xs font-bold text-primary uppercase mb-1 block">
            Team 1 (Home)
          </label>
          <Select
            required
            value={t1Id}
            onChange={(e) => handleTeamChange(1, e.target.value)}
            options={teamOptions}
            className="mb-2"
          />
          <Input
            type="number"
            required
            min={0}
            value={t1Score}
            onChange={(e) => setT1Score(Number(e.target.value))}
            placeholder="Goals scored"
          />
        </div>

        <div className="font-display font-bold text-xl pb-2 px-2 text-muted-foreground">
          VS
        </div>

        <div>
          <label className="text-xs font-bold text-accent uppercase mb-1 block">
            Team 2 (Away)
          </label>
          <Select
            required
            value={t2Id}
            onChange={(e) => handleTeamChange(2, e.target.value)}
            options={teamOptions}
            className="mb-2"
          />
          <Input
            type="number"
            required
            min={0}
            value={t2Score}
            onChange={(e) => setT2Score(Number(e.target.value))}
            placeholder="Goals scored"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-bold text-foreground uppercase">
            Individual Matchups ({matchups.length}/5)
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMatchup}
            disabled={matchups.length >= 5 || !t1Id || !t2Id}
          >
            + Add Game
          </Button>
        </div>

        <div className="space-y-3">
          {!t1Id || !t2Id ? (
            <p className="text-sm text-amber-500 italic text-center p-4 bg-amber-500/10 rounded border border-amber-500/20">
              Select both teams above before adding individual matchups.
            </p>
          ) : null}

          {matchups.map((m, i) => (
            <div
              key={i}
              className="flex flex-col md:flex-row gap-2 items-center bg-secondary/30 p-3 rounded border border-border relative group"
            >
              <div className="flex-1 w-full">
                <label className="text-xs text-primary font-bold uppercase mb-1 block">
                  {teams?.find((t: any) => t.id === Number(t1Id))?.name ||
                    "Team 1"}
                </label>
                <Select
                  required
                  value={m.p1}
                  onChange={(e) => updateM(i, "p1", e.target.value)}
                  options={team1PlayerOptions}
                />
              </div>

              <div className="flex flex-col items-center gap-1 shrink-0">
                <Input
                  type="number"
                  required
                  min={0}
                  value={m.s1}
                  onChange={(e) => updateM(i, "s1", e.target.value)}
                  className="w-16 text-center"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <Input
                  type="number"
                  required
                  min={0}
                  value={m.s2}
                  onChange={(e) => updateM(i, "s2", e.target.value)}
                  className="w-16 text-center"
                />
              </div>

              <div className="flex-1 w-full">
                <label className="text-xs text-accent font-bold uppercase mb-1 block">
                  {teams?.find((t: any) => t.id === Number(t2Id))?.name ||
                    "Team 2"}
                </label>
                <Select
                  required
                  value={m.p2}
                  onChange={(e) => updateM(i, "p2", e.target.value)}
                  options={team2PlayerOptions}
                />
              </div>

              <div className="w-full md:w-32">
                <Select
                  value={m.mvp}
                  onChange={(e) => updateM(i, "mvp", e.target.value)}
                  options={[
                    { label: "No MVP", value: "" },
                    { label: "P1 MVP", value: m.p1 },
                    { label: "P2 MVP", value: m.p2 },
                  ]}
                />
              </div>

              <button
                type="button"
                onClick={() => removeM(i)}
                className="text-destructive p-2 hover:bg-destructive/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {matchups.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center p-4">
              Add 5v5 individual games here.
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        variant="gaming"
        className="w-full h-12"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Record Full Match
      </Button>
    </form>
  );
}
