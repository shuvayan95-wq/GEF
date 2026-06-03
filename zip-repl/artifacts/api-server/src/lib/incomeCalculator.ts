import { db } from "@workspace/db";
import {
  matchesTable,
  playerMatchupsTable,
  playersTable,
  leaguesTable,
  teamFinancialsTable,
  ffpIncomeLogTable,
  teamsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const INCOME_RATES = {
  league: { win: 500_000, draw: 250_000, loss: 100_000 },
  cup:    { win: 1_000_000, draw: 500_000, loss: 250_000 },
};

const GOALS_BONUS_PER_GOAL = 10_000;
const MVP_BONUS = 50_000;

function getResult(myScore: number, theirScore: number): "win" | "draw" | "loss" {
  if (myScore > theirScore) return "win";
  if (myScore === theirScore) return "draw";
  return "loss";
}

export async function recalculateAllTeamIncomes(reason = "Match update") {
  console.log(`[FFP Income] Recalculating all team incomes — ${reason}`);
  try {
    const teams = await db.select().from(teamsTable);
    await Promise.all(teams.map(t => recalculateTeamIncome(t.id)));
    console.log(`[FFP Income] Done for ${teams.length} teams`);
  } catch (err) {
    console.error("[FFP Income] Error:", err);
  }
}

export async function recalculateTeamIncome(teamId: number) {
  const matches = await db.select().from(matchesTable);
  const teamMatches = matches.filter(m => m.team1Id === teamId || m.team2Id === teamId);

  const allPlayers = await db.select().from(playersTable).where(eq(playersTable.teamId, teamId));
  const teamPlayerIds = new Set(allPlayers.map(p => p.id));

  const leagueCache = new Map<number, string>();

  const newLogEntries: {
    teamId: number;
    matchId: number;
    source: string;
    amount: string;
    description: string;
  }[] = [];

  for (const match of teamMatches) {
    const isTeam1 = match.team1Id === teamId;
    const myScore = isTeam1 ? match.team1Score : match.team2Score;
    const theirScore = isTeam1 ? match.team2Score : match.team1Score;
    const result = getResult(myScore, theirScore);

    let leagueType = "league";
    if (match.leagueId) {
      if (!leagueCache.has(match.leagueId)) {
        const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, match.leagueId));
        leagueCache.set(match.leagueId, league?.leagueType ?? "league");
      }
      leagueType = leagueCache.get(match.leagueId)!;
    }

    const rates = leagueType === "cup" ? INCOME_RATES.cup : INCOME_RATES.league;
    const matchIncome = rates[result];
    const competitionLabel = leagueType === "cup" ? "GEF Champions Cup" : "League Match";
    const resultLabel = result.charAt(0).toUpperCase() + result.slice(1);

    newLogEntries.push({
      teamId,
      matchId: match.id,
      source: `${leagueType}_${result}`,
      amount: String(matchIncome),
      description: `${competitionLabel} — ${resultLabel} bonus (Match #${match.id})`,
    });

    const matchups = await db.select().from(playerMatchupsTable).where(eq(playerMatchupsTable.matchId, match.id));

    for (const mu of matchups) {
      const isP1InTeam = teamPlayerIds.has(mu.player1Id);
      const isP2InTeam = teamPlayerIds.has(mu.player2Id);

      if (isP1InTeam && mu.player1Goals > 0) {
        newLogEntries.push({
          teamId,
          matchId: match.id,
          source: "goals_bonus",
          amount: String(mu.player1Goals * GOALS_BONUS_PER_GOAL),
          description: `Goals bonus — Player #${mu.player1Id} scored ${mu.player1Goals} goal(s) (Match #${match.id})`,
        });
      }
      if (isP2InTeam && mu.player2Goals > 0) {
        newLogEntries.push({
          teamId,
          matchId: match.id,
          source: "goals_bonus",
          amount: String(mu.player2Goals * GOALS_BONUS_PER_GOAL),
          description: `Goals bonus — Player #${mu.player2Id} scored ${mu.player2Goals} goal(s) (Match #${match.id})`,
        });
      }
      if (mu.mvpPlayerId !== null && teamPlayerIds.has(mu.mvpPlayerId)) {
        newLogEntries.push({
          teamId,
          matchId: match.id,
          source: "mvp_bonus",
          amount: String(MVP_BONUS),
          description: `MVP bonus — Player #${mu.mvpPlayerId} awarded MVP (Match #${match.id})`,
        });
      }
    }
  }

  const totalIncome = newLogEntries.reduce((sum, e) => sum + Number(e.amount), 0);

  await db.delete(ffpIncomeLogTable).where(eq(ffpIncomeLogTable.teamId, teamId));

  if (newLogEntries.length > 0) {
    await db.insert(ffpIncomeLogTable).values(newLogEntries);
  }

  const existing = await db.select().from(teamFinancialsTable).where(eq(teamFinancialsTable.teamId, teamId));
  if (existing.length > 0) {
    await db
      .update(teamFinancialsTable)
      .set({ income: String(totalIncome) })
      .where(eq(teamFinancialsTable.teamId, teamId));
  } else {
    await db.insert(teamFinancialsTable).values({
      teamId,
      season: "2025-26",
      income: String(totalIncome),
      expenses: "0",
      budget: "0",
      wagesExpense: "0",
      transferExpense: "0",
      operationalExpense: "0",
    });
  }

  return totalIncome;
}
