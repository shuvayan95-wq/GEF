import { pgTable, serial, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ballonDorTable = pgTable("ballon_dor_results", {
  id: serial("id").primaryKey(),
  season: text("season").notNull().unique(),
  winner: jsonb("winner"),
  top50: jsonb("top50").notNull().default("[]"),
  totalCandidates: text("total_candidates").notNull().default("0"),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  notes: text("notes"),
  revealed: boolean("revealed").notNull().default(false),
  hofAwards: jsonb("hof_awards").default("[]"),
});

export const insertBallonDorSchema = createInsertSchema(ballonDorTable).omit({ id: true, calculatedAt: true });
export type InsertBallonDor = z.infer<typeof insertBallonDorSchema>;
export type BallonDor = typeof ballonDorTable.$inferSelect;
