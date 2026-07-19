import { pgTable, serial, integer, text, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Captain Users ────────────────────────────────────────────────────────────
// One captain per club. Admin assigns the club after registration.
export const captainUsersTable = pgTable("captain_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  // status: pending → active | rejected | suspended | deactivated
  status: text("status").notNull().default("pending"),
  // Set by admin on approval
  teamId: integer("team_id"),
  approvedAt: timestamp("approved_at"),
  approvedBy: text("approved_by"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  suspendedAt: timestamp("suspended_at"),
  suspendReason: text("suspend_reason"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCaptainUserSchema = createInsertSchema(captainUsersTable).omit({
  id: true, createdAt: true, updatedAt: true,
  approvedAt: true, approvedBy: true, rejectedAt: true, rejectionReason: true,
  suspendedAt: true, suspendReason: true, lastLoginAt: true,
});
export type CaptainUser = typeof captainUsersTable.$inferSelect;
export type InsertCaptainUser = z.infer<typeof insertCaptainUserSchema>;

// ─── Captain Login History ────────────────────────────────────────────────────
export const captainLoginHistoryTable = pgTable("captain_login_history", {
  id: serial("id").primaryKey(),
  captainId: integer("captain_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Captain Notifications ────────────────────────────────────────────────────
// Notifications sent to a specific captain (or all captains via captainId=null)
export const captainNotificationsTable = pgTable("captain_notifications", {
  id: serial("id").primaryKey(),
  captainId: integer("captain_id"), // null = broadcast to all active captains
  teamId: integer("team_id"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  // type: budget_change | player_update | violation | announcement | transfer | contract | reward | penalty | custom
  type: text("type").notNull().default("announcement"),
  isRead: boolean("is_read").notNull().default(false),
  isImportant: boolean("is_important").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  sentByAdmin: boolean("sent_by_admin").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CaptainNotification = typeof captainNotificationsTable.$inferSelect;

// ─── Captain Audit Log ────────────────────────────────────────────────────────
export const captainAuditLogTable = pgTable("captain_audit_log", {
  id: serial("id").primaryKey(),
  captainId: integer("captain_id").notNull(),
  teamId: integer("team_id"),
  action: text("action").notNull(), // e.g. LOGIN, LOGOUT, VIEW_TRANSACTIONS, BUDGET_ALLOCATION_CHANGED
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CaptainAuditLog = typeof captainAuditLogTable.$inferSelect;

// ─── Club Violations ──────────────────────────────────────────────────────────
export const clubViolationsTable = pgTable("club_violations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  reason: text("reason").notNull(),
  // type: late_submission | rule_violation | walkover | financial_penalty | disciplinary
  type: text("type").notNull().default("rule_violation"),
  penaltyAmount: numeric("penalty_amount", { precision: 15, scale: 2 }),
  penaltyDescription: text("penalty_description"),
  adminNote: text("admin_note"),
  issuedDate: text("issued_date").notNull(),
  status: text("status").notNull().default("active"), // active | resolved | appealing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClubViolationSchema = createInsertSchema(clubViolationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type ClubViolation = typeof clubViolationsTable.$inferSelect;
export type InsertClubViolation = z.infer<typeof insertClubViolationSchema>;
