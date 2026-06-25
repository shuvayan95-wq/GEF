import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  playersTable, teamsTable,
  potwRoundsTable, potwVotesTable,
  matchesTable, playerMatchupsTable,
  leaguesTable,
  gccTournamentsTable,
} from "@workspace/db";
import { desc, eq, and, inArray, or } from "drizzle-orm";

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
// If season provided, restricts to matches in that season and uses last 3 distinct match dates.
// Otherwise falls back to last matchLimit matches globally.
async function computePlayerStats(playerIds?: number[], matchLimit = 30, season?: string) {
  let seasonMatchIds: number[] | null = null;

  if (season) {
    // Get league IDs for this season
    const leaguesForSeason = await db.select({ id: leaguesTable.id })
      .from(leaguesTable)
      .where(eq(leaguesTable.season, season));
    const leagueIds = leaguesForSeason.map(l => l.id);

    // Get gcc tournament IDs for this season
    const gccForSeason = await db.select({ id: gccTournamentsTable.id })
      .from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.season, season));
    const gccIds = gccForSeason.map(g => g.id);

    // Get all matches for this season (by season field or by leagueId/gccTournamentId)
    const allSeasonMatches = await db.select({ id: matchesTable.id, date: matchesTable.date })
      .from(matchesTable)
      .where(
        or(
          eq(matchesTable.season, season),
          leagueIds.length > 0 ? inArray(matchesTable.leagueId, leagueIds) : undefined,
          gccIds.length > 0 ? inArray(matchesTable.gccTournamentId, gccIds) : undefined,
        )
      )
      .orderBy(desc(matchesTable.date));

    if (!allSeasonMatches.length) return {};

    // Get last 3 distinct matchdays (dates)
    const distinctDates = [...new Set(allSeasonMatches.map(m => m.date))].slice(0, 3);
    seasonMatchIds = allSeasonMatches.filter(m => distinctDates.includes(m.date)).map(m => m.id);

    if (!seasonMatchIds.length) return {};
  }

  const recentMatches = seasonMatchIds
    ? await db.select().from(matchesTable).where(inArray(matchesTable.id, seasonMatchIds))
    : await db.select().from(matchesTable).orderBy(desc(matchesTable.date)).limit(matchLimit);

  if (!recentMatches.length) return {};

  const matchIds = recentMatches.map((m) => m.id);
  const matchMap = new Map(recentMatches.map((m) => [m.id, m]));

  const matchups = await db
    .select()
    .from(playerMatchupsTable)
    .where(inArray(playerMatchupsTable.matchId, matchIds));

  const allPlayers = await db.select({ id: playersTable.id, teamId: playersTable.teamId }).from(playersTable);
  const playerTeamMap = new Map(allPlayers.map((p) => [p.id, p.teamId]));

  type Entry = { matchDate: string; matchId: number; goals: number; isMvp: boolean; isWin: boolean };
  const entriesMap: Record<number, Entry[]> = {};

  const addEntry = (playerId: number, goals: number, isMvp: boolean, matchId: number) => {
    const match = matchMap.get(matchId);
    if (!match) return;
    const teamId = playerTeamMap.get(playerId);
    let isWin = false;
    if (teamId === match.team1Id) isWin = match.team1Score > match.team2Score;
    else if (teamId === match.team2Id) isWin = match.team2Score > match.team1Score;

    if (!entriesMap[playerId]) entriesMap[playerId] = [];
    entriesMap[playerId].push({ matchDate: match.date, matchId, goals, isMvp, isWin });
  };

  for (const mu of matchups) {
    addEntry(mu.player1Id, mu.player1Goals, mu.mvpPlayerId === mu.player1Id, mu.matchId);
    addEntry(mu.player2Id, mu.player2Goals, mu.mvpPlayerId === mu.player2Id, mu.matchId);
  }

  const result: Record<number, { goals: number; mvps: number; wins: number; matches: number }> = {};
  const ids = playerIds ?? Object.keys(entriesMap).map(Number);

  for (const pid of ids) {
    const entries = (entriesMap[pid] ?? [])
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate))
      .filter((e, i, arr) => arr.findIndex((x) => x.matchId === e.matchId) === i)
      .slice(0, 3);

    result[pid] = {
      goals: entries.reduce((s, e) => s + e.goals, 0),
      mvps: entries.filter((e) => e.isMvp).length,
      wins: entries.filter((e) => e.isWin).length,
      matches: entries.length,
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
      db.select().from(potwRoundsTable).where(eq(potwRoundsTable.isActive, false)).orderBy(desc(potwRoundsTable.createdAt)).limit(10),
      db.select().from(playersTable),
    ]);
    const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
    res.json(past.map((r) => ({ ...r, winner: r.winnerId ? (playerMap.get(r.winnerId) ?? null) : null })));
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
