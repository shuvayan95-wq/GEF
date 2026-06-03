import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playerContractsTable, playersTable, teamsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

router.get("/contracts", requireAdmin, async (_req, res) => {
  try {
    const [contracts, players, teams] = await Promise.all([
      db.select().from(playerContractsTable).orderBy(desc(playerContractsTable.createdAt)),
      db.select().from(playersTable),
      db.select().from(teamsTable),
    ]);
    const playerMap = new Map(players.map(p => [p.id, p]));
    const teamMap = new Map(teams.map(t => [t.id, t]));
    const enriched = contracts.map(c => ({
      ...c,
      playerName: playerMap.get(c.playerId)?.name ?? "Unknown",
      teamName: teamMap.get(c.teamId)?.name ?? "Unknown",
    }));
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.get("/contracts/players", requireAdmin, async (_req, res) => {
  try {
    const [players, teams] = await Promise.all([
      db.select().from(playersTable),
      db.select().from(teamsTable),
    ]);
    const teamMap = new Map(teams.map(t => [t.id, t.name]));
    res.json({ players: players.map(p => ({ id: p.id, name: p.name, teamId: p.teamId, teamName: p.teamId ? teamMap.get(p.teamId) ?? null : null })), teams });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.post("/contracts", requireAdmin, async (req, res) => {
  try {
    const { playerId, teamId, startDate, endDate, salaryAmount, bonusAmount, clauses, promisedMatches, penaltyAmount, status, notes } = req.body;
    if (!playerId || !teamId || !startDate || !endDate) {
      return res.status(400).json({ error: "playerId, teamId, startDate and endDate are required" });
    }
    const [contract] = await db.insert(playerContractsTable).values({
      playerId: Number(playerId),
      teamId: Number(teamId),
      startDate,
      endDate,
      salaryAmount: salaryAmount ?? null,
      bonusAmount: bonusAmount ?? null,
      clauses: clauses ?? null,
      promisedMatches: promisedMatches ? Number(promisedMatches) : null,
      penaltyAmount: penaltyAmount ?? null,
      status: status ?? "active",
      notes: notes ?? null,
    }).returning();
    res.status(201).json(contract);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.patch("/contracts/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { playerId, teamId, startDate, endDate, salaryAmount, bonusAmount, clauses, promisedMatches, penaltyAmount, status, notes } = req.body;
    const [contract] = await db
      .update(playerContractsTable)
      .set({
        ...(playerId !== undefined && { playerId: Number(playerId) }),
        ...(teamId !== undefined && { teamId: Number(teamId) }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        ...(salaryAmount !== undefined && { salaryAmount }),
        ...(bonusAmount !== undefined && { bonusAmount }),
        ...(clauses !== undefined && { clauses }),
        ...(promisedMatches !== undefined && { promisedMatches: promisedMatches ? Number(promisedMatches) : null }),
        ...(penaltyAmount !== undefined && { penaltyAmount }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      })
      .where(eq(playerContractsTable.id, id))
      .returning();
    if (!contract) return res.status(404).json({ error: "Contract not found" });
    res.json(contract);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.delete("/contracts/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(playerContractsTable).where(eq(playerContractsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
