import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const clubFanbaseTable = pgTable("club_fanbase", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().unique(),
  currentFans: integer("current_fans").notNull().default(0),
  startingFans: integer("starting_fans").notNull().default(0),
  seasonStartFans: integer("season_start_fans").notNull().default(0),
  highestEver: integer("highest_ever").notNull().default(0),
  lowestEver: integer("lowest_ever").notNull().default(0),
  largestGain: integer("largest_gain").notNull().default(0),
  largestLoss: integer("largest_loss").notNull().default(0),
  season: text("season").notNull().default("2025-26"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ClubFanbase = typeof clubFanbaseTable.$inferSelect;

export const fanHistoryTable = pgTable("fan_history", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  changeAmount: integer("change_amount").notNull(),
  newTotal: integer("new_total").notNull(),
  reason: text("reason").notNull(),
  eventType: text("event_type").notNull(),
  referenceId: integer("reference_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FanHistory = typeof fanHistoryTable.$inferSelect;

export const fanDivisionThresholdsTable = pgTable("fan_division_thresholds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  minFans: integer("min_fans").notNull(),
  color: text("color").notNull().default("#6b7280"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type FanDivisionThreshold = typeof fanDivisionThresholdsTable.$inferSelect;

export const fanSettingsTable = pgTable("fan_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
});

export type FanSetting = typeof fanSettingsTable.$inferSelect;
