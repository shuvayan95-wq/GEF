CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"position" text,
	"team_id" integer,
	"nationality" text,
	"efootball_id" text,
	"rank" text,
	"crew_name" text,
	"card_ovr" integer,
	"card_pace" integer,
	"card_shooting" integer,
	"card_passing" integer,
	"card_dribbling" integer,
	"card_defending" integer,
	"card_physical" integer,
	"card_playing_style" text,
	"card_type" text,
	"market_value" numeric(15, 2),
	"salary" numeric(15, 2),
	"whatsapp_number" text,
	"status" text DEFAULT 'active' NOT NULL,
	"team_role" text,
	"lineup_role" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"league_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"team1_id" integer NOT NULL,
	"team2_id" integer NOT NULL,
	"team1_score" integer DEFAULT 0 NOT NULL,
	"team2_score" integer DEFAULT 0 NOT NULL,
	"league_id" integer,
	"gcc_tournament_id" integer,
	"gcc_fixture_id" integer,
	"season" text,
	"notes" text,
	"match_type" text DEFAULT 'league' NOT NULL,
	"super_cup_leg" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_matchups" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"player1_id" integer NOT NULL,
	"player2_id" integer NOT NULL,
	"player1_goals" integer DEFAULT 0 NOT NULL,
	"player2_goals" integer DEFAULT 0 NOT NULL,
	"mvp_player_id" integer
);
--> statement-breakpoint
CREATE TABLE "awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"awarded_at" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "league_participants_league_id_team_id_unique" UNIQUE("league_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"season" text,
	"logo_url" text,
	"league_type" text DEFAULT 'league' NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"fixture_rounds" integer DEFAULT 1 NOT NULL,
	"league_rules" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trophies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"season" text NOT NULL,
	"league_id" integer,
	"winner_team_id" integer,
	"winner_player_id" integer,
	"description" text,
	"type" text DEFAULT 'league_champion' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_market_value_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"value" numeric(15, 2) NOT NULL,
	"reason" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ffp_income_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"match_id" integer,
	"source" text NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ffp_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_label" text DEFAULT '2025-26' NOT NULL,
	"max_loss_amount" numeric(15, 2) DEFAULT '5000000' NOT NULL,
	"max_expense_ratio" numeric(5, 2) DEFAULT '1.70' NOT NULL,
	"wage_cap_percent" numeric(5, 2) DEFAULT '70.00' NOT NULL,
	"at_risk_threshold" numeric(5, 2) DEFAULT '0.70' NOT NULL,
	"high_risk_threshold" numeric(5, 2) DEFAULT '0.85' NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_financials" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"season" text DEFAULT '2025-26' NOT NULL,
	"income" numeric(15, 2) DEFAULT '0' NOT NULL,
	"expenses" numeric(15, 2) DEFAULT '0' NOT NULL,
	"budget" numeric(15, 2) DEFAULT '0' NOT NULL,
	"wages_expense" numeric(15, 2) DEFAULT '0' NOT NULL,
	"transfer_expense" numeric(15, 2) DEFAULT '0' NOT NULL,
	"operational_expense" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ballon_dor_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"season" text NOT NULL,
	"winner" jsonb,
	"top50" jsonb DEFAULT '[]' NOT NULL,
	"total_candidates" text DEFAULT '0' NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"revealed" boolean DEFAULT false NOT NULL,
	"hof_awards" jsonb DEFAULT '[]',
	CONSTRAINT "ballon_dor_results_season_unique" UNIQUE("season")
);
--> statement-breakpoint
CREATE TABLE "ceremony_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_name" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ceremony_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ceremony_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"phase" text DEFAULT 'intro' NOT NULL,
	"current_step" text DEFAULT '0' NOT NULL,
	"reveal_index" text DEFAULT '0' NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"animation_speed" text DEFAULT 'normal' NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"from_team_id" integer,
	"to_team_id" integer NOT NULL,
	"transfer_date" text NOT NULL,
	"season" text,
	"fee" numeric(15, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"predictions" jsonb DEFAULT '[]' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_sports_desk" (
	"id" serial PRIMARY KEY NOT NULL,
	"articles" jsonb DEFAULT '[]' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "cms_admin_team" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"image_url" text,
	"bio" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"event_date" text NOT NULL,
	"event_time" text,
	"location" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"about_long" text DEFAULT '' NOT NULL,
	"image_url" text,
	"banner_image_url" text,
	"type" text DEFAULT 'partner' NOT NULL,
	"website" text,
	"owner_name" text,
	"owner_role" text,
	"owner_bio" text,
	"owner_image_url" text,
	"co_owner_name" text,
	"co_owner_role" text,
	"co_owner_bio" text,
	"co_owner_image_url" text,
	"events_json" text DEFAULT '[]' NOT NULL,
	"staff_json" text DEFAULT '[]' NOT NULL,
	"social_links" text DEFAULT '{}' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'news' NOT NULL,
	"author" text DEFAULT 'GEF Admin' NOT NULL,
	"image_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cms_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "lineup_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"in_player_id" integer,
	"in_player_name" text NOT NULL,
	"out_player_id" integer,
	"out_player_name" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"context_notes" text,
	"matchup_notes" jsonb DEFAULT '[]' NOT NULL,
	"report" jsonb,
	"is_published" boolean DEFAULT true NOT NULL,
	"generated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_analysis_match_id_unique" UNIQUE("match_id")
);
--> statement-breakpoint
CREATE TABLE "potw_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_label" text NOT NULL,
	"nominee_ids" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"winner_id" integer,
	"votes_revealed" boolean DEFAULT false NOT NULL,
	"season" text,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "potw_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"voter_ip" text NOT NULL,
	"voter_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "power_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_label" text NOT NULL,
	"rankings" jsonb DEFAULT '[]' NOT NULL,
	"previous_rankings" jsonb DEFAULT '[]' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer,
	"season" text NOT NULL,
	"type" text DEFAULT 'cup_knockout' NOT NULL,
	"competition" text,
	"stage" text,
	"description" text NOT NULL,
	"penalty_points" integer DEFAULT 0 NOT NULL,
	"ai_suggested" boolean DEFAULT false,
	"resolved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gcc_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"pot" integer DEFAULT 1 NOT NULL,
	"seed" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gcc_fixtures" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"stage" text DEFAULT 'league' NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"leg" integer DEFAULT 1 NOT NULL,
	"pair_key" text,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"played" boolean DEFAULT false NOT NULL,
	"notes" text,
	"scheduled_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gcc_tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"season" text NOT NULL,
	"logo_url" text,
	"status" text DEFAULT 'setup' NOT NULL,
	"num_pots" integer DEFAULT 4 NOT NULL,
	"match_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"direct_qualifiers" integer DEFAULT 8 NOT NULL,
	"playoff_spots" integer DEFAULT 8 NOT NULL,
	"draw_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"finalized_results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"season" text DEFAULT '2025-26' NOT NULL,
	"reference_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "efootball_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"position" text,
	"nationality" text,
	"club_name" text,
	"card_ovr" integer,
	"card_type" text,
	"playing_style" text,
	"card_pace" integer,
	"card_shooting" integer,
	"card_passing" integer,
	"card_dribbling" integer,
	"card_defending" integer,
	"card_physical" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "efw_formations" (
	"id" serial PRIMARY KEY NOT NULL,
	"formation_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"pros" text,
	"cons" text,
	"best_for" text,
	"style" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "efw_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_name" text NOT NULL,
	"post_type" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"image_url" text,
	"formation_code" text,
	"formation_players" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "efw_qna" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"category" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "efw_tips" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text,
	"title" text NOT NULL,
	"content" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"salary_amount" numeric(15, 2),
	"bonus_amount" numeric(15, 2),
	"clauses" text,
	"promised_matches" integer,
	"penalty_amount" numeric(15, 2),
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knockout_cups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"season" text,
	"logo_url" text,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"rounds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knockout_fixtures" (
	"id" serial PRIMARY KEY NOT NULL,
	"cup_id" integer NOT NULL,
	"round_key" text NOT NULL,
	"leg" integer DEFAULT 1 NOT NULL,
	"team1_id" integer,
	"team2_id" integer,
	"player1_id" integer,
	"player2_id" integer,
	"team1_score" integer,
	"team2_score" integer,
	"player1_goals" integer,
	"player2_goals" integer,
	"matchups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"match_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_fixtures" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"matchday" integer NOT NULL,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"scheduled_date" text,
	"match_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captain_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" text NOT NULL,
	"whatsapp_number" text NOT NULL,
	"pin" text NOT NULL,
	"role" text DEFAULT 'captain' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "captain_accounts_whatsapp_number_unique" UNIQUE("whatsapp_number")
);
--> statement-breakpoint
CREATE TABLE "notifications_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"team_ids" text,
	"whatsapp_status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_fanbase" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"current_fans" integer DEFAULT 0 NOT NULL,
	"starting_fans" integer DEFAULT 0 NOT NULL,
	"season_start_fans" integer DEFAULT 0 NOT NULL,
	"highest_ever" integer DEFAULT 0 NOT NULL,
	"lowest_ever" integer DEFAULT 0 NOT NULL,
	"largest_gain" integer DEFAULT 0 NOT NULL,
	"largest_loss" integer DEFAULT 0 NOT NULL,
	"season" text DEFAULT '2025-26' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "club_fanbase_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "fan_division_thresholds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"min_fans" integer NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fan_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"change_amount" integer NOT NULL,
	"new_total" integer NOT NULL,
	"reason" text NOT NULL,
	"event_type" text NOT NULL,
	"reference_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fan_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	CONSTRAINT "fan_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_participants" ADD CONSTRAINT "league_participants_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineup_changes" ADD CONSTRAINT "lineup_changes_in_player_id_players_id_fk" FOREIGN KEY ("in_player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineup_changes" ADD CONSTRAINT "lineup_changes_out_player_id_players_id_fk" FOREIGN KEY ("out_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_fixtures" ADD CONSTRAINT "knockout_fixtures_cup_id_knockout_cups_id_fk" FOREIGN KEY ("cup_id") REFERENCES "public"."knockout_cups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_fixtures" ADD CONSTRAINT "knockout_fixtures_team1_id_teams_id_fk" FOREIGN KEY ("team1_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_fixtures" ADD CONSTRAINT "knockout_fixtures_team2_id_teams_id_fk" FOREIGN KEY ("team2_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_fixtures" ADD CONSTRAINT "knockout_fixtures_player1_id_players_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_fixtures" ADD CONSTRAINT "knockout_fixtures_player2_id_players_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_fixtures" ADD CONSTRAINT "league_fixtures_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_fixtures" ADD CONSTRAINT "league_fixtures_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;