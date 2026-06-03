import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAwards, useCreateAward, useDeleteAward, useListPlayers } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2, Trophy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export function ManageAwards() {
  const { data: awards, isLoading } = useListAwards();
  const { data: players } = useListPlayers();
  const deleteMutation = useDeleteAward();
  const createMutation = useCreateAward();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ playerId: "", title: "", description: "", awardedAt: new Date().toISOString().split('T')[0] });

  const handleDelete = async (id: number) => {
    if(confirm("Delete this award?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: ['/api/awards'] });
        queryClient.invalidateQueries({ queryKey: ['/api/players'] });
        toast({ title: "Award deleted" });
      } catch {
        toast({ variant: "destructive", title: "Failed to delete" });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        data: {
          playerId: Number(formData.playerId),
          title: formData.title,
          description: formData.description,
          awardedAt: new Date(formData.awardedAt).toISOString()
        }
      });
      toast({ title: "Award granted" });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/awards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
    } catch(err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    }
  };

  const playerOptions = players?.map(p => ({ label: p.name, value: p.id })) || [];

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold uppercase">Manage Awards</h1>
        <Button onClick={() => setIsDialogOpen(true)} variant="gaming" size="sm" className="gap-2"><Plus className="w-4 h-4"/> Grant Award</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && <div className="col-span-full text-center">Loading...</div>}
        {awards?.map(a => (
          <div key={a.id} className="bg-card border border-border p-6 rounded-xl relative shadow-lg">
            <button onClick={() => handleDelete(a.id)} className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
            <Trophy className="w-8 h-8 text-yellow-500 mb-4" />
            <h3 className="font-bold text-lg mb-1">{a.title}</h3>
            <p className="text-primary font-bold uppercase text-sm mb-2">{a.playerName}</p>
            {a.description && <p className="text-sm text-muted-foreground mb-4">{a.description}</p>}
            <div className="text-xs text-muted-foreground font-mono">{format(new Date(a.awardedAt), 'MMMM d, yyyy')}</div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grant New Award</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Player</label>
              <Select required value={formData.playerId} onChange={e => setFormData({...formData, playerId: e.target.value})} options={playerOptions} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Award Title</label>
              <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Golden Boot Season 1" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Description</label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Date</label>
              <Input type="date" required value={formData.awardedAt} onChange={e => setFormData({...formData, awardedAt: e.target.value})} />
            </div>
            <Button type="submit" variant="gaming" className="w-full mt-4" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Grant
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
