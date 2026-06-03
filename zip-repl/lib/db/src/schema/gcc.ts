import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Tournament ───────────────────────────────────────────────────────────────

export const gccTournamentsTable = pgTable("gcc_tournaments", {
  id:               serial("id").primaryKey(),
  name:             text("name").notNull(),
  season:           text("season").notNull(),
  logoUrl:          text("logo_url"),
  // setup → draw → league → playoffs → knockout → complete
  status:           text("status").notNull().default("setup"),
  numPots:          integer("num_pots").notNull().default(4),
  // {"1":2,"2":2,"3":2,"4":2}  = play 2 opponents from each pot
  matchRules:       jsonb("match_rules").notNull().default({}),
  directQualifiers: integer("direct_qualifiers").notNull().default(8),
  playoffSpots:     integer("playoff_spots").notNull().default(8),
  // {pairs:[{homeTeamId,awayTeamId}...], revealed:0, complete:false}
  drawState:        jsonb("draw_state").notNull().default({}),
  // Explicitly finalized tournament results for Ballon d'Or scoring
  // { leagueEliminated:[teamId,...], playoffEliminated:[...], r16Eliminated:[...],
  //   qfEliminated:[...], sfEliminated:[...], runnerUp:teamId|null, champion:teamId|null }
  finalizedResults: jsonb("finalized_results"),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

export const insertGccTournamentSchema = createInsertSchema(gccTournamentsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertGccTournament = z.infer<typeof insertGccTournamentSchema>;
export type GccTournament = typeof gccTournamentsTable.$inferSelect;

// ─── Team Entries (tournament enrollment with pot assignment) ─────────────────

export const gccEntriesTable = pgTable("gcc_entries", {
  id:           serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  teamId:       integer("team_id").notNull(),
  pot:          integer("pot").notNull().default(1),
  seed:         integer("seed"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const insertGccEntrySchema = createInsertSchema(gccEntriesTable).omit({
  id: true, createdAt: true,
});
export type InsertGccEntry = z.infer<typeof insertGccEntrySchema>;
export type GccEntry = typeof gccEntriesTable.$inferSelect;

// ─── Fixtures (league + knockout) ────────────────────────────────────────────

export const gccFixturesTable = pgTable("gcc_fixtures", {
  id:           serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  // "league" | "playoff" | "r16" | "qf" | "sf" | "final"
  stage:        text("stage").notNull().default("league"),
  round:        integer("round").notNull().default(1),
  // 1 = first leg, 2 = second leg (for playoff/knockout)
  leg:          integer("leg").notNull().default(1),
  // groups two-leg ties together (e.g. "qf-1")
  pairKey:      text("pair_key"),
  homeTeamId:   integer("home_team_id").notNull(),
  awayTeamId:   integer("away_team_id").notNull(),
  homeScore:    integer("home_score"),
  awayScore:    integer("away_score"),
  played:       boolean("played").notNull().default(false),
  notes:        text("notes"),
  scheduledDate: text("scheduled_date"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const insertGccFixtureSchema = createInsertSchema(gccFixturesTable).omit({
  id: true, createdAt: true,
});
export type InsertGccFixture = z.infer<typeof insertGccFixtureSchema>;
export type GccFixture = typeof gccFixturesTable.$inferSelect;
