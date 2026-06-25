import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable, teamsTable, awardsTable, playerMatchupsTable, playerMarketValueHistoryTable, matchesTable } from "@workspace/db";
import { eq, sql, asc, inArray } from "drizzle-orm";
import { recalculateAllMarketValues, calcOVR } from "../lib/marketValue.js";
import { syncTeamFinancials } from "./budget.js";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
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
  const overallRating = calcOVR(matchesPlayed, wins, losses, draws, goalsScored, goalsConceded, mvpCount);
  return { wins, losses, draws, goalsScored, goalsConceded, mvpCount, matchesPlayed, overallRating };
}

async function buildPlayerData(player: any) {
  const matchups = await db
    .select()
    .from(playerMatchupsTable)
    .where(
      sql`${playerMatchupsTable.player1Id} = ${player.id} OR ${playerMatchupsTable.player2Id} = ${player.id}`
    );

  const stats = aggregatePlayerStats(player.id, matchups);

  let teamName: string | null = null;
  if (player.teamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, player.teamId));
    teamName = team?.name ?? null;
  }

  return {
    id: player.id,
    name: player.name,
    imageUrl: player.imageUrl ?? null,
    position: player.position ?? null,
    teamId: player.teamId ?? null,
    teamName,
    nationality: player.nationality ?? null,
    efootballId: player.efootballId ?? null,
    rank: player.rank ?? null,
    crewName: player.crewName ?? null,
    cardOvr: player.cardOvr ?? null,
    cardPace: player.cardPace ?? null,
    cardShooting: player.cardShooting ?? null,
    cardPassing: player.cardPassing ?? null,
    cardDribbling: player.cardDribbling ?? null,
    cardDefending: player.cardDefending ?? null,
    cardPhysical: player.cardPhysical ?? null,
    cardPlayingStyle: player.cardPlayingStyle ?? null,
    cardType: player.cardType ?? null,
    marketValue: player.marketValue ? Number(player.marketValue) : null,
    salary: player.salary ? Number(player.salary) : null,
    status: player.status,
    teamRole: player.teamRole ?? null,
    ...stats,
    createdAt: player.createdAt.toISOString(),
  };
}

router.get("/players", async (req, res) => {
  try {
    const [players, allMatchups, teams] = await Promise.all([
      db.select().from(playersTable),
      db.select().from(playerMatchupsTable),
      db.select().from(teamsTable),
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));

    const result = players.map(player => {
      const stats = aggregatePlayerStats(player.id, allMatchups);
      const team = player.teamId ? teamMap.get(player.teamId) : null;
      return {
        id: player.id,
        name: player.name,
        imageUrl: player.imageUrl ?? null,
        position: player.position ?? null,
        teamId: player.teamId ?? null,
        teamName: team?.name ?? null,
        nationality: player.nationality ?? null,
        efootballId: player.efootballId ?? null,
        rank: player.rank ?? null,
        crewName: player.crewName ?? null,
        cardOvr: player.cardOvr ?? null,
        cardPace: player.cardPace ?? null,
        cardShooting: player.cardShooting ?? null,
        cardPassing: player.cardPassing ?? null,
        cardDribbling: player.cardDribbling ?? null,
        cardDefending: player.cardDefending ?? null,
        cardPhysical: player.cardPhysical ?? null,
        cardPlayingStyle: player.cardPlayingStyle ?? null,
        cardType: player.cardType ?? null,
        marketValue: player.marketValue ? Number(player.marketValue) : null,
        salary: player.salary ? Number(player.salary) : null,
        status: player.status,
        teamRole: player.teamRole ?? null,
        ...stats,
        createdAt: player.createdAt.toISOString(),
      };
    });

    res.json(result);
  } catch (err: any) {
    console.error("Error fetching players:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch players" });
  }
});

router.get("/players/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json(await buildPlayerData(player));
  } catch (err: any) {
    console.error("Error fetching player:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch player" });
  }
});

router.get("/players/:id/stats", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) return res.status(404).json({ error: "Player not found" });

    const [matchups, awards] = await Promise.all([
      db.select().from(playerMatchupsTable).where(
        sql`${playerMatchupsTable.player1Id} = ${id} OR ${playerMatchupsTable.player2Id} = ${id}`
      ),
      db.select().from(awardsTable).where(eq(awardsTable.playerId, id)),
    ]);

    const stats = aggregatePlayerStats(id, matchups);

    let teamName: string | null = null;
    if (player.teamId) {
      const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, player.teamId));
      teamName = team?.name ?? null;
    }

    const recentMatchups = matchups.slice(-5);
    const opponentIds = recentMatchups.map(m => (m.player1Id === id ? m.player2Id : m.player1Id));
    const matchIds = recentMatchups.map(m => m.matchId);

    const [opponents, recentMatchRows] = await Promise.all([
      opponentIds.length > 0
        ? db.select().from(playersTable).where(inArray(playersTable.id, opponentIds))
        : Promise.resolve([] as any[]),
      matchIds.length > 0
        ? db.select().from(matchesTable).where(inArray(matchesTable.id, matchIds))
        : Promise.resolve([] as any[]),
    ]);

    const opponentMap = new Map(opponents.map(o => [o.id, o]));
    const matchMap = new Map(recentMatchRows.map(m => [m.id, m]));

    const recentMatches = recentMatchups.map(m => {
      const opponentId = m.player1Id === id ? m.player2Id : m.player1Id;
      const myGoals = m.player1Id === id ? m.player1Goals : m.player2Goals;
      const theirGoals = m.player1Id === id ? m.player2Goals : m.player1Goals;
      const result = myGoals > theirGoals ? "W" : myGoals < theirGoals ? "L" : "D";
      const match = matchMap.get(m.matchId);
      return {
        matchId: m.matchId,
        date: match?.date ?? "",
        opponentName: opponentMap.get(opponentId)?.name ?? "Unknown",
        playerGoals: myGoals,
        opponentGoals: theirGoals,
        result,
      };
    });

    const winRate = stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0;
    const goalsPerMatch = stats.matchesPlayed > 0 ? stats.goalsScored / stats.matchesPlayed : 0;
    const goalsConcededPerMatch = stats.matchesPlayed > 0 ? stats.goalsConceded / stats.matchesPlayed : 0;

    res.json({
      playerId: id,
      name: player.name,
      imageUrl: player.imageUrl ?? null,
      position: player.position ?? null,
      teamId: player.teamId ?? null,
      teamName,
      nationality: player.nationality ?? null,
      efootballId: player.efootballId ?? null,
      rank: player.rank ?? null,
      crewName: player.crewName ?? null,
      cardOvr: player.cardOvr ?? null,
      cardPace: player.cardPace ?? null,
      cardShooting: player.cardShooting ?? null,
      cardPassing: player.cardPassing ?? null,
      cardDribbling: player.cardDribbling ?? null,
      cardDefending: player.cardDefending ?? null,
      cardPhysical: player.cardPhysical ?? null,
      cardPlayingStyle: player.cardPlayingStyle ?? null,
      cardType: player.cardType ?? null,
      marketValue: player.marketValue ? Number(player.marketValue) : null,
      status: player.status,
      teamRole: player.teamRole ?? null,
      matchesPlayed: stats.matchesPlayed,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate: Math.round(winRate * 10) / 10,
      goalsScored: stats.goalsScored,
      goalsConceded: stats.goalsConceded,
      goalDiff: stats.goalsScored - stats.goalsConceded,
      goalsPerMatch: Math.round(goalsPerMatch * 100) / 100,
      goalsConcededPerMatch: Math.round(goalsConcededPerMatch * 100) / 100,
      mvpCount: stats.mvpCount,
      overallRating: stats.overallRating,
      recentMatches,
      awards: awards.map(a => ({
        id: a.id,
        playerId: a.playerId,
        playerName: player.name,
        title: a.title,
        description: a.description ?? null,
        awardedAt: a.awardedAt,
      })),
    });
  } catch (err: any) {
    console.error("Error fetching player stats:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch player stats" });
  }
});

router.get("/players/:id/market-value-history", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) return res.status(404).json({ error: "Player not found" });

    const history = await db
      .select()
      .from(playerMarketValueHistoryTable)
      .where(eq(playerMarketValueHistoryTable.playerId, id))
      .orderBy(asc(playerMarketValueHistoryTable.recordedAt));

    res.json({
      playerId: id,
      currentValue: player.marketValue ? Number(player.marketValue) : null,
      history: history.map(h => ({
        id: h.id,
        value: Number(h.value),
        reason: h.reason ?? null,
        recordedAt: h.recordedAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("Error fetching market value history:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch market value history" });
  }
});

router.post("/players", requireAdmin, async (req, res) => {
  const { name, imageUrl, position, teamId, nationality, efootballId, rank, crewName,
          cardOvr, cardPace, cardShooting, cardPassing, cardDribbling, cardDefending,
          cardPhysical, cardPlayingStyle, cardType, marketValue, salary } = req.body;
  const [player] = await db
    .insert(playersTable)
    .values({ name, imageUrl, position, teamId, nationality, efootballId, rank, crewName,
              cardOvr, cardPace, cardShooting, cardPassing, cardDribbling, cardDefending,
              cardPhysical, cardPlayingStyle, cardType, marketValue, salary })
    .returning();
  res.status(201).json(await buildPlayerData(player));
});

router.put("/players/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, imageUrl, position, teamId, nationality, efootballId, rank, crewName,
          cardOvr, cardPace, cardShooting, cardPassing, cardDribbling, cardDefending,
          cardPhysical, cardPlayingStyle, cardType, marketValue, salary } = req.body;
  const [player] = await db
    .update(playersTable)
    .set({ name, imageUrl, position, teamId, nationality, efootballId, rank, crewName,
           cardOvr, cardPace, cardShooting, cardPassing, cardDribbling, cardDefending,
           cardPhysical, cardPlayingStyle, cardType, marketValue, salary })
    .where(eq(playersTable.id, id))
    .returning();
  if (!player) return res.status(404).json({ error: "Player not found" });
  res.json(await buildPlayerData(player));
});

router.patch("/players/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!["active", "left"].includes(status)) {
      return res.status(400).json({ error: "status must be 'active' or 'left'" });
    }
    const [player] = await db
      .update(playersTable)
      .set({ status })
      .where(eq(playersTable.id, id))
      .returning();
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json({ id: player.id, status: player.status });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.patch("/players/:id/role", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { teamRole } = req.body;
    if (teamRole !== null && !["captain", "vice_captain"].includes(teamRole)) {
      return res.status(400).json({ error: "teamRole must be 'captain', 'vice_captain', or null" });
    }
    const [player] = await db
      .update(playersTable)
      .set({ teamRole: teamRole ?? null })
      .where(eq(playersTable.id, id))
      .returning();
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json({ id: player.id, teamRole: player.teamRole });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.patch("/players/:id/identity", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { efootballId, rank, crewName, whatsappNumber } = req.body;
    const [player] = await db
      .update(playersTable)
      .set({
        efootballId: efootballId ?? null,
        rank: rank ?? null,
        crewName: crewName ?? null,
        whatsappNumber: whatsappNumber ?? null,
      })
      .where(eq(playersTable.id, id))
      .returning();
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json({ id: player.id, efootballId: player.efootballId, rank: player.rank, crewName: player.crewName, whatsappNumber: player.whatsappNumber });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PATCH /api/players/:id/salary — admin: manually set salary
router.patch("/players/:id/salary", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { salary } = req.body as { salary: number };
    if (salary === undefined || salary === null || isNaN(Number(salary))) {
      return res.status(400).json({ error: "salary is required" });
    }
    const [player] = await db
      .update(playersTable)
      .set({ salary: String(Math.round(Number(salary))) })
      .where(eq(playersTable.id, id))
      .returning();
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json({ id: player.id, salary: player.salary ? Number(player.salary) : null });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/admin/salaries/recalculate — bulk auto-calculate salaries from performance
router.post("/admin/salaries/recalculate", requireAdmin, async (req, res) => {
  try {
    const { playerIds } = req.body as { playerIds?: number[] };
    const allPlayers = await db.select().from(playersTable);
    const allMatchups = await db.select().from(playerMatchupsTable);
    const allAwards = await db.select().from(awardsTable);

    const targets = playerIds
      ? allPlayers.filter(p => playerIds.includes(p.id))
      : allPlayers;

    const updated: { id: number; name: string; salary: number }[] = [];

    for (const player of targets) {
      const stats = aggregatePlayerStats(player.id, allMatchups);
      const mvpCount = allAwards.filter(a => a.playerId === player.id && a.awardType === "mvp").length;
      const ovr = calcOVR(player) ?? 70;

      // Base: 10,000 | win rate bonus | goals bonus | MVP bonus | OVR bonus
      const base = 10000;
      const winRateBonus = stats.games > 0 ? Math.round((stats.wins / stats.games) * 5000) : 0;
      const goalsBonus = (stats.goalsScored ?? 0) * 80;
      const mvpBonus = mvpCount * 400;
      const ovrBonus = Math.max(0, ovr - 70) * 80;

      const rawSalary = base + winRateBonus + goalsBonus + mvpBonus + ovrBonus;
      // Round to nearest 500
      const salary = Math.round(rawSalary / 500) * 500;

      await db.update(playersTable)
        .set({ salary: String(salary) })
        .where(eq(playersTable.id, player.id));

      updated.push({ id: player.id, name: player.name, salary });
    }

    res.json({ updated, count: updated.length });

    // Sync wages_expense for all affected teams in the background
    const teamIds = [...new Set(targets.filter(p => p.teamId).map(p => p.teamId as number))];
    Promise.all(teamIds.map(id => syncTeamFinancials(id))).catch(() => {});
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /api/admin/salaries — all players with salary info
router.get("/admin/salaries", requireAdmin, async (_req, res) => {
  try {
    const players = await db.select().from(playersTable).orderBy(sql`name ASC`);
    const teams = await db.select().from(teamsTable);
    const allMatchups = await db.select().from(playerMatchupsTable);
    const teamMap = new Map(teams.map(t => [t.id, t.name]));

    const result = players.map(p => {
      const stats = aggregatePlayerStats(p.id, allMatchups);
      return {
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        teamName: p.teamId ? (teamMap.get(p.teamId) ?? "Free Agent") : "Free Agent",
        status: p.status,
        cardOvr: p.cardOvr,
        salary: p.salary ? Number(p.salary) : null,
        games: stats.games,
        wins: stats.wins,
        goals: stats.goalsScored,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.delete("/players/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(playersTable).where(eq(playersTable.id, id));
  res.json({ success: true, message: "Player deleted" });
});

export default router;
