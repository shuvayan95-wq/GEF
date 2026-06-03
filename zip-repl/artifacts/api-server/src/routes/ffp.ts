import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ffpSettingsTable, teamFinancialsTable, teamsTable, ffpIncomeLogTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function calcStatus(
  income: number,
  expenses: number,
  wages: number,
  settings: any,
): { status: "compliant" | "at_risk" | "high_risk" | "breach"; lossAmount: number; expenseRatio: number; wageRatio: number; lossPercent: number; ratioPercent: number } {
  const maxLoss = Number(settings.maxLossAmount);
  const maxRatio = Number(settings.maxExpenseRatio);
  const wageCap = Number(settings.wageCapPercent) / 100;
  const atRisk = Number(settings.atRiskThreshold);
  const highRisk = Number(settings.highRiskThreshold);

  const lossAmount = expenses - income;
  const expenseRatio = income > 0 ? expenses / income : expenses > 0 ? 999 : 1;
  const wageRatio = income > 0 ? wages / income : wages > 0 ? 999 : 0;

  const lossPercent = maxLoss > 0 ? lossAmount / maxLoss : 0;
  const ratioPercent = maxRatio > 0 ? (expenseRatio - 1) / (maxRatio - 1) : 0;

  const worst = Math.max(lossPercent, ratioPercent);

  let status: "compliant" | "at_risk" | "high_risk" | "breach";
  if (lossAmount > maxLoss || expenseRatio > maxRatio || wageRatio > wageCap) {
    status = "breach";
  } else if (worst >= highRisk) {
    status = "high_risk";
  } else if (worst >= atRisk) {
    status = "at_risk";
  } else {
    status = "compliant";
  }

  return { status, lossAmount, expenseRatio, wageRatio, lossPercent, ratioPercent };
}

async function getOrCreateSettings() {
  const rows = await db.select().from(ffpSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(ffpSettingsTable).values({}).returning();
  return created;
}

router.get("/ffp/settings", async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.json({
    id: settings.id,
    seasonLabel: settings.seasonLabel,
    maxLossAmount: Number(settings.maxLossAmount),
    maxExpenseRatio: Number(settings.maxExpenseRatio),
    wageCapPercent: Number(settings.wageCapPercent),
    atRiskThreshold: Number(settings.atRiskThreshold),
    highRiskThreshold: Number(settings.highRiskThreshold),
    notes: settings.notes ?? null,
    updatedAt: settings.updatedAt.toISOString(),
  });
});

router.put("/ffp/settings", requireAdmin, async (req, res) => {
  const { seasonLabel, maxLossAmount, maxExpenseRatio, wageCapPercent, atRiskThreshold, highRiskThreshold, notes } = req.body;
  const settings = await getOrCreateSettings();
  const [updated] = await db
    .update(ffpSettingsTable)
    .set({
      seasonLabel,
      maxLossAmount: String(maxLossAmount),
      maxExpenseRatio: String(maxExpenseRatio),
      wageCapPercent: String(wageCapPercent),
      atRiskThreshold: String(atRiskThreshold),
      highRiskThreshold: String(highRiskThreshold),
      notes: notes ?? null,
      updatedAt: sql`now()`,
    })
    .where(eq(ffpSettingsTable.id, settings.id))
    .returning();
  res.json({
    id: updated.id,
    seasonLabel: updated.seasonLabel,
    maxLossAmount: Number(updated.maxLossAmount),
    maxExpenseRatio: Number(updated.maxExpenseRatio),
    wageCapPercent: Number(updated.wageCapPercent),
    atRiskThreshold: Number(updated.atRiskThreshold),
    highRiskThreshold: Number(updated.highRiskThreshold),
    notes: updated.notes ?? null,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.get("/ffp/teams", async (_req, res) => {
  const settings = await getOrCreateSettings();
  const teams = await db.select().from(teamsTable);
  const financials = await db.select().from(teamFinancialsTable);

  const result = teams.map(team => {
    const fin = financials.find(f => f.teamId === team.id);
    const income = fin ? Number(fin.income) : 0;
    const expenses = fin ? Number(fin.expenses) : 0;
    const wages = fin ? Number(fin.wagesExpense) : 0;
    const budget = fin ? Number(fin.budget) : 0;
    const transferExp = fin ? Number(fin.transferExpense) : 0;
    const opExp = fin ? Number(fin.operationalExpense) : 0;

    const compliance = calcStatus(income, expenses, wages, settings);

    return {
      teamId: team.id,
      teamName: team.name,
      logoUrl: team.logoUrl ?? null,
      season: fin?.season ?? settings.seasonLabel,
      income,
      expenses,
      budget,
      wagesExpense: wages,
      transferExpense: transferExp,
      operationalExpense: opExp,
      netPosition: income - expenses,
      notes: fin?.notes ?? null,
      ...compliance,
      financialsId: fin?.id ?? null,
    };
  });

  res.json(result);
});

router.post("/ffp/teams", requireAdmin, async (req, res) => {
  const { teamId, season, expenses, budget, wagesExpense, transferExpense, operationalExpense, notes } = req.body;

  const totalExp = Number(wagesExpense ?? 0) + Number(transferExpense ?? 0) + Number(operationalExpense ?? 0);
  const finalExpenses = expenses !== undefined ? Number(expenses) : totalExp;

  const existing = await db.select().from(teamFinancialsTable).where(eq(teamFinancialsTable.teamId, teamId));

  let record;
  if (existing.length > 0) {
    const [updated] = await db
      .update(teamFinancialsTable)
      .set({
        season,
        expenses: String(finalExpenses),
        budget: String(budget ?? 0),
        wagesExpense: String(wagesExpense ?? 0),
        transferExpense: String(transferExpense ?? 0),
        operationalExpense: String(operationalExpense ?? 0),
        notes: notes ?? null,
        updatedAt: sql`now()`,
      })
      .where(eq(teamFinancialsTable.teamId, teamId))
      .returning();
    record = updated;
  } else {
    const [created] = await db
      .insert(teamFinancialsTable)
      .values({
        teamId,
        season,
        income: "0",
        expenses: String(finalExpenses),
        budget: String(budget ?? 0),
        wagesExpense: String(wagesExpense ?? 0),
        transferExpense: String(transferExpense ?? 0),
        operationalExpense: String(operationalExpense ?? 0),
        notes: notes ?? null,
      })
      .returning();
    record = created;
  }

  res.json({ success: true, id: record.id });
});

router.get("/ffp/income-log/:teamId", async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  const logs = await db
    .select()
    .from(ffpIncomeLogTable)
    .where(eq(ffpIncomeLogTable.teamId, teamId));

  const categorySummary = logs.reduce((acc: any, l) => {
    const src = l.source;
    if (!acc[src]) acc[src] = 0;
    acc[src] += Number(l.amount);
    return acc;
  }, {});

  res.json({
    teamId,
    total: logs.reduce((s, l) => s + Number(l.amount), 0),
    logs: logs.map(l => ({
      id: l.id,
      matchId: l.matchId,
      source: l.source,
      amount: Number(l.amount),
      description: l.description,
      createdAt: l.createdAt.toISOString(),
    })),
    categorySummary,
  });
});

export default router;
