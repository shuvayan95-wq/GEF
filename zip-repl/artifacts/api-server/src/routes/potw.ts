import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  playersTable, teamsTable,
  potwRoundsTable, potwVotesTable,
  matchesTable, playerMatchupsTable,
  leaguesTable,
  gccTournamentsTable,
} from "@workspace/db";
import { desc, eq, and, inArray, or, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function getIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// ─── Shared helper: compute last-3-matchday stats per player ──────────────────
//
// Strategy (player-centric — avoids missing matches due to broken season chains):
//  1. Fetch all matchups that involve the target players.
//  2. Load those matches (ordered newest-first).
//  3. If a season is specified, try to narrow to matches that belong to that
//     season (via direct season field, leagueId, or gccTournamentId lookup).
//     If the season filter would wipe everything (e.g. matches stored without
//     season/leagueId/gccTournamentId), we fall back gracefully to all matches.
//  4. Keep only the 3 most-recent distinct match dates.
//  5. Aggregate goals / wins / MVPs per match (a player can appear in multiple
//     matchup rows of the same fixture).
//
async function computePlayerStats(playerIds?: number[], matchLimit = 30, season?: string) {
  // ── 1. Matchups for the target players ────────────────────────────────────
  let rawMatchups: (typeof playerMatchupsTable.$inferSelect)[];

  if (playerIds && playerIds.length > 0) {
    rawMatchups = await db.select().from(playerMatchupsTable).where(
      or(
        inArray(playerMatchupsTable.player1Id, playerIds),
        inArray(playerMatchupsTable.player2Id, playerIds),
      )
    );
  } else {
    // No specific players — load all matchups (used when building full standings)
    rawMatchups = await db.select().from(playerMatchupsTable);
  }

  if (!rawMatchups.length) return {};

  // ── 2. Fetch the matches those matchups belong to ─────────────────────────
  const allMatchupMatchIds = [...new Set(rawMatchups.map(m => m.matchId))];
  let candidates = await db
    .select()
    .from(matchesTable)
    .where(inArray(matchesTable.id, allMatchupMatchIds))
    .orderBy(desc(matchesTable.date));

  if (!candidates.length) return {};

  // ── 3. Season filter — strict, normalized ─────────────────────────────────
  //   Normalise "SEASON 2025/26" → "2025/26" so GCC tournaments stored with
  //   the "SEASON " prefix still match POTW rounds that omit it (and vice-versa).
  if (season) {
    const norm = (s: string) => s.replace(/^season\s*/i, "").trim().toLowerCase();
    const normSeason = norm(season);

    // Load ALL leagues & GCC tournaments, filter by normalised season in JS
    // so that prefix/case differences don't cause an empty result set.
    const [allLeagues, allGcc] = await Promise.all([
      db.select({ id: leaguesTable.id, season: leaguesTable.season }).from(leaguesTable),
      db.select({ id: gccTournamentsTable.id, season: gccTournamentsTable.season }).from(gccTournamentsTable),
    ]);

    const leagueIdSet = new Set(
      allLeagues.filter(l => l.season && norm(l.season) === normSeason).map(l => l.id)
    );
    const gccIdSet = new Set(
      allGcc.filter(g => g.season && norm(g.season) === normSeason).map(g => g.id)
    );

    // Strict filter — no fallback. Old-season matches must not bleed through.
    candidates = candidates.filter(m => {
      const mSeason = m.season ? norm(m.season) : "";
      return (
        mSeason === normSeason ||
        (m.leagueId        != null && leagueIdSet.has(m.leagueId)) ||
        (m.gccTournamentId != null && gccIdSet.has(m.gccTournamentId))
      );
    });
  } else if (!playerIds) {
    // Global fallback without season: cap at matchLimit most-recent matches
    candidates = candidates.slice(0, matchLimit);
  }

  // ── 4. Build a lookup: matchId → match record (from season-filtered candidates)
  const candidateMatchMap = new Map(candidates.map(m => [m.id, m]));

  // ── 5. Per-player aggregation with individual last-3-matchday windows ─────
  //   Each player gets their OWN 3 most-recent distinct dates — this means
  //   a league-only player (e.g. Sieon) never gets their dates crowded out by
  //   more-recent GCC dates from other nominees.
  const result: Record<number, { goals: number; mvps: number; wins: number; matches: number }> = {};
  const ids = playerIds ?? [...new Set([...rawMatchups.flatMap(mu => [mu.player1Id, mu.player2Id])])];

  for (const pid of ids) {
    // All matchups for this player that belong to a season-candidate match
    const pMatchups = rawMatchups.filter(mu =>
      (mu.player1Id === pid || mu.player2Id === pid) &&
      candidateMatchMap.has(mu.matchId)
    );

    if (!pMatchups.length) {
      result[pid] = { goals: 0, mvps: 0, wins: 0, matches: 0 };
      continue;
    }

    // Collect per-match aggregates (goals sum, mvp, win) for this player
    type MatchAgg = { matchDate: string; goals: number; isMvp: boolean; wonAny: boolean };
    const byMatch = new Map<number, MatchAgg>();

    for (const mu of pMatchups) {
      const match = candidateMatchMap.get(mu.matchId)!;
      if (!byMatch.has(mu.matchId)) {
        byMatch.set(mu.matchId, { matchDate: match.date, goals: 0, isMvp: false, wonAny: false });
      }
      const agg = byMatch.get(mu.matchId)!;
      const isP1 = mu.player1Id === pid;
      agg.goals  += isP1 ? mu.player1Goals : mu.player2Goals;
      agg.isMvp   = agg.isMvp || mu.mvpPlayerId === pid;
      agg.wonAny  = agg.wonAny || (isP1 ? mu.player1Goals > mu.player2Goals : mu.player2Goals > mu.player1Goals);
    }

    // Sort by date desc, then matchId desc (insertion order) — take last 3 matches.
    // We intentionally do NOT collapse by calendar date because admins often enter
    // multiple matchdays' results on the same day, which would wrongly merge them.
    const matchEntries = [...byMatch.entries()]
      .sort(([idA, a], [idB, b]) => {
        const cmp = b.matchDate.localeCompare(a.matchDate);
        return cmp !== 0 ? cmp : idB - idA;
      })
      .slice(0, 3)
      .map(([, agg]) => agg);

    result[pid] = {
      goals:   matchEntries.reduce((s, m) => s + m.goals, 0),
      mvps:    matchEntries.filter(m => m.isMvp).length,
      wins:    matchEntries.filter(m => m.wonAny).length,
      matches: matchEntries.length,
    };
  }
  return result;
}

// ─── GET /api/potw — current active round with vote counts + nominee stats ────
router.get("/potw", async (req, res) => {
  try {
    const voterToken = req.query.token as string | undefined;

    const [activeRounds, allPlayers] = await Promise.all([
      db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, true)).orderBy(desc(potwRoundsTable.createdAt)).limit(1),
      db.select().from(playersTable),
    ]);

    const round = activeRounds[0] ?? null;

    if (!round) {
      const [lastClosed] = await db
        .select()
        .from(potwRoundsTable)
        .where(eq(potwRoundsTable.isActive, false))
        .orderBy(desc(potwRoundsTable.createdAt))
        .limit(1);

      if (!lastClosed) return res.json({ round: null, nominees: [], voteCounts: {}, hasVoted: false, myVote: null, totalVotes: 0, nomineeStats: {} });

      const nomineeIds = (lastClosed.nomineeIds as number[]) ?? [];
      const nominees = allPlayers.filter((p) => nomineeIds.includes(p.id));
      const votes = await db.select().from(potwVotesTable).where(eq(potwVotesTable.roundId, lastClosed.id));
      const voteCounts: Record<number, number> = {};
      for (const v of votes) voteCounts[v.playerId] = (voteCounts[v.playerId] ?? 0) + 1;
      const nomineeStats = await computePlayerStats(nomineeIds, 30, lastClosed.season ?? undefined);
      return res.json({ round: lastClosed, nominees, voteCounts, hasVoted: true, myVote: lastClosed.winnerId ?? null, totalVotes: votes.length, nomineeStats });
    }

    const nomineeIds = (round.nomineeIds as number[]) ?? [];
    const nominees = allPlayers.filter((p) => nomineeIds.includes(p.id));

    const votes = await db.select().from(potwVotesTable).where(eq(potwVotesTable.roundId, round.id));
    const voteCounts: Record<number, number> = {};
    for (const v of votes) voteCounts[v.playerId] = (voteCounts[v.playerId] ?? 0) + 1;

    const ip = getIp(req);
    let hasVoted = votes.some((v) => v.voterIp === ip);
    let myVote = votes.find((v) => v.voterIp === ip)?.playerId ?? null;

    if (!hasVoted && voterToken) {
      const tokenVote = votes.find((v) => v.voterToken === voterToken);
      if (tokenVote) { hasVoted = true; myVote = tokenVote.playerId; }
    }

    const nomineeStats = await computePlayerStats(nomineeIds, 30, round.season ?? undefined);

    // Hide vote counts from public when round is active and votes not yet revealed
    const publicVoteCounts = round.isActive && !round.votesRevealed ? {} : voteCounts;

    res.json({ round, nominees, voteCounts: publicVoteCounts, hasVoted, myVote, totalVotes: votes.length, nomineeStats });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/potw/history ────────────────────────────────────────────────────
router.get("/potw/history", async (_req, res) => {
  try {
    const [past, allPlayers] = await Promise.all([
      db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, false)).orderBy(desc(potwRoundsTable.createdAt)).limit(50),
      db.select().from(playersTable),
    ]);
    const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

    // Build per-player win + nomination counts
    const winsMap = new Map<number, number>();
    const nomMap  = new Map<number, number>();
    for (const r of past) {
      const nomineeIds = (r.nomineeIds as number[]) ?? [];
      for (const nid of nomineeIds) nomMap.set(nid, (nomMap.get(nid) ?? 0) + 1);
      if (r.winnerId) winsMap.set(r.winnerId, (winsMap.get(r.winnerId) ?? 0) + 1);
    }

    const leaderboard = [...new Set([...winsMap.keys(), ...nomMap.keys()])]
      .map(pid => ({
        player: playerMap.get(pid) ?? null,
        wins: winsMap.get(pid) ?? 0,
        nominations: nomMap.get(pid) ?? 0,
      }))
      .filter(e => e.player)
      .sort((a, b) => b.wins - a.wins || b.nominations - a.nominations);

    const rounds = past.map((r) => ({
      ...r,
      winner: r.winnerId ? (playerMap.get(r.winnerId) ?? null) : null,
    }));

    res.json({ rounds, leaderboard });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/potw/player/:id — POTW record for a specific player ─────────────
router.get("/potw/player/:id", async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    if (!playerId) return res.status(400).json({ error: "invalid id" });

    const past = await db
      .select()
      .from(potwRoundsTable)
      .where(eq(potwRoundsTable.isActive, false))
      .orderBy(desc(potwRoundsTable.createdAt));

    const nominated = past.filter(r => ((r.nomineeIds as number[]) ?? []).includes(playerId));
    const wins = nominated.filter(r => r.winnerId === playerId);

    res.json({
      nominations: nominated.length,
      wins: wins.length,
      winRounds: wins.map(r => ({
        weekLabel: r.weekLabel,
        season: r.season,
        closedAt: r.closedAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── POST /api/potw/vote ─────────────────────────────────────────────────────
router.post("/potw/vote", async (req, res) => {
  try {
    const { playerId, voterToken } = req.body as { playerId: number; voterToken?: string };
    if (!playerId) return res.status(400).json({ error: "playerId required" });

    const active = await db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, true)).limit(1);
    if (!active.length) return res.status(400).json({ error: "No active voting round" });

    const round = active[0];
    const nomineeIds = (round.nomineeIds as number[]) ?? [];
    if (!nomineeIds.includes(playerId)) return res.status(400).json({ error: "Player not nominated" });

    const ip = getIp(req);
    const allVotes = await db.select().from(potwVotesTable).where(eq(potwVotesTable.roundId, round.id));

    if (allVotes.some((v) => v.voterIp === ip)) {
      return res.status(409).json({ error: "Already voted this round" });
    }

    if (voterToken && allVotes.some((v) => v.voterToken === voterToken)) {
      return res.status(409).json({ error: "Already voted this round" });
    }

    await db.insert(potwVotesTable).values({
      roundId: round.id,
      playerId,
      voterIp: ip,
      voterToken: voterToken ?? null,
    });

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/admin/potw/candidates — players ranked by last 3 match stats ───
router.get("/admin/potw/candidates", requireAdmin, async (req, res) => {
  try {
    const season = req.query.season as string | undefined;

    const allPlayers = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.status, "active"));

    const statsMap = await computePlayerStats(
      allPlayers.map((p) => p.id),
      40,
      season,
    );

    const candidates = allPlayers
      .map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        imageUrl: p.imageUrl,
        teamId: p.teamId,
        stats: statsMap[p.id] ?? { goals: 0, mvps: 0, wins: 0, matches: 0 },
      }))
      .filter((p) => p.stats.matches > 0)
      .sort((a, b) => {
        const scoreA = a.stats.goals * 3 + a.stats.mvps * 5 + a.stats.wins * 2;
        const scoreB = b.stats.goals * 3 + b.stats.mvps * 5 + b.stats.wins * 2;
        return scoreB - scoreA;
      });

    res.json({ players: candidates });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── POST /api/admin/potw/round ───────────────────────────────────────────────
router.post("/admin/potw/round", requireAdmin, async (req, res) => {
  try {
    const { weekLabel, nomineeIds, season } = req.body as { weekLabel: string; nomineeIds: number[]; season?: string };
    if (!weekLabel || !nomineeIds?.length) return res.status(400).json({ error: "weekLabel and nomineeIds required" });

    await db.update(potwRoundsTable).set({ isActive: false }).where(eq(potwRoundsTable.isActive, true));
    const [round] = await db.insert(potwRoundsTable).values({
      weekLabel,
      nomineeIds,
      isActive: true,
      season: season ?? null,
      votesRevealed: false,
    }).returning();
    res.json(round);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── POST /api/admin/potw/close ───────────────────────────────────────────────
router.post("/admin/potw/close", requireAdmin, async (req, res) => {
  try {
    const active = await db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, true)).limit(1);
    if (!active.length) return res.status(400).json({ error: "No active round" });

    const round = active[0];
    const votes = await db.select().from(potwVotesTable).where(eq(potwVotesTable.roundId, round.id));

    const counts: Record<number, number> = {};
    for (const v of votes) counts[v.playerId] = (counts[v.playerId] ?? 0) + 1;
    const winnerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

    await db.update(potwRoundsTable).set({
      isActive: false,
      votesRevealed: true,
      winnerId: winnerId ? parseInt(winnerId) : null,
      closedAt: new Date(),
    }).where(eq(potwRoundsTable.id, round.id));

    res.json({ ok: true, winnerId: winnerId ? parseInt(winnerId) : null });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── POST /api/admin/potw/override-winner ─────────────────────────────────────
// Close the active round and crown a specific player regardless of vote counts.
router.post("/admin/potw/override-winner", requireAdmin, async (req, res) => {
  try {
    const { winnerId } = req.body as { winnerId: number };
    if (!winnerId) return res.status(400).json({ error: "winnerId required" });

    const active = await db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, true)).limit(1);
    if (!active.length) return res.status(400).json({ error: "No active round" });

    const round = active[0];
    const nomineeIds = round.nomineeIds as number[];
    if (!nomineeIds.includes(winnerId)) {
      return res.status(400).json({ error: "Player is not a nominee in the active round" });
    }

    await db.update(potwRoundsTable).set({
      isActive: false,
      votesRevealed: true,
      winnerId,
      closedAt: new Date(),
    }).where(eq(potwRoundsTable.id, round.id));

    res.json({ ok: true, winnerId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── POST /api/admin/potw/reveal-votes ───────────────────────────────────────
router.post("/admin/potw/reveal-votes", requireAdmin, async (req, res) => {
  try {
    const active = await db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, true)).limit(1);
    if (!active.length) return res.status(400).json({ error: "No active round" });

    await db.update(potwRoundsTable).set({ votesRevealed: true }).where(eq(potwRoundsTable.id, active[0].id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── DELETE /api/admin/potw/round/:id ────────────────────────────────────────
router.delete("/admin/potw/round/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(potwVotesTable).where(eq(potwVotesTable.roundId, id));
    await db.delete(potwRoundsTable).where(eq(potwRoundsTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/admin/potw ─────────────────────────────────────────────────────
router.get("/admin/potw", requireAdmin, async (_req, res) => {
  try {
    const [rounds, allPlayers] = await Promise.all([
      db.select().from(potwRoundsTable).orderBy(desc(potwRoundsTable.createdAt)).limit(20),
      db.select().from(playersTable),
    ]);
    res.json({
      rounds,
      players: allPlayers.map((p) => ({ id: p.id, name: p.name, teamId: p.teamId, imageUrl: p.imageUrl, position: p.position })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
