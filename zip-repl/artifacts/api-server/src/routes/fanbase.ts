import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  clubFanbaseTable,
  fanHistoryTable,
  fanDivisionThresholdsTable,
  fanSettingsTable,
  teamsTable,
} from "@workspace/db";
import { eq, desc, asc, sql } from "drizzle-orm";
import {
  ensureSettingsSeeded,
  applyFanChange,
  getDivision,
  getSettings,
} from "../lib/fanbaseUtils.js";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Seed on first use — single Promise to avoid concurrent inserts
let seedPromise: Promise<void> | null = null;
async function seed() {
  if (!seedPromise) {
    seedPromise = ensureSettingsSeeded().catch(err => {
      seedPromise = null; // allow retry on failure
      throw err;
    });
  }
  await seedPromise;
}

// GET /fanbase — all clubs with fanbase + division
router.get("/fanbase", async (_req, res) => {
  try {
    await seed();
    const [teams, fanbases, divisions] = await Promise.all([
      db.select().from(teamsTable),
      db.select().from(clubFanbaseTable),
      db.select().from(fanDivisionThresholdsTable).orderBy(asc(fanDivisionThresholdsTable.sortOrder)),
    ]);

    const fanMap = new Map(fanbases.map(f => [f.teamId, f]));
    const result = teams.map(t => {
      const fb = fanMap.get(t.id);
      const division = fb ? getDivision(fb.currentFans, divisions) : null;
      return {
        teamId: t.id,
        teamName: t.name,
        logoUrl: t.logoUrl ?? null,
        initialized: !!fb,
        currentFans: fb?.currentFans ?? 0,
        startingFans: fb?.startingFans ?? 0,
        seasonStartFans: fb?.seasonStartFans ?? 0,
        highestEver: fb?.highestEver ?? 0,
        lowestEver: fb?.lowestEver ?? 0,
        largestGain: fb?.largestGain ?? 0,
        largestLoss: fb?.largestLoss ?? 0,
        season: fb?.season ?? "2025-26",
        division: division?.name ?? null,
        divisionColor: division?.color ?? "#6b7280",
        seasonGrowth: fb ? fb.currentFans - fb.seasonStartFans : 0,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /fanbase/leaderboard — ranked by fans
router.get("/fanbase/leaderboard", async (_req, res) => {
  try {
    await seed();
    const [teams, fanbases, divisions] = await Promise.all([
      db.select().from(teamsTable),
      db.select().from(clubFanbaseTable).orderBy(desc(clubFanbaseTable.currentFans)),
      db.select().from(fanDivisionThresholdsTable).orderBy(asc(fanDivisionThresholdsTable.sortOrder)),
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));

    const result = fanbases.map((fb, idx) => {
      const team = teamMap.get(fb.teamId);
      const division = getDivision(fb.currentFans, divisions);
      return {
        rank: idx + 1,
        teamId: fb.teamId,
        teamName: team?.name ?? "Unknown",
        logoUrl: team?.logoUrl ?? null,
        currentFans: fb.currentFans,
        division: division?.name ?? "Local Club",
        divisionColor: division?.color ?? "#6b7280",
        seasonGrowth: fb.currentFans - fb.seasonStartFans,
        highestEver: fb.highestEver,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /fanbase/divisions — all division thresholds
router.get("/fanbase/divisions", async (_req, res) => {
  try {
    await seed();
    const divs = await db.select().from(fanDivisionThresholdsTable).orderBy(asc(fanDivisionThresholdsTable.sortOrder));
    res.json(divs);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /fanbase/settings
router.get("/fanbase/settings", async (_req, res) => {
  try {
    await seed();
    const rows = await db.select().from(fanSettingsTable);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /fanbase/:teamId — single team detail
router.get("/fanbase/:teamId", async (req, res) => {
  try {
    await seed();
    const teamId = parseInt(req.params.teamId);
    const [team, fb, divisions] = await Promise.all([
      db.select().from(teamsTable).where(eq(teamsTable.id, teamId)).then(r => r[0] ?? null),
      db.select().from(clubFanbaseTable).where(eq(clubFanbaseTable.teamId, teamId)).then(r => r[0] ?? null),
      db.select().from(fanDivisionThresholdsTable).orderBy(asc(fanDivisionThresholdsTable.sortOrder)),
    ]);

    if (!team) return res.status(404).json({ error: "Team not found" });
    if (!fb) return res.json({ teamId, teamName: team.name, logoUrl: team.logoUrl, initialized: false });

    const history = await db
      .select()
      .from(fanHistoryTable)
      .where(eq(fanHistoryTable.teamId, teamId))
      .orderBy(desc(fanHistoryTable.createdAt))
      .limit(50);

    const division = getDivision(fb.currentFans, divisions);

    res.json({
      teamId,
      teamName: team.name,
      logoUrl: team.logoUrl ?? null,
      initialized: true,
      currentFans: fb.currentFans,
      startingFans: fb.startingFans,
      seasonStartFans: fb.seasonStartFans,
      highestEver: fb.highestEver,
      lowestEver: fb.lowestEver,
      largestGain: fb.largestGain,
      largestLoss: fb.largestLoss,
      season: fb.season,
      division: division?.name ?? null,
      divisionColor: division?.color ?? "#6b7280",
      seasonGrowth: fb.currentFans - fb.seasonStartFans,
      history: history.map(h => ({
        id: h.id,
        changeAmount: h.changeAmount,
        newTotal: h.newTotal,
        reason: h.reason,
        eventType: h.eventType,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /fanbase/:teamId/history — paginated history
router.get("/fanbase/:teamId/history", async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const limit = Math.min(parseInt((req.query.limit as string) || "100"), 500);
    const history = await db
      .select()
      .from(fanHistoryTable)
      .where(eq(fanHistoryTable.teamId, teamId))
      .orderBy(desc(fanHistoryTable.createdAt))
      .limit(limit);
    res.json(history.map(h => ({
      id: h.id,
      changeAmount: h.changeAmount,
      newTotal: h.newTotal,
      reason: h.reason,
      eventType: h.eventType,
      createdAt: h.createdAt.toISOString(),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /fanbase/:teamId/init — initialize a team's fanbase
router.post("/fanbase/:teamId/init", requireAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { startingFans, season } = req.body;
    if (!startingFans || isNaN(Number(startingFans))) {
      return res.status(400).json({ error: "startingFans required" });
    }
    const fans = Number(startingFans);
    const s = season || "2025-26";

    const existing = await db.select().from(clubFanbaseTable).where(eq(clubFanbaseTable.teamId, teamId)).then(r => r[0] ?? null);
    if (existing) {
      await db.update(clubFanbaseTable).set({
        currentFans: fans,
        startingFans: fans,
        seasonStartFans: fans,
        highestEver: Math.max(existing.highestEver, fans),
        lowestEver: existing.lowestEver === 0 ? fans : Math.min(existing.lowestEver, fans),
        season: s,
        updatedAt: sql`now()`,
      }).where(eq(clubFanbaseTable.teamId, teamId));
    } else {
      await db.insert(clubFanbaseTable).values({
        teamId,
        currentFans: fans,
        startingFans: fans,
        seasonStartFans: fans,
        highestEver: fans,
        lowestEver: fans,
        largestGain: 0,
        largestLoss: 0,
        season: s,
      });
    }

    await db.insert(fanHistoryTable).values({
      teamId,
      changeAmount: fans,
      newTotal: fans,
      reason: "Starting fanbase assigned",
      eventType: "init",
      referenceId: null,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /fanbase/:teamId/adjust — manual admin adjustment
router.post("/fanbase/:teamId/adjust", requireAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { amount, reason, setTo } = req.body;

    const existing = await db.select().from(clubFanbaseTable).where(eq(clubFanbaseTable.teamId, teamId)).then(r => r[0] ?? null);
    if (!existing) return res.status(404).json({ error: "Fanbase not initialized for this team. Initialize it first." });

    if (setTo !== undefined && setTo !== null && setTo !== "") {
      const newTotal = Math.max(0, Number(setTo));
      const change = newTotal - existing.currentFans;
      await db.update(clubFanbaseTable).set({
        currentFans: newTotal,
        highestEver: Math.max(existing.highestEver, newTotal),
        lowestEver: Math.min(existing.lowestEver, newTotal),
        updatedAt: sql`now()`,
      }).where(eq(clubFanbaseTable.teamId, teamId));
      await db.insert(fanHistoryTable).values({
        teamId,
        changeAmount: change,
        newTotal,
        reason: reason || "Admin adjustment (set)",
        eventType: "manual",
      });
    } else {
      if (amount === undefined || amount === null) return res.status(400).json({ error: "amount or setTo required" });
      await applyFanChange(teamId, Number(amount), reason || "Admin adjustment", "manual");
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /fanbase/divisions — update thresholds
router.put("/fanbase/divisions", requireAdmin, async (req, res) => {
  try {
    const { divisions } = req.body;
    if (!Array.isArray(divisions)) return res.status(400).json({ error: "divisions array required" });

    await db.delete(fanDivisionThresholdsTable);
    if (divisions.length > 0) {
      await db.insert(fanDivisionThresholdsTable).values(
        divisions.map((d: any, i: number) => ({
          name: d.name,
          minFans: Number(d.minFans),
          color: d.color || "#6b7280",
          sortOrder: i,
        }))
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /fanbase/settings — update settings
router.put("/fanbase/settings", requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) return res.status(400).json({ error: "settings array required" });

    for (const s of settings) {
      await db
        .insert(fanSettingsTable)
        .values({ key: s.key, value: String(s.value), description: s.description ?? null })
        .onConflictDoUpdate({ target: fanSettingsTable.key, set: { value: String(s.value) } });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
