import { pgTable, serial, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const ceremonyStateTable = pgTable("ceremony_state", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("waiting"),
  phase: text("phase").notNull().default("intro"),
  currentStep: text("current_step").notNull().default("0"),
  revealIndex: text("reveal_index").notNull().default("0"),
  isPaused: boolean("is_paused").notNull().default(false),
  animationSpeed: text("animation_speed").notNull().default("normal"),
  data: jsonb("data").notNull().default("{}"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ceremonyMessagesTable = pgTable("ceremony_messages", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ceremonyAttendeesTable = pgTable("ceremony_attendees", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});
