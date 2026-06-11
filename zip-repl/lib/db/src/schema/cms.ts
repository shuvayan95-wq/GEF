import { pgTable, serial, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const cmsSettingsTable = pgTable("cms_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cmsPostsTable = pgTable("cms_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull().default(""),
  category: text("category").notNull().default("news"),
  author: text("author").notNull().default("GEF Admin"),
  imageUrl: text("image_url"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cmsEventsTable = pgTable("cms_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time"),
  location: text("location"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cmsPartnersTable = pgTable("cms_partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().default(""),
  description: text("description").notNull().default(""),
  aboutLong: text("about_long").notNull().default(""),
  imageUrl: text("image_url"),
  bannerImageUrl: text("banner_image_url"),
  type: text("type").notNull().default("partner"),
  website: text("website"),
  ownerName: text("owner_name"),
  ownerRole: text("owner_role"),
  ownerBio: text("owner_bio"),
  ownerImageUrl: text("owner_image_url"),
  coOwnerName: text("co_owner_name"),
  coOwnerRole: text("co_owner_role"),
  coOwnerBio: text("co_owner_bio"),
  coOwnerImageUrl: text("co_owner_image_url"),
  eventsJson: text("events_json").notNull().default("[]"),
  staffJson: text("staff_json").notNull().default("[]"),
  socialLinks: text("social_links").notNull().default("{}"),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cmsAdminTeamTable = pgTable("cms_admin_team", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  imageUrl: text("image_url"),
  bio: text("bio").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiSportsDeskTable = pgTable("ai_sports_desk", {
  id: serial("id").primaryKey(),
  articles: jsonb("articles").notNull().default("[]"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  notes: text("notes"),
});

export const aiPredictionsTable = pgTable("ai_predictions", {
  id: serial("id").primaryKey(),
  predictions: jsonb("predictions").notNull().default("[]"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  isPublished: boolean("is_published").notNull().default(false),
});

export type AiPrediction = typeof aiPredictionsTable.$inferSelect;

// ─── Player of the Week ───────────────────────────────────────────────────────
export const potwRoundsTable = pgTable("potw_rounds", {
  id: serial("id").primaryKey(),
  weekLabel: text("week_label").notNull(), // e.g. "Week 12 · Season 3"
  nomineeIds: jsonb("nominee_ids").notNull().default("[]"), // int[]
  isActive: boolean("is_active").notNull().default(true),
  winnerId: integer("winner_id"), // player id, set when closed
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const potwVotesTable = pgTable("potw_votes", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull(),
  playerId: integer("player_id").notNull(),
  voterIp: text("voter_ip").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PotwRound = typeof potwRoundsTable.$inferSelect;
export type PotwVote = typeof potwVotesTable.$inferSelect;

// ─── Power Rankings ───────────────────────────────────────────────────────────
export const powerRankingsTable = pgTable("power_rankings", {
  id: serial("id").primaryKey(),
  weekLabel: text("week_label").notNull(),
  rankings: jsonb("rankings").notNull().default("[]"),
  previousRankings: jsonb("previous_rankings").notNull().default("[]"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  isPublished: boolean("is_published").notNull().default(false),
});

export type PowerRanking = typeof powerRankingsTable.$inferSelect;

// ─── Match Analysis ───────────────────────────────────────────────────────────
export const matchAnalysisTable = pgTable("match_analysis", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().unique(),
  contextNotes: text("context_notes"),
  matchupNotes: jsonb("matchup_notes").notNull().default("[]"),
  report: jsonb("report"),
  isPublished: boolean("is_published").notNull().default(true),
  generatedAt: timestamp("generated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MatchAnalysis = typeof matchAnalysisTable.$inferSelect;

export type CmsSetting = typeof cmsSettingsTable.$inferSelect;
export type CmsPost = typeof cmsPostsTable.$inferSelect;
export type CmsEvent = typeof cmsEventsTable.$inferSelect;
export type CmsPartner = typeof cmsPartnersTable.$inferSelect;
export type CmsAdminTeamMember = typeof cmsAdminTeamTable.$inferSelect;
export type AiSportsDesk = typeof aiSportsDeskTable.$inferSelect;
