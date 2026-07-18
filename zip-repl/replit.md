# GEF Player Statistics Platform

## Overview

Full-stack eFootball 5v5 player statistics platform built as a pnpm workspace monorepo. Tracks players, teams, matches, leagues, and trophies for the Global eFootball Federation.

## Admin Credentials
- Set via environment variables `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- Default fallback: `Shuvayan95@gmail.com` / `Shuvayan@11` (set env vars to override)

## Features

### Ceremony System
- **Live Ceremony** (`/ceremony/live`) — real-time broadcast screen with websockets, golden sweeps, confetti, animated reveals
- **5 Special Awards** auto-seeded on ceremony start:
  - ⚡ Phenomenal Finisher — top 3 scorers (auto-calculated, finalist reveal 3rd→2nd→winner)
  - 🦁 Best Captain — admin picks 3 finalists from player list + controls reveal
  - 🏟️ Best Team — auto-calculated by trophies/win-rate/goal-diff, big winner card
  - 🧤 GK Directing Defense — top 3 least conceded per match (auto-calculated)
  - 🎩 Best Admin — manually entered name + photo upload, finalist reveal
- **Admin Control Panel** (`/admin/ceremony`) — tabs: Control / 🏅 Awards / Edit Data / Chat
  - "Awards" tab: auto-calculate button, captain player-picker, best admin upload, per-award finalist reveal (3rd/2nd/winner)
  - "Control" tab: fixed "Start Top 10 Reveal" button (now correctly switches to rankings phase)
- **Finalist Reveal System**: each award stores `finalists[]` + `finalistRevealIndex` (-1=hidden, 0=3rd, 1=2nd, 2=winner)
- **New backend routes**: `GET /ceremony/calculate-special-awards?season=`, `POST /ceremony/import-special-awards`, `POST /ceremony/award-finalist-reveal`

### Public
- **Global Leaderboard** — OVR-ranked player cards with W/D/L, goals, MVPs
- **Player Roster** — searchable player grid with OVR, team, stats
- **Player Profile** — per-player dossier: photo, team, position, metrics, recent form, awards
- **Teams** — team pages with roster and match records
- **Match Results** — expandable scorecards with team logos, league badge, player avatars in 1v1 matchups
- **Leagues** — standings table + per-player stats per league/division
- **Trophy Cabinet** — visual cabinet grouped by season, categorized by award type
- **H2H Rivalries** — searchable head-to-head records with rivalry scores
- **Player Compare** — side-by-side radar charts and stat comparison

### Admin Dashboard (`/admin`)
- Manage Players (CRUD + image upload)
- Manage Teams (CRUD + image upload + league assignment)
- Manage Matches (5-player matchup scorecards, MVP selection, league tagging)
- Manage Leagues (CRUD)
- Trophy Cabinet Management (award trophies with league/player/team links)
- Manage Awards (individual player awards)

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Express 5 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM (Replit built-in, `DATABASE_URL`; switch to Supabase by setting `SUPABASE_DATABASE_URL`)
- **Storage**: Supabase Storage (`player-images` bucket, public) — images uploaded via `/api/upload/image` are stored here. Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **API**: OpenAPI spec → Orval codegen → React Query hooks
- **Auth**: Session-based (express-session, admin creds from env vars ADMIN_EMAIL/ADMIN_PASSWORD)

## Structure

```
artifacts/
  api-server/       Express API — routes in src/routes/
  gef-stats/        React frontend — pages in src/pages/{public,admin}/
lib/
  db/               Drizzle schema + DB connection
  api-spec/         OpenAPI spec + Orval codegen config
  api-client-react/ Generated React Query hooks
  api-zod/          Generated Zod schemas
scripts/            Utility scripts
```

## DB Schema

Tables: `players`, `teams`, `matches`, `player_matchups`, `awards`, `leagues`, `trophies`

- `leagues` — id, name, season, description, logoUrl
- `teams.leagueId` — FK to leagues (nullable)
- `matches.leagueId` — FK to leagues (nullable)
- `trophies` — id, name, season, type, leagueId, winnerTeamId, winnerPlayerId, description

## OVR Formula

`matchWeight = min(matches/10, 1)` — blends raw performance toward a 60 baseline for new players with few games.

## Development

- Push DB migrations: `pnpm --filter @workspace/db run push`
- API Server: `pnpm --filter @workspace/api-server run dev`
- Frontend: `pnpm --filter @workspace/gef-stats run dev`
- Codegen: `pnpm --filter @workspace/api-spec run codegen`

## Running on Replit

Two workflows are configured:
- **Backend API** — runs Express on port 3000 (`pnpm --filter @workspace/api-server run dev`). On startup it pushes the Drizzle schema to Supabase then starts the server.
- **Start application** — runs Vite frontend on port 5000 (`pnpm --filter @workspace/gef-stats run dev`).

### Required Secrets (Replit Secrets)
| Key | Purpose |
|-----|---------|
| `SUPABASE_DATABASE_URL` | PostgreSQL connection string (uses SSL) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role JWT for file uploads |
| `SESSION_SECRET` | Express session signing secret |

### Optional Secrets
| Key | Purpose |
|-----|---------|
| `OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_API_KEY` | AI-powered features |
| `GROQ_API_KEY` | Groq AI features |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Override default admin credentials |

### Non-Secret Env Vars
| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://vnidzmtmjyoncpvecact.supabase.co` |

Note: `DATABASE_URL` is runtime-managed by Replit and is NOT used; `SUPABASE_DATABASE_URL` takes priority in the DB connection.
