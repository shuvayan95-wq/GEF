import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playerMarketValueHistoryTable = pgTable("player_market_value_history", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  value: numeric("value", { precision: 15, scale: 2 }).notNull(),
  reason: text("reason"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export const insertMarketValueHistorySchema = createInsertSchema(playerMarketValueHistoryTable).omit({ id: true, recordedAt: true });
export type InsertMarketValueHistory = z.infer<typeof insertMarketValueHistorySchema>;
export type MarketValueHistory = typeof playerMarketValueHistoryTable.$inferSelect;
