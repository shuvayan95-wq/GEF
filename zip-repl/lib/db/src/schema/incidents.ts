import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Incidents — admin-curated events that affect Ballon d'Or scoring.
 *
 * Positive incidents (type = "exceptional_performance") add penaltyPoints (negative penalty = bonus).
 * Negative incidents subtract penaltyPoints from the player's final score.
 *
 * Examples:
 *  - cup_knockout:   team knocked out of GEF Champions Cup group stage → -120 pts
 *  - disciplinary:   red card / ban                                   → -60 pts
 *  - poor_form:      notable underperformance in a decisive match       → -40 pts
 *  - exceptional_performance: standout heroics in a final              → +60 pts
 */
export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),

  // Who is affected (player is required; team is optional context)
  playerId:   integer("player_id").notNull(),
  teamId:     integer("team_id"),

  // Which season this incident belongs to (e.g. "2024-25")
  season: text("season").notNull(),

  // Incident classification
  type: text("type").notNull().default("cup_knockout"),
  // e.g. "GEF Champions Cup", "Domestic League", "Super Cup"
  competition: text("competition"),
  // e.g. "Group Stage", "Round of 16", "Semi-Final"
  stage: text("stage"),

  // Human-readable description of what happened
  description: text("description").notNull(),

  // Points deducted (positive = penalty, negative = bonus)
  penaltyPoints: integer("penalty_points").notNull().default(0),

  // Whether the penalty was AI-suggested (admin may override)
  aiSuggested: boolean("ai_suggested").default(false),

  // Who confirmed/resolved this incident
  resolvedBy: text("resolved_by"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;
