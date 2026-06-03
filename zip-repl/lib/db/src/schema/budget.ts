import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const budgetTransactionsTable = pgTable("budget_transactions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  type: text("type").notNull(), // "income" | "expense"
  category: text("category").notNull(), // "transfer_in" | "transfer_out" | "prize_money" | "wages" | "penalty" | "operational" | "sponsorship" | "grant" | "other"
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull().default(""),
  season: text("season").notNull().default("2025-26"),
  referenceId: integer("reference_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBudgetTransactionSchema = createInsertSchema(budgetTransactionsTable).omit({ id: true, createdAt: true });
export type InsertBudgetTransaction = z.infer<typeof insertBudgetTransactionSchema>;
export type BudgetTransaction = typeof budgetTransactionsTable.$inferSelect;
