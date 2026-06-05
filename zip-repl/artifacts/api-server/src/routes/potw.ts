import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable, teamsTable, potwRoundsTable, potwVotesTable } from "@workspace/db";
import { desc, eq, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function getIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// GET /api/potw — current active round with vote counts
router.get("/potw", async (req, res) => {
  try {
    const [activeRounds, allPlayers] = await Promise.all([
      db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, true)).orderBy(desc(potwRoundsTable.createdAt)).limit(1),
      db.select().from(playersTable),
    ]);

    const round = activeRounds[0] ?? null;
    if (!round) return res.json({ round: null, nominees: [], voteCounts: {}, hasVoted: false });

    const nomineeIds = (round.nomineeIds as number[]) ?? [];
    const nominees = allPlayers.filter(p => nomineeIds.includes(p.id));

    const votes = await db.select().from(potwVotesTable).where(eq(potwVotesTable.roundId, round.id));
    const voteCounts: Record<number, number> = {};
    for (const v of votes) {
      voteCounts[v.playerId] = (voteCounts[v.playerId] ?? 0) + 1;
    }

    const ip = getIp(req);
    const hasVoted = votes.some(v => v.voterIp === ip);
    const myVote = votes.find(v => v.voterIp === ip)?.playerId ?? null;

    res.json({ round, nominees, voteCounts, hasVoted, myVote, totalVotes: votes.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /api/potw/history — past closed rounds with winners
router.get("/potw/history", async (_req, res) => {
  try {
    const [past, allPlayers] = await Promise.all([
      db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, false)).orderBy(desc(potwRoundsTable.createdAt)).limit(10),
      db.select().from(playersTable),
    ]);
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));
    res.json(past.map(r => ({ ...r, winner: r.winnerId ? (playerMap.get(r.winnerId) ?? null) : null })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/potw/vote — cast a vote
router.post("/potw/vote", async (req, res) => {
  try {
    const { playerId } = req.body as { playerId: number };
    if (!playerId) return res.status(400).json({ error: "playerId required" });

    const active = await db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, true)).limit(1);
    if (!active.length) return res.status(400).json({ error: "No active voting round" });

    const round = active[0];
    const nomineeIds = (round.nomineeIds as number[]) ?? [];
    if (!nomineeIds.includes(playerId)) return res.status(400).json({ error: "Player not nominated" });

    const ip = getIp(req);
    const existing = await db.select().from(potwVotesTable)
      .where(and(eq(potwVotesTable.roundId, round.id), eq(potwVotesTable.voterIp, ip)))
      .limit(1);

    if (existing.length) return res.status(409).json({ error: "Already voted this round" });

    await db.insert(potwVotesTable).values({ roundId: round.id, playerId, voterIp: ip });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/admin/potw/round — create new voting round
router.post("/admin/potw/round", requireAdmin, async (req, res) => {
  try {
    const { weekLabel, nomineeIds } = req.body as { weekLabel: string; nomineeIds: number[] };
    if (!weekLabel || !nomineeIds?.length) return res.status(400).json({ error: "weekLabel and nomineeIds required" });

    // Deactivate existing active rounds
    await db.update(potwRoundsTable).set({ isActive: false }).where(eq(potwRoundsTable.isActive, true));
    const [round] = await db.insert(potwRoundsTable).values({ weekLabel, nomineeIds, isActive: true }).returning();
    res.json(round);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/admin/potw/close — close active round, set winner by most votes
router.post("/admin/potw/close", requireAdmin, async (req, res) => {
  try {
    const active = await db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, true)).limit(1);
    if (!active.length) return res.status(400).json({ error: "No active round" });

    const round = active[0];
    const votes = await db.select().from(potwVotesTable).where(eq(potwVotesTable.roundId, round.id));

    const counts: Record<number, number> = {};
    for (const v of votes) counts[v.playerId] = (counts[v.playerId] ?? 0) + 1;
    const winnerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

    await db.update(potwRoundsTable).set({
      isActive: false,
      winnerId: winnerId ? parseInt(winnerId) : null,
      closedAt: new Date(),
    }).where(eq(potwRoundsTable.id, round.id));

    res.json({ ok: true, winnerId: winnerId ? parseInt(winnerId) : null });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /api/admin/potw/round/:id — delete a round
router.delete("/admin/potw/round/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(potwVotesTable).where(eq(potwVotesTable.roundId, id));
    await db.delete(potwRoundsTable).where(eq(potwRoundsTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /api/admin/potw — admin: get all rounds
router.get("/admin/potw", requireAdmin, async (_req, res) => {
  try {
    const [rounds, allPlayers] = await Promise.all([
      db.select().from(potwRoundsTable).orderBy(desc(potwRoundsTable.createdAt)).limit(20),
      db.select().from(playersTable),
    ]);
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));
    res.json({ rounds, players: allPlayers.map(p => ({ id: p.id, name: p.name, teamId: p.teamId, imageUrl: p.imageUrl, position: p.position })) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
