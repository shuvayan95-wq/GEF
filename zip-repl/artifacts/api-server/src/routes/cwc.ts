import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  cwcCrewsTable,
  cwcPlayersTable,
  cwcTrophiesTable,
  cwcPlayerAwardsTable,
} from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ─── CREWS ───────────────────────────────────────────────────────────────────

// GET /cwc/crews
router.get("/cwc/crews", async (_req, res) => {
  try {
    const crews = await db.select().from(cwcCrewsTable).where(eq(cwcCrewsTable.isActive, true)).orderBy(asc(cwcCrewsTable.powerRanking));
    res.json(crews);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /cwc/crews/all  (admin — includes inactive)
router.get("/cwc/crews/all", requireAdmin, async (_req, res) => {
  try {
    const crews = await db.select().from(cwcCrewsTable).orderBy(asc(cwcCrewsTable.name));
    res.json(crews);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /cwc/crews/:idOrSlug
router.get("/cwc/crews/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isNumeric = /^\d+$/.test(idOrSlug);
    const crews = await db.select().from(cwcCrewsTable).where(
      isNumeric ? eq(cwcCrewsTable.id, parseInt(idOrSlug)) : eq(cwcCrewsTable.slug, idOrSlug)
    );
    if (!crews.length) return res.status(404).json({ error: "Crew not found" });
    const crew = crews[0];

    const players = await db.select().from(cwcPlayersTable)
      .where(eq(cwcPlayersTable.crewId, crew.id))
      .orderBy(asc(cwcPlayersTable.sortOrder), asc(cwcPlayersTable.jerseyNumber));

    const trophies = await db.select().from(cwcTrophiesTable)
      .where(eq(cwcTrophiesTable.crewId, crew.id));

    const playerIds = players.map(p => p.id);
    let awards: any[] = [];
    if (playerIds.length) {
      awards = await db.select().from(cwcPlayerAwardsTable);
      awards = awards.filter(a => playerIds.includes(a.playerId));
    }

    res.json({ crew, players, trophies, awards });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /cwc/crews  (admin)
router.post("/cwc/crews", requireAdmin, async (req, res) => {
  try {
    const { name, slug, ...rest } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const autoSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const [crew] = await db.insert(cwcCrewsTable).values({ name, slug: autoSlug, ...rest }).returning();
    res.json(crew);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /cwc/crews/:id  (admin)
router.put("/cwc/crews/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { id: _id, createdAt, ...data } = req.body;
    data.updatedAt = new Date();
    const [crew] = await db.update(cwcCrewsTable).set(data).where(eq(cwcCrewsTable.id, id)).returning();
    res.json(crew);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /cwc/crews/:id  (admin)
router.delete("/cwc/crews/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Cascade: remove trophies and players first
    const players = await db.select({ id: cwcPlayersTable.id }).from(cwcPlayersTable).where(eq(cwcPlayersTable.crewId, id));
    for (const p of players) {
      await db.delete(cwcPlayerAwardsTable).where(eq(cwcPlayerAwardsTable.playerId, p.id));
    }
    await db.delete(cwcPlayersTable).where(eq(cwcPlayersTable.crewId, id));
    await db.delete(cwcTrophiesTable).where(eq(cwcTrophiesTable.crewId, id));
    await db.delete(cwcCrewsTable).where(eq(cwcCrewsTable.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PLAYERS ─────────────────────────────────────────────────────────────────

// GET /cwc/players  (all active players, optionally filtered by crewId)
router.get("/cwc/players", async (req, res) => {
  try {
    const { crewId } = req.query;
    let query = db.select().from(cwcPlayersTable).where(eq(cwcPlayersTable.isArchived, false));
    const players = crewId
      ? await db.select().from(cwcPlayersTable)
          .where(eq(cwcPlayersTable.crewId, parseInt(crewId as string)))
          .orderBy(asc(cwcPlayersTable.sortOrder))
      : await db.select().from(cwcPlayersTable)
          .where(eq(cwcPlayersTable.isArchived, false))
          .orderBy(asc(cwcPlayersTable.crewId), asc(cwcPlayersTable.sortOrder));
    res.json(players);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /cwc/players/:id
router.get("/cwc/players/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const players = await db.select().from(cwcPlayersTable).where(eq(cwcPlayersTable.id, id));
    if (!players.length) return res.status(404).json({ error: "Player not found" });
    const player = players[0];
    const awards = await db.select().from(cwcPlayerAwardsTable).where(eq(cwcPlayerAwardsTable.playerId, id));
    res.json({ player, awards });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /cwc/players  (admin)
router.post("/cwc/players", requireAdmin, async (req, res) => {
  try {
    const { realName, crewId, ...rest } = req.body;
    if (!realName || !crewId) return res.status(400).json({ error: "realName and crewId required" });
    const [player] = await db.insert(cwcPlayersTable).values({ realName, crewId: parseInt(crewId), ...rest }).returning();
    // Update rosterSize on crew
    await updateCrewRosterSize(parseInt(crewId));
    res.json(player);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /cwc/players/:id  (admin)
router.put("/cwc/players/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { id: _id, createdAt, ...data } = req.body;
    data.updatedAt = new Date();
    const [player] = await db.update(cwcPlayersTable).set(data).where(eq(cwcPlayersTable.id, id)).returning();
    if (player?.crewId) await updateCrewRosterSize(player.crewId);
    res.json(player);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /cwc/players/:id  (admin)
router.delete("/cwc/players/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [player] = await db.select().from(cwcPlayersTable).where(eq(cwcPlayersTable.id, id));
    await db.delete(cwcPlayerAwardsTable).where(eq(cwcPlayerAwardsTable.playerId, id));
    await db.delete(cwcPlayersTable).where(eq(cwcPlayersTable.id, id));
    if (player?.crewId) await updateCrewRosterSize(player.crewId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── TROPHIES ─────────────────────────────────────────────────────────────────

// GET /cwc/trophies/:crewId
router.get("/cwc/trophies/:crewId", async (req, res) => {
  try {
    const trophies = await db.select().from(cwcTrophiesTable)
      .where(eq(cwcTrophiesTable.crewId, parseInt(req.params.crewId)));
    res.json(trophies);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /cwc/trophies  (admin)
router.post("/cwc/trophies", requireAdmin, async (req, res) => {
  try {
    const [trophy] = await db.insert(cwcTrophiesTable).values(req.body).returning();
    res.json(trophy);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /cwc/trophies/:id  (admin)
router.put("/cwc/trophies/:id", requireAdmin, async (req, res) => {
  try {
    const { id: _id, createdAt, ...data } = req.body;
    const [trophy] = await db.update(cwcTrophiesTable).set(data).where(eq(cwcTrophiesTable.id, parseInt(req.params.id))).returning();
    res.json(trophy);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /cwc/trophies/:id  (admin)
router.delete("/cwc/trophies/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(cwcTrophiesTable).where(eq(cwcTrophiesTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PLAYER AWARDS ────────────────────────────────────────────────────────────

// GET /cwc/player-awards/:playerId
router.get("/cwc/player-awards/:playerId", async (req, res) => {
  try {
    const awards = await db.select().from(cwcPlayerAwardsTable)
      .where(eq(cwcPlayerAwardsTable.playerId, parseInt(req.params.playerId)));
    res.json(awards);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /cwc/player-awards  (admin)
router.post("/cwc/player-awards", requireAdmin, async (req, res) => {
  try {
    const [award] = await db.insert(cwcPlayerAwardsTable).values(req.body).returning();
    res.json(award);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /cwc/player-awards/:id  (admin)
router.put("/cwc/player-awards/:id", requireAdmin, async (req, res) => {
  try {
    const { id: _id, createdAt, ...data } = req.body;
    const [award] = await db.update(cwcPlayerAwardsTable).set(data).where(eq(cwcPlayerAwardsTable.id, parseInt(req.params.id))).returning();
    res.json(award);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /cwc/player-awards/:id  (admin)
router.delete("/cwc/player-awards/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(cwcPlayerAwardsTable).where(eq(cwcPlayerAwardsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function updateCrewRosterSize(crewId: number) {
  const players = await db.select().from(cwcPlayersTable)
    .where(eq(cwcPlayersTable.crewId, crewId));
  const active = players.filter(p => p.isActive && !p.isArchived);
  await db.update(cwcCrewsTable).set({
    rosterSize: active.length,
    updatedAt: new Date(),
  }).where(eq(cwcCrewsTable.id, crewId));
}

export default router;
