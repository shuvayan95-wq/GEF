import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2, Globe2, Lightbulb, HelpCircle, Users, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EfwPost {
  id: number; authorName: string; postType: string; title: string;
  content: string | null; imageUrl: string | null;
  formationCode: string | null; formationPlayers: string | null;
  isPinned: boolean; createdAt: string;
}

interface EfwFormation {
  id: number; formationCode: string; title: string;
  description: string | null; pros: string | null; cons: string | null;
  bestFor: string | null; style: string | null; sortOrder: number;
}
interface EfwTip {
  id: number; category: string | null; title: string; content: string | null; sortOrder: number;
}
interface EfwQna {
  id: number; question: string; answer: string | null; category: string | null; sortOrder: number;
}

// ── Generic Hooks ─────────────────────────────────────────────────────────────

function useCrud<T>(key: string, path: string) {
  const qc = useQueryClient();
  const list = useQuery<T[]>({
    queryKey: [key],
    queryFn: () => fetch(getApiUrl(path), { credentials: "include" }).then(r => r.json()),
  });
  const create = useMutation({
    mutationFn: (data: any) => fetch(getApiUrl(path), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => fetch(getApiUrl(`${path}/${id}`), { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => fetch(getApiUrl(`${path}/${id}`), { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
  return { list, create, update, remove };
}

// ── Textarea ──────────────────────────────────────────────────────────────────

function Textarea({ value, onChange, placeholder, rows = 3, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn("w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/50", className)}
    />
  );
}

// ── Formations Tab ────────────────────────────────────────────────────────────

const FORMATION_STYLES = ["Balanced", "Attacking", "Defensive"];

function FormationsTab() {
  const { list, create, update, remove } = useCrud<EfwFormation>("/api/efw/formations", "/api/efw/formations");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EfwFormation | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this formation?")) return;
    try { await remove.mutateAsync(id); toast({ title: "Deleted" }); }
    catch { toast({ variant: "destructive", title: "Failed" }); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{list.data?.length ?? 0} formations</p>
        <Button size="sm" variant="gaming" onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Formation
        </Button>
      </div>

      <div className="space-y-2">
        {list.isLoading && <div className="h-16 bg-secondary/30 rounded-xl animate-pulse" />}
        {list.data?.map(f => (
          <div key={f.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors">
            <div className="font-display font-black text-2xl text-primary w-20 shrink-0">{f.formationCode}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{f.title}</div>
              {f.bestFor && <div className="text-xs text-muted-foreground truncate mt-0.5">{f.bestFor}</div>}
            </div>
            {f.style && (
              <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border shrink-0",
                f.style === "Attacking" ? "bg-red-500/10 border-red-400/30 text-red-400" :
                f.style === "Defensive" ? "bg-blue-500/10 border-blue-400/30 text-blue-400" :
                "bg-yellow-500/10 border-yellow-400/30 text-yellow-400"
              )}>{f.style}</span>
            )}
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => { setEditing(f); setOpen(true); }}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(f.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
        {!list.isLoading && !list.data?.length && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            <Globe2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No formations yet. Click "Add Formation" to start.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Formation" : "Add Formation"}</DialogTitle></DialogHeader>
          <FormationForm
            key={editing?.id ?? "new"}
            initial={editing}
            onSave={async (data) => {
              try {
                if (editing) await update.mutateAsync({ id: editing.id, data });
                else await create.mutateAsync(data);
                toast({ title: editing ? "Updated" : "Formation added" });
                setOpen(false);
              } catch { toast({ variant: "destructive", title: "Failed to save" }); }
            }}
            saving={create.isPending || update.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormationForm({ initial, onSave, saving }: { initial: EfwFormation | null; onSave: (d: any) => void; saving: boolean }) {
  const [d, setD] = useState({
    formationCode: initial?.formationCode ?? "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    pros: initial?.pros ?? "",
    cons: initial?.cons ?? "",
    bestFor: initial?.bestFor ?? "",
    style: initial?.style ?? "Balanced",
    sortOrder: initial?.sortOrder ?? 0,
  });
  const f = (k: string) => (v: string) => setD(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(d); }} className="space-y-4 mt-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Formation Code *</label>
          <Input required value={d.formationCode} onChange={e => f("formationCode")(e.target.value)} placeholder="4-3-3" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Style</label>
          <select value={d.style} onChange={e => f("style")(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50">
            {FORMATION_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Title *</label>
        <Input required value={d.title} onChange={e => f("title")(e.target.value)} placeholder="Wing Attack Formation" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Best For</label>
        <Input value={d.bestFor} onChange={e => f("bestFor")(e.target.value)} placeholder="Counter-attacking, wing play…" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
        <Textarea value={d.description} onChange={f("description")} placeholder="Describe how this formation works and when to use it…" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Strengths (one per line)</label>
          <Textarea value={d.pros} onChange={f("pros")} placeholder="Strong width&#10;Good counter attack&#10;…" rows={4} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Weaknesses (one per line)</label>
          <Textarea value={d.cons} onChange={f("cons")} placeholder="Vulnerable to crosses&#10;Needs fast wingers&#10;…" rows={4} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Sort Order</label>
        <Input type="number" value={d.sortOrder} onChange={e => setD(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} placeholder="0" />
      </div>
      <Button type="submit" variant="gaming" className="w-full" disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {initial ? "Save Changes" : "Add Formation"}
      </Button>
    </form>
  );
}

// ── Tips Tab ──────────────────────────────────────────────────────────────────

const TIP_CATEGORIES = ["General", "Offense", "Defense", "Midfield", "Mental"];

function TipsTab() {
  const { list, create, update, remove } = useCrud<EfwTip>("/api/efw/tips", "/api/efw/tips");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EfwTip | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this tip?")) return;
    try { await remove.mutateAsync(id); toast({ title: "Deleted" }); }
    catch { toast({ variant: "destructive", title: "Failed" }); }
  };

  const catColor: Record<string, string> = {
    "Offense": "bg-red-500/10 border-red-400/30 text-red-400",
    "Defense": "bg-blue-500/10 border-blue-400/30 text-blue-400",
    "Midfield": "bg-yellow-500/10 border-yellow-400/30 text-yellow-400",
    "Mental": "bg-purple-500/10 border-purple-400/30 text-purple-400",
    "General": "bg-primary/10 border-primary/30 text-primary",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{list.data?.length ?? 0} tips</p>
        <Button size="sm" variant="gaming" onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Tip
        </Button>
      </div>

      <div className="space-y-2">
        {list.isLoading && <div className="h-16 bg-secondary/30 rounded-xl animate-pulse" />}
        {list.data?.map(t => (
          <div key={t.id} className="flex items-start gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-sm">{t.title}</span>
                {t.category && (
                  <span className={cn("text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border", catColor[t.category] ?? catColor["General"])}>
                    {t.category}
                  </span>
                )}
              </div>
              {t.content && <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setOpen(true); }}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
        {!list.isLoading && !list.data?.length && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No tips yet. Click "Add Tip" to start.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Tip" : "Add Tip"}</DialogTitle></DialogHeader>
          <TipForm
            key={editing?.id ?? "new"}
            initial={editing}
            onSave={async (data) => {
              try {
                if (editing) await update.mutateAsync({ id: editing.id, data });
                else await create.mutateAsync(data);
                toast({ title: editing ? "Updated" : "Tip added" });
                setOpen(false);
              } catch { toast({ variant: "destructive", title: "Failed to save" }); }
            }}
            saving={create.isPending || update.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TipForm({ initial, onSave, saving }: { initial: EfwTip | null; onSave: (d: any) => void; saving: boolean }) {
  const [d, setD] = useState({
    category: initial?.category ?? "General",
    title: initial?.title ?? "",
    content: initial?.content ?? "",
    sortOrder: initial?.sortOrder ?? 0,
  });
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(d); }} className="space-y-4 mt-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Category</label>
          <select value={d.category} onChange={e => setD(p => ({ ...p, category: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50">
            {TIP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Sort Order</label>
          <Input type="number" value={d.sortOrder} onChange={e => setD(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Title *</label>
        <Input required value={d.title} onChange={e => setD(p => ({ ...p, title: e.target.value }))} placeholder="Use manual cursor for better control" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Content</label>
        <Textarea value={d.content} onChange={v => setD(p => ({ ...p, content: v }))} placeholder="Explain the tip in detail…" rows={5} />
      </div>
      <Button type="submit" variant="gaming" className="w-full" disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {initial ? "Save Changes" : "Add Tip"}
      </Button>
    </form>
  );
}

// ── Q&A Tab ───────────────────────────────────────────────────────────────────

const QNA_CATEGORIES = ["General", "Gameplay", "Rules", "Cards", "Technical"];

function QnaTab() {
  const { list, create, update, remove } = useCrud<EfwQna>("/api/efw/qna", "/api/efw/qna");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EfwQna | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this Q&A?")) return;
    try { await remove.mutateAsync(id); toast({ title: "Deleted" }); }
    catch { toast({ variant: "destructive", title: "Failed" }); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{list.data?.length ?? 0} entries</p>
        <Button size="sm" variant="gaming" onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Q&A
        </Button>
      </div>

      <div className="space-y-2">
        {list.isLoading && <div className="h-16 bg-secondary/30 rounded-xl animate-pulse" />}
        {list.data?.map(q => (
          <div key={q.id} className="flex items-start gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span className="font-bold text-sm">{q.question}</span>
              </div>
              {q.answer && <p className="text-xs text-muted-foreground line-clamp-2 ml-5">{q.answer}</p>}
              {q.category && <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground ml-5">{q.category}</span>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => { setEditing(q); setOpen(true); }}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(q.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
        {!list.isLoading && !list.data?.length && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No Q&amp;A yet. Click "Add Q&amp;A" to start.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Q&A" : "Add Q&A"}</DialogTitle></DialogHeader>
          <QnaForm
            key={editing?.id ?? "new"}
            initial={editing}
            onSave={async (data) => {
              try {
                if (editing) await update.mutateAsync({ id: editing.id, data });
                else await create.mutateAsync(data);
                toast({ title: editing ? "Updated" : "Q&A added" });
                setOpen(false);
              } catch { toast({ variant: "destructive", title: "Failed to save" }); }
            }}
            saving={create.isPending || update.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QnaForm({ initial, onSave, saving }: { initial: EfwQna | null; onSave: (d: any) => void; saving: boolean }) {
  const [d, setD] = useState({
    category: initial?.category ?? "General",
    question: initial?.question ?? "",
    answer: initial?.answer ?? "",
    sortOrder: initial?.sortOrder ?? 0,
  });
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(d); }} className="space-y-4 mt-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Category</label>
          <select value={d.category} onChange={e => setD(p => ({ ...p, category: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50">
            {QNA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Sort Order</label>
          <Input type="number" value={d.sortOrder} onChange={e => setD(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Question *</label>
        <Input required value={d.question} onChange={e => setD(p => ({ ...p, question: e.target.value }))} placeholder="How do I counter a 4-3-3?" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Answer</label>
        <Textarea value={d.answer} onChange={v => setD(p => ({ ...p, answer: v }))} placeholder="Write a detailed answer…" rows={6} />
      </div>
      <Button type="submit" variant="gaming" className="w-full" disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {initial ? "Save Changes" : "Add Q&A"}
      </Button>
    </form>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

// ── Posts Tab ─────────────────────────────────────────────────────────────────

const POST_TYPE_LABELS: Record<string, string> = {
  formation: "Formation", card: "Card", moment: "Moment",
  highlight: "Highlight", other: "Other",
};

function PostsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: posts, isLoading } = useQuery<EfwPost[]>({
    queryKey: ["/api/efw/posts"],
    queryFn: () => fetch(getApiUrl("/api/efw/posts"), { credentials: "include" }).then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(getApiUrl(`/api/efw/posts/${id}`), { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/efw/posts"] }); toast({ title: "Post deleted" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
  });

  const pinMutation = useMutation({
    mutationFn: (id: number) => fetch(getApiUrl(`/api/efw/posts/${id}/pin`), { method: "PATCH", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/efw/posts"] }),
    onError: () => toast({ variant: "destructive", title: "Failed to pin" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{posts?.length ?? 0} community posts</p>
      </div>
      <div className="space-y-2">
        {isLoading && <div className="h-16 bg-secondary/30 rounded-xl animate-pulse" />}
        {posts?.map(post => (
          <div key={post.id} className="flex items-start gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[8px] font-bold uppercase tracking-widest bg-secondary border border-border px-2 py-0.5 rounded-full">
                  {POST_TYPE_LABELS[post.postType] ?? post.postType}
                </span>
                {post.isPinned && <span className="text-[8px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-500/10 border border-yellow-400/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Pin className="w-2.5 h-2.5" />Pinned</span>}
                <span className="text-xs font-semibold text-primary">{post.authorName}</span>
                <span className="text-[9px] text-muted-foreground ml-auto">
                  {new Date(post.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                </span>
              </div>
              <p className="font-bold text-sm truncate">{post.title}</p>
              {post.content && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.content}</p>}
              {post.formationCode && <span className="text-[9px] text-blue-400 font-bold mt-0.5 inline-block">{post.formationCode}</span>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" title={post.isPinned ? "Unpin" : "Pin"}
                onClick={() => pinMutation.mutate(post.id)}
                className={cn("h-8 w-8", post.isPinned ? "text-yellow-400" : "text-muted-foreground")}>
                {post.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(post.id); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && !posts?.length && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No community posts yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page tabs ─────────────────────────────────────────────────────────────

type AdminTab = "formations" | "tips" | "qna" | "posts";

const ADMIN_TABS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
  { key: "formations", label: "Formations",    icon: Globe2 },
  { key: "tips",       label: "Tips & Tricks", icon: Lightbulb },
  { key: "qna",        label: "Q&A",           icon: HelpCircle },
  { key: "posts",      label: "Community Posts", icon: Users },
];

export function ManageEfootballWorld() {
  const [tab, setTab] = useState<AdminTab>("formations");

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold uppercase">eFootball World</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage formations, tips &amp; Q&amp;A shown on the public eFootball World page</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {ADMIN_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all -mb-px",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "formations" && <FormationsTab />}
      {tab === "tips" && <TipsTab />}
      {tab === "qna" && <QnaTab />}
      {tab === "posts" && <PostsTab />}
    </AdminLayout>
  );
}
