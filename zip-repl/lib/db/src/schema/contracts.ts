import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const playerContractsTable = pgTable("player_contracts", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  teamId: integer("team_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  salaryAmount: numeric("salary_amount", { precision: 15, scale: 2 }),
  bonusAmount: numeric("bonus_amount", { precision: 15, scale: 2 }),
  clauses: text("clauses"),
  promisedMatches: integer("promised_matches"),
  penaltyAmount: numeric("penalty_amount", { precision: 15, scale: 2 }),
  status: text("status").default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PlayerContract = typeof playerContractsTable.$inferSelect;
