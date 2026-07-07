import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leaguesTable } from "./leagues";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  team1Id: integer("team1_id").notNull(),
  team2Id: integer("team2_id").notNull(),
  team1Score: integer("team1_score").notNull().default(0),
  team2Score: integer("team2_score").notNull().default(0),
  leagueId: integer("league_id").references(() => leaguesTable.id),
  gccTournamentId: integer("gcc_tournament_id"),
  gccFixtureId: integer("gcc_fixture_id"),
  season: text("season"),
  notes: text("notes"),
  matchType: text("match_type").notNull().default("league"),
  superCupLeg: integer("super_cup_leg"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerMatchupsTable = pgTable("player_matchups", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  player1Id: integer("player1_id").notNull(),
  player2Id: integer("player2_id").notNull(),
  player1Goals: integer("player1_goals").notNull().default(0),
  player2Goals: integer("player2_goals").notNull().default(0),
  mvpPlayerId: integer("mvp_player_id"),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({
  id: true,
  createdAt: true,
});
export const insertPlayerMatchupSchema = createInsertSchema(
  playerMatchupsTable,
).omit({ id: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
export type InsertPlayerMatchup = z.infer<typeof insertPlayerMatchupSchema>;
export type PlayerMatchup = typeof playerMatchupsTable.$inferSelect;
