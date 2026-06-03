import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  position: text("position"),
  teamId: integer("team_id"),
  nationality: text("nationality"),
  efootballId: text("efootball_id"),
  rank: text("rank"),
  crewName: text("crew_name"),
  cardOvr: integer("card_ovr"),
  cardPace: integer("card_pace"),
  cardShooting: integer("card_shooting"),
  cardPassing: integer("card_passing"),
  cardDribbling: integer("card_dribbling"),
  cardDefending: integer("card_defending"),
  cardPhysical: integer("card_physical"),
  cardPlayingStyle: text("card_playing_style"),
  cardType: text("card_type"),
  marketValue: numeric("market_value", { precision: 15, scale: 2 }),
  salary: numeric("salary", { precision: 15, scale: 2 }),
  whatsappNumber: text("whatsapp_number"),
  status: text("status").default("active").notNull(),
  teamRole: text("team_role"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
