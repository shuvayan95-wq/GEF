import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transfersTable = pgTable("transfers", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  fromTeamId: integer("from_team_id"),
  toTeamId: integer("to_team_id").notNull(),
  transferDate: text("transfer_date").notNull(),
  season: text("season"),
  fee: numeric("fee", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransferSchema = createInsertSchema(transfersTable).omit({ id: true, createdAt: true });
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfersTable.$inferSelect;
