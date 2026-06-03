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

export type CmsSetting = typeof cmsSettingsTable.$inferSelect;
export type CmsPost = typeof cmsPostsTable.$inferSelect;
export type CmsEvent = typeof cmsEventsTable.$inferSelect;
export type CmsPartner = typeof cmsPartnersTable.$inferSelect;
export type CmsAdminTeamMember = typeof cmsAdminTeamTable.$inferSelect;
export type AiSportsDesk = typeof aiSportsDeskTable.$inferSelect;
