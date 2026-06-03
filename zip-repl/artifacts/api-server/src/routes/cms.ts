import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cmsSettingsTable, cmsPostsTable, cmsEventsTable, cmsPartnersTable, cmsAdminTeamTable } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ─── SETTINGS ───────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Record<string, string> = {
  hero_title: "Global eFootball Federation",
  hero_subtitle: "The official home of competitive eFootball — tracking stats, stories, and everything that matters in GEF.",
  hero_badge: "Season 2024/25",
  mission_title: "Our Mission",
  mission_text: "GEF exists to bring eFootball players together under one competitive roof. We track every goal, every match, every transfer — so history is never forgotten.",
  about_title: "About GEF",
  about_text: "Founded by a group of passionate eFootball players, GEF is a community-driven federation that prides itself on fair play, competitive excellence, and building a legacy in the digital football world.",
  fun_fact_1: "The highest ever single-match goal tally in GEF history was 12 goals.",
  fun_fact_2: "Over 500 matches have been played since GEF's founding season.",
  fun_fact_3: "GEF spans multiple seasons with players from around the world.",
  cta_text: "Ready to compete?",
  cta_subtitle: "Join GEF and be part of the most competitive eFootball community.",
};

// GET /cms/settings
router.get("/cms/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(cmsSettingsTable);
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /cms/settings/:key (admin)
router.put("/cms/settings/:key", requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: "value required" });

    const existing = await db.select().from(cmsSettingsTable).where(eq(cmsSettingsTable.key, key));
    if (existing.length > 0) {
      await db.update(cmsSettingsTable)
        .set({ value: String(value), updatedAt: new Date() })
        .where(eq(cmsSettingsTable.key, key));
    } else {
      await db.insert(cmsSettingsTable).values({ key, value: String(value) });
    }
    res.json({ key, value });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /cms/settings (bulk admin)
router.put("/cms/settings", requireAdmin, async (req, res) => {
  try {
    const updates: Record<string, string> = req.body;
    for (const [key, value] of Object.entries(updates)) {
      const existing = await db.select().from(cmsSettingsTable).where(eq(cmsSettingsTable.key, key));
      if (existing.length > 0) {
        await db.update(cmsSettingsTable).set({ value: String(value), updatedAt: new Date() }).where(eq(cmsSettingsTable.key, key));
      } else {
        await db.insert(cmsSettingsTable).values({ key, value: String(value) });
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── POSTS ───────────────────────────────────────────────────────────────────

// GET /cms/posts (public — published only)
router.get("/cms/posts", async (_req, res) => {
  try {
    const posts = await db.select().from(cmsPostsTable)
      .where(eq(cmsPostsTable.isPublished, true))
      .orderBy(desc(cmsPostsTable.publishedAt));
    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /cms/posts/all (admin — all posts)
router.get("/cms/posts/all", requireAdmin, async (_req, res) => {
  try {
    const posts = await db.select().from(cmsPostsTable).orderBy(desc(cmsPostsTable.createdAt));
    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /cms/posts/:id (single post by id)
router.get("/cms/posts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const post = await db.select().from(cmsPostsTable).where(eq(cmsPostsTable.id, id)).then(r => r[0]);
    if (!post) return res.status(404).json({ error: "Not found" });
    res.json(post);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /cms/posts (admin)
router.post("/cms/posts", requireAdmin, async (req, res) => {
  try {
    const { title, excerpt, content, category, author, imageUrl, isPublished } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });

    const baseSlug = slugify(title);
    let slug = baseSlug;
    let attempt = 1;
    while (true) {
      const existing = await db.select().from(cmsPostsTable).where(eq(cmsPostsTable.slug, slug));
      if (existing.length === 0) break;
      slug = `${baseSlug}-${attempt++}`;
    }

    const [post] = await db.insert(cmsPostsTable).values({
      title,
      slug,
      excerpt: excerpt || "",
      content: content || "",
      category: category || "news",
      author: author || "GEF Admin",
      imageUrl: imageUrl || null,
      isPublished: Boolean(isPublished),
      publishedAt: isPublished ? new Date() : null,
    }).returning();

    res.status(201).json(post);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /cms/posts/:id (admin)
router.put("/cms/posts/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, excerpt, content, category, author, imageUrl, isPublished } = req.body;

    const existing = await db.select().from(cmsPostsTable).where(eq(cmsPostsTable.id, id)).then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const wasPublished = existing.isPublished;
    const nowPublished = Boolean(isPublished);

    const [post] = await db.update(cmsPostsTable).set({
      title: title ?? existing.title,
      excerpt: excerpt ?? existing.excerpt,
      content: content ?? existing.content,
      category: category ?? existing.category,
      author: author ?? existing.author,
      imageUrl: imageUrl !== undefined ? (imageUrl || null) : existing.imageUrl,
      isPublished: nowPublished,
      publishedAt: nowPublished && !wasPublished ? new Date() : existing.publishedAt,
      updatedAt: new Date(),
    }).where(eq(cmsPostsTable.id, id)).returning();

    res.json(post);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /cms/posts/:id (admin)
router.delete("/cms/posts/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(cmsPostsTable).where(eq(cmsPostsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── EVENTS ──────────────────────────────────────────────────────────────────

// GET /cms/events (public)
router.get("/cms/events", async (_req, res) => {
  try {
    const events = await db.select().from(cmsEventsTable)
      .where(eq(cmsEventsTable.isPublished, true))
      .orderBy(asc(cmsEventsTable.eventDate));
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /cms/events/all (admin)
router.get("/cms/events/all", requireAdmin, async (_req, res) => {
  try {
    const events = await db.select().from(cmsEventsTable).orderBy(asc(cmsEventsTable.eventDate));
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /cms/events (admin)
router.post("/cms/events", requireAdmin, async (req, res) => {
  try {
    const { title, description, eventDate, eventTime, location, isPublished } = req.body;
    if (!title || !eventDate) return res.status(400).json({ error: "title and eventDate required" });

    const [event] = await db.insert(cmsEventsTable).values({
      title,
      description: description || "",
      eventDate,
      eventTime: eventTime || null,
      location: location || null,
      isPublished: isPublished !== false,
    }).returning();

    res.status(201).json(event);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /cms/events/:id (admin)
router.put("/cms/events/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, eventDate, eventTime, location, isPublished } = req.body;

    const existing = await db.select().from(cmsEventsTable).where(eq(cmsEventsTable.id, id)).then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const [event] = await db.update(cmsEventsTable).set({
      title: title ?? existing.title,
      description: description ?? existing.description,
      eventDate: eventDate ?? existing.eventDate,
      eventTime: eventTime !== undefined ? (eventTime || null) : existing.eventTime,
      location: location !== undefined ? (location || null) : existing.location,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : existing.isPublished,
    }).where(eq(cmsEventsTable.id, id)).returning();

    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /cms/events/:id (admin)
router.delete("/cms/events/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(cmsEventsTable).where(eq(cmsEventsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── PARTNERS ─────────────────────────────────────────────────────────────────

// GET /cms/partners (public — visible only)
router.get("/cms/partners", async (_req, res) => {
  try {
    const rows = await db.select().from(cmsPartnersTable)
      .where(eq(cmsPartnersTable.isVisible, true))
      .orderBy(asc(cmsPartnersTable.sortOrder), asc(cmsPartnersTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /cms/partners/all (admin)
router.get("/cms/partners/all", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(cmsPartnersTable)
      .orderBy(asc(cmsPartnersTable.sortOrder), asc(cmsPartnersTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /cms/partners/:idOrSlug (public — single partner detail, supports numeric id or slug)
router.get("/cms/partners/:idOrSlug", async (req, res) => {
  try {
    const param = req.params.idOrSlug;
    const numericId = parseInt(param);
    const [row] = isNaN(numericId)
      ? await db.select().from(cmsPartnersTable).where(eq(cmsPartnersTable.slug, param))
      : await db.select().from(cmsPartnersTable).where(eq(cmsPartnersTable.id, numericId));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /cms/partners (admin)
router.post("/cms/partners", requireAdmin, async (req, res) => {
  try {
    const { name, description, aboutLong, imageUrl, bannerImageUrl, type, website, ownerName, ownerRole, ownerBio, ownerImageUrl, coOwnerName, coOwnerRole, coOwnerBio, coOwnerImageUrl, eventsJson, staffJson, socialLinks, sortOrder, isVisible } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const baseSlug = slugify(name);
    const [row] = await db.insert(cmsPartnersTable).values({
      name,
      slug: baseSlug,
      description: description || "",
      aboutLong: aboutLong || "",
      imageUrl: imageUrl || null,
      bannerImageUrl: bannerImageUrl || null,
      type: type || "partner",
      website: website || null,
      ownerName: ownerName || null,
      ownerRole: ownerRole || null,
      ownerBio: ownerBio || null,
      ownerImageUrl: ownerImageUrl || null,
      coOwnerName: coOwnerName || null,
      coOwnerRole: coOwnerRole || null,
      coOwnerBio: coOwnerBio || null,
      coOwnerImageUrl: coOwnerImageUrl || null,
      eventsJson: eventsJson || "[]",
      staffJson: staffJson || "[]",
      socialLinks: socialLinks || "{}",
      sortOrder: sortOrder ?? 0,
      isVisible: isVisible !== false,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /cms/partners/:id (admin)
router.put("/cms/partners/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, aboutLong, imageUrl, bannerImageUrl, type, website, ownerName, ownerRole, ownerBio, ownerImageUrl, coOwnerName, coOwnerRole, coOwnerBio, coOwnerImageUrl, eventsJson, staffJson, socialLinks, sortOrder, isVisible } = req.body;
    const existing = await db.select().from(cmsPartnersTable).where(eq(cmsPartnersTable.id, id)).then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const [row] = await db.update(cmsPartnersTable).set({
      name: name ?? existing.name,
      slug: name ? slugify(name) : existing.slug,
      description: description ?? existing.description,
      aboutLong: aboutLong ?? existing.aboutLong,
      imageUrl: imageUrl !== undefined ? (imageUrl || null) : existing.imageUrl,
      bannerImageUrl: bannerImageUrl !== undefined ? (bannerImageUrl || null) : existing.bannerImageUrl,
      type: type ?? existing.type,
      website: website !== undefined ? (website || null) : existing.website,
      ownerName: ownerName !== undefined ? (ownerName || null) : existing.ownerName,
      ownerRole: ownerRole !== undefined ? (ownerRole || null) : existing.ownerRole,
      ownerBio: ownerBio !== undefined ? (ownerBio || null) : existing.ownerBio,
      ownerImageUrl: ownerImageUrl !== undefined ? (ownerImageUrl || null) : existing.ownerImageUrl,
      coOwnerName: coOwnerName !== undefined ? (coOwnerName || null) : existing.coOwnerName,
      coOwnerRole: coOwnerRole !== undefined ? (coOwnerRole || null) : existing.coOwnerRole,
      coOwnerBio: coOwnerBio !== undefined ? (coOwnerBio || null) : existing.coOwnerBio,
      coOwnerImageUrl: coOwnerImageUrl !== undefined ? (coOwnerImageUrl || null) : existing.coOwnerImageUrl,
      eventsJson: eventsJson ?? existing.eventsJson,
      staffJson: staffJson ?? existing.staffJson,
      socialLinks: socialLinks ?? existing.socialLinks,
      sortOrder: sortOrder ?? existing.sortOrder,
      isVisible: isVisible !== undefined ? Boolean(isVisible) : existing.isVisible,
    }).where(eq(cmsPartnersTable.id, id)).returning();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /cms/partners/:id (admin)
router.delete("/cms/partners/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(cmsPartnersTable).where(eq(cmsPartnersTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── ADMIN TEAM ───────────────────────────────────────────────────────────────

// GET /cms/admin-team (public — visible only)
router.get("/cms/admin-team", async (_req, res) => {
  try {
    const rows = await db.select().from(cmsAdminTeamTable)
      .where(eq(cmsAdminTeamTable.isVisible, true))
      .orderBy(asc(cmsAdminTeamTable.sortOrder), asc(cmsAdminTeamTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /cms/admin-team/all (admin)
router.get("/cms/admin-team/all", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(cmsAdminTeamTable)
      .orderBy(asc(cmsAdminTeamTable.sortOrder), asc(cmsAdminTeamTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /cms/admin-team (admin)
router.post("/cms/admin-team", requireAdmin, async (req, res) => {
  try {
    const { name, role, imageUrl, bio, sortOrder, isVisible } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const [row] = await db.insert(cmsAdminTeamTable).values({
      name,
      role: role || "",
      imageUrl: imageUrl || null,
      bio: bio || "",
      sortOrder: sortOrder ?? 0,
      isVisible: isVisible !== false,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /cms/admin-team/:id (admin)
router.put("/cms/admin-team/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, role, imageUrl, bio, sortOrder, isVisible } = req.body;
    const existing = await db.select().from(cmsAdminTeamTable).where(eq(cmsAdminTeamTable.id, id)).then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const [row] = await db.update(cmsAdminTeamTable).set({
      name: name ?? existing.name,
      role: role ?? existing.role,
      imageUrl: imageUrl !== undefined ? (imageUrl || null) : existing.imageUrl,
      bio: bio ?? existing.bio,
      sortOrder: sortOrder ?? existing.sortOrder,
      isVisible: isVisible !== undefined ? Boolean(isVisible) : existing.isVisible,
    }).where(eq(cmsAdminTeamTable.id, id)).returning();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /cms/admin-team/:id (admin)
router.delete("/cms/admin-team/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(cmsAdminTeamTable).where(eq(cmsAdminTeamTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
