---
name: Captain Portal Architecture
description: Full captain portal system — DB tables, backend routes, frontend pages, admin management
---

## Summary
A complete Club Management Portal separate from the admin panel. Captains register → pending → admin approves + assigns club → captain can log in.

## DB Tables (created via raw SQL, also in `lib/db/src/schema/captainPortal.ts`)
- `captain_users` — email/password (bcrypt), status (pending/active/rejected/suspended/deactivated), teamId set on approval
- `captain_login_history` — IP + userAgent per login
- `captain_notifications` — per-captain or broadcast (captainId=null) notifications with isRead/isImportant/isPinned
- `captain_audit_log` — every portal action logged with IP
- `club_violations` — violations per team, visible to their captain

**Why raw SQL for creation:** drizzle-kit push prompts interactively when it sees new tables that might be renames of existing ones (e.g. `captain_audit_log` vs `session`). Fixed the push-force script with `yes '' | drizzle-kit push --force ... || true` and pre-created tables with raw SQL so the prompt doesn't appear on restart.

## Backend Routes
- `captainAuth.ts` — `/captain/register`, `/captain/login`, `/captain/logout`, `/captain/me`
- `captainPortal.ts` — all captain-protected endpoints (uses `req.session.captainId`)
- `captainAdmin.ts` — admin CRUD for captains + violations management

## Session Security
Captain sessions use `req.session.captainId` + `req.session.captainTeamId`. The `captainTeamId` is NEVER used for data queries — every protected route re-fetches teamId from DB using captainId to prevent session tampering. All DB queries filter by teamId derived from the captain's DB record, not from any URL parameter.

## Frontend Routes
All under `/captain/*` in App.tsx. Layout: `CaptainLayout.tsx`. Auth hook: `use-captain-auth.ts`.

## Admin Page
`/admin/captains` → `ManageCaptains.tsx` — approve (with club assignment), reject, suspend, reactivate, notify, reset password, login history, audit log.
Admin sidebar link added to `AdminLayout.tsx`.

## wouter Link pattern
In wouter, `<Link>` renders its own `<a>` — never nest `<a>` inside `<Link>`. Use `<Link href="..." className="...">text</Link>` directly.
