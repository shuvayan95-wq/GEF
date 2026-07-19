import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ffpSettingsTable = pgTable("ffp_settings", {
  id: serial("id").primaryKey(),
  seasonLabel: text("season_label").notNull().default("2025-26"),
  maxLossAmount: numeric("max_loss_amount", { precision: 15, scale: 2 }).notNull().default("5000000"),
  maxExpenseRatio: numeric("max_expense_ratio", { precision: 5, scale: 2 }).notNull().default("1.70"),
  wageCapPercent: numeric("wage_cap_percent", { precision: 5, scale: 2 }).notNull().default("70.00"),
  atRiskThreshold: numeric("at_risk_threshold", { precision: 5, scale: 2 }).notNull().default("0.70"),
  highRiskThreshold: numeric("high_risk_threshold", { precision: 5, scale: 2 }).notNull().default("0.85"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teamFinancialsTable = pgTable("team_financials", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  season: text("season").notNull().default("2025-26"),
  income: numeric("income", { precision: 15, scale: 2 }).notNull().default("0"),
  expenses: numeric("expenses", { precision: 15, scale: 2 }).notNull().default("0"),
  budget: numeric("budget", { precision: 15, scale: 2 }).notNull().default("0"),
  // FIFA-style budget allocation: wageBudget + transferBudget must not exceed budget
  wageBudget: numeric("wage_budget", { precision: 15, scale: 2 }).notNull().default("0"),
  transferBudget: numeric("transfer_budget", { precision: 15, scale: 2 }).notNull().default("0"),
  wagesExpense: numeric("wages_expense", { precision: 15, scale: 2 }).notNull().default("0"),
  transferExpense: numeric("transfer_expense", { precision: 15, scale: 2 }).notNull().default("0"),
  operationalExpense: numeric("operational_expense", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ffpIncomeLogTable = pgTable("ffp_income_log", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  matchId: integer("match_id"),
  source: text("source").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFfpSettingsSchema = createInsertSchema(ffpSettingsTable).omit({ id: true, updatedAt: true });
export const insertTeamFinancialsSchema = createInsertSchema(teamFinancialsTable).omit({ id: true, updatedAt: true });
export const insertFfpIncomeLogSchema = createInsertSchema(ffpIncomeLogTable).omit({ id: true, createdAt: true });
export type InsertFfpSettings = z.infer<typeof insertFfpSettingsSchema>;
export type InsertTeamFinancials = z.infer<typeof insertTeamFinancialsSchema>;
export type InsertFfpIncomeLog = z.infer<typeof insertFfpIncomeLogSchema>;
export type FfpSettings = typeof ffpSettingsTable.$inferSelect;
export type TeamFinancials = typeof teamFinancialsTable.$inferSelect;
export type FfpIncomeLog = typeof ffpIncomeLogTable.$inferSelect;
