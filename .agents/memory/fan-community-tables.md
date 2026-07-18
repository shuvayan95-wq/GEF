---
name: Fan Community Tables
description: Schema, generation logic, and integration points for the AI fan reactions/articles system
---

## Tables
- `fan_reactions` — AI fan comments per match, with personality, team, isRival flag
- `fan_articles` — AI match report per match (headline, summary, mood, talking point)

## Generation
- `fanCommunityUtils.ts` generates both in parallel using the same `getOpenAI()` pattern as `ai.ts`
- Checks for existing reactions before generating (skips if match already has reactions)
- Falls back to template-based reactions/articles if no AI available
- Called async (`.catch(console.error)`) — never blocks the API response

## Integration Points
- `leagues.ts` `PATCH /fixture-schedule/:id/result` — calls `processMatchFans` + `generateMatchReactions` only on FIRST result entry (checks `!fixture.matchId`)
- `gcc.ts` `PUT /gcc/tournaments/:id/fixtures/:fid` — calls on every score update (no dedup guard for GCC)
- `gcc.ts` `POST /gcc/tournaments/:id/fixtures/add` — same, for directly-added fixtures

## Fan Growth: GCC vs League
- `processMatchFans` accepts `matchType: "league" | "gcc"` (default: "league")
- GCC uses `cup_win_min/max` settings; league uses `match_win_min/max`
- Both use the same `match_loss_min/max` for losses

**Why:** GCC is a cup competition so wins should generate more fan growth than regular league matches.
**How to apply:** Pass `"gcc"` as matchType whenever triggering from GCC routes.
