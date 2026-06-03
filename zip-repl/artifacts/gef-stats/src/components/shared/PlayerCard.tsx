import { Player } from "@workspace/api-client-react/src/generated/api.schemas";
import { formatOvr } from "@/lib/utils";
import { Link } from "wouter";
import { Shield, Target, Trophy, Activity } from "lucide-react";

function getOvrTierClass(ovr: number): string {
  if (ovr >= 90) return "ovr-elite";
  if (ovr >= 80) return "ovr-great";
  if (ovr >= 70) return "ovr-average";
  return "ovr-poor";
}

function getAvatarBorderClass(ovr: number): string {
  if (ovr >= 90) return "border-yellow-400/70 shadow-[0_0_14px_rgba(234,179,8,0.55)]";
  if (ovr >= 80) return "border-primary/60 shadow-[0_0_12px_rgba(34,197,94,0.45)]";
  if (ovr >= 70) return "border-blue-400/50 shadow-[0_0_8px_rgba(96,165,250,0.3)]";
  return "border-red-400/40";
}

function getCardAccentClass(ovr: number): string {
  if (ovr >= 90) return "from-yellow-400/10 via-yellow-400/5";
  if (ovr >= 80) return "from-primary/10 via-primary/5";
  if (ovr >= 70) return "from-blue-400/8 via-blue-400/4";
  return "from-red-400/8 via-red-400/4";
}

function getHeaderBgClass(ovr: number): string {
  if (ovr >= 90) return "bg-gradient-to-br from-yellow-400/10 to-secondary";
  if (ovr >= 80) return "bg-gradient-to-br from-primary/10 to-secondary";
  if (ovr >= 70) return "bg-gradient-to-br from-blue-400/8 to-secondary";
  return "bg-secondary";
}

export function PlayerCard({ player }: { player: Player }) {
  const ovr = player.overallRating ?? 0;
  const tierClass = getOvrTierClass(ovr);
  const avatarBorder = getAvatarBorderClass(ovr);
  const accentGradient = getCardAccentClass(ovr);
  const headerBg = getHeaderBgClass(ovr);

  return (
    <Link href={`/players/${player.id}`}>
      <div className={`card-beam group relative rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1.5 cursor-pointer`}>

        {/* Hover gradient sweep */}
        <div className={`absolute inset-0 bg-gradient-to-b ${accentGradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

        {/* Top Header Section */}
        <div className={`relative h-24 ${headerBg} flex justify-between p-4 border-b border-border/60`}>
          {/* Corner reticle accents */}
          <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-primary/30" />
          <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-primary/30" />

          <div className="flex flex-col justify-center">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{player.position || 'N/A'}</span>
            <span className="text-[11px] font-semibold text-foreground/70 flex items-center gap-1 mt-1">
              <Shield className="w-2.5 h-2.5 text-primary shrink-0" />
              <span className="truncate max-w-[80px]">{player.teamName || 'Free Agent'}</span>
            </span>
          </div>

          <div className="flex flex-col items-end justify-center">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">OVR</span>
            <span className={`font-display text-4xl leading-none font-black ${tierClass}`}>
              {formatOvr(player.overallRating)}
            </span>
          </div>
        </div>

        {/* Avatar Overlap */}
        <div className={`absolute top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-4 border-card bg-secondary overflow-hidden z-10 flex items-center justify-center transition-all duration-300 ${avatarBorder}`}>
          {player.imageUrl ? (
            <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <img src={`${import.meta.env.BASE_URL}images/default-avatar.png`} alt="Default" className="w-full h-full object-cover opacity-50 grayscale" />
          )}
        </div>

        {/* Content */}
        <div className="pt-14 pb-5 px-4 text-center relative z-0">
          <h3 className="font-display text-xl font-black text-foreground mb-1 uppercase tracking-wide truncate group-hover:text-primary transition-colors duration-200">
            {player.name}
          </h3>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="flex flex-col items-center p-2 rounded-lg bg-background/50 border border-white/5 hover:border-primary/20 transition-colors">
              <Activity className="w-3 h-3 text-muted-foreground mb-0.5" />
              <span className="font-bold text-sm text-foreground">{player.matchesPlayed}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wide">M</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-background/50 border border-white/5 hover:border-green-400/20 transition-colors">
              <Target className="w-3 h-3 text-green-400 mb-0.5" />
              <span className="font-bold text-sm text-foreground">{player.goalsScored}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wide">GLS</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-background/50 border border-white/5 hover:border-yellow-400/20 transition-colors">
              <Trophy className="w-3 h-3 text-yellow-400 mb-0.5" />
              <span className="font-bold text-sm text-foreground">{player.mvpCount}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wide">MVP</span>
            </div>
          </div>

          <div className="mt-3 flex justify-center gap-1.5 text-xs font-display font-bold">
            <span className="text-green-500">{player.wins}W</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-yellow-500">{player.draws}D</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-red-500">{player.losses}L</span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/30 transition-all duration-300" />
      </div>
    </Link>
  );
}
