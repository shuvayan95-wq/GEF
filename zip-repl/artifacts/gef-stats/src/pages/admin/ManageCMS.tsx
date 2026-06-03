import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/use-upload";
import { Globe, Plus, Trash2, Loader2, ChevronDown, ChevronUp, Eye, EyeOff, Pencil, X, Check, CalendarDays, Handshake, Crown, Upload } from "lucide-react";

type CmsSettings = Record<string, string>;

interface CmsPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  imageUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface CmsEvent {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string | null;
  location: string | null;
  isPublished: boolean;
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
}

interface CmsAdminMember {
  id: number;
  name: string;
  role: string;
  imageUrl: string | null;
  bio: string;
  sortOrder: number;
  isVisible: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  hero_badge: "Hero Badge Text",
  hero_title: "Hero Title",
  hero_subtitle: "Hero Subtitle",
  mission_title: "Mission Title",
  mission_text: "Mission Text",
  about_title: "About Title",
  about_text: "About Text",
  fun_fact_1: "Fun Fact #1",
  fun_fact_2: "Fun Fact #2",
  fun_fact_3: "Fun Fact #3",
  cta_text: "CTA Headline",
  cta_subtitle: "CTA Subtitle",
};

const SETTING_KEYS = Object.keys(SECTION_LABELS);

type Tab = "settings" | "posts" | "events" | "partners" | "team";

export function ManageCMS() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("settings");

  // ─── Settings ───────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<CmsSettings>({});
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadSettings = async () => {
    const data = await fetch("/api/cms/settings").then(r => r.json());
    setSettings(data);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/cms/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Homepage settings saved!" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSettingsSaving(false);
    }
  };

  // ─── Posts ───────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<CmsPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postForm, setPostForm] = useState<Partial<CmsPost> | null>(null);
  const [postSaving, setPostSaving] = useState(false);

  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      const data = await fetch("/api/cms/posts/all").then(r => r.json());
      setPosts(Array.isArray(data) ? data : []);
    } finally {
      setPostsLoading(false);
    }
  };

  const savePost = async () => {
    if (!postForm?.title) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setPostSaving(true);
    try {
      const method = postForm.id ? "PUT" : "POST";
      const url = postForm.id ? `/api/cms/posts/${postForm.id}` : "/api/cms/posts";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(postForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: postForm.id ? "Post updated!" : "Post created!" });
      setPostForm(null);
      await loadPosts();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setPostSaving(false);
    }
  };

  const deletePost = async (id: number) => {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/cms/posts/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Post deleted" });
    await loadPosts();
  };

  const togglePostPublish = async (post: CmsPost) => {
    await fetch(`/api/cms/posts/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...post, isPublished: !post.isPublished }),
    });
    await loadPosts();
  };

  // ─── Events ──────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<CmsEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventForm, setEventForm] = useState<Partial<CmsEvent> | null>(null);
  const [eventSaving, setEventSaving] = useState(false);

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const data = await fetch("/api/cms/events/all").then(r => r.json());
      setEvents(Array.isArray(data) ? data : []);
    } finally {
      setEventsLoading(false);
    }
  };

  const saveEvent = async () => {
    if (!eventForm?.title || !eventForm?.eventDate) {
      toast({ title: "Title and date are required", variant: "destructive" });
      return;
    }
    setEventSaving(true);
    try {
      const method = eventForm.id ? "PUT" : "POST";
      const url = eventForm.id ? `/api/cms/events/${eventForm.id}` : "/api/cms/events";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(eventForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: eventForm.id ? "Event updated!" : "Event created!" });
      setEventForm(null);
      await loadEvents();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setEventSaving(false);
    }
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/cms/events/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Event deleted" });
    await loadEvents();
  };

  const toggleEventPublish = async (event: CmsEvent) => {
    await fetch(`/api/cms/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...event, isPublished: !event.isPublished }),
    });
    await loadEvents();
  };

  // ─── Partners ────────────────────────────────────────────────────────────
  const [partners, setPartners] = useState<CmsPartner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnerForm, setPartnerForm] = useState<Partial<CmsPartner> | null>(null);
  const [partnerSaving, setPartnerSaving] = useState(false);
  const [partnerFile, setPartnerFile] = useState<File | null>(null);
  const [partnerPreview, setPartnerPreview] = useState<string>("");
  const [partnerBannerFile, setPartnerBannerFile] = useState<File | null>(null);
  const [partnerBannerPreview, setPartnerBannerPreview] = useState<string>("");
  const [partnerOwnerFile, setPartnerOwnerFile] = useState<File | null>(null);
  const [partnerOwnerPreview, setPartnerOwnerPreview] = useState<string>("");
  const [partnerCoOwnerFile, setPartnerCoOwnerFile] = useState<File | null>(null);
  const [partnerCoOwnerPreview, setPartnerCoOwnerPreview] = useState<string>("");
  const [staffFiles, setStaffFiles] = useState<(File | null)[]>([]);
  const [staffPreviews, setStaffPreviews] = useState<string[]>([]);
  const partnerUpload = useImageUpload();
  const partnerBannerUpload = useImageUpload();
  const partnerOwnerUpload = useImageUpload();
  const partnerCoOwnerUpload = useImageUpload();
  const staffUpload = useImageUpload();

  const loadPartners = async () => {
    setPartnersLoading(true);
    try {
      const data = await fetch("/api/cms/partners/all").then(r => r.json());
      setPartners(Array.isArray(data) ? data : []);
    } finally {
      setPartnersLoading(false);
    }
  };

  const resetPartnerFiles = () => {
    setPartnerFile(null); setPartnerPreview("");
    setPartnerBannerFile(null); setPartnerBannerPreview("");
    setPartnerOwnerFile(null); setPartnerOwnerPreview("");
    setPartnerCoOwnerFile(null); setPartnerCoOwnerPreview("");
    setStaffFiles([]); setStaffPreviews([]);
  };

  const savePartner = async () => {
    if (!partnerForm?.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setPartnerSaving(true);
    try {
      let imageUrl = partnerForm.imageUrl ?? null;
      let bannerImageUrl = partnerForm.bannerImageUrl ?? null;
      let ownerImageUrl = partnerForm.ownerImageUrl ?? null;
      let coOwnerImageUrl = partnerForm.coOwnerImageUrl ?? null;
      if (partnerFile) { const r = await partnerUpload.mutateAsync(partnerFile); imageUrl = r.url; }
      if (partnerBannerFile) { const r = await partnerBannerUpload.mutateAsync(partnerBannerFile); bannerImageUrl = r.url; }
      if (partnerOwnerFile) { const r = await partnerOwnerUpload.mutateAsync(partnerOwnerFile); ownerImageUrl = r.url; }
      if (partnerCoOwnerFile) { const r = await partnerCoOwnerUpload.mutateAsync(partnerCoOwnerFile); coOwnerImageUrl = r.url; }
      // Upload any pending staff photos
      let staffArr: any[] = (() => { try { return JSON.parse(partnerForm.staffJson || "[]"); } catch { return []; } })();
      for (let i = 0; i < staffArr.length; i++) {
        if (staffFiles[i]) {
          const r = await staffUpload.mutateAsync(staffFiles[i]!);
          staffArr[i] = { ...staffArr[i], imageUrl: r.url };
        }
      }
      const staffJson = JSON.stringify(staffArr);
      const method = partnerForm.id ? "PUT" : "POST";
      const url = partnerForm.id ? `/api/cms/partners/${partnerForm.id}` : "/api/cms/partners";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...partnerForm, imageUrl, bannerImageUrl, ownerImageUrl, coOwnerImageUrl, staffJson }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: partnerForm.id ? "Partner updated!" : "Partner added!" });
      setPartnerForm(null);
      resetPartnerFiles();
      await loadPartners();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setPartnerSaving(false);
    }
  };

  const deletePartner = async (id: number) => {
    if (!confirm("Remove this partner?")) return;
    await fetch(`/api/cms/partners/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Partner removed" });
    await loadPartners();
  };

  const togglePartnerVisibility = async (p: CmsPartner) => {
    await fetch(`/api/cms/partners/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...p, isVisible: !p.isVisible }),
    });
    await loadPartners();
  };

  // ─── Admin Team ──────────────────────────────────────────────────────────
  const [adminTeam, setAdminTeam] = useState<CmsAdminMember[]>([]);
  const [adminTeamLoading, setAdminTeamLoading] = useState(false);
  const [memberForm, setMemberForm] = useState<Partial<CmsAdminMember> | null>(null);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberFile, setMemberFile] = useState<File | null>(null);
  const [memberPreview, setMemberPreview] = useState<string>("");
  const memberUpload = useImageUpload();

  const loadAdminTeam = async () => {
    setAdminTeamLoading(true);
    try {
      const data = await fetch("/api/cms/admin-team/all").then(r => r.json());
      setAdminTeam(Array.isArray(data) ? data : []);
    } finally {
      setAdminTeamLoading(false);
    }
  };

  const saveMember = async () => {
    if (!memberForm?.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setMemberSaving(true);
    try {
      let imageUrl = memberForm.imageUrl ?? null;
      if (memberFile) {
        const upRes = await memberUpload.mutateAsync(memberFile);
        imageUrl = upRes.url;
      }
      const method = memberForm.id ? "PUT" : "POST";
      const url = memberForm.id ? `/api/cms/admin-team/${memberForm.id}` : "/api/cms/admin-team";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...memberForm, imageUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: memberForm.id ? "Member updated!" : "Member added!" });
      setMemberForm(null);
      setMemberFile(null);
      setMemberPreview("");
      await loadAdminTeam();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setMemberSaving(false);
    }
  };

  const deleteMember = async (id: number) => {
    if (!confirm("Remove this team member?")) return;
    await fetch(`/api/cms/admin-team/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Member removed" });
    await loadAdminTeam();
  };

  const toggleMemberVisibility = async (m: CmsAdminMember) => {
    await fetch(`/api/cms/admin-team/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...m, isVisible: !m.isVisible }),
    });
    await loadAdminTeam();
  };

  useEffect(() => {
    loadSettings();
    loadPosts();
    loadEvents();
    loadPartners();
    loadAdminTeam();
  }, []);

  const INPUT = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors";
  const TEXTAREA = `${INPUT} resize-none`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Globe className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold">Homepage & CMS</h1>
            <p className="text-sm text-muted-foreground">Edit homepage content, posts, and events</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-secondary/50 rounded-xl p-1 w-fit">
          {(["settings", "posts", "events", "partners", "team"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${tab === t ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "settings" ? "Page Content" : t}
            </button>
          ))}
        </div>

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h2 className="font-semibold text-lg">Homepage Sections</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {SETTING_KEYS.map(key => {
                  const isLong = key.endsWith("_text") || key.endsWith("_subtitle");
                  return (
                    <div key={key} className={isLong ? "md:col-span-2" : ""}>
                      <label className="block text-sm font-medium mb-1.5">{SECTION_LABELS[key]}</label>
                      {isLong ? (
                        <textarea
                          rows={3}
                          className={TEXTAREA}
                          value={settings[key] ?? ""}
                          onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                          placeholder={`Enter ${SECTION_LABELS[key].toLowerCase()}…`}
                        />
                      ) : (
                        <input
                          type="text"
                          className={INPUT}
                          value={settings[key] ?? ""}
                          onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                          placeholder={`Enter ${SECTION_LABELS[key].toLowerCase()}…`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  onClick={saveSettings}
                  disabled={settingsSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
                >
                  {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {settingsSaving ? "Saving…" : "Save All Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── POSTS ── */}
        {tab === "posts" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setPostForm({ category: "news", author: "GEF Admin", isPublished: false })}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> New Post
              </button>
            </div>

            {/* Post Form */}
            {postForm && (
              <div className="bg-card border border-primary/30 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">{postForm.id ? "Edit Post" : "New Post"}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Title *</label>
                    <input className={INPUT} value={postForm.title ?? ""} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))} placeholder="Post title…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Category</label>
                    <select className={INPUT} value={postForm.category ?? "news"} onChange={e => setPostForm(f => ({ ...f, category: e.target.value }))}>
                      <option value="news">News</option>
                      <option value="blog">Blog</option>
                      <option value="announcement">Announcement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Author</label>
                    <input className={INPUT} value={postForm.author ?? ""} onChange={e => setPostForm(f => ({ ...f, author: e.target.value }))} placeholder="GEF Admin" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Excerpt (short summary)</label>
                    <textarea rows={2} className={TEXTAREA} value={postForm.excerpt ?? ""} onChange={e => setPostForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="Brief summary shown on the homepage card…" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Full Content</label>
                    <textarea rows={6} className={TEXTAREA} value={postForm.content ?? ""} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))} placeholder="Full post content…" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Cover Image URL (optional)</label>
                    <input className={INPUT} value={postForm.imageUrl ?? ""} onChange={e => setPostForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://…" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={postForm.isPublished ?? false} onChange={e => setPostForm(f => ({ ...f, isPublished: e.target.checked }))} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-medium">Publish immediately</span>
                  </label>
                  <div className="flex gap-3">
                    <button onClick={() => setPostForm(null)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary">
                      Cancel
                    </button>
                    <button onClick={savePost} disabled={postSaving} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                      {postSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {postSaving ? "Saving…" : "Save Post"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Posts List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border font-semibold">
                All Posts ({posts.length})
              </div>
              {postsLoading ? (
                <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : posts.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">No posts yet. Click "New Post" to create one.</div>
              ) : (
                <div className="divide-y divide-border">
                  {posts.map(post => (
                    <div key={post.id} className="px-5 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{post.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${post.isPublished ? "bg-green-500/15 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                            {post.isPublished ? "Published" : "Draft"}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{post.category}</span>
                        </div>
                        {post.excerpt && <p className="text-xs text-muted-foreground mt-0.5 truncate">{post.excerpt}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => togglePostPublish(post)} title={post.isPublished ? "Unpublish" : "Publish"} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          {post.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setPostForm(post)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePost(post.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EVENTS ── */}
        {tab === "events" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setEventForm({ isPublished: true, eventDate: new Date().toISOString().split("T")[0] })}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> New Event
              </button>
            </div>

            {/* Event Form */}
            {eventForm && (
              <div className="bg-card border border-primary/30 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">{eventForm.id ? "Edit Event" : "New Event"}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Title *</label>
                    <input className={INPUT} value={eventForm.title ?? ""} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Event name…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Date *</label>
                    <input type="date" className={INPUT} value={eventForm.eventDate ?? ""} onChange={e => setEventForm(f => ({ ...f, eventDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Time (optional)</label>
                    <input type="time" className={INPUT} value={eventForm.eventTime ?? ""} onChange={e => setEventForm(f => ({ ...f, eventTime: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Location (optional)</label>
                    <input className={INPUT} value={eventForm.location ?? ""} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="Online / Discord / etc." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Description</label>
                    <textarea rows={3} className={TEXTAREA} value={eventForm.description ?? ""} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="What's happening at this event…" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={eventForm.isPublished ?? true} onChange={e => setEventForm(f => ({ ...f, isPublished: e.target.checked }))} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-medium">Show on homepage</span>
                  </label>
                  <div className="flex gap-3">
                    <button onClick={() => setEventForm(null)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary">Cancel</button>
                    <button onClick={saveEvent} disabled={eventSaving} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                      {eventSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {eventSaving ? "Saving…" : "Save Event"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Events List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border font-semibold">All Events ({events.length})</div>
              {eventsLoading ? (
                <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : events.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">No events yet. Click "New Event" to add one.</div>
              ) : (
                <div className="divide-y divide-border">
                  {events.map(event => (
                    <div key={event.id} className="px-5 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                      <CalendarDays className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{event.title}</span>
                          {!event.isPublished && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Hidden</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {event.eventDate}{event.eventTime ? ` · ${event.eventTime}` : ""}{event.location ? ` · ${event.location}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleEventPublish(event)} title={event.isPublished ? "Hide" : "Show"} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          {event.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEventForm(event)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteEvent(event.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PARTNERS ── */}
        {tab === "partners" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setPartnerForm({ type: "partner", isVisible: true, sortOrder: partners.length })}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Partner
              </button>
            </div>

            {partnerForm && (
              <div className="bg-card border border-primary/30 rounded-xl p-6 space-y-5">
                <h2 className="font-semibold text-lg flex items-center gap-2"><Handshake className="w-5 h-5 text-primary" />{partnerForm.id ? "Edit Partner" : "New Partner"}</h2>

                {/* Basic info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Name *</label>
                    <input className={INPUT} value={partnerForm.name ?? ""} onChange={e => setPartnerForm(f => ({ ...f, name: e.target.value }))} placeholder="Partner / league name…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Type</label>
                    <select className={INPUT} value={partnerForm.type ?? "partner"} onChange={e => setPartnerForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="partner">Partner / Collaborator</option>
                      <option value="league">League</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Short Description (shown on homepage card)</label>
                    <input className={INPUT} value={partnerForm.description ?? ""} onChange={e => setPartnerForm(f => ({ ...f, description: e.target.value }))} placeholder="One-liner description…" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Full About Text (shown on partner detail page)</label>
                    <textarea rows={4} className={INPUT + " resize-none"} value={partnerForm.aboutLong ?? ""} onChange={e => setPartnerForm(f => ({ ...f, aboutLong: e.target.value }))} placeholder="Full description, history, mission…" />
                  </div>
                </div>

                {/* Images */}
                <div className="border-t border-border pt-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Images</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Logo</label>
                      <div className="flex flex-col gap-2">
                        <div className="w-full h-20 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
                          {partnerPreview ? <img src={partnerPreview} className="w-full h-full object-cover" /> :
                           partnerForm.imageUrl ? <img src={partnerForm.imageUrl} className="w-full h-full object-cover" /> :
                           <Upload className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <input type="file" accept="image/*" className={INPUT} onChange={e => { const f = e.target.files?.[0] || null; setPartnerFile(f); if (f) setPartnerPreview(URL.createObjectURL(f)); }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Banner Image</label>
                      <div className="flex flex-col gap-2">
                        <div className="w-full h-20 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
                          {partnerBannerPreview ? <img src={partnerBannerPreview} className="w-full h-full object-cover" /> :
                           partnerForm.bannerImageUrl ? <img src={partnerForm.bannerImageUrl} className="w-full h-full object-cover" /> :
                           <Upload className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <input type="file" accept="image/*" className={INPUT} onChange={e => { const f = e.target.files?.[0] || null; setPartnerBannerFile(f); if (f) setPartnerBannerPreview(URL.createObjectURL(f)); }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Owner / Head Photo</label>
                      <div className="flex flex-col gap-2">
                        <div className="w-full h-20 rounded-full border border-border bg-secondary flex items-center justify-center overflow-hidden rounded-lg">
                          {partnerOwnerPreview ? <img src={partnerOwnerPreview} className="w-full h-full object-cover" /> :
                           partnerForm.ownerImageUrl ? <img src={partnerForm.ownerImageUrl} className="w-full h-full object-cover" /> :
                           <Upload className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <input type="file" accept="image/*" className={INPUT} onChange={e => { const f = e.target.files?.[0] || null; setPartnerOwnerFile(f); if (f) setPartnerOwnerPreview(URL.createObjectURL(f)); }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Owner / head */}
                <div className="border-t border-border pt-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Owner</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Name</label>
                      <input className={INPUT} value={partnerForm.ownerName ?? ""} onChange={e => setPartnerForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="Owner's name…" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Role / Title</label>
                      <input className={INPUT} value={partnerForm.ownerRole ?? ""} onChange={e => setPartnerForm(f => ({ ...f, ownerRole: e.target.value }))} placeholder="Founder, President, Commissioner…" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1.5">Bio</label>
                      <textarea rows={2} className={INPUT + " resize-none"} value={partnerForm.ownerBio ?? ""} onChange={e => setPartnerForm(f => ({ ...f, ownerBio: e.target.value }))} placeholder="Short bio about the owner…" />
                    </div>
                  </div>
                </div>

                {/* Co-Owner */}
                <div className="border-t border-border pt-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Co-Owner</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Co-Owner Photo</label>
                      <div className="flex flex-col gap-2">
                        <div className="w-full h-20 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
                          {partnerCoOwnerPreview ? <img src={partnerCoOwnerPreview} className="w-full h-full object-cover" /> :
                           partnerForm.coOwnerImageUrl ? <img src={partnerForm.coOwnerImageUrl} className="w-full h-full object-cover" /> :
                           <Upload className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <input type="file" accept="image/*" className={INPUT} onChange={e => { const f = e.target.files?.[0] || null; setPartnerCoOwnerFile(f); if (f) setPartnerCoOwnerPreview(URL.createObjectURL(f)); }} />
                      </div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Name</label>
                          <input className={INPUT} value={partnerForm.coOwnerName ?? ""} onChange={e => setPartnerForm(f => ({ ...f, coOwnerName: e.target.value }))} placeholder="Co-owner's name…" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Role / Title</label>
                          <input className={INPUT} value={partnerForm.coOwnerRole ?? ""} onChange={e => setPartnerForm(f => ({ ...f, coOwnerRole: e.target.value }))} placeholder="Co-Founder, Vice President…" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Bio</label>
                        <textarea rows={2} className={INPUT + " resize-none"} value={partnerForm.coOwnerBio ?? ""} onChange={e => setPartnerForm(f => ({ ...f, coOwnerBio: e.target.value }))} placeholder="Short bio about the co-owner…" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social + website */}
                <div className="border-t border-border pt-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Links & Social</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Website URL</label>
                      <input className={INPUT} value={partnerForm.website ?? ""} onChange={e => setPartnerForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Instagram (handle or URL)</label>
                      <input className={INPUT} value={(() => { try { return JSON.parse(partnerForm.socialLinks || "{}").instagram || ""; } catch { return ""; } })()} onChange={e => { const sl = (() => { try { return JSON.parse(partnerForm.socialLinks || "{}"); } catch { return {}; } })(); setPartnerForm(f => ({ ...f, socialLinks: JSON.stringify({ ...sl, instagram: e.target.value }) })); }} placeholder="username or https://…" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">X / Twitter (handle or URL)</label>
                      <input className={INPUT} value={(() => { try { return JSON.parse(partnerForm.socialLinks || "{}").twitter || ""; } catch { return ""; } })()} onChange={e => { const sl = (() => { try { return JSON.parse(partnerForm.socialLinks || "{}"); } catch { return {}; } })(); setPartnerForm(f => ({ ...f, socialLinks: JSON.stringify({ ...sl, twitter: e.target.value }) })); }} placeholder="username or https://…" />
                    </div>
                  </div>
                </div>

                {/* Events */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Events Organised</div>
                    <button type="button" onClick={() => {
                      const evs = (() => { try { return JSON.parse(partnerForm.eventsJson || "[]"); } catch { return []; } })();
                      setPartnerForm(f => ({ ...f, eventsJson: JSON.stringify([...evs, { title: "", date: "", description: "", location: "" }]) }));
                    }} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Event
                    </button>
                  </div>
                  {((): any[] => { try { return JSON.parse(partnerForm.eventsJson || "[]"); } catch { return []; } })().map((ev: any, i: number) => {
                    const evs: any[] = (() => { try { return JSON.parse(partnerForm.eventsJson || "[]"); } catch { return []; } })();
                    const update = (key: string, val: string) => { const copy = [...evs]; copy[i] = { ...copy[i], [key]: val }; setPartnerForm(f => ({ ...f, eventsJson: JSON.stringify(copy) })); };
                    const remove = () => { const copy = evs.filter((_: any, j: number) => j !== i); setPartnerForm(f => ({ ...f, eventsJson: JSON.stringify(copy) })); };
                    return (
                      <div key={i} className="bg-secondary/50 rounded-lg p-3 mb-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                          <input className={INPUT + " col-span-2"} value={ev.title || ""} onChange={e => update("title", e.target.value)} placeholder="Event title *" />
                          <input type="date" className={INPUT} value={ev.date || ""} onChange={e => update("date", e.target.value)} />
                          <input className={INPUT} value={ev.location || ""} onChange={e => update("location", e.target.value)} placeholder="Location" />
                        </div>
                        <div className="flex gap-2">
                          <input className={INPUT + " flex-1"} value={ev.description || ""} onChange={e => update("description", e.target.value)} placeholder="Short description…" />
                          <button type="button" onClick={remove} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                  {((): any[] => { try { return JSON.parse(partnerForm.eventsJson || "[]"); } catch { return []; } })().length === 0 && (
                    <div className="text-xs text-muted-foreground italic">No events yet. Click "Add Event" to add one.</div>
                  )}
                </div>

                {/* Staff / Administration */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Staff / Administration</div>
                    <button type="button" onClick={() => {
                      const arr: any[] = (() => { try { return JSON.parse(partnerForm.staffJson || "[]"); } catch { return []; } })();
                      setPartnerForm(f => ({ ...f, staffJson: JSON.stringify([...arr, { name: "", role: "", bio: "", imageUrl: null }]) }));
                      setStaffFiles(prev => [...prev, null]);
                      setStaffPreviews(prev => [...prev, ""]);
                    }} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Person
                    </button>
                  </div>
                  {((): any[] => { try { return JSON.parse(partnerForm.staffJson || "[]"); } catch { return []; } })().map((member: any, i: number) => {
                    const arr: any[] = (() => { try { return JSON.parse(partnerForm.staffJson || "[]"); } catch { return []; } })();
                    const updateField = (key: string, val: string) => {
                      const copy = [...arr]; copy[i] = { ...copy[i], [key]: val };
                      setPartnerForm(f => ({ ...f, staffJson: JSON.stringify(copy) }));
                    };
                    const removeMember = () => {
                      const copy = arr.filter((_: any, j: number) => j !== i);
                      setPartnerForm(f => ({ ...f, staffJson: JSON.stringify(copy) }));
                      setStaffFiles(prev => prev.filter((_, j) => j !== i));
                      setStaffPreviews(prev => prev.filter((_, j) => j !== i));
                    };
                    const preview = staffPreviews[i] || member.imageUrl || "";
                    return (
                      <div key={i} className="bg-secondary/50 border border-border rounded-xl p-4 mb-3">
                        <div className="flex gap-4 items-start">
                          {/* Photo */}
                          <div className="shrink-0 flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full border border-border bg-card flex items-center justify-center overflow-hidden">
                              {preview ? <img src={preview} className="w-full h-full object-cover" /> : <Crown className="w-6 h-6 text-muted-foreground/30" />}
                            </div>
                            <label className="cursor-pointer flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-secondary hover:bg-secondary/70 text-[11px] font-medium transition-colors">
                              <Upload className="w-3 h-3" /> Upload
                              <input type="file" accept="image/*" className="hidden" onChange={e => {
                                const f = e.target.files?.[0] || null;
                                setStaffFiles(prev => { const c = [...prev]; c[i] = f; return c; });
                                if (f) setStaffPreviews(prev => { const c = [...prev]; c[i] = URL.createObjectURL(f); return c; });
                              }} />
                            </label>
                          </div>
                          {/* Fields */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input className={INPUT} value={member.name || ""} onChange={e => updateField("name", e.target.value)} placeholder="Name *" />
                            <input className={INPUT} value={member.role || ""} onChange={e => updateField("role", e.target.value)} placeholder="Role / Title…" />
                            <input className={INPUT + " md:col-span-2"} value={member.bio || ""} onChange={e => updateField("bio", e.target.value)} placeholder="Short bio…" />
                          </div>
                          <button type="button" onClick={removeMember} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {((): any[] => { try { return JSON.parse(partnerForm.staffJson || "[]"); } catch { return []; } })().length === 0 && (
                    <div className="text-xs text-muted-foreground italic">No staff added yet. Click "Add Person" to add admins, managers, etc.</div>
                  )}
                </div>

                {/* Sort + visibility */}
                <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Sort Order</label>
                    <input type="number" className={INPUT} value={partnerForm.sortOrder ?? 0} onChange={e => setPartnerForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={partnerForm.isVisible ?? true} onChange={e => setPartnerForm(f => ({ ...f, isVisible: e.target.checked }))} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-medium">Visible on homepage</span>
                  </label>
                  <div className="flex gap-3">
                    <button onClick={() => { setPartnerForm(null); resetPartnerFiles(); }} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary">Cancel</button>
                    <button onClick={savePartner} disabled={partnerSaving} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                      {partnerSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {partnerSaving ? "Saving…" : "Save Partner"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border font-semibold">All Partners ({partners.length})</div>
              {partnersLoading ? (
                <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : partners.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">No partners yet. Click "Add Partner" to add one.</div>
              ) : (
                <div className="divide-y divide-border">
                  {partners.map(p => (
                    <div key={p.id} className="px-5 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Handshake className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{p.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.type === "league" ? "bg-yellow-500/15 text-yellow-400" : "bg-primary/10 text-primary"}`}>
                            {p.type === "league" ? "League" : "Partner"}
                          </span>
                          {!p.isVisible && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Hidden</span>}
                        </div>
                        {p.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => togglePartnerVisibility(p)} title={p.isVisible ? "Hide" : "Show"} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          {p.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setPartnerForm(p)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePartner(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ADMIN TEAM ── */}
        {tab === "team" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setMemberForm({ isVisible: true, sortOrder: adminTeam.length })}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Member
              </button>
            </div>

            {memberForm && (
              <div className="bg-card border border-primary/30 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2"><Crown className="w-5 h-5 text-primary" />{memberForm.id ? "Edit Member" : "New Member"}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Name *</label>
                    <input className={INPUT} value={memberForm.name ?? ""} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Role / Title</label>
                    <input className={INPUT} value={memberForm.role ?? ""} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))} placeholder="Head Admin, Founder, Manager…" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Photo</label>
                    <div className="flex gap-3 items-center">
                      <div className="w-14 h-14 rounded-full border border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                        {memberPreview ? <img src={memberPreview} className="w-full h-full object-cover" /> :
                         memberForm.imageUrl ? <img src={memberForm.imageUrl} className="w-full h-full object-cover" /> :
                         <Upload className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <input type="file" accept="image/*" className={INPUT} onChange={e => { const f = e.target.files?.[0] || null; setMemberFile(f); if (f) setMemberPreview(URL.createObjectURL(f)); }} />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Bio (optional)</label>
                    <textarea rows={2} className={INPUT + " resize-none"} value={memberForm.bio ?? ""} onChange={e => setMemberForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio or description…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Sort Order</label>
                    <input type="number" className={INPUT} value={memberForm.sortOrder ?? 0} onChange={e => setMemberForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={memberForm.isVisible ?? true} onChange={e => setMemberForm(f => ({ ...f, isVisible: e.target.checked }))} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-medium">Visible on homepage</span>
                  </label>
                  <div className="flex gap-3">
                    <button onClick={() => { setMemberForm(null); setMemberFile(null); setMemberPreview(""); }} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary">Cancel</button>
                    <button onClick={saveMember} disabled={memberSaving} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                      {memberSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {memberSaving ? "Saving…" : "Save Member"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border font-semibold">Administration Team ({adminTeam.length})</div>
              {adminTeamLoading ? (
                <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : adminTeam.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">No members yet. Click "Add Member" to add one.</div>
              ) : (
                <div className="divide-y divide-border">
                  {adminTeam.map(m => (
                    <div key={m.id} className="px-5 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                      {m.imageUrl ? (
                        <img src={m.imageUrl} alt={m.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <Crown className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{m.name}</span>
                          {m.role && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{m.role}</span>}
                          {!m.isVisible && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Hidden</span>}
                        </div>
                        {m.bio && <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.bio}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleMemberVisibility(m)} title={m.isVisible ? "Hide" : "Show"} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          {m.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setMemberForm(m)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteMember(m.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
