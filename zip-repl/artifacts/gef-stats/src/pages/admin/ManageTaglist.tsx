import { useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Check, X, Pencil, Loader2, Users, Tag, MessageCircle,
  UserX, UserCheck, ArrowUp, ArrowDown, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TaglistPlayer {
  id: number; name: string; imageUrl: string | null; position: string | null;
  nationality: string | null; efootballId: string | null; rank: string | null;
  crewName: string | null; whatsappNumber: string | null; status: string;
  teamRole: string | null; lineupRole: string | null;
}
interface TaglistTeam {
  id: number; name: string; logoUrl: string | null;
  playerCount: number; players: TaglistPlayer[]; status?: string;
}
interface TaglistData { teams: TaglistTeam[]; freeAgents: TaglistPlayer[]; }

function useTaglistAdmin() {
  return useQuery<TaglistData>({
    queryKey: ["/api/taglist"],
    queryFn: () => fetch(getApiUrl("/api/taglist"), { credentials: "include" }).then(r => r.json()),
  });
}

function useUpdateIdentity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, efootballId, rank, crewName, whatsappNumber }: {
      id: number; efootballId: string; rank: string; crewName: string; whatsappNumber: string;
    }) =>
      fetch(getApiUrl(`/api/players/${id}/identity`), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ efootballId: efootballId || null, rank: rank || null, crewName: crewName || null, whatsappNumber: whatsappNumber || null }),
      }).then(r => { if (!r.ok) throw new Error("Failed to save"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/taglist"] });
      qc.invalidateQueries({ queryKey: ["/api/players"] });
    },
  });
}

function useTogglePlayerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(getApiUrl(`/api/players/${id}/status`), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/taglist"] });
      qc.invalidateQueries({ queryKey: ["/api/players"] });
    },
  });
}

function useSetLineupRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role, replacingPlayerId }: { id: number; role: string | null; replacingPlayerId?: number }) =>
      fetch(getApiUrl(`/api/players/${id}/lineup-role`), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, replacingPlayerId }),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/taglist"] });
      qc.invalidateQueries({ queryKey: ["/api/players"] });
    },
  });
}

function LineupRoleCell({ player, mainPlayers }: { player: TaglistPlayer; mainPlayers: TaglistPlayer[] }) {
  const [promoting, setPromoting] = useState(false);
  const [replacingId, setReplacingId] = useState<string>("");
  const setRole = useSetLineupRole();
  const { toast } = useToast();

  const handlePromote = async () => {
    try {
      await setRole.mutateAsync({
        id: player.id,
        role: "main",
        replacingPlayerId: replacingId ? parseInt(replacingId) : undefined,
      });
      setPromoting(false);
      setReplacingId("");
      toast({ title: `${player.name} promoted to main lineup` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update lineup" });
    }
  };

  const handleDemote = async () => {
    try {
      await setRole.mutateAsync({ id: player.id, role: "bench" });
      toast({ title: `${player.name} moved to bench` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update lineup" });
    }
  };

  const isMain = player.lineupRole === "main";
  const isBench = player.lineupRole === "bench";

  if (promoting) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <select
          value={replacingId}
          onChange={e => setReplacingId(e.target.value)}
          className="flex-1 min-w-0 bg-background border border-primary/40 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary text-foreground"
        >
          <option value="">Nobody (first pick)</option>
          {mainPlayers.filter(p => p.id !== player.id).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={handlePromote}
          disabled={setRole.isPending}
          className="w-6 h-6 rounded bg-primary/15 border border-primary/40 flex items-center justify-center text-primary hover:bg-primary/25"
        >
          {setRole.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button
          onClick={() => { setPromoting(false); setReplacingId(""); }}
          className="w-6 h-6 rounded bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary/80"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Role badge */}
      <span className={cn(
        "text-[9px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0",
        isMain ? "text-green-400 bg-green-500/10 border-green-500/30" :
        isBench ? "text-amber-400 bg-amber-500/10 border-amber-500/30" :
        "text-muted-foreground/40 border-border/30"
      )}>
        {isMain ? "Main" : isBench ? "Bench" : "—"}
      </span>

      {/* Promote button */}
      {!isMain && (
        <button
          onClick={() => setPromoting(true)}
          title="Promote to main lineup"
          className="w-6 h-6 rounded border border-green-500/30 text-green-400 flex items-center justify-center hover:bg-green-500/10 transition-colors"
        >
          <ArrowUp className="w-3 h-3" />
        </button>
      )}

      {/* Demote button */}
      {!isBench && (
        <button
          onClick={handleDemote}
          disabled={setRole.isPending}
          title="Move to bench"
          className="w-6 h-6 rounded border border-amber-500/30 text-amber-400 flex items-center justify-center hover:bg-amber-500/10 transition-colors"
        >
          {setRole.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowDown className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

function PlayerIdentityRow({ player, mainPlayers }: { player: TaglistPlayer; mainPlayers: TaglistPlayer[] }) {
  const [editing, setEditing] = useState(false);
  const [efootballId, setEfootballId] = useState(player.efootballId ?? "");
  const [rank, setRank] = useState(player.rank ?? "");
  const [crewName, setCrewName] = useState(player.crewName ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(player.whatsappNumber ?? "");
  const updateMutation = useUpdateIdentity();
  const toggleStatus = useTogglePlayerStatus();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setEfootballId(player.efootballId ?? "");
    setRank(player.rank ?? "");
    setCrewName(player.crewName ?? "");
    setWhatsappNumber(player.whatsappNumber ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const cancel = () => {
    setEditing(false);
    setEfootballId(player.efootballId ?? "");
    setRank(player.rank ?? "");
    setCrewName(player.crewName ?? "");
    setWhatsappNumber(player.whatsappNumber ?? "");
  };
  const save = async () => {
    try {
      await updateMutation.mutateAsync({ id: player.id, efootballId, rank, crewName, whatsappNumber });
      setEditing(false);
      toast({ title: `${player.name} updated` });
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
    }
  };
  const handleStatusToggle = async () => {
    const newStatus = player.status === "active" ? "left" : "active";
    try {
      await toggleStatus.mutateAsync({ id: player.id, status: newStatus });
      toast({ title: `${player.name} marked as ${newStatus}` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  };

  const waDigits = player.whatsappNumber ? player.whatsappNumber.replace(/\D/g, "") : "";
  const isLeft = player.status === "left";

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2.5 border-b border-border/40 last:border-0 transition-colors text-xs",
      isLeft ? "opacity-50 bg-red-500/5" : editing ? "bg-primary/5" : "hover:bg-secondary/20"
    )}>
      {/* Avatar + name */}
      <img src={player.imageUrl || "/images/default-avatar.png"} className="w-8 h-8 rounded-full object-cover border border-border shrink-0" alt={player.name} />
      <div className="w-28 shrink-0">
        <div className="flex items-center gap-1">
          <div className="font-bold text-xs uppercase truncate">{player.name}</div>
          {isLeft && <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">Left</span>}
        </div>
        {player.position && <div className="text-[9px] text-muted-foreground uppercase">{player.position}</div>}
      </div>

      {/* Lineup role */}
      <div className="w-36 shrink-0">
        <LineupRoleCell player={player} mainPlayers={mainPlayers} />
      </div>

      {/* Fields */}
      {editing ? (
        <>
          <input ref={inputRef} value={efootballId} onChange={e => setEfootballId(e.target.value)} onKeyDown={handleKeyDown} placeholder="eFootball ID"
            className="flex-1 min-w-0 bg-background border border-primary/40 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50" />
          <input value={rank} onChange={e => setRank(e.target.value)} onKeyDown={handleKeyDown} placeholder="Rank"
            className="w-20 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50" />
          <input value={crewName} onChange={e => setCrewName(e.target.value)} onKeyDown={handleKeyDown} placeholder="Crew Name"
            className="w-24 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50" />
          <input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} onKeyDown={handleKeyDown} placeholder="+1234567890"
            className="w-28 bg-background border border-green-500/40 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-green-500 text-foreground placeholder:text-muted-foreground/50" />
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={save} disabled={updateMutation.isPending}
              className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/40 flex items-center justify-center hover:bg-primary/25 transition-colors text-primary">
              {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={cancel}
              className="w-7 h-7 rounded-lg bg-secondary/50 border border-border flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <span className={cn("font-mono text-xs font-bold", player.efootballId ? "text-primary" : "text-muted-foreground/30")}>
              {player.efootballId || "—"}
            </span>
          </div>
          <div className="w-20 shrink-0">
            <span className={cn("text-xs", player.rank ? "text-yellow-400 font-bold" : "text-muted-foreground/30")}>{player.rank || "—"}</span>
          </div>
          <div className="w-24 shrink-0">
            <span className={cn("text-xs", player.crewName ? "text-cyan-400" : "text-muted-foreground/30")}>{player.crewName || "—"}</span>
          </div>
          <div className="w-28 shrink-0">
            {waDigits ? (
              <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-green-400 font-bold hover:text-green-300 transition-colors">
                <MessageCircle className="w-3 h-3" />{player.whatsappNumber}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground/30">—</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleStatusToggle} disabled={toggleStatus.isPending} title={isLeft ? "Mark as Active" : "Mark as Left"}
              className={cn("w-7 h-7 rounded-lg border flex items-center justify-center transition-colors",
                isLeft ? "border-green-500/30 text-green-400 hover:bg-green-500/10" : "border-red-500/30 text-red-400 hover:bg-red-500/10")}>
              {toggleStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : isLeft ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
            </button>
            <button onClick={startEdit}
              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-secondary hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground shrink-0">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TeamSection({ team, defaultOpen }: { team: TaglistTeam; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const leftCount = team.players.filter(p => p.status === "left").length;
  const mainCount = team.players.filter(p => p.lineupRole === "main").length;
  const benchCount = team.players.filter(p => p.lineupRole === "bench").length;
  const mainPlayers = team.players.filter(p => p.lineupRole === "main");

  return (
    <div className={cn("bg-card border rounded-2xl overflow-hidden transition-all", open ? "border-primary/20" : "border-border")}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/10 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center border border-border overflow-hidden shrink-0">
          {team.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-contain" /> : <Shield className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-display font-bold uppercase truncate">{team.name}</div>
            {team.status === "left" && (
              <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">Inactive</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>{team.playerCount} active</span>
            {leftCount > 0 && <span className="text-red-400">{leftCount} left</span>}
            {mainCount > 0 && <span className="text-green-400 flex items-center gap-0.5"><ArrowUp className="w-2.5 h-2.5" />{mainCount} main</span>}
            {benchCount > 0 && <span className="text-amber-400 flex items-center gap-0.5"><ArrowDown className="w-2.5 h-2.5" />{benchCount} bench</span>}
          </div>
        </div>
        <div className={cn("text-muted-foreground transition-transform duration-200", open && "rotate-180")}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="border-t border-border/60">
              {team.players.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground/60">No players in this team</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 border-b border-border/40 text-[9px] font-bold uppercase tracking-widest text-muted-foreground overflow-x-auto">
                    <div className="w-8 shrink-0" />
                    <div className="w-28 shrink-0">Player</div>
                    <div className="w-36 shrink-0">Lineup Role</div>
                    <div className="flex-1 min-w-0">eFootball ID</div>
                    <div className="w-20 shrink-0">Rank</div>
                    <div className="w-24 shrink-0">Crew</div>
                    <div className="w-28 shrink-0 flex items-center gap-1 text-green-400"><MessageCircle className="w-3 h-3" />WhatsApp</div>
                    <div className="w-16 shrink-0 text-center">Actions</div>
                  </div>
                  {team.players.map(p => (
                    <PlayerIdentityRow key={p.id} player={p} mainPlayers={mainPlayers} />
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ManageTaglist() {
  const { data, isLoading } = useTaglistAdmin();

  const totalActive = (data?.teams.reduce((s, t) => s + t.playerCount, 0) ?? 0) + (data?.freeAgents.filter(p => p.status === "active").length ?? 0);
  const totalLeft = data?.teams.flatMap(t => t.players).filter(p => p.status === "left").length ?? 0;
  const totalMain = data?.teams.flatMap(t => t.players).filter(p => p.lineupRole === "main").length ?? 0;
  const totalBench = data?.teams.flatMap(t => t.players).filter(p => p.lineupRole === "bench").length ?? 0;

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold uppercase">Manage Taglist</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edit player IDs, set lineup roles (Main / Bench), and toggle status. Use ↑ to promote a player to the main lineup — you can select who they replace.
        </p>
      </div>

      {!isLoading && data && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { label: "Teams", value: data.teams.length, icon: Shield, color: "" },
            { label: "Active", value: totalActive, icon: Users, color: "text-green-400" },
            { label: "Main Lineup", value: totalMain, icon: ArrowUp, color: "text-green-400" },
            { label: "Bench", value: totalBench, icon: ArrowDown, color: "text-amber-400" },
            { label: "Left", value: totalLeft, icon: UserX, color: "text-red-400" },
            { label: "Free Agents", value: data.freeAgents.length, icon: Tag, color: "" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-sm">
              <s.icon className={`w-4 h-4 ${s.color || "text-primary"}`} />
              <span className={`font-black ${s.color || "text-primary"}`}>{s.value}</span>
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-2xl animate-pulse border border-border" />)}</div>
      ) : (
        <div className="space-y-3">
          {data?.teams.map((team, i) => <TeamSection key={team.id} team={team as any} defaultOpen={i === 0} />)}
          {data && data.freeAgents.length > 0 && (
            <TeamSection
              team={{ id: -1, name: "Free Agents", logoUrl: null, playerCount: data.freeAgents.filter(p => p.status === "active").length, players: data.freeAgents } as any}
              defaultOpen={false}
            />
          )}
        </div>
      )}
    </AdminLayout>
  );
}
