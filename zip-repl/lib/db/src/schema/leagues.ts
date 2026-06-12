import { pgTable, serial, text, boolean, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaguesTable = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  season: text("season"),
  logoUrl: text("logo_url"),
  leagueType: text("league_type").notNull().default("league"),
  isLocked: boolean("is_locked").notNull().default(false),
  fixtureRounds: integer("fixture_rounds").notNull().default(1),
  leagueRules: text("league_rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leagueParticipantsTable = pgTable("league_participants", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.leagueId, t.teamId)]);

export const insertLeagueSchema = createInsertSchema(leaguesTable).omit({ id: true, createdAt: true });
export const insertLeagueParticipantSchema = createInsertSchema(leagueParticipantsTable).omit({ id: true, createdAt: true });
export type InsertLeague = z.infer<typeof insertLeagueSchema>;
export type League = typeof leaguesTable.$inferSelect;
export type LeagueParticipant = typeof leagueParticipantsTable.$inferSelect;
