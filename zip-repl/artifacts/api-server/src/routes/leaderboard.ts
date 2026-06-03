import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable, teamsTable, playerMatchupsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { calcOVR } from "../lib/marketValue.js";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res) => {
  try {
  const players = await db.select().from(playersTable);
  const entries = await Promise.all(players.map(async (player) => {
    const matchups = await db
      .select()
      .from(playerMatchupsTable)
      .where(sql`${playerMatchupsTable.player1Id} = ${player.id} OR ${playerMatchupsTable.player2Id} = ${player.id}`);

    let wins = 0, losses = 0, draws = 0, goalsScored = 0, goalsConceded = 0, mvpCount = 0;
    for (const m of matchups) {
      const isP1 = m.player1Id === player.id;
      const myGoals = isP1 ? m.player1Goals : m.player2Goals;
      const theirGoals = isP1 ? m.player2Goals : m.player1Goals;
      goalsScored += myGoals;
      goalsConceded += theirGoals;
      if (myGoals > theirGoals) wins++;
      else if (myGoals < theirGoals) losses++;
      else draws++;
      if (m.mvpPlayerId === player.id) mvpCount++;
    }

    let teamName: string | null = null;
    if (player.teamId) {
      const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, player.teamId));
      teamName = team?.name ?? null;
    }

    const matchesPlayed = matchups.length;
    const overallRating = calcOVR(matchesPlayed, wins, losses, draws, goalsScored, goalsConceded, mvpCount);
    const winRate = matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0;
    const goalsPerMatch = matchesPlayed > 0 ? goalsScored / matchesPlayed : 0;

    return {
      playerId: player.id,
      name: player.name,
      imageUrl: player.imageUrl ?? null,
      teamName,
      matchesPlayed,
      wins,
      losses,
      draws,
      goalsScored,
      goalsConceded,
      winRate: Math.round(winRate * 10) / 10,
      goalsPerMatch: Math.round(goalsPerMatch * 100) / 100,
      mvpCount,
      overallRating,
    };
  }));

  entries.sort((a, b) => b.overallRating - a.overallRating);
  const ranked = entries.map((e, i) => ({ rank: i + 1, ...e }));
  res.json(ranked);
  } catch (err: any) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch leaderboard" });
  }
});

export default router;
