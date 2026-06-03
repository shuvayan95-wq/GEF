import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trophiesTable = pgTable("trophies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  season: text("season").notNull(),
  leagueId: integer("league_id"),
  winnerTeamId: integer("winner_team_id"),
  winnerPlayerId: integer("winner_player_id"),
  description: text("description"),
  type: text("type").notNull().default("league_champion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrophySchema = createInsertSchema(trophiesTable).omit({ id: true, createdAt: true });
export type InsertTrophy = z.infer<typeof insertTrophySchema>;
export type Trophy = typeof trophiesTable.$inferSelect;
