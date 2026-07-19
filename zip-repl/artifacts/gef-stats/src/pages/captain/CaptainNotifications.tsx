import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CaptainLayout } from "@/components/layout/CaptainLayout";
import { getApiUrl } from "@/lib/api";
import { Loader2, Bell, BellOff, Pin, Star, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const TYPE_COLORS: Record<string, string> = {
  announcement: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  violation: "text-red-400 bg-red-500/10 border-red-500/20",
  budget_change: "text-green-400 bg-green-500/10 border-green-500/20",
  player_update: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  transfer: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  contract: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  reward: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  penalty: "text-red-400 bg-red-500/10 border-red-500/20",
};

type FilterType = "all" | "unread" | "important" | "pinned";

export function CaptainNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: notifications = [], isLoading } = useQuery<any[]>({
    queryKey: ["captain-notifications"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/captain/notifications"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await fetch(getApiUrl(`/api/captain/notifications/${id}/read`), { method: "PATCH", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["captain-notifications"] }),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned }: { id: number; isPinned: boolean }) => {
      await fetch(getApiUrl(`/api/captain/notifications/${id}/pin`), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["captain-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch(getApiUrl("/api/captain/notifications/read-all"), { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["captain-notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.isRead;
    if (filter === "important") return n.isImportant;
    if (filter === "pinned") return n.isPinned;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const FILTERS: { key: FilterType; label: string; icon: any }[] = [
    { key: "all", label: "All", icon: Bell },
    { key: "unread", label: `Unread (${unreadCount})`, icon: BellOff },
    { key: "important", label: "Important", icon: Star },
    { key: "pinned", label: "Pinned", icon: Pin },
  ];

  return (
    <CaptainLayout>
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wide">Notifications</h1>
            <p className="text-sm text-muted-foreground">{unreadCount} unread · {notifications.length} total</p>
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${filter === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => (
              <div
                key={n.id}
                className={`bg-card border rounded-xl p-4 transition-all ${!n.isRead ? "border-primary/30 bg-primary/5" : "border-border"} ${n.isPinned ? "ring-1 ring-amber-500/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {n.isPinned && <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      {n.isImportant && <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TYPE_COLORS[n.type] ?? "text-muted-foreground bg-secondary border-border"}`}>
                        {n.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="font-bold text-sm">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {!n.isRead && (
                      <button onClick={() => markRead.mutate(n.id)}
                        className="text-[10px] text-primary hover:underline font-bold whitespace-nowrap">
                        Mark read
                      </button>
                    )}
                    <button onClick={() => togglePin.mutate({ id: n.id, isPinned: !n.isPinned })}
                      className={`text-[10px] hover:underline font-bold whitespace-nowrap ${n.isPinned ? "text-amber-400" : "text-muted-foreground"}`}>
                      {n.isPinned ? "Unpin" : "Pin"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CaptainLayout>
  );
}
