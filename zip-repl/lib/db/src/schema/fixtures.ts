import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";
import { matchesTable } from "./matches";

export const leagueFixturesTable = pgTable("league_fixtures", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  matchday: integer("matchday").notNull(),
  homeTeamId: integer("home_team_id").notNull(),
  awayTeamId: integer("away_team_id").notNull(),
  scheduledDate: text("scheduled_date"),
  matchId: integer("match_id").references(() => matchesTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LeagueFixture = typeof leagueFixturesTable.$inferSelect;
