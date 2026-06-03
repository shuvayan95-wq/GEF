import { Navbar } from "@/components/layout/Navbar";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Globe, Trophy, Handshake, CalendarDays, MapPin,
  Clock, User, Instagram, Twitter, ExternalLink, Flame, Crown, Star,
} from "lucide-react";
import { format } from "date-fns";

interface PartnerEvent {
  title: string;
  date?: string;
  description?: string;
  location?: string;
}

interface SocialLinks {
  instagram?: string;
  twitter?: string;
  website?: string;
  [key: string]: string | undefined;
}

interface StaffMember {
  name: string;
  role?: string;
  bio?: string;
  imageUrl?: string | null;
}

interface CmsPartner {
  id: number;
  name: string;
  slug: string;
  description: string;
  aboutLong: string;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  type: string;
  website: string | null;
  ownerName: string | null;
  ownerRole: string | null;
  ownerBio: string | null;
  ownerImageUrl: string | null;
  coOwnerName: string | null;
  coOwnerRole: string | null;
  coOwnerBio: string | null;
  coOwnerImageUrl: string | null;
  eventsJson: string;
  staffJson: string;
  socialLinks: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
}

function parseJson<T>(str: string, fallback: T): T {
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

function isPresident(role?: string) {
  return role?.toLowerCase().includes("president") && !role?.toLowerCase().includes("vice");
}
function isVicePresident(role?: string) {
  return role?.toLowerCase().includes("vice") || role?.toLowerCase().includes("vp");
}

interface LeaderCardProps {
  member: StaffMember;
  accentClass: string;
  icon: React.ReactNode;
  delay: number;
}

function LeaderCard({ member, accentClass, icon, delay }: LeaderCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col items-center text-center"
    >
      {/* Portrait frame */}
      <div className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl border-2 overflow-hidden mb-4 shadow-lg ${accentClass}`}>
        {member.imageUrl ? (
          <img
            src={member.imageUrl}
            alt={member.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-card/80 flex flex-col items-center justify-center gap-2">
            <User className="w-12 h-12 text-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">No Photo</span>
          </div>
        )}
        {/* Corner badge */}
        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow ${accentClass} bg-background/80`}>
          {icon}
        </div>
      </div>

      <div className="font-display font-black uppercase text-base leading-tight">{member.name}</div>
      <div className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${accentClass.includes("primary") ? "text-primary" : "text-yellow-400"}`}>
        {member.role}
      </div>
      {member.bio && (
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed max-w-[180px]">{member.bio}</p>
      )}
    </motion.div>
  );
}

export function PartnerDetail() {
  const [, params] = useRoute("/partners/:id");
  const id = params?.id;

  const { data: partner, isLoading, error } = useQuery<CmsPartner>({
    queryKey: ["partner-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/cms/partners/${id}`);
      if (!res.ok) throw new Error("Partner not found");
      return res.json();
    },
    enabled: !!id,
  });

  const isLeague = partner?.type === "league";
  const accentBorder = isLeague ? "border-yellow-500/40" : "border-primary/40";
  const accentText = isLeague ? "text-yellow-400" : "text-primary";
  const accentBg = isLeague ? "bg-yellow-500/10" : "bg-primary/10";

  const events: PartnerEvent[] = partner ? parseJson<PartnerEvent[]>(partner.eventsJson, []) : [];
  const staff: StaffMember[] = partner ? parseJson<StaffMember[]>(partner.staffJson, []) : [];
  const social: SocialLinks = partner ? parseJson<SocialLinks>(partner.socialLinks, {}) : {};

  const presidents = staff.filter(m => isPresident(m.role));
  const vicePresidents = staff.filter(m => isVicePresident(m.role));
  const otherStaff = staff.filter(m => !isPresident(m.role) && !isVicePresident(m.role));
  const hasLeadership = presidents.length > 0 || vicePresidents.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-muted-foreground">Partner not found.</div>
        <Link href="/#partners" className="text-primary hover:underline text-sm">← Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── BANNER ──────────────────────────────────────────────────────────── */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {partner.bannerImageUrl ? (
          <img src={partner.bannerImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full ${isLeague ? "bg-gradient-to-br from-yellow-500/20 via-yellow-500/5 to-background" : "bg-gradient-to-br from-primary/20 via-primary/5 to-background"}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="absolute bottom-6 left-0 right-0 container mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-end gap-5">
            {/* Logo frame — proper square with solid border */}
            <div className={`relative w-24 h-24 md:w-28 md:h-28 rounded-2xl border-2 overflow-hidden shrink-0 shadow-xl ${accentBorder} bg-card`}>
              {partner.imageUrl ? (
                <img
                  src={partner.imageUrl}
                  alt={partner.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${accentBg}`}>
                  {isLeague
                    ? <Trophy className="w-10 h-10 text-yellow-400/50" />
                    : <Handshake className="w-10 h-10 text-primary/40" />}
                </div>
              )}
            </div>

            <div className="pb-1">
              <div className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${isLeague ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-primary/10 text-primary border border-primary/20"}`}>
                {isLeague ? <Trophy className="w-3 h-3" /> : <Handshake className="w-3 h-3" />}
                {isLeague ? "League" : "Partner"}
              </div>
              <h1 className="font-display font-black uppercase text-3xl md:text-4xl leading-tight">{partner.name}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: main info */}
          <div className="lg:col-span-2 space-y-10">

            {/* About */}
            {(partner.description || partner.aboutLong) && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <h2 className={`font-display font-black uppercase text-lg mb-3 ${accentText}`}>About</h2>
                {partner.description && (
                  <p className="text-muted-foreground leading-relaxed text-sm mb-3">{partner.description}</p>
                )}
                {partner.aboutLong && (
                  <p className="text-foreground/80 leading-relaxed text-sm whitespace-pre-line">{partner.aboutLong}</p>
                )}
              </motion.section>
            )}

            {/* ── PRESIDENT & VICE PRESIDENT ────────────────────────────────── */}
            {hasLeadership && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
                <h2 className={`font-display font-black uppercase text-lg mb-6 ${accentText}`}>
                  Leadership
                </h2>

                <div className={`rounded-2xl border ${accentBorder} ${accentBg} p-6`}>
                  <div className="flex flex-wrap justify-center gap-10">
                    {presidents.map((m, i) => (
                      <LeaderCard
                        key={`pres-${i}`}
                        member={m}
                        accentClass={isLeague ? "border-yellow-500/40" : "border-primary/40"}
                        icon={<Crown className="w-3 h-3 text-primary" />}
                        delay={0.09 + i * 0.05}
                      />
                    ))}
                    {vicePresidents.map((m, i) => (
                      <LeaderCard
                        key={`vp-${i}`}
                        member={m}
                        accentClass={isLeague ? "border-yellow-400/30" : "border-primary/30"}
                        icon={<Star className="w-3 h-3 text-primary" />}
                        delay={0.12 + i * 0.05}
                      />
                    ))}
                  </div>
                </div>
              </motion.section>
            )}

            {/* ── OTHER STAFF / ADMINISTRATION ──────────────────────────────── */}
            {otherStaff.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <h2 className={`font-display font-black uppercase text-lg mb-4 ${accentText}`}>Administration</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {otherStaff.map((member, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}
                      className="bg-card border border-border rounded-xl overflow-hidden text-center group"
                    >
                      <div className={`h-32 flex items-center justify-center overflow-hidden ${isLeague ? "bg-gradient-to-br from-yellow-500/10 to-card" : "bg-gradient-to-br from-primary/10 to-card"}`}>
                        {member.imageUrl ? (
                          <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <User className="w-10 h-10 text-muted-foreground/20" />
                            <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">No Photo</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="font-display font-black uppercase text-xs leading-tight">{member.name}</div>
                        {member.role && <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${accentText}`}>{member.role}</div>}
                        {member.bio && <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{member.bio}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* ── EVENTS ────────────────────────────────────────────────────── */}
            {events.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                <h2 className={`font-display font-black uppercase text-lg mb-4 ${accentText}`}>Events Organised</h2>
                <div className="space-y-3">
                  {events.map((ev, i) => {
                    const hasPast = ev.date && new Date(ev.date) < new Date();
                    return (
                      <div key={i} className={`flex gap-4 p-4 rounded-xl border ${hasPast ? "opacity-60 border-border bg-card/50" : "border-primary/20 bg-primary/5"}`}>
                        {ev.date && (
                          <div className={`shrink-0 w-14 text-center rounded-xl py-2 ${hasPast ? "bg-secondary" : "bg-primary/10 border border-primary/20"}`}>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(ev.date), "MMM")}</div>
                            <div className={`text-xl font-display font-black leading-none ${hasPast ? "text-muted-foreground" : "text-primary"}`}>{format(new Date(ev.date), "d")}</div>
                            <div className="text-[10px] text-muted-foreground">{format(new Date(ev.date), "yyyy")}</div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm uppercase">{ev.title}</div>
                          {ev.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ev.description}</p>}
                          {ev.location && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
                              <MapPin className="w-3 h-3" /> {ev.location}
                            </div>
                          )}
                        </div>
                        {hasPast && <span className="text-[10px] font-bold text-muted-foreground self-start bg-secondary px-2 py-0.5 rounded-full">Past</span>}
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Owner card */}
            {partner.ownerName && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div className={`h-48 flex items-center justify-center overflow-hidden ${isLeague ? "bg-gradient-to-br from-yellow-500/10 to-card" : "bg-gradient-to-br from-primary/10 to-card"}`}>
                  {partner.ownerImageUrl ? (
                    <img src={partner.ownerImageUrl} alt={partner.ownerName} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <User className="w-14 h-14 text-muted-foreground/20" />
                      <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">No Photo</span>
                    </div>
                  )}
                </div>
                <div className="p-4 text-center">
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${accentText}`}>
                    {partner.ownerRole || "Founder"}
                  </div>
                  <div className="font-display font-black uppercase text-base leading-tight">{partner.ownerName}</div>
                  {partner.ownerBio && (
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{partner.ownerBio}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Co-Owner card */}
            {partner.coOwnerName && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.11 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div className={`h-48 flex items-center justify-center overflow-hidden ${isLeague ? "bg-gradient-to-br from-yellow-500/10 to-card" : "bg-gradient-to-br from-primary/10 to-card"}`}>
                  {partner.coOwnerImageUrl ? (
                    <img src={partner.coOwnerImageUrl} alt={partner.coOwnerName} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <User className="w-14 h-14 text-muted-foreground/20" />
                      <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">No Photo</span>
                    </div>
                  )}
                </div>
                <div className="p-4 text-center">
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${accentText}`}>
                    {partner.coOwnerRole || "Co-Founder"}
                  </div>
                  <div className="font-display font-black uppercase text-base leading-tight">{partner.coOwnerName}</div>
                  {partner.coOwnerBio && (
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{partner.coOwnerBio}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Links */}
            {(partner.website || social.instagram || social.twitter) && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}
                className="bg-card border border-border rounded-2xl p-4 space-y-2"
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Links</div>
                {partner.website && (
                  <a href={partner.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm hover:text-primary transition-colors group"
                  >
                    <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    <span className="truncate">Website</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                  </a>
                )}
                {social.instagram && (
                  <a href={social.instagram.startsWith("http") ? social.instagram : `https://instagram.com/${social.instagram}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm hover:text-pink-400 transition-colors group"
                  >
                    <Instagram className="w-4 h-4 text-muted-foreground group-hover:text-pink-400" />
                    <span className="truncate">{social.instagram.startsWith("http") ? "Instagram" : `@${social.instagram}`}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                  </a>
                )}
                {social.twitter && (
                  <a href={social.twitter.startsWith("http") ? social.twitter : `https://x.com/${social.twitter}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm hover:text-sky-400 transition-colors group"
                  >
                    <Twitter className="w-4 h-4 text-muted-foreground group-hover:text-sky-400" />
                    <span className="truncate">{social.twitter.startsWith("http") ? "X / Twitter" : `@${social.twitter}`}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                  </a>
                )}
              </motion.div>
            )}

            {/* Type badge */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Partnership Type</div>
              <div className={`inline-flex items-center gap-1.5 text-sm font-bold uppercase px-3 py-1.5 rounded-lg ${isLeague ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-primary/10 text-primary border border-primary/20"}`}>
                {isLeague ? <Trophy className="w-4 h-4" /> : <Handshake className="w-4 h-4" />}
                {isLeague ? "Official League Partner" : "Official Partner"}
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/30 mt-4">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-bold text-sm">GEF STATS</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">© {new Date().getFullYear()} Global eFootball Federation. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/players" className="hover:text-foreground transition-colors">Players</Link>
            <Link href="/teams" className="hover:text-foreground transition-colors">Teams</Link>
            <Link href="/matches" className="hover:text-foreground transition-colors">Matches</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
