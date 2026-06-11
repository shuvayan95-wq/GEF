import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";

// ─── Knockout Cup ─────────────────────────────────────────────────────────────
// rounds: [{key:"R16"|"QF"|"SF"|"FINAL"|"3RD", label:"Round of 16", order:1, twoLegged:false}]

export const knockoutCupsTable = pgTable("knockout_cups", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  season:      text("season"),
  logoUrl:     text("logo_url"),
  description: text("description"),
  // "active" | "completed"
  status:      text("status").notNull().default("active"),
  rounds:      jsonb("rounds").notNull().default([]),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export const insertKnockoutCupSchema = createInsertSchema(knockoutCupsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertKnockoutCup = z.infer<typeof insertKnockoutCupSchema>;
export type KnockoutCup = typeof knockoutCupsTable.$inferSelect;

// ─── Knockout Fixture ─────────────────────────────────────────────────────────

export const knockoutFixturesTable = pgTable("knockout_fixtures", {
  id:           serial("id").primaryKey(),
  cupId:        integer("cup_id").notNull().references(() => knockoutCupsTable.id, { onDelete: "cascade" }),
  roundKey:     text("round_key").notNull(),  // "R16"|"QF"|"SF"|"FINAL"|"3RD"
  leg:          integer("leg").notNull().default(1), // 1 = first leg, 2 = second leg
  player1Id:    integer("player1_id").references(() => playersTable.id, { onDelete: "set null" }),
  player2Id:    integer("player2_id").references(() => playersTable.id, { onDelete: "set null" }),
  player1Goals: integer("player1_goals"),
  player2Goals: integer("player2_goals"),
  notes:        text("notes"),
  matchDate:    text("match_date"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const insertKnockoutFixtureSchema = createInsertSchema(knockoutFixturesTable).omit({
  id: true, createdAt: true,
});
export type InsertKnockoutFixture = z.infer<typeof insertKnockoutFixtureSchema>;
export type KnockoutFixture = typeof knockoutFixturesTable.$inferSelect;
