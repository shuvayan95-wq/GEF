import { db } from "@workspace/db";
import { playersTable, playerMatchupsTable, playerMarketValueHistoryTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export function calcMarketValue(
  ovr: number,
  matchesPlayed: number,
  wins: number,
  goals: number,
  mvps: number,
): number {
  const BASE = 500_000;
  const ovrFactor = Math.pow(Math.max(ovr, 40) / 60, 1.8);
  const goalsPerMatch = matchesPlayed > 0 ? goals / matchesPlayed : 0;
  const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;

  const goalBonus = Math.min(goalsPerMatch * 120_000, 600_000);
  const winBonus = winRate * 400_000;
  const mvpBonus = Math.min(mvps * 60_000, 400_000);

  // Experience bonus: more matches = more proven value (caps at 30 matches)
  const experienceBonus = Math.min(matchesPlayed / 30, 1) * 300_000;

  const total = BASE * ovrFactor + goalBonus + winBonus + mvpBonus + experienceBonus;
  return Math.round(Math.min(15_000_000, Math.max(100_000, total)));
}

// Bayesian credibility OVR: more matches = more trusted
// k=8 means you need 8 matches to be 50% "credible"
export function calcOVR(
  matches: number,
  wins: number,
  losses: number,
  draws: number,
  goals: number,
  conceded: number,
  mvps: number,
): number {
  if (matches === 0) return 50;

  const winRate = wins / matches;
  const lossRate = losses / matches;
  const drawRate = draws / matches;
  const goalDiffPerMatch = (goals - conceded) / matches;
  const goalsPerMatch = goals / matches;

  // Per-match performance contributions
  const performanceScore = (winRate * 60) + (drawRate * 25) - (lossRate * 20);
  const goalBonus = Math.min(goalsPerMatch * 5, 15);
  const gdBonus = Math.min(Math.max(goalDiffPerMatch * 3, -10), 10);
  const mvpBonus = Math.min(mvps * 2.5, 15);

  const rawContrib = performanceScore + goalBonus + gdBonus + mvpBonus;

  // Bayesian credibility factor — 1 match is barely trusted, grows with evidence
  // Formula: matches / (matches + k), k=8
  // 1 match → 11%, 5 → 39%, 10 → 56%, 20 → 71%, 30 → 79%
  const credibility = matches / (matches + 8);

  const ovr = 50 + rawContrib * credibility;
  return Math.min(99, Math.max(40, Math.round(ovr * 10) / 10));
}

export async function recalculateAllMarketValues(reason?: string) {
  const players = await db.select().from(playersTable);

  for (const player of players) {
    const matchups = await db
      .select()
      .from(playerMatchupsTable)
      .where(
        sql`${playerMatchupsTable.player1Id} = ${player.id} OR ${playerMatchupsTable.player2Id} = ${player.id}`
      );

    let wins = 0, losses = 0, draws = 0, goals = 0, conceded = 0, mvps = 0;
    for (const m of matchups) {
      const isP1 = m.player1Id === player.id;
      const myGoals = isP1 ? m.player1Goals : m.player2Goals;
      const theirGoals = isP1 ? m.player2Goals : m.player1Goals;
      goals += myGoals;
      conceded += theirGoals;
      if (myGoals > theirGoals) wins++;
      else if (myGoals < theirGoals) losses++;
      else draws++;
      if (m.mvpPlayerId === player.id) mvps++;
    }

    const ovr = calcOVR(matchups.length, wins, losses, draws, goals, conceded, mvps);
    const newValue = calcMarketValue(ovr, matchups.length, wins, goals, mvps);

    const prevValue = player.marketValue ? Math.round(Number(player.marketValue)) : null;

    await db.update(playersTable)
      .set({ marketValue: String(newValue) })
      .where(eq(playersTable.id, player.id));

    if (prevValue !== newValue) {
      await db.insert(playerMarketValueHistoryTable).values({
        playerId: player.id,
        value: String(newValue),
        reason: reason ?? "Match result update",
      });
    }
  }
}
