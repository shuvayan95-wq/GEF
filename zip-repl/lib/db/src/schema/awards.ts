import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const awardsTable = pgTable("awards", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  awardedAt: text("awarded_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAwardSchema = createInsertSchema(awardsTable).omit({ id: true, createdAt: true });
export type InsertAward = z.infer<typeof insertAwardSchema>;
export type Award = typeof awardsTable.$inferSelect;
