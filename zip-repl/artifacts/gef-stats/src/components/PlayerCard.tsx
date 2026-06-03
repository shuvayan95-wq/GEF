import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerCardData {
  name: string;
  imageUrl?: string | null;
  position?: string | null;
  nationality?: string | null;
  cardOvr?: number | null;
  cardPace?: number | null;
  cardShooting?: number | null;
  cardPassing?: number | null;
  cardDribbling?: number | null;
  cardDefending?: number | null;
  cardPhysical?: number | null;
  cardPlayingStyle?: string | null;
  cardType?: string | null;
}

// ── Card type themes ──────────────────────────────────────────────────────────

type CardTheme = {
  bg: string;
  shine: string;
  ovrColor: string;
  nameColor: string;
  statLabelColor: string;
  statBarBg: string;
  statBarFill: string;
  border: string;
  badge: string;
  badgeText: string;
};

const THEMES: Record<string, CardTheme> = {
  "Black Ball": {
    bg: "from-[#0a0a0a] via-[#1a1209] to-[#0a0a0a]",
    shine: "from-yellow-400/0 via-yellow-300/20 to-yellow-400/0",
    ovrColor: "text-yellow-300",
    nameColor: "text-yellow-100",
    statLabelColor: "text-yellow-400/80",
    statBarBg: "bg-yellow-900/40",
    statBarFill: "bg-gradient-to-r from-yellow-500 to-yellow-300",
    border: "border-yellow-500/60",
    badge: "bg-yellow-500/20 border-yellow-500/60",
    badgeText: "text-yellow-300",
  },
  "Iconic": {
    bg: "from-[#1a1000] via-[#2d1f00] to-[#1a1000]",
    shine: "from-amber-400/0 via-amber-300/25 to-amber-400/0",
    ovrColor: "text-amber-300",
    nameColor: "text-amber-100",
    statLabelColor: "text-amber-400/80",
    statBarBg: "bg-amber-900/40",
    statBarFill: "bg-gradient-to-r from-amber-600 to-amber-300",
    border: "border-amber-400/60",
    badge: "bg-amber-500/20 border-amber-400/60",
    badgeText: "text-amber-300",
  },
  "Featured": {
    bg: "from-[#030d1a] via-[#061830] to-[#030d1a]",
    shine: "from-blue-400/0 via-blue-300/20 to-blue-400/0",
    ovrColor: "text-blue-300",
    nameColor: "text-blue-100",
    statLabelColor: "text-blue-400/80",
    statBarBg: "bg-blue-900/40",
    statBarFill: "bg-gradient-to-r from-blue-600 to-cyan-300",
    border: "border-blue-400/50",
    badge: "bg-blue-500/20 border-blue-400/50",
    badgeText: "text-blue-300",
  },
  "Matchday": {
    bg: "from-[#001a06] via-[#002d0f] to-[#001a06]",
    shine: "from-green-400/0 via-green-300/20 to-green-400/0",
    ovrColor: "text-green-300",
    nameColor: "text-green-100",
    statLabelColor: "text-green-400/80",
    statBarBg: "bg-green-900/40",
    statBarFill: "bg-gradient-to-r from-green-600 to-emerald-300",
    border: "border-green-400/50",
    badge: "bg-green-500/20 border-green-400/50",
    badgeText: "text-green-300",
  },
  "Standard": {
    bg: "from-[#0d0d14] via-[#141420] to-[#0d0d14]",
    shine: "from-primary/0 via-primary/15 to-primary/0",
    ovrColor: "text-primary",
    nameColor: "text-foreground",
    statLabelColor: "text-muted-foreground",
    statBarBg: "bg-secondary/60",
    statBarFill: "bg-gradient-to-r from-primary to-cyan-400",
    border: "border-primary/30",
    badge: "bg-primary/10 border-primary/30",
    badgeText: "text-primary",
  },
};

function getTheme(cardType?: string | null): CardTheme {
  if (cardType && THEMES[cardType]) return THEMES[cardType];
  return THEMES["Standard"];
}

function statColor(val: number): string {
  if (val >= 90) return "text-yellow-300";
  if (val >= 80) return "text-green-400";
  if (val >= 70) return "text-blue-400";
  return "text-red-400";
}

// ── Stat Row ──────────────────────────────────────────────────────────────────

function StatRow({ label, value, theme }: { label: string; value: number | null | undefined; theme: CardTheme }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-[9px] font-bold uppercase tracking-wider w-7 shrink-0", theme.statLabelColor)}>{label}</span>
      <div className={cn("flex-1 h-1 rounded-full", theme.statBarBg)}>
        <div
          className={cn("h-full rounded-full transition-all", theme.statBarFill)}
          style={{ width: `${Math.min(v, 99)}%` }}
        />
      </div>
      <span className={cn("text-[11px] font-black tabular-nums w-5 text-right", statColor(v))}>{value ?? "—"}</span>
    </div>
  );
}

// ── Main Card ─────────────────────────────────────────────────────────────────

interface PlayerCardProps {
  player: PlayerCardData;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PlayerCard({ player, size = "md", className }: PlayerCardProps) {
  const theme = getTheme(player.cardType);
  const hasStats = player.cardOvr != null;

  const sizeClasses = {
    sm: "w-36 text-[10px]",
    md: "w-52",
    lg: "w-64",
  };

  const cardStats = [
    { label: "PAC", value: player.cardPace },
    { label: "SHT", value: player.cardShooting },
    { label: "PAS", value: player.cardPassing },
    { label: "DRB", value: player.cardDribbling },
    { label: "DEF", value: player.cardDefending },
    { label: "PHY", value: player.cardPhysical },
  ];

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden border select-none",
        "bg-gradient-to-b",
        theme.bg,
        theme.border,
        sizeClasses[size],
        className
      )}
      style={{
        clipPath: "polygon(16px 0%, 100% 0%, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0% 100%, 0% 16px)",
        aspectRatio: "2/3",
      }}
    >
      {/* Shine sweep */}
      <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none z-10", theme.shine)} />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5 z-0"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

      {/* Corner cut accent */}
      <div className={cn("absolute top-0 right-0 w-8 h-8 opacity-40 z-20", theme.badge.split(" ")[0])}
        style={{ clipPath: "polygon(100% 0%, 0% 0%, 100% 100%)" }} />

      <div className="relative z-20 flex flex-col h-full p-3 gap-1">

        {/* Top row: OVR + Position + Card type */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col items-center leading-none">
            <span className={cn("font-black tabular-nums leading-none", theme.ovrColor,
              size === "lg" ? "text-4xl" : size === "md" ? "text-3xl" : "text-2xl"
            )}>
              {player.cardOvr ?? "—"}
            </span>
            {player.position && (
              <span className={cn("font-bold uppercase tracking-widest mt-0.5",
                theme.badgeText,
                size === "lg" ? "text-[11px]" : "text-[9px]"
              )}>
                {player.position}
              </span>
            )}
          </div>

          {/* Card type badge */}
          {player.cardType && player.cardType !== "Standard" && (
            <span className={cn(
              "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border",
              theme.badge, theme.badgeText
            )}>
              {player.cardType}
            </span>
          )}
        </div>

        {/* Player image — centrepiece */}
        <div className="flex-1 flex items-center justify-center relative">
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.name}
              className="w-full h-full object-contain object-bottom drop-shadow-2xl"
              style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.8))" }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/images/default-avatar.png"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-secondary/50 border border-white/10 flex items-center justify-center text-4xl font-black text-white/20">
                {player.name.slice(0, 1)}
              </div>
            </div>
          )}

          {/* Nationality floating badge */}
          {player.nationality && (
            <div className={cn("absolute bottom-1 left-1 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border backdrop-blur-sm", theme.badge, theme.badgeText)}>
              {player.nationality.slice(0, 3)}
            </div>
          )}
        </div>

        {/* Player name */}
        <div className="text-center">
          <div className={cn(
            "font-black uppercase leading-tight truncate tracking-tight",
            theme.nameColor,
            size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-[10px]"
          )}>
            {player.name}
          </div>
          {player.cardPlayingStyle && (
            <div className={cn("text-[8px] font-bold uppercase tracking-widest opacity-70 mt-0.5 truncate", theme.badgeText)}>
              {player.cardPlayingStyle}
            </div>
          )}
        </div>

        {/* Divider */}
        {hasStats && <div className={cn("h-px opacity-30", theme.border.replace("border-", "bg-"))} />}

        {/* Stats */}
        {hasStats && (
          <div className="space-y-1 pb-0.5">
            {cardStats.map(s => (
              <StatRow key={s.label} label={s.label} value={s.value} theme={theme} />
            ))}
          </div>
        )}

        {/* No stats placeholder */}
        {!hasStats && (
          <div className="text-center pb-1">
            <span className={cn("text-[9px] opacity-40 uppercase tracking-widest", theme.statLabelColor)}>
              Stats not entered
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
