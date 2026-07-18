import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const fanReactionsTable = pgTable("fan_reactions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id"),
  teamId: integer("team_id").notNull(),
  eventType: text("event_type").notNull(), // match_win, match_loss, match_draw, gcc_win, gcc_loss, gcc_draw
  fanPersonality: text("fan_personality").notNull(), // optimistic, angry, sarcastic, tactical, etc
  comment: text("comment").notNull(),
  isRival: boolean("is_rival").notNull().default(false),
  rivalTeamId: integer("rival_team_id"),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FanReaction = typeof fanReactionsTable.$inferSelect;

export const fanArticlesTable = pgTable("fan_articles", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id"),
  homeTeamId: integer("home_team_id").notNull(),
  awayTeamId: integer("away_team_id").notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  starPlayer: text("star_player"),
  talkingPoint: text("talking_point"),
  mediaRating: integer("media_rating"),
  winnerMood: text("winner_mood"),
  loserMood: text("loser_mood"),
  momentumChange: text("momentum_change"),
  matchType: text("match_type").notNull().default("league"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FanArticle = typeof fanArticlesTable.$inferSelect;
