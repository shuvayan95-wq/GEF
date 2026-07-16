import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const captainAccountsTable = pgTable("captain_accounts", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  name: text("name").notNull(),
  whatsappNumber: text("whatsapp_number").notNull().unique(),
  pin: text("pin").notNull(),
  role: text("role").notNull().default("captain"),
  status: text("status").notNull().default("pending"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CaptainAccount = typeof captainAccountsTable.$inferSelect;

export const notificationsLogTable = pgTable("notifications_log", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  teamIds: text("team_ids"),
  whatsappStatus: text("whatsapp_status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NotificationLog = typeof notificationsLogTable.$inferSelect;
