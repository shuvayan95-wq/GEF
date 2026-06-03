import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { teamsTable, playersTable, playerMatchupsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function calcOVR(matches: number, wins: number, losses: number, draws: number, goals: number, conceded: number, mvps: number): number {
  if (matches === 0) return 50;
  const winRate = wins / matches;
  const lossRate = losses / matches;
  const drawRate = draws / matches;
  const goalDiffPerMatch = (goals - conceded) / matches;
  const goalsPerMatch = goals / matches;
  const matchWeight = Math.min(matches / 10, 1);
  const performanceScore = (winRate * 60) + (drawRate * 25) - (lossRate * 20);
  const goalBonus = Math.min(goalsPerMatch * 5, 15);
  const gdBonus = Math.min(Math.max(goalDiffPerMatch * 3, -10), 10);
  const mvpBonus = Math.min(mvps * 2, 10);
  const rawScore = 50 + performanceScore + goalBonus + gdBonus + mvpBonus;
  const blended = rawScore * matchWeight + 60 * (1 - matchWeight);
  return Math.min(99, Math.max(40, Math.round(blended * 10) / 10));
}

function aggregatePlayerStats(playerId: number, allMatchups: any[]) {
  let wins = 0, losses = 0, draws = 0, goalsScored = 0, goalsConceded = 0, mvpCount = 0;
  for (const m of allMatchups) {
    const isP1 = m.player1Id === playerId;
    const isP2 = m.player2Id === playerId;
    if (!isP1 && !isP2) continue;
    const myGoals = isP1 ? m.player1Goals : m.player2Goals;
    const theirGoals = isP1 ? m.player2Goals : m.player1Goals;
    goalsScored += myGoals;
    goalsConceded += theirGoals;
    if (myGoals > theirGoals) wins++;
    else if (myGoals < theirGoals) losses++;
    else draws++;
    if (m.mvpPlayerId === playerId) mvpCount++;
  }
  const matchesPlayed = wins + losses + draws;
  return {
    wins, losses, draws, goalsScored, goalsConceded, mvpCount,
    matchesPlayed,
    overallRating: calcOVR(matchesPlayed, wins, losses, draws, goalsScored, goalsConceded, mvpCount),
  };
}

router.get("/teams", async (req, res) => {
  try {
    const includeInactive = req.query.all === "true" || (req.session as any).isAdmin;
    const [teams, players, allMatchups] = await Promise.all([
      db.select().from(teamsTable),
      db.select().from(playersTable),
      db.select().from(playerMatchupsTable),
    ]);

    const filteredTeams = includeInactive ? teams : teams.filter(t => t.status === "active");

    const result = filteredTeams.map(team => {
      const teamPlayers = players.filter(p => p.teamId === team.id);
      const playersData = teamPlayers.map(player => ({
        id: player.id,
        name: player.name,
        imageUrl: player.imageUrl ?? null,
        position: player.position ?? null,
        teamId: player.teamId ?? null,
        teamName: team.name,
        nationality: player.nationality ?? null,
        marketValue: player.marketValue ? Number(player.marketValue) : null,
        salary: player.salary ? Number(player.salary) : null,
        status: player.status,
        teamRole: player.teamRole ?? null,
        createdAt: player.createdAt.toISOString(),
        ...aggregatePlayerStats(player.id, allMatchups),
      }));
      return {
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl ?? null,
        leagueId: team.leagueId ?? null,
        status: team.status,
        players: playersData,
        createdAt: team.createdAt.toISOString(),
      };
    });

    res.json(result);
  } catch (err: any) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch teams" });
  }
});

router.get("/teams/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [[team], players, allMatchups] = await Promise.all([
      db.select().from(teamsTable).where(eq(teamsTable.id, id)),
      db.select().from(playersTable).where(eq(playersTable.teamId, id)),
      db.select().from(playerMatchupsTable),
    ]);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const playersData = players.map(player => ({
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl ?? null,
      position: player.position ?? null,
      teamId: player.teamId ?? null,
      teamName: team.name,
      nationality: player.nationality ?? null,
      marketValue: player.marketValue ? Number(player.marketValue) : null,
      salary: player.salary ? Number(player.salary) : null,
      status: player.status,
      teamRole: player.teamRole ?? null,
      createdAt: player.createdAt.toISOString(),
      ...aggregatePlayerStats(player.id, allMatchups),
    }));

    res.json({
      id: team.id,
      name: team.name,
      logoUrl: team.logoUrl ?? null,
      leagueId: team.leagueId ?? null,
      status: team.status,
      players: playersData,
      createdAt: team.createdAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Error fetching team:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch team" });
  }
});

router.post("/teams", requireAdmin, async (req, res) => {
  try {
    const { name, logoUrl, leagueId } = req.body;
    const [team] = await db.insert(teamsTable).values({ name, logoUrl, leagueId: leagueId || null }).returning();
    res.status(201).json({ id: team.id, name: team.name, logoUrl: team.logoUrl ?? null, leagueId: team.leagueId ?? null, status: team.status, players: [], createdAt: team.createdAt.toISOString() });
  } catch (err: any) {
    console.error("Error creating team:", err);
    res.status(500).json({ error: err?.message || "Failed to create team" });
  }
});

router.put("/teams/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, logoUrl, leagueId } = req.body;
    const [[team], players, allMatchups] = await Promise.all([
      db.update(teamsTable).set({ name, logoUrl, leagueId: leagueId || null }).where(eq(teamsTable.id, id)).returning(),
      db.select().from(playersTable).where(eq(playersTable.teamId, id)),
      db.select().from(playerMatchupsTable),
    ]);
    if (!team) return res.status(404).json({ error: "Team not found" });
    const playersData = players.map(player => ({
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl ?? null,
      position: player.position ?? null,
      teamId: player.teamId ?? null,
      teamName: team.name,
      nationality: player.nationality ?? null,
      marketValue: player.marketValue ? Number(player.marketValue) : null,
      salary: player.salary ? Number(player.salary) : null,
      status: player.status,
      teamRole: player.teamRole ?? null,
      createdAt: player.createdAt.toISOString(),
      ...aggregatePlayerStats(player.id, allMatchups),
    }));
    res.json({ id: team.id, name: team.name, logoUrl: team.logoUrl ?? null, leagueId: team.leagueId ?? null, status: team.status, players: playersData, createdAt: team.createdAt.toISOString() });
  } catch (err: any) {
    console.error("Error updating team:", err);
    res.status(500).json({ error: err?.message || "Failed to update team" });
  }
});

router.patch("/teams/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!["active", "left"].includes(status)) {
      return res.status(400).json({ error: "status must be 'active' or 'left'" });
    }
    const [team] = await db
      .update(teamsTable)
      .set({ status })
      .where(eq(teamsTable.id, id))
      .returning();
    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json({ id: team.id, status: team.status });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.delete("/teams/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(teamsTable).where(eq(teamsTable.id, id));
    res.json({ success: true, message: "Team deleted" });
  } catch (err: any) {
    console.error("Error deleting team:", err);
    res.status(500).json({ error: err?.message || "Failed to delete team" });
  }
});

export default router;
