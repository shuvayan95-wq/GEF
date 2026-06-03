import { Router, type IRouter } from "express";
import { db, efwFormationsTable, efwTipsTable, efwQnaTable, efwPostsTable } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ── Formations ────────────────────────────────────────────────────────────────

router.get("/api/efw/formations", async (_req, res) => {
  try {
    const rows = await db.select().from(efwFormationsTable).orderBy(asc(efwFormationsTable.sortOrder), asc(efwFormationsTable.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.post("/api/efw/formations", requireAdmin, async (req, res) => {
  try {
    const { formationCode, title, description, pros, cons, bestFor, style, sortOrder } = req.body;
    if (!formationCode || !title) return res.status(400).json({ error: "formationCode and title required" });
    const [row] = await db.insert(efwFormationsTable).values({
      formationCode, title,
      description: description || null, pros: pros || null, cons: cons || null,
      bestFor: bestFor || null, style: style || null, sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.put("/api/efw/formations/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { formationCode, title, description, pros, cons, bestFor, style, sortOrder } = req.body;
    const [row] = await db.update(efwFormationsTable).set({
      formationCode, title,
      description: description || null, pros: pros || null, cons: cons || null,
      bestFor: bestFor || null, style: style || null, sortOrder: sortOrder ?? 0,
    }).where(eq(efwFormationsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.delete("/api/efw/formations/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(efwFormationsTable).where(eq(efwFormationsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

// ── Tips ──────────────────────────────────────────────────────────────────────

router.get("/api/efw/tips", async (_req, res) => {
  try {
    const rows = await db.select().from(efwTipsTable).orderBy(asc(efwTipsTable.sortOrder), asc(efwTipsTable.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.post("/api/efw/tips", requireAdmin, async (req, res) => {
  try {
    const { category, title, content, sortOrder } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const [row] = await db.insert(efwTipsTable).values({
      category: category || null, title, content: content || null, sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.put("/api/efw/tips/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { category, title, content, sortOrder } = req.body;
    const [row] = await db.update(efwTipsTable).set({
      category: category || null, title, content: content || null, sortOrder: sortOrder ?? 0,
    }).where(eq(efwTipsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.delete("/api/efw/tips/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(efwTipsTable).where(eq(efwTipsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

// ── Q&A ───────────────────────────────────────────────────────────────────────

router.get("/api/efw/qna", async (_req, res) => {
  try {
    const rows = await db.select().from(efwQnaTable).orderBy(asc(efwQnaTable.sortOrder), asc(efwQnaTable.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.post("/api/efw/qna", requireAdmin, async (req, res) => {
  try {
    const { question, answer, category, sortOrder } = req.body;
    if (!question) return res.status(400).json({ error: "question required" });
    const [row] = await db.insert(efwQnaTable).values({
      question, answer: answer || null, category: category || null, sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.put("/api/efw/qna/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { question, answer, category, sortOrder } = req.body;
    const [row] = await db.update(efwQnaTable).set({
      question, answer: answer || null, category: category || null, sortOrder: sortOrder ?? 0,
    }).where(eq(efwQnaTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.delete("/api/efw/qna/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(efwQnaTable).where(eq(efwQnaTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

// ── Community Posts ───────────────────────────────────────────────────────────

router.get("/api/efw/posts", async (_req, res) => {
  try {
    const rows = await db.select().from(efwPostsTable)
      .orderBy(desc(efwPostsTable.isPinned), desc(efwPostsTable.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.post("/api/efw/posts", async (req, res) => {
  try {
    const { authorName, postType, title, content, imageUrl, formationCode, formationPlayers } = req.body;
    if (!authorName || !postType || !title) {
      return res.status(400).json({ error: "authorName, postType, and title are required" });
    }
    const [row] = await db.insert(efwPostsTable).values({
      authorName: authorName.trim(),
      postType,
      title: title.trim(),
      content: content?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      formationCode: formationCode?.trim() || null,
      formationPlayers: formationPlayers?.trim() || null,
      isPinned: false,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.patch("/api/efw/posts/:id/pin", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(efwPostsTable).where(eq(efwPostsTable.id, id)).limit(1);
    if (!existing[0]) return res.status(404).json({ error: "Not found" });
    const [row] = await db.update(efwPostsTable).set({ isPinned: !existing[0].isPinned })
      .where(eq(efwPostsTable.id, id)).returning();
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.delete("/api/efw/posts/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(efwPostsTable).where(eq(efwPostsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

export default router;
