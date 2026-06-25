import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  budgetTransactionsTable,
  teamFinancialsTable,
  ffpIncomeLogTable,
  teamsTable,
  transfersTable,
  playersTable,
  matchesTable,
  playerMatchupsTable,
  leaguesTable,
  gccTournamentsTable,
} from "@workspace/db";
import { eq, sql, and, isNull, inArray, or, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Recalculate team_financials from budget_transactions + match income logs
export async function syncTeamFinancials(teamId: number) {
  const txns = await db.select().from(budgetTransactionsTable).where(eq(budgetTransactionsTable.teamId, teamId));
  const matchIncomeLogs = await db.select().from(ffpIncomeLogTable).where(eq(ffpIncomeLogTable.teamId, teamId));

  const matchIncome = matchIncomeLogs.reduce((s, l) => s + Number(l.amount), 0);
  const budgetIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = matchIncome + budgetIncome;

  const wages = txns.filter(t => t.category === "wages").reduce((s, t) => s + Number(t.amount), 0);
  const transferOut = txns.filter(t => t.category === "transfer_out").reduce((s, t) => s + Number(t.amount), 0);
  const operational = txns.filter(t => t.type === "expense" && !["wages", "transfer_out"].includes(t.category)).reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = wages + transferOut + operational;

  const existing = await db.select().from(teamFinancialsTable).where(eq(teamFinancialsTable.teamId, teamId));

  if (existing.length > 0) {
    await db.update(teamFinancialsTable).set({
      income: String(totalIncome),
      expenses: String(totalExpenses),
      wagesExpense: String(wages),
      transferExpense: String(transferOut),
      operationalExpense: String(operational),
      updatedAt: sql`now()`,
    }).where(eq(teamFinancialsTable.teamId, teamId));
  } else {
    await db.insert(teamFinancialsTable).values({
      teamId,
      season: "2025-26",
      income: String(totalIncome),
      expenses: String(totalExpenses),
      budget: "0",
      wagesExpense: String(wages),
      transferExpense: String(transferOut),
      operationalExpense: String(operational),
    });
  }
}

// GET /budget — all teams with budget summaries
router.get("/budget", async (_req, res) => {
  try {
    const teams = await db.select().from(teamsTable);
    const financials = await db.select().from(teamFinancialsTable);
    const txns = await db.select().from(budgetTransactionsTable);
    const matchLogs = await db.select().from(ffpIncomeLogTable);

    const result = teams.map(team => {
      const fin = financials.find(f => f.teamId === team.id);
      const teamTxns = txns.filter(t => t.teamId === team.id);
      const matchIncome = matchLogs.filter(l => l.teamId === team.id).reduce((s, l) => s + Number(l.amount), 0);
      const budgetIncome = teamTxns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const budgetExpenses = teamTxns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      const startingBudget = fin ? Number(fin.budget) : 0;
      const currentBalance = startingBudget + matchIncome + budgetIncome - budgetExpenses;
      const penalties = teamTxns.filter(t => t.category === "penalty").reduce((s, t) => s + Number(t.amount), 0);

      return {
        teamId: team.id,
        teamName: team.name,
        logoUrl: team.logoUrl ?? null,
        startingBudget,
        matchIncome,
        budgetIncome,
        totalIncome: matchIncome + budgetIncome,
        budgetExpenses,
        penalties,
        currentBalance,
        season: fin?.season ?? "2025-26",
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /budget/:teamId — team detail with all transactions
router.get("/budget/:teamId", async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
    if (!team) return res.status(404).json({ error: "Team not found" });

    const fin = await db.select().from(teamFinancialsTable).where(eq(teamFinancialsTable.teamId, teamId)).then(r => r[0] ?? null);
    const txns = await db.select().from(budgetTransactionsTable).where(eq(budgetTransactionsTable.teamId, teamId)).then(r => r.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    const matchLogs = await db.select().from(ffpIncomeLogTable).where(eq(ffpIncomeLogTable.teamId, teamId));

    const matchIncome = matchLogs.reduce((s, l) => s + Number(l.amount), 0);
    const budgetIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const budgetExpenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const startingBudget = fin ? Number(fin.budget) : 0;
    const currentBalance = startingBudget + matchIncome + budgetIncome - budgetExpenses;

    const byCategory = txns.reduce((acc: any, t) => {
      if (!acc[t.category]) acc[t.category] = { income: 0, expense: 0 };
      acc[t.category][t.type] += Number(t.amount);
      return acc;
    }, {});

    res.json({
      teamId,
      teamName: team.name,
      logoUrl: team.logoUrl ?? null,
      startingBudget,
      matchIncome,
      budgetIncome,
      budgetExpenses,
      currentBalance,
      season: fin?.season ?? "2025-26",
      byCategory,
      transactions: txns.map(t => ({
        id: t.id,
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        description: t.description,
        season: t.season,
        referenceId: t.referenceId,
        createdAt: t.createdAt.toISOString(),
      })),
      matchIncomeLogs: matchLogs.map(l => ({
        id: l.id,
        source: l.source,
        amount: Number(l.amount),
        description: l.description,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /budget/:teamId/starting — set starting budget
router.put("/budget/:teamId/starting", requireAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { amount, season } = req.body;
    const existing = await db.select().from(teamFinancialsTable).where(eq(teamFinancialsTable.teamId, teamId));

    if (existing.length > 0) {
      await db.update(teamFinancialsTable).set({
        budget: String(amount),
        season: season ?? existing[0].season,
        updatedAt: sql`now()`,
      }).where(eq(teamFinancialsTable.teamId, teamId));
    } else {
      await db.insert(teamFinancialsTable).values({
        teamId,
        season: season ?? "2025-26",
        income: "0",
        expenses: "0",
        budget: String(amount),
        wagesExpense: "0",
        transferExpense: "0",
        operationalExpense: "0",
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /budget/:teamId/transaction — add a transaction
router.post("/budget/:teamId/transaction", requireAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { type, category, amount, description, season, referenceId } = req.body;

    if (!type || !category || !amount) {
      return res.status(400).json({ error: "type, category, amount are required" });
    }
    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "type must be income or expense" });
    }

    const [txn] = await db.insert(budgetTransactionsTable).values({
      teamId,
      type,
      category,
      amount: String(amount),
      description: description ?? "",
      season: season ?? "2025-26",
      referenceId: referenceId ?? null,
    }).returning();

    await syncTeamFinancials(teamId);

    res.status(201).json({
      id: txn.id,
      type: txn.type,
      category: txn.category,
      amount: Number(txn.amount),
      description: txn.description,
      season: txn.season,
      createdAt: txn.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /budget/sync-transfers — backfill budget transactions from all transfers with fees
router.post("/budget/sync-transfers", requireAdmin, async (_req, res) => {
  try {
    const transfers = await db.select().from(transfersTable);
    const players = await db.select().from(playersTable);
    const existingTxns = await db.select().from(budgetTransactionsTable);

    const withFee = transfers.filter(t => t.fee && Number(t.fee) > 0);
    const affectedTeams = new Set<number>();
    let created = 0;

    for (const transfer of withFee) {
      const player = players.find(p => p.id === transfer.playerId);
      const playerName = player?.name ?? `Player #${transfer.playerId}`;
      const season = transfer.season ?? "2025-26";
      const fee = Number(transfer.fee);

      // Buying team expense
      const buyerExpenseExists = existingTxns.some(
        t => t.referenceId === transfer.id && t.teamId === transfer.toTeamId && t.category === "transfer_out"
      );
      if (!buyerExpenseExists && transfer.toTeamId) {
        await db.insert(budgetTransactionsTable).values({
          teamId: transfer.toTeamId,
          type: "expense",
          category: "transfer_out",
          amount: String(fee),
          description: `Transfer fee — signed ${playerName}`,
          season,
          referenceId: transfer.id,
        });
        affectedTeams.add(transfer.toTeamId);
        created++;
      }

      // Selling team income
      if (transfer.fromTeamId) {
        const sellerIncomeExists = existingTxns.some(
          t => t.referenceId === transfer.id && t.teamId === transfer.fromTeamId && t.category === "transfer_in"
        );
        if (!sellerIncomeExists) {
          await db.insert(budgetTransactionsTable).values({
            teamId: transfer.fromTeamId,
            type: "income",
            category: "transfer_in",
            amount: String(fee),
            description: `Transfer fee received — sold ${playerName}`,
            season,
            referenceId: transfer.id,
          });
          affectedTeams.add(transfer.fromTeamId);
          created++;
        }
      }
    }

    for (const teamId of affectedTeams) {
      await syncTeamFinancials(teamId);
    }

    res.json({ success: true, created, syncedTeams: affectedTeams.size });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /admin/performance-bonus — calculate and grant performance bonuses for last 3 MDs of a season
router.post("/admin/performance-bonus", requireAdmin, async (req, res) => {
  try {
    const { season } = req.body as { season?: string };
    if (!season) return res.status(400).json({ error: "season is required" });

    // Get league IDs for this season
    const leaguesForSeason = await db.select({ id: leaguesTable.id }).from(leaguesTable)
      .where(eq(leaguesTable.season, season));
    const leagueIds = leaguesForSeason.map(l => l.id);

    // Get gcc tournament IDs for this season
    const gccForSeason = await db.select({ id: gccTournamentsTable.id }).from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.season, season));
    const gccIds = gccForSeason.map(g => g.id);

    // Get all matches for this season
    const seasonMatchesRaw = await db.select({ id: matchesTable.id, date: matchesTable.date, team1Id: matchesTable.team1Id, team2Id: matchesTable.team2Id, team1Score: matchesTable.team1Score, team2Score: matchesTable.team2Score })
      .from(matchesTable)
      .where(
        or(
          eq(matchesTable.season, season),
          leagueIds.length > 0 ? inArray(matchesTable.leagueId, leagueIds) : undefined,
          gccIds.length > 0 ? inArray(matchesTable.gccTournamentId, gccIds) : undefined,
        )
      )
      .orderBy(desc(matchesTable.date));

    if (!seasonMatchesRaw.length) return res.status(400).json({ error: "No matches found for this season" });

    // Last 3 distinct matchdays (dates)
    const distinctDates = [...new Set(seasonMatchesRaw.map(m => m.date))].slice(0, 3);
    const lastMatches = seasonMatchesRaw.filter(m => distinctDates.includes(m.date));
    const lastMatchIds = lastMatches.map(m => m.id);

    // Get all player matchups for those matches
    const matchups = await db.select().from(playerMatchupsTable)
      .where(inArray(playerMatchupsTable.matchId, lastMatchIds));

    // Get all players with their team
    const players = await db.select({ id: playersTable.id, teamId: playersTable.teamId })
      .from(playersTable).where(eq(playersTable.status, "active"));
    const playerTeamMap = new Map(players.map(p => [p.id, p.teamId]));

    // Build match map for win calculation
    const matchMap = new Map(lastMatches.map(m => [m.id, m]));

    // Tally per-team score
    const teamScores = new Map<number, { goals: number; wins: number; mvps: number }>();

    const ensureTeam = (teamId: number) => {
      if (!teamScores.has(teamId)) teamScores.set(teamId, { goals: 0, wins: 0, mvps: 0 });
    };

    for (const mu of matchups) {
      const match = matchMap.get(mu.matchId);
      if (!match) continue;

      const team1 = playerTeamMap.get(mu.player1Id);
      const team2 = playerTeamMap.get(mu.player2Id);

      if (team1) {
        ensureTeam(team1);
        teamScores.get(team1)!.goals += mu.player1Goals;
        if (match.team1Score > match.team2Score) teamScores.get(team1)!.wins += 1;
        if (mu.mvpPlayerId === mu.player1Id) teamScores.get(team1)!.mvps += 1;
      }
      if (team2) {
        ensureTeam(team2);
        teamScores.get(team2)!.goals += mu.player2Goals;
        if (match.team2Score > match.team1Score) teamScores.get(team2)!.wins += 1;
        if (mu.mvpPlayerId === mu.player2Id) teamScores.get(team2)!.mvps += 1;
      }
    }

    // Get all teams
    const allTeams = await db.select().from(teamsTable);

    // Calculate max score for normalization
    let maxScore = 0;
    for (const [, s] of teamScores) {
      const score = s.goals * 3 + s.wins * 2 + s.mvps * 5;
      if (score > maxScore) maxScore = score;
    }

    const MIN_BONUS = 50_000;
    const MAX_BONUS = 250_000;

    const results: { teamId: number; teamName: string; bonus: number; score: number }[] = [];

    for (const team of allTeams) {
      const s = teamScores.get(team.id);
      if (!s) continue;

      const score = s.goals * 3 + s.wins * 2 + s.mvps * 5;
      if (score === 0) continue;

      const ratio = maxScore > 0 ? score / maxScore : 0;
      const rawBonus = MIN_BONUS + ratio * (MAX_BONUS - MIN_BONUS);
      const bonus = Math.round(rawBonus / 5000) * 5000;

      // Check if bonus already given for this season (avoid duplicates)
      const existing = await db.select().from(budgetTransactionsTable)
        .where(and(
          eq(budgetTransactionsTable.teamId, team.id),
          eq(budgetTransactionsTable.category, "performance_bonus"),
          eq(budgetTransactionsTable.season, season)
        ));
      if (existing.length > 0) continue;

      await db.insert(budgetTransactionsTable).values({
        teamId: team.id,
        type: "income",
        category: "performance_bonus",
        amount: String(bonus),
        description: `Performance bonus — ${season} (last 3 matchdays)`,
        season,
      });

      await syncTeamFinancials(team.id);
      results.push({ teamId: team.id, teamName: team.name, bonus, score });
    }

    res.json({ success: true, bonusesGranted: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /budget/transaction/:id — delete a transaction
router.delete("/budget/transaction/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [txn] = await db.select().from(budgetTransactionsTable).where(eq(budgetTransactionsTable.id, id));
    if (!txn) return res.status(404).json({ error: "Transaction not found" });

    await db.delete(budgetTransactionsTable).where(eq(budgetTransactionsTable.id, id));
    await syncTeamFinancials(txn.teamId);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
