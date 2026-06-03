import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useImageUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Upload, Loader2, Layers } from "lucide-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { PlayerCard } from "@/components/PlayerCard";
import { getApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const CARD_TYPES = ["Standard", "Featured", "Iconic", "Black Ball", "Matchday"];
const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST", "SS"];
const PLAYING_STYLES = [
  "Goal Poacher", "Dummy Runner", "Fox in the Box", "Target Man", "Deep-Lying Forward",
  "Creative Playmaker", "Hole Player", "Orchestrator", "Box-to-Box", "Holding",
  "Defensive Midfielder", "Wide Midfielder", "Anchor Man",
  "Full Back", "Defensive Full Back", "Attacking Full Back", "Prolific Winger", "Classic Winger",
  "Build Up", "Sweeper", "Defensive",
];

interface EfCard {
  id: number;
  name: string;
  imageUrl: string | null;
  position: string | null;
  nationality: string | null;
  clubName: string | null;
  cardOvr: number | null;
  cardType: string | null;
  playingStyle: string | null;
  cardPace: number | null;
  cardShooting: number | null;
  cardPassing: number | null;
  cardDribbling: number | null;
  cardDefending: number | null;
  cardPhysical: number | null;
  createdAt: string;
}

function useEfCards() {
  return useQuery<EfCard[]>({
    queryKey: ["/api/ef-cards"],
    queryFn: () => fetch(getApiUrl("/api/ef-cards"), { credentials: "include" }).then(r => r.json()),
  });
}

function useDeleteEfCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(getApiUrl(`/api/ef-cards/${id}`), { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ef-cards"] }),
  });
}

export function ManageCards() {
  const { data: cards, isLoading } = useEfCards();
  const deleteMutation = useDeleteEfCard();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<EfCard | null>(null);

  const handleDelete = async (id: number) => {
    if (confirm("Delete this card permanently?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: "Card deleted" });
      } catch {
        toast({ variant: "destructive", title: "Failed to delete" });
      }
    }
  };

  const openEdit = (card: EfCard) => { setEditingCard(card); setIsDialogOpen(true); };
  const openCreate = () => { setEditingCard(null); setIsDialogOpen(true); };

  const typeLabel = (type: string | null) => {
    if (!type) return null;
    const colors: Record<string, string> = {
      "Black Ball": "bg-yellow-500/10 border-yellow-500/40 text-yellow-300",
      "Iconic": "bg-amber-500/10 border-amber-500/40 text-amber-300",
      "Featured": "bg-blue-500/10 border-blue-500/40 text-blue-300",
      "Matchday": "bg-green-500/10 border-green-500/40 text-green-300",
      "Standard": "bg-primary/10 border-primary/30 text-primary",
    };
    return (
      <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", colors[type] ?? colors["Standard"])}>
        {type}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase">eFootball Cards</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage the in-game card database (Konami player cards)</p>
        </div>
        <Button onClick={openCreate} variant="gaming" size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Card
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Card</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Player Name</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Club</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Position</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Type</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Playing Style</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">OVR</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && (!cards || cards.length === 0) && (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground font-medium">No cards yet</p>
                  <p className="text-muted-foreground/60 text-sm mt-1">Click "Add Card" to add your first eFootball card</p>
                </td>
              </tr>
            )}
            {cards?.map(card => (
              <tr key={card.id} className="hover:bg-secondary/20">
                <td className="p-3 pl-4">
                  <div className="w-10">
                    <PlayerCard
                      player={{
                        name: card.name,
                        imageUrl: card.imageUrl,
                        position: card.position,
                        nationality: card.nationality,
                        cardOvr: card.cardOvr,
                        cardType: card.cardType,
                        cardPace: card.cardPace,
                        cardShooting: card.cardShooting,
                        cardPassing: card.cardPassing,
                        cardDribbling: card.cardDribbling,
                        cardDefending: card.cardDefending,
                        cardPhysical: card.cardPhysical,
                        cardPlayingStyle: card.playingStyle,
                      }}
                      size="sm"
                    />
                  </div>
                </td>
                <td className="p-4 font-bold">{card.name}</td>
                <td className="p-4 text-sm text-muted-foreground">{card.clubName || "—"}</td>
                <td className="p-4 text-sm">
                  {card.position ? (
                    <span className="bg-secondary px-2 py-0.5 rounded text-xs font-bold uppercase">{card.position}</span>
                  ) : "—"}
                </td>
                <td className="p-4">{typeLabel(card.cardType)}</td>
                <td className="p-4 text-sm text-muted-foreground">{card.playingStyle || "—"}</td>
                <td className="p-4 text-right font-black text-primary text-lg">{card.cardOvr ?? "—"}</td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(card)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(card.id)}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? "Edit Card" : "Add eFootball Card"}</DialogTitle>
          </DialogHeader>
          <CardForm
            key={editingCard?.id ?? "new"}
            initialData={editingCard}
            onSuccess={() => {
              setIsDialogOpen(false);
              qc.invalidateQueries({ queryKey: ["/api/ef-cards"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function CardForm({ initialData, onSuccess }: { initialData: EfCard | null; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    imageUrl: initialData?.imageUrl || "",
    position: initialData?.position || "",
    nationality: initialData?.nationality || "",
    clubName: initialData?.clubName || "",
    cardOvr: initialData?.cardOvr?.toString() || "",
    cardType: initialData?.cardType || "Standard",
    playingStyle: initialData?.playingStyle || "",
    cardPace: initialData?.cardPace?.toString() || "",
    cardShooting: initialData?.cardShooting?.toString() || "",
    cardPassing: initialData?.cardPassing?.toString() || "",
    cardDribbling: initialData?.cardDribbling?.toString() || "",
    cardDefending: initialData?.cardDefending?.toString() || "",
    cardPhysical: initialData?.cardPhysical?.toString() || "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const uploadMutation = useImageUpload();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImageUrl = formData.imageUrl;
      if (file) {
        const upRes = await uploadMutation.mutateAsync(file);
        finalImageUrl = upRes.url;
      }

      const payload = {
        name: formData.name,
        imageUrl: finalImageUrl || null,
        position: formData.position || null,
        nationality: formData.nationality || null,
        clubName: formData.clubName || null,
        cardOvr: formData.cardOvr ? parseInt(formData.cardOvr) : null,
        cardType: formData.cardType || "Standard",
        playingStyle: formData.playingStyle || null,
        cardPace: formData.cardPace ? parseInt(formData.cardPace) : null,
        cardShooting: formData.cardShooting ? parseInt(formData.cardShooting) : null,
        cardPassing: formData.cardPassing ? parseInt(formData.cardPassing) : null,
        cardDribbling: formData.cardDribbling ? parseInt(formData.cardDribbling) : null,
        cardDefending: formData.cardDefending ? parseInt(formData.cardDefending) : null,
        cardPhysical: formData.cardPhysical ? parseInt(formData.cardPhysical) : null,
      };

      const url = initialData
        ? getApiUrl(`/api/ef-cards/${initialData.id}`)
        : getApiUrl("/api/ef-cards");
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      toast({ title: initialData ? "Card updated" : "Card added" });
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error saving card", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const cardPreview = {
    name: formData.name || "Player Name",
    imageUrl: previewUrl || formData.imageUrl || null,
    position: formData.position || null,
    nationality: formData.nationality || null,
    cardOvr: formData.cardOvr ? parseInt(formData.cardOvr) : null,
    cardPace: formData.cardPace ? parseInt(formData.cardPace) : null,
    cardShooting: formData.cardShooting ? parseInt(formData.cardShooting) : null,
    cardPassing: formData.cardPassing ? parseInt(formData.cardPassing) : null,
    cardDribbling: formData.cardDribbling ? parseInt(formData.cardDribbling) : null,
    cardDefending: formData.cardDefending ? parseInt(formData.cardDefending) : null,
    cardPhysical: formData.cardPhysical ? parseInt(formData.cardPhysical) : null,
    cardPlayingStyle: formData.playingStyle || null,
    cardType: formData.cardType || "Standard",
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex gap-6">
        {/* Left: fields */}
        <div className="flex-1 space-y-4">

          {/* Image */}
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 rounded border border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0">
              {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> :
               formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> :
               <Upload className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Card Image</label>
              <Input type="file" accept="image/*" onChange={handleFileChange} className="bg-background" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Player Name *</label>
            <Input required value={formData.name} onChange={set("name")} placeholder="e.g. Kylian Mbappé" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Club</label>
              <Input value={formData.clubName} onChange={set("clubName")} placeholder="Real Madrid" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Nationality</label>
              <Input value={formData.nationality} onChange={set("nationality")} placeholder="French" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Position</label>
            <select
              value={formData.position}
              onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="">— Select position —</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Card Info */}
          <div className="border-t border-border pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Card Stats
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Card Type</label>
                  <select
                    value={formData.cardType}
                    onChange={e => setFormData(prev => ({ ...prev, cardType: e.target.value }))}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                  >
                    {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Overall (OVR)</label>
                  <Input type="number" min="1" max="99" value={formData.cardOvr} onChange={set("cardOvr")} placeholder="e.g. 94" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Playing Style</label>
                <select
                  value={formData.playingStyle}
                  onChange={e => setFormData(prev => ({ ...prev, playingStyle: e.target.value }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                >
                  <option value="">— Select style —</option>
                  {PLAYING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "cardPace", label: "Pace" },
                  { key: "cardShooting", label: "Shooting" },
                  { key: "cardPassing", label: "Passing" },
                  { key: "cardDribbling", label: "Dribbling" },
                  { key: "cardDefending", label: "Defending" },
                  { key: "cardPhysical", label: "Physical" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">{label}</label>
                    <Input
                      type="number" min="1" max="99"
                      value={(formData as any)[key]}
                      onChange={set(key)}
                      placeholder="—"
                      className="text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: live card preview */}
        <div className="hidden sm:flex flex-col items-center gap-2 w-44 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Preview</div>
          <PlayerCard player={cardPreview} size="sm" />
        </div>
      </div>

      <Button type="submit" variant="gaming" className="w-full mt-6" disabled={saving || uploadMutation.isPending}>
        {(saving || uploadMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {initialData ? "Save Changes" : "Add Card"}
      </Button>
    </form>
  );
}
