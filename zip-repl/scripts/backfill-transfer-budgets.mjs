import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, and } from "drizzle-orm";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL });
const db = drizzle(pool);

// Inline schema refs (avoid workspace import complexity in script)
import { pgTable, serial, integer, varchar, text, timestamp, numeric } from "drizzle-orm/pg-core";

const transfersTable = pgTable("transfers", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id"),
  fromTeamId: integer("from_team_id"),
  toTeamId: integer("to_team_id"),
  fee: numeric("fee"),
  notes: text("notes"),
  season: varchar("season", { length: 20 }),
  transferDate: timestamp("transfer_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
});

const budgetTransactionsTable = pgTable("budget_transactions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  amount: numeric("amount").notNull(),
  description: text("description"),
  season: varchar("season", { length: 20 }),
  referenceId: integer("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

const teamFinancialsTable = pgTable("team_financials", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id"),
  season: varchar("season", { length: 20 }),
  income: numeric("income"),
  expenses: numeric("expenses"),
  budget: numeric("budget"),
  wagesExpense: numeric("wages_expense"),
  transferExpense: numeric("transfer_expense"),
  operationalExpense: numeric("operational_expense"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const ffpIncomeLogTable = pgTable("ffp_income_log", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id"),
  amount: numeric("amount"),
  source: varchar("source", { length: 50 }),
  description: text("description"),
  season: varchar("season", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

async function syncTeamFinancials(teamId) {
  const txns = await db.select().from(budgetTransactionsTable).where(eq(budgetTransactionsTable.teamId, teamId));
  const matchLogs = await db.select().from(ffpIncomeLogTable).where(eq(ffpIncomeLogTable.teamId, teamId));

  const matchIncome = matchLogs.reduce((s, l) => s + Number(l.amount), 0);
  const budgetIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const wages = txns.filter(t => t.category === "wages").reduce((s, t) => s + Number(t.amount), 0);
  const transferOut = txns.filter(t => t.category === "transfer_out").reduce((s, t) => s + Number(t.amount), 0);
  const operational = txns.filter(t => t.type === "expense" && !["wages", "transfer_out"].includes(t.category)).reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = wages + transferOut + operational;
  const totalIncome = matchIncome + budgetIncome;

  const existing = await db.select().from(teamFinancialsTable).where(eq(teamFinancialsTable.teamId, teamId));
  if (existing.length > 0) {
    await db.update(teamFinancialsTable).set({
      income: String(totalIncome),
      expenses: String(totalExpenses),
      wagesExpense: String(wages),
      transferExpense: String(transferOut),
      operationalExpense: String(operational),
      updatedAt: new Date(),
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

async function main() {
  console.log("Backfilling transfer budget transactions...\n");

  const transfers = await db.select().from(transfersTable);
  const players = await db.select().from(playersTable);
  const existingTxns = await db.select().from(budgetTransactionsTable);

  const withFee = transfers.filter(t => t.fee && Number(t.fee) > 0);
  console.log(`Found ${withFee.length} transfers with fees\n`);

  const affectedTeams = new Set();
  let created = 0;

  for (const transfer of withFee) {
    const player = players.find(p => p.id === transfer.playerId);
    const playerName = player?.name ?? `Player #${transfer.playerId}`;
    const season = transfer.season ?? "2025-26";
    const fee = Number(transfer.fee);

    // Check / create buying team expense
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
      console.log(`  ✓ Expense for team ${transfer.toTeamId}: -€${(fee/1e6).toFixed(2)}M (${playerName})`);
    } else if (buyerExpenseExists) {
      console.log(`  ⟳ Expense for team ${transfer.toTeamId} already exists (${playerName})`);
    }

    // Check / create selling team income
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
        console.log(`  ✓ Income for team ${transfer.fromTeamId}: +€${(fee/1e6).toFixed(2)}M (${playerName})`);
      } else {
        console.log(`  ⟳ Income for team ${transfer.fromTeamId} already exists (${playerName})`);
      }
    }
  }

  console.log(`\nCreated ${created} transactions. Syncing financials for ${affectedTeams.size} teams...`);
  for (const teamId of affectedTeams) {
    await syncTeamFinancials(teamId);
    console.log(`  ✓ Synced team ${teamId}`);
  }

  console.log("\nDone.");
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
