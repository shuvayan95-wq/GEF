import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable, teamsTable, awardsTable, playerMatchupsTable, playerMarketValueHistoryTable, matchesTable } from "@workspace/db";
import { eq, sql, asc, inArray } from "drizzle-orm";
import { recalculateAllMarketValues, calcOVR } from "../lib/marketValue.js";

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

router.delete("/players/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(playersTable).where(eq(playersTable.id, id));
  res.json({ success: true, message: "Player deleted" });
});

export default router;
