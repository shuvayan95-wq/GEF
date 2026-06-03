import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const efootballCardsTable = pgTable("efootball_cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  position: text("position"),
  nationality: text("nationality"),
  clubName: text("club_name"),
  cardOvr: integer("card_ovr"),
  cardType: text("card_type"),
  playingStyle: text("playing_style"),
  cardPace: integer("card_pace"),
  cardShooting: integer("card_shooting"),
  cardPassing: integer("card_passing"),
  cardDribbling: integer("card_dribbling"),
  cardDefending: integer("card_defending"),
  cardPhysical: integer("card_physical"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEfootballCardSchema = createInsertSchema(efootballCardsTable).omit({ id: true, createdAt: true });
export type InsertEfootballCard = z.infer<typeof insertEfootballCardSchema>;
export type EfootballCard = typeof efootballCardsTable.$inferSelect;
