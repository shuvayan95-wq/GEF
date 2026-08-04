import { pgTable, serial, text, integer, boolean, jsonb, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── CWC Crews ───────────────────────────────────────────────────────────────

export const cwcCrewsTable = pgTable("cwc_crews", {
  id:               serial("id").primaryKey(),
  name:             text("name").notNull(),
  slug:             text("slug").notNull().unique(),
  tagline:          text("tagline"),
  region:           text("region"),
  country:          text("country"),
  founded:          text("founded"),
  founder:          text("founder"),
  captain:          text("captain"),
  manager:          text("manager"),
  ownerInvestor:    text("owner_investor"),
  logoUrl:          text("logo_url"),
  bannerUrl:        text("banner_url"),
  story:            text("story"),
  powerRanking:     integer("power_ranking"),
  currentDivision:  text("current_division"),
  currentFanbase:   integer("current_fanbase").default(0),
  totalMarketValue: numeric("total_market_value", { precision: 15, scale: 2 }).default("0"),
  totalWageBill:    numeric("total_wage_bill", { precision: 15, scale: 2 }).default("0"),
  rosterSize:       integer("roster_size").default(0),
  // Trophy counts (cached for quick display)
  cwcTitles:        integer("cwc_titles").default(0),
  ccTitles:         integer("cc_titles").default(0),
  leagueTitles:     integer("league_titles").default(0),
  superCupTitles:   integer("super_cup_titles").default(0),
  // Win/Draw/Loss record
  overallWins:      integer("overall_wins").default(0),
  overallDraws:     integer("overall_draws").default(0),
  overallLosses:    integer("overall_losses").default(0),
  isActive:         boolean("is_active").notNull().default(true),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

export const insertCwcCrewSchema = createInsertSchema(cwcCrewsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertCwcCrew = z.infer<typeof insertCwcCrewSchema>;
export type CwcCrew = typeof cwcCrewsTable.$inferSelect;

// ─── CWC Players ─────────────────────────────────────────────────────────────

export const cwcPlayersTable = pgTable("cwc_players", {
  id:               serial("id").primaryKey(),
  crewId:           integer("crew_id").notNull(),
  realName:         text("real_name").notNull(),
  ign:              text("ign"),
  nationality:      text("nationality"),
  age:              integer("age"),
  efootballId:      text("efootball_id"),
  whatsappNumber:   text("whatsapp_number"),
  jerseyNumber:     integer("jersey_number"),
  position:         text("position"),
  imageUrl:         text("image_url"),
  joinedCrew:       text("joined_crew"),
  contractUntil:    text("contract_until"),
  marketValue:      numeric("market_value", { precision: 15, scale: 2 }).default("0"),
  wage:             numeric("wage", { precision: 15, scale: 2 }).default("0"),
  playerRating:     integer("player_rating"),
  bio:              text("bio"),
  // Stats — auto-updated from match results
  matchesPlayed:    integer("matches_played").default(0),
  wins:             integer("wins").default(0),
  losses:           integer("losses").default(0),
  goalsScored:      integer("goals_scored").default(0),
  goalsConceded:    integer("goals_conceded").default(0),
  averageRating:    numeric("average_rating", { precision: 4, scale: 2 }).default("0"),
  currentForm:      text("current_form").default(""),   // e.g. "W W L W W"
  isActive:         boolean("is_active").notNull().default(true),
  isArchived:       boolean("is_archived").notNull().default(false),
  sortOrder:        integer("sort_order").default(0),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

export const insertCwcPlayerSchema = createInsertSchema(cwcPlayersTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertCwcPlayer = z.infer<typeof insertCwcPlayerSchema>;
export type CwcPlayer = typeof cwcPlayersTable.$inferSelect;

// ─── CWC Trophies ────────────────────────────────────────────────────────────

export const cwcTrophiesTable = pgTable("cwc_trophies", {
  id:             serial("id").primaryKey(),
  crewId:         integer("crew_id").notNull(),
  name:           text("name").notNull(),
  timesWon:       integer("times_won").notNull().default(1),
  // JSON array of season strings e.g. ["2024/25","2025/26"]
  winningSeasons: jsonb("winning_seasons").notNull().default([]),
  iconType:       text("icon_type").default("trophy"), // trophy | shield | star | crown | medal
  createdAt:      timestamp("created_at").defaultNow().notNull(),
});

export const insertCwcTrophySchema = createInsertSchema(cwcTrophiesTable).omit({
  id: true, createdAt: true,
});
export type InsertCwcTrophy = z.infer<typeof insertCwcTrophySchema>;
export type CwcTrophy = typeof cwcTrophiesTable.$inferSelect;

// ─── CWC Player Awards ───────────────────────────────────────────────────────

export const cwcPlayerAwardsTable = pgTable("cwc_player_awards", {
  id:        serial("id").primaryKey(),
  playerId:  integer("player_id").notNull(),
  awardName: text("award_name").notNull(),
  timesWon:  integer("times_won").notNull().default(1),
  seasons:   text("seasons").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCwcPlayerAwardSchema = createInsertSchema(cwcPlayerAwardsTable).omit({
  id: true, createdAt: true,
});
export type InsertCwcPlayerAward = z.infer<typeof insertCwcPlayerAwardSchema>;
export type CwcPlayerAward = typeof cwcPlayerAwardsTable.$inferSelect;
