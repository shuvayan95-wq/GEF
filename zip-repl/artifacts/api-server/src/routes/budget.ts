import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  budgetTransactionsTable,
  teamFinancialsTable,
  ffpIncomeLogTable,
  teamsTable,
  transfersTable,
  playersTable,
} from "@workspace/db";
import { eq, sql, and, isNull } from "drizzle-orm";

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
