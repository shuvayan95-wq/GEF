import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { knockoutCupsTable, knockoutFixturesTable, playersTable, teamsTable } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function enrichFixtures(fixtures: any[], playerMap: Map<number, any>, teamMap: Map<number, any>) {
  return fixtures.map(f => ({
    ...f,
    team1: f.team1Id ? (teamMap.get(f.team1Id) ?? null) : null,
    team2: f.team2Id ? (teamMap.get(f.team2Id) ?? null) : null,
    player1: f.player1Id ? (playerMap.get(f.player1Id) ?? null) : null,
    player2: f.player2Id ? (playerMap.get(f.player2Id) ?? null) : null,
    matchups: (f.matchups ?? []).map((mu: any) => ({
      ...mu,
      player1Name: mu.player1Id ? (playerMap.get(mu.player1Id)?.name ?? "?") : "?",
      player1ImageUrl: mu.player1Id ? (playerMap.get(mu.player1Id)?.imageUrl ?? null) : null,
      player2Name: mu.player2Id ? (playerMap.get(mu.player2Id)?.name ?? "?") : "?",
      player2ImageUrl: mu.player2Id ? (playerMap.get(mu.player2Id)?.imageUrl ?? null) : null,
    })),
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

    const [players, teams] = await Promise.all([
      db.select().from(playersTable),
      db.select().from(teamsTable),
    ]);
    const playerMap = new Map(players.map(p => [p.id, { id: p.id, name: p.name, imageUrl: p.imageUrl, position: p.position }]));
    const teamMap = new Map(teams.map(t => [t.id, { id: t.id, name: t.name, logoUrl: t.logoUrl }]));

    const enriched = await enrichFixtures(fixtures, playerMap, teamMap);
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
    const { roundKey, leg, team1Id, team2Id, team1Score, team2Score, matchups, notes, matchDate } = req.body;
    if (!roundKey) return res.status(400).json({ error: "roundKey is required" });

    // Auto-calculate team scores from matchups if not provided
    let t1Score = team1Score ?? null;
    let t2Score = team2Score ?? null;
    if (t1Score === null && Array.isArray(matchups) && matchups.length > 0) {
      t1Score = matchups.reduce((sum: number, mu: any) => sum + (Number(mu.player1Goals) || 0), 0);
      t2Score = matchups.reduce((sum: number, mu: any) => sum + (Number(mu.player2Goals) || 0), 0);
    }

    const [fix] = await db.insert(knockoutFixturesTable).values({
      cupId, roundKey, leg: leg ?? 1,
      team1Id: team1Id ?? null, team2Id: team2Id ?? null,
      team1Score: t1Score, team2Score: t2Score,
      matchups: matchups ?? [],
      notes: notes || null, matchDate: matchDate || null,
    }).returning();

    // Enrich response
    const [players, teams] = await Promise.all([
      db.select().from(playersTable),
      db.select().from(teamsTable),
    ]);
    const playerMap = new Map(players.map(p => [p.id, { id: p.id, name: p.name, imageUrl: p.imageUrl, position: p.position }]));
    const teamMap = new Map(teams.map(t => [t.id, { id: t.id, name: t.name, logoUrl: t.logoUrl }]));
    const [enriched] = await enrichFixtures([fix], playerMap, teamMap);
    res.status(201).json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /api/admin/cups/:id/fixtures/:fid — update fixture
router.put("/admin/cups/:id/fixtures/:fid", requireAdmin, async (req, res) => {
  try {
    const fid = parseInt(req.params.fid);
    const { team1Id, team2Id, team1Score, team2Score, matchups, notes, matchDate, leg } = req.body;

    let t1Score = team1Score ?? null;
    let t2Score = team2Score ?? null;
    if (t1Score === null && Array.isArray(matchups) && matchups.length > 0) {
      t1Score = matchups.reduce((sum: number, mu: any) => sum + (Number(mu.player1Goals) || 0), 0);
      t2Score = matchups.reduce((sum: number, mu: any) => sum + (Number(mu.player2Goals) || 0), 0);
    }

    const [fix] = await db.update(knockoutFixturesTable)
      .set({
        team1Id: team1Id ?? null, team2Id: team2Id ?? null,
        team1Score: t1Score, team2Score: t2Score,
        matchups: matchups ?? [],
        notes: notes || null, matchDate: matchDate || null, leg: leg ?? 1,
      })
      .where(eq(knockoutFixturesTable.id, fid)).returning();
    if (!fix) return res.status(404).json({ error: "Fixture not found" });

    const [players, teams] = await Promise.all([
      db.select().from(playersTable),
      db.select().from(teamsTable),
    ]);
    const playerMap = new Map(players.map(p => [p.id, { id: p.id, name: p.name, imageUrl: p.imageUrl, position: p.position }]));
    const teamMap = new Map(teams.map(t => [t.id, { id: t.id, name: t.name, logoUrl: t.logoUrl }]));
    const [enriched] = await enrichFixtures([fix], playerMap, teamMap);
    res.json(enriched);
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
