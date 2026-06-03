import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const efwFormationsTable = pgTable("efw_formations", {
  id: serial("id").primaryKey(),
  formationCode: text("formation_code").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  pros: text("pros"),
  cons: text("cons"),
  bestFor: text("best_for"),
  style: text("style"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const efwTipsTable = pgTable("efw_tips", {
  id: serial("id").primaryKey(),
  category: text("category"),
  title: text("title").notNull(),
  content: text("content"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const efwQnaTable = pgTable("efw_qna", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer"),
  category: text("category"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const efwPostsTable = pgTable("efw_posts", {
  id: serial("id").primaryKey(),
  authorName: text("author_name").notNull(),
  postType: text("post_type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  formationCode: text("formation_code"),
  formationPlayers: text("formation_players"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EfwFormation = typeof efwFormationsTable.$inferSelect;
export type EfwTip = typeof efwTipsTable.$inferSelect;
export type EfwQna = typeof efwQnaTable.$inferSelect;
export type EfwPost = typeof efwPostsTable.$inferSelect;
