import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { knockoutCupsTable, knockoutFixturesTable, playersTable, teamsTable } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function enrichFixtures(fixtures: any[], playerMap: Map<number, any>) {
  return fixtures.map(f => ({
    ...f,
    player1: f.player1Id ? (playerMap.get(f.player1Id) ?? null) : null,
    player2: f.player2Id ? (playerMap.get(f.player2Id) ?? null) : null,
  }));
}

// GET /api/cups — list all cups
router.get("/cups", async (_req, res) => {
  try {
    const cups = await db.select().from(knockoutCupsTable).orderBy(desc(knockoutCupsTable.createdAt));
    res.json(cups);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /api/cups/:id — cup detail with all fixtures enriched
router.get("/cups/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cups = await db.select().from(knockoutCupsTable).where(eq(knockoutCupsTable.id, id));
    if (!cups.length) return res.status(404).json({ error: "Cup not found" });
    const cup = cups[0];

    const fixtures = await db
      .select()
      .from(knockoutFixturesTable)
      .where(eq(knockoutFixturesTable.cupId, id))
      .orderBy(asc(knockoutFixturesTable.roundKey), asc(knockoutFixturesTable.leg), asc(knockoutFixturesTable.id));

    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, { id: p.id, name: p.name, imageUrl: p.imageUrl, position: p.position }]));

    const enriched = await enrichFixtures(fixtures, playerMap);
    res.json({ ...cup, fixtures: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/admin/cups — create cup
router.post("/admin/cups", requireAdmin, async (req, res) => {
  try {
    const { name, season, logoUrl, description, rounds } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [cup] = await db.insert(knockoutCupsTable).values({
      name, season: season || null, logoUrl: logoUrl || null,
      description: description || null, rounds: rounds ?? [],
    }).returning();
    res.status(201).json(cup);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /api/admin/cups/:id — update cup
router.put("/admin/cups/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, season, logoUrl, description, rounds, status } = req.body;
    const [cup] = await db.update(knockoutCupsTable)
      .set({ name, season: season || null, logoUrl: logoUrl || null, description: description || null, rounds: rounds ?? [], status: status ?? "active", updatedAt: new Date() })
      .where(eq(knockoutCupsTable.id, id)).returning();
    if (!cup) return res.status(404).json({ error: "Cup not found" });
    res.json(cup);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /api/admin/cups/:id — delete cup (cascades fixtures)
router.delete("/admin/cups/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(knockoutCupsTable).where(eq(knockoutCupsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/admin/cups/:id/fixtures — add fixture to a round
router.post("/admin/cups/:id/fixtures", requireAdmin, async (req, res) => {
  try {
    const cupId = parseInt(req.params.id);
    const { roundKey, leg, player1Id, player2Id, player1Goals, player2Goals, notes, matchDate } = req.body;
    if (!roundKey) return res.status(400).json({ error: "roundKey is required" });
    const [fix] = await db.insert(knockoutFixturesTable).values({
      cupId, roundKey, leg: leg ?? 1,
      player1Id: player1Id ?? null, player2Id: player2Id ?? null,
      player1Goals: player1Goals ?? null, player2Goals: player2Goals ?? null,
      notes: notes || null, matchDate: matchDate || null,
    }).returning();
    res.status(201).json(fix);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /api/admin/cups/:id/fixtures/:fid — update fixture
router.put("/admin/cups/:id/fixtures/:fid", requireAdmin, async (req, res) => {
  try {
    const fid = parseInt(req.params.fid);
    const { player1Id, player2Id, player1Goals, player2Goals, notes, matchDate, leg } = req.body;
    const [fix] = await db.update(knockoutFixturesTable)
      .set({
        player1Id: player1Id ?? null, player2Id: player2Id ?? null,
        player1Goals: player1Goals ?? null, player2Goals: player2Goals ?? null,
        notes: notes || null, matchDate: matchDate || null, leg: leg ?? 1,
      })
      .where(eq(knockoutFixturesTable.id, fid)).returning();
    if (!fix) return res.status(404).json({ error: "Fixture not found" });
    res.json(fix);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /api/admin/cups/:id/fixtures/:fid — delete fixture
router.delete("/admin/cups/:id/fixtures/:fid", requireAdmin, async (req, res) => {
  try {
    const fid = parseInt(req.params.fid);
    await db.delete(knockoutFixturesTable).where(eq(knockoutFixturesTable.id, fid));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
