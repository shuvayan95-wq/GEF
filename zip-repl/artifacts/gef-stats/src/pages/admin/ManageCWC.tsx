import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useGetAllCwcCrews, 
  useCreateCwcCrew, 
  useUpdateCwcCrew, 
  useDeleteCwcCrew,
  useGetCwcPlayers,
  useCreateCwcPlayer,
  useUpdateCwcPlayer,
  useDeleteCwcPlayer,
  useGetCwcTrophies,
  useCreateCwcTrophy,
  useUpdateCwcTrophy,
  useDeleteCwcTrophy,
  useGetCwcPlayerAwards,
  useCreateCwcPlayerAward,
  useUpdateCwcPlayerAward,
  useDeleteCwcPlayerAward,
  useUploadImage,
  CwcCrew, CwcPlayer, CwcTrophy, CwcPlayerAward
} from "@/hooks/use-cwc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Upload, Image as ImageIcon } from "lucide-react";

export function ManageCWC() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Manage CWC</h1>
        <p className="text-muted-foreground mt-2">Manage crews, players, trophies, and awards for the Crew World Cup.</p>
      </div>

      <Tabs defaultValue="crews" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="crews">Crews</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="trophies">Trophies</TabsTrigger>
          <TabsTrigger value="awards">Awards</TabsTrigger>
        </TabsList>

        <TabsContent value="crews">
          <CrewsTab />
        </TabsContent>

        <TabsContent value="players">
          <PlayersTab />
        </TabsContent>

        <TabsContent value="trophies">
          <TrophiesTab />
        </TabsContent>
        
        <TabsContent value="awards">
          <AwardsTab />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

// -----------------------------------------------------------------------------
// CREWS TAB
// -----------------------------------------------------------------------------
function CrewsTab() {
  const { data: crews, isLoading } = useGetAllCwcCrews();
  const createMutation = useCreateCwcCrew();
  const updateMutation = useUpdateCwcCrew();
  const deleteMutation = useDeleteCwcCrew();
  const uploadImage = useUploadImage();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteDialogOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Partial<CwcCrew> | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const openNew = () => {
    setEditingCrew({ isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (crew: CwcCrew) => {
    setEditingCrew(crew);
    setDialogOpen(true);
  };

  const openDelete = (id: number) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingCrew?.name || !editingCrew?.slug) {
      toast({ title: "Error", description: "Name and Slug are required", variant: "destructive" });
      return;
    }
    
    if (editingCrew.id) {
      updateMutation.mutate(
        { id: editingCrew.id, data: editingCrew },
        {
          onSuccess: () => {
            toast({ title: "Success", description: "Crew updated." });
            setDialogOpen(false);
          },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
        }
      );
    } else {
      createMutation.mutate(
        editingCrew,
        {
          onSuccess: () => {
            toast({ title: "Success", description: "Crew created." });
            setDialogOpen(false);
          },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
        }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedId) return;
    deleteMutation.mutate(selectedId, {
      onSuccess: () => {
        toast({ title: "Success", description: "Crew deleted." });
        setDeleteDialogOpen(false);
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'bannerUrl') => {
    if (!e.target.files?.[0]) return;
    try {
      const url = await uploadImage.mutateAsync(e.target.files[0]);
      setEditingCrew(prev => prev ? { ...prev, [field]: url } : prev);
      toast({ title: "Success", description: "Image uploaded." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Crews Directory</h2>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Crew</Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Logo</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : crews?.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No crews found.</td></tr>
              ) : (
                crews?.map(crew => (
                  <tr key={crew.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      {crew.logoUrl ? (
                        <img src={crew.logoUrl} alt={crew.name} className="w-8 h-8 object-contain rounded bg-black/50 p-1" />
                      ) : (
                        <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{crew.name} <span className="text-muted-foreground text-xs font-normal">/{crew.slug}</span></td>
                    <td className="px-4 py-3">{crew.region || "-"}</td>
                    <td className="px-4 py-3">{crew.powerRanking || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${crew.isActive ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                        {crew.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(crew)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDelete(crew.id)}><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCrew?.id ? 'Edit Crew' : 'New Crew'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Name *</Label>
              <Input value={editingCrew?.name || ''} onChange={e => setEditingCrew({...editingCrew, name: e.target.value})} placeholder="e.g. Royal Esports" />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Slug *</Label>
              <Input value={editingCrew?.slug || ''} onChange={e => setEditingCrew({...editingCrew, slug: e.target.value})} placeholder="e.g. royal-esports" />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label>Tagline</Label>
              <Input value={editingCrew?.tagline || ''} onChange={e => setEditingCrew({...editingCrew, tagline: e.target.value})} placeholder="Short punchy phrase" />
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Region</Label>
              <Input value={editingCrew?.region || ''} onChange={e => setEditingCrew({...editingCrew, region: e.target.value})} placeholder="e.g. EU, NA, ASIA" />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Country</Label>
              <Input value={editingCrew?.country || ''} onChange={e => setEditingCrew({...editingCrew, country: e.target.value})} />
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Founded</Label>
              <Input value={editingCrew?.founded || ''} onChange={e => setEditingCrew({...editingCrew, founded: e.target.value})} placeholder="e.g. 2023" />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Founder</Label>
              <Input value={editingCrew?.founder || ''} onChange={e => setEditingCrew({...editingCrew, founder: e.target.value})} />
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Captain</Label>
              <Input value={editingCrew?.captain || ''} onChange={e => setEditingCrew({...editingCrew, captain: e.target.value})} />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Manager</Label>
              <Input value={editingCrew?.manager || ''} onChange={e => setEditingCrew({...editingCrew, manager: e.target.value})} />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Owner / Investor</Label>
              <Input value={editingCrew?.ownerInvestor || ''} onChange={e => setEditingCrew({...editingCrew, ownerInvestor: e.target.value})} />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Current Division</Label>
              <Input value={editingCrew?.currentDivision || ''} onChange={e => setEditingCrew({...editingCrew, currentDivision: e.target.value})} />
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Power Ranking</Label>
              <Input type="number" value={editingCrew?.powerRanking || ''} onChange={e => setEditingCrew({...editingCrew, powerRanking: e.target.value ? Number(e.target.value) : null})} />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Current Fanbase</Label>
              <Input type="number" value={editingCrew?.currentFanbase || ''} onChange={e => setEditingCrew({...editingCrew, currentFanbase: e.target.value ? Number(e.target.value) : null})} />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Story (Rich Text / Markdown)</Label>
              <Textarea value={editingCrew?.story || ''} onChange={e => setEditingCrew({...editingCrew, story: e.target.value})} rows={4} />
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2 border border-border p-4 rounded-lg bg-secondary/30">
              <Label>Logo URL</Label>
              <div className="flex gap-2">
                <Input value={editingCrew?.logoUrl || ''} onChange={e => setEditingCrew({...editingCrew, logoUrl: e.target.value})} />
                <Button variant="outline" className="relative shrink-0" disabled={uploadImage.isPending}>
                  {uploadImage.isPending ? '...' : <Upload className="w-4 h-4" />}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleUpload(e, 'logoUrl')} accept="image/*" />
                </Button>
              </div>
              {editingCrew?.logoUrl && <img src={editingCrew.logoUrl} className="h-16 mt-2 rounded bg-black p-1 object-contain" alt="" />}
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2 border border-border p-4 rounded-lg bg-secondary/30">
              <Label>Banner URL</Label>
              <div className="flex gap-2">
                <Input value={editingCrew?.bannerUrl || ''} onChange={e => setEditingCrew({...editingCrew, bannerUrl: e.target.value})} />
                <Button variant="outline" className="relative shrink-0" disabled={uploadImage.isPending}>
                  {uploadImage.isPending ? '...' : <Upload className="w-4 h-4" />}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleUpload(e, 'bannerUrl')} accept="image/*" />
                </Button>
              </div>
              {editingCrew?.bannerUrl && <img src={editingCrew.bannerUrl} className="h-16 mt-2 rounded object-cover w-full" alt="" />}
            </div>

            <div className="col-span-2 flex items-center justify-between p-4 bg-secondary/20 border border-border rounded-lg mt-2">
              <div className="space-y-0.5">
                <Label>Is Active?</Label>
                <div className="text-sm text-muted-foreground">Show this crew publicly</div>
              </div>
              <Switch checked={!!editingCrew?.isActive} onCheckedChange={c => setEditingCrew({...editingCrew, isActive: c})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>Save Crew</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Crew</DialogTitle>
            <DialogDescription>
              Deleting this Crew will permanently remove all associated players, trophies, history and media. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PLAYERS TAB
// -----------------------------------------------------------------------------
function PlayersTab() {
  const { data: crews } = useGetAllCwcCrews();
  const [filterCrewId, setFilterCrewId] = useState<string>("all");
  const parsedCrewId = filterCrewId !== "all" ? Number(filterCrewId) : undefined;
  
  const { data: players, isLoading } = useGetCwcPlayers(parsedCrewId);
  const createMutation = useCreateCwcPlayer();
  const updateMutation = useUpdateCwcPlayer();
  const deleteMutation = useDeleteCwcPlayer();
  const uploadImage = useUploadImage();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Partial<CwcPlayer> | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const openNew = () => {
    setEditingPlayer({ isActive: true, isArchived: false });
    setDialogOpen(true);
  };

  const openEdit = (player: CwcPlayer) => {
    setEditingPlayer(player);
    setDialogOpen(true);
  };

  const openDelete = (id: number) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingPlayer?.realName || !editingPlayer?.crewId) {
      toast({ title: "Error", description: "Name and Crew are required", variant: "destructive" });
      return;
    }
    
    if (editingPlayer.id) {
      updateMutation.mutate(
        { id: editingPlayer.id, data: editingPlayer },
        {
          onSuccess: () => { toast({ title: "Success", description: "Player updated." }); setDialogOpen(false); },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
        }
      );
    } else {
      createMutation.mutate(
        editingPlayer,
        {
          onSuccess: () => { toast({ title: "Success", description: "Player created." }); setDialogOpen(false); },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
        }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedId) return;
    deleteMutation.mutate(selectedId, {
      onSuccess: () => { toast({ title: "Success", description: "Player deleted." }); setDeleteDialogOpen(false); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    try {
      const url = await uploadImage.mutateAsync(e.target.files[0]);
      setEditingPlayer(prev => prev ? { ...prev, imageUrl: url } : prev);
      toast({ title: "Success", description: "Image uploaded." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Players</h2>
          <Select
            className="w-[200px]"
            value={filterCrewId}
            onChange={e => setFilterCrewId(e.target.value)}
            options={[{ label: "All Crews", value: "all" }, ...(crews?.map(c => ({ label: c.name, value: c.id.toString() })) ?? [])]}
          />
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Player</Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Image</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">OVR</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium">Crew</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : players?.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No players found.</td></tr>
              ) : (
                players?.map(player => (
                  <tr key={player.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      {player.imageUrl ? (
                        <img src={player.imageUrl} alt="" className="w-8 h-8 object-cover rounded bg-black/50" />
                      ) : (
                        <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {player.realName}
                      {player.ign && <span className="text-muted-foreground text-xs block">"{player.ign}"</span>}
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">{player.playerRating || "-"}</td>
                    <td className="px-4 py-3">{player.position || "-"}</td>
                    <td className="px-4 py-3">
                      {crews?.find(c => c.id === player.crewId)?.name || `ID: ${player.crewId}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(player)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDelete(player.id)}><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlayer?.id ? 'Edit Player' : 'New Player'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Real Name *</Label>
              <Input value={editingPlayer?.realName || ''} onChange={e => setEditingPlayer({...editingPlayer, realName: e.target.value})} />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>In-Game Name (IGN)</Label>
              <Input value={editingPlayer?.ign || ''} onChange={e => setEditingPlayer({...editingPlayer, ign: e.target.value})} />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Crew *</Label>
              <Select
                value={editingPlayer?.crewId?.toString() || ""}
                onChange={e => setEditingPlayer({...editingPlayer, crewId: Number(e.target.value)})}
                options={[{ label: "Select a Crew", value: "" }, ...(crews?.map(c => ({ label: c.name, value: c.id.toString() })) ?? [])]}
              />
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Nationality</Label>
              <Input value={editingPlayer?.nationality || ''} onChange={e => setEditingPlayer({...editingPlayer, nationality: e.target.value})} />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Age</Label>
              <Input type="number" value={editingPlayer?.age || ''} onChange={e => setEditingPlayer({...editingPlayer, age: e.target.value ? Number(e.target.value) : null})} />
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Jersey Number</Label>
              <Input type="number" value={editingPlayer?.jerseyNumber || ''} onChange={e => setEditingPlayer({...editingPlayer, jerseyNumber: e.target.value ? Number(e.target.value) : null})} />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Position</Label>
              <Input value={editingPlayer?.position || ''} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value})} />
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2 border border-border p-4 rounded-lg bg-secondary/30">
              <Label>Image URL (Transparent PNG ideal)</Label>
              <div className="flex gap-2">
                <Input value={editingPlayer?.imageUrl || ''} onChange={e => setEditingPlayer({...editingPlayer, imageUrl: e.target.value})} />
                <Button variant="outline" className="relative shrink-0" disabled={uploadImage.isPending}>
                  {uploadImage.isPending ? '...' : <Upload className="w-4 h-4" />}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpload} accept="image/*" />
                </Button>
              </div>
              {editingPlayer?.imageUrl && <img src={editingPlayer.imageUrl} className="h-20 mt-2 rounded object-contain bg-black/50 p-2" alt="" />}
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2">
               <Label>eFootball ID</Label>
               <Input value={editingPlayer?.efootballId || ''} onChange={e => setEditingPlayer({...editingPlayer, efootballId: e.target.value})} />
               <Label className="mt-4 block text-destructive">WhatsApp Number (Hidden)</Label>
               <Input value={editingPlayer?.whatsappNumber || ''} onChange={e => setEditingPlayer({...editingPlayer, whatsappNumber: e.target.value})} />
            </div>

            <div className="col-span-2"><hr className="border-border my-2" /></div>
            
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Player Rating (OVR)</Label>
              <Input type="number" value={editingPlayer?.playerRating || ''} onChange={e => setEditingPlayer({...editingPlayer, playerRating: e.target.value ? Number(e.target.value) : null})} />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Matches Played</Label>
              <Input type="number" value={editingPlayer?.matchesPlayed || ''} onChange={e => setEditingPlayer({...editingPlayer, matchesPlayed: e.target.value ? Number(e.target.value) : null})} />
            </div>

            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Wins</Label>
              <Input type="number" value={editingPlayer?.wins || ''} onChange={e => setEditingPlayer({...editingPlayer, wins: e.target.value ? Number(e.target.value) : null})} />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label>Goals Scored</Label>
              <Input type="number" value={editingPlayer?.goalsScored || ''} onChange={e => setEditingPlayer({...editingPlayer, goalsScored: e.target.value ? Number(e.target.value) : null})} />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label>Bio</Label>
              <Textarea value={editingPlayer?.bio || ''} onChange={e => setEditingPlayer({...editingPlayer, bio: e.target.value})} rows={3} />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>Save Player</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Player</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove this player?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TROPHIES TAB
// -----------------------------------------------------------------------------
function TrophiesTab() {
  const { data: crews } = useGetAllCwcCrews();
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");
  const parsedCrewId = selectedCrewId ? Number(selectedCrewId) : undefined;
  
  const { data: trophies, isLoading } = useGetCwcTrophies(parsedCrewId);
  const createMutation = useCreateCwcTrophy();
  const updateMutation = useUpdateCwcTrophy();
  const deleteMutation = useDeleteCwcTrophy();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrophy, setEditingTrophy] = useState<Partial<CwcTrophy> | null>(null);

  const openNew = () => {
    if (!parsedCrewId) {
      toast({ title: "Error", description: "Select a crew first", variant: "destructive" });
      return;
    }
    setEditingTrophy({ crewId: parsedCrewId, timesWon: 1, iconType: 'trophy', winningSeasons: [] });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingTrophy?.name || !editingTrophy?.crewId) return;
    
    if (editingTrophy.id) {
      updateMutation.mutate({ id: editingTrophy.id, data: editingTrophy }, {
        onSuccess: () => { toast({ title: "Success", description: "Saved" }); setDialogOpen(false); }
      });
    } else {
      createMutation.mutate(editingTrophy, {
        onSuccess: () => { toast({ title: "Success", description: "Saved" }); setDialogOpen(false); }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Trophies</h2>
          <Select
            className="w-[250px]"
            value={selectedCrewId}
            onChange={e => setSelectedCrewId(e.target.value)}
            options={[{ label: "Select Crew to view/add", value: "" }, ...(crews?.map(c => ({ label: c.name, value: c.id.toString() })) ?? [])]}
          />
        </div>
        <Button onClick={openNew} disabled={!parsedCrewId}><Plus className="w-4 h-4 mr-2" /> Add Trophy</Button>
      </div>

      {!parsedCrewId ? (
        <div className="bg-card border border-border p-12 text-center rounded-lg text-muted-foreground">
          Select a crew from the dropdown to manage their trophies.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-8">Loading...</div>
          ) : trophies?.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">No trophies recorded for this crew.</div>
          ) : (
            trophies?.map(trophy => (
              <div key={trophy.id} className="bg-card border border-border rounded-lg p-4 flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-primary">{trophy.name}</h4>
                  <div className="text-sm text-muted-foreground mt-1">Won {trophy.timesWon} times</div>
                  {trophy.winningSeasons && trophy.winningSeasons.length > 0 && (
                    <div className="text-xs text-muted-foreground/60 mt-2">{trophy.winningSeasons.join(", ")}</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTrophy(trophy); setDialogOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(trophy.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTrophy?.id ? 'Edit Trophy' : 'New Trophy'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Trophy Name</Label>
              <Input value={editingTrophy?.name || ''} onChange={e => setEditingTrophy({...editingTrophy, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Times Won</Label>
                <Input type="number" value={editingTrophy?.timesWon || 1} onChange={e => setEditingTrophy({...editingTrophy, timesWon: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Icon Style</Label>
                <Select
                  value={editingTrophy?.iconType || 'trophy'}
                  onChange={e => setEditingTrophy({...editingTrophy, iconType: e.target.value})}
                  options={[
                    { label: "Trophy Cup", value: "trophy" },
                    { label: "Shield", value: "shield" },
                    { label: "Star", value: "star" },
                    { label: "Crown", value: "crown" },
                    { label: "Medal", value: "medal" },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Winning Seasons (comma separated)</Label>
              <Input 
                value={editingTrophy?.winningSeasons?.join(', ') || ''} 
                onChange={e => setEditingTrophy({...editingTrophy, winningSeasons: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} 
                placeholder="e.g. 2022/23, 2023/24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// -----------------------------------------------------------------------------
// AWARDS TAB
// -----------------------------------------------------------------------------
function AwardsTab() {
  const { data: crews } = useGetAllCwcCrews();
  const [selectedCrewId, setSelectedCrewId] = useState<string>("all");
  const parsedCrewId = selectedCrewId !== "all" ? Number(selectedCrewId) : undefined;
  
  const { data: players } = useGetCwcPlayers(parsedCrewId);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const parsedPlayerId = selectedPlayerId ? Number(selectedPlayerId) : undefined;
  
  const { data: awards, isLoading } = useGetCwcPlayerAwards(parsedPlayerId);
  const createMutation = useCreateCwcPlayerAward();
  const updateMutation = useUpdateCwcPlayerAward();
  const deleteMutation = useDeleteCwcPlayerAward();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<Partial<CwcPlayerAward> | null>(null);

  const openNew = () => {
    if (!parsedPlayerId) {
      toast({ title: "Error", description: "Select a player first", variant: "destructive" });
      return;
    }
    setEditingAward({ playerId: parsedPlayerId, timesWon: 1 });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingAward?.awardName || !editingAward?.playerId) return;
    if (editingAward.id) {
      updateMutation.mutate({ id: editingAward.id, data: editingAward }, {
        onSuccess: () => { toast({ title: "Success", description: "Saved" }); setDialogOpen(false); }
      });
    } else {
      createMutation.mutate(editingAward, {
        onSuccess: () => { toast({ title: "Success", description: "Saved" }); setDialogOpen(false); }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold w-24">Awards</h2>
          
          <Select
            className="w-[200px]"
            value={selectedCrewId}
            onChange={e => setSelectedCrewId(e.target.value)}
            options={[{ label: "All Crews", value: "all" }, ...(crews?.map(c => ({ label: c.name, value: c.id.toString() })) ?? [])]}
          />

          <Select
            className="w-[250px]"
            value={selectedPlayerId}
            onChange={e => setSelectedPlayerId(e.target.value)}
            options={[{ label: "Select Player to view/add", value: "" }, ...(players?.map(p => ({ label: p.realName, value: p.id.toString() })) ?? [])]}
          />
        </div>
        <Button onClick={openNew} disabled={!parsedPlayerId}><Plus className="w-4 h-4 mr-2" /> Add Award</Button>
      </div>

      {!parsedPlayerId ? (
        <div className="bg-card border border-border p-12 text-center rounded-lg text-muted-foreground">
          Select a player to manage their individual awards.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-8">Loading...</div>
          ) : awards?.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">No awards recorded for this player.</div>
          ) : (
            awards?.map(award => (
              <div key={award.id} className="bg-card border border-border rounded-lg p-4 flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-[#FFB800]">{award.awardName}</h4>
                  <div className="text-sm text-muted-foreground mt-1">Won {award.timesWon} times</div>
                  {award.seasons && (
                    <div className="text-xs text-muted-foreground/60 mt-2">{award.seasons}</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingAward(award); setDialogOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(award.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAward?.id ? 'Edit Award' : 'New Award'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Award Name</Label>
              <Input value={editingAward?.awardName || ''} onChange={e => setEditingAward({...editingAward, awardName: e.target.value})} placeholder="e.g. MVP Matchday 7" />
            </div>
            <div className="space-y-2">
              <Label>Times Won</Label>
              <Input type="number" value={editingAward?.timesWon || 1} onChange={e => setEditingAward({...editingAward, timesWon: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Seasons / Notes</Label>
              <Input value={editingAward?.seasons || ''} onChange={e => setEditingAward({...editingAward, seasons: e.target.value})} placeholder="e.g. 2023/24" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
