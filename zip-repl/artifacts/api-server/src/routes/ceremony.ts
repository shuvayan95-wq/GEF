import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  ceremonyStateTable,
  ceremonyMessagesTable,
  ceremonyAttendeesTable,
  ballonDorTable,
  trophiesTable,
  playersTable,
  teamsTable,
  matchesTable,
  playerMatchupsTable,
  leaguesTable,
  gccTournamentsTable,
  gccFixturesTable,
} from "@workspace/db";
import { desc, asc, eq, inArray } from "drizzle-orm";
import type { Server as IOServer } from "socket.io";

let _io: IOServer | null = null;
export function setIO(io: IOServer) { _io = io; }

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

const DEFAULT_AWARDS = [
  {
    id: "phenomenal_finisher",
    name: "⚡ Phenomenal Finisher",
    description: "Top scorer of the season — pure clinical finishing",
    type: "finalists_auto",
    finalists: null,
    finalistRevealIndex: -1,
    winner: null,
  },
  {
    id: "best_captain",
    name: "🦁 Best Captain",
    description: "The undisputed leader — chosen by the admin",
    type: "finalists_manual",
    finalists: null,
    finalistRevealIndex: -1,
    winner: null,
  },
  {
    id: "best_team",
    name: "🏟️ Best Team",
    description: "Most dominant team of the season",
    type: "team_auto",
    finalists: null,
    finalistRevealIndex: -1,
    winner: null,
  },
  {
    id: "gk_defense",
    name: "🧤 GK Directing Defense",
    description: "Best defensive wall — fewest goals conceded",
    type: "finalists_auto",
    finalists: null,
    finalistRevealIndex: -1,
    winner: null,
  },
  {
    id: "best_admin",
    name: "🎩 Best Admin",
    description: "GEF Administrator of the Year",
    type: "manual",
    finalists: null,
    finalistRevealIndex: -1,
    winner: null,
  },
  {
    id: "gcc_champion",
    name: "🏆 GCC Champion",
    description: "Winners of the GEF Champions Cup — the elite club competition",
    type: "finalists_auto",
    finalists: null,
    finalistRevealIndex: -1,
    winner: null,
  },
];

async function ensureCeremonyState() {
  const rows = await db.select().from(ceremonyStateTable).limit(1);
  if (rows.length === 0) {
    const [row] = await db.insert(ceremonyStateTable).values({
      status: "waiting",
      phase: "intro",
      currentStep: "0",
      revealIndex: "0",
      isPaused: false,
      animationSpeed: "normal",
      data: {
        intro: { title: "Ballon d'Or Ceremony", message: "Welcome to the GEF Ballon d'Or Award Ceremony!" },
        awards: DEFAULT_AWARDS,
        rankings: [],
        winner: null,
      },
    }).returning();
    return row;
  }

  // If existing state has no awards, seed the defaults
  const existing = rows[0];
  const data: any = existing.data || {};
  if (!data.awards || (Array.isArray(data.awards) && data.awards.length === 0)) {
    const newData = { ...data, awards: DEFAULT_AWARDS };
    const [updated] = await db
      .update(ceremonyStateTable)
      .set({ data: newData, updatedAt: new Date() })
      .where(eq(ceremonyStateTable.id, existing.id))
      .returning();
    return updated;
  }

  return existing;
}

// ── Helper: extend season matchups to include GCC matches ───────────────────
// Both calculate-special-awards and import-special-awards share this logic.
async function mergeGccMatchups(
  season: string,
  allMatches: any[],
  allMatchups: any[],
  leagueMatchIds: Set<number>
): Promise<any[]> {
  function extractYear(s: string) { const m = s.match(/\d{4}/); return m ? m[0] : s; }
  const bdYear = extractYear(season);

  const allGcc = await db.select().from(gccTournamentsTable);
  const gccTournaments = allGcc.filter(t => extractYear(t.season) === bdYear);
  const gccTournamentIds = gccTournaments.map(t => t.id);
  if (gccTournamentIds.length === 0) return [];

  const gccTournamentIdSet = new Set(gccTournamentIds);

  // 1) Matches stamped with gccTournamentId
  const linkedIds = new Set(
    allMatches
      .filter(m => m.gccTournamentId != null && gccTournamentIdSet.has(m.gccTournamentId))
      .map(m => m.id)
  );

  // 2) Legacy fallback: notes start with "GCC" and team pair exists in GCC fixtures
  const gccFixtures = await db.select().from(gccFixturesTable)
    .where(inArray(gccFixturesTable.tournamentId, gccTournamentIds));
  const gccPairKeys = new Set(
    gccFixtures.map(fx => `${Math.min(fx.homeTeamId, fx.awayTeamId)}-${Math.max(fx.homeTeamId, fx.awayTeamId)}`)
  );
  const legacyIds = new Set(
    allMatches
      .filter(m =>
        m.leagueId === null &&
        m.gccTournamentId === null &&
        (m.notes?.startsWith("GCC") ?? false) &&
        gccPairKeys.has(`${Math.min(m.team1Id, m.team2Id)}-${Math.max(m.team1Id, m.team2Id)}`)
      )
      .map(m => m.id)
  );

  const allGccMatchIds = new Set([...linkedIds, ...legacyIds]);
  return allMatchups.filter(mu => allGccMatchIds.has(mu.matchId) && !leagueMatchIds.has(mu.matchId));
}

// ── Helper: compute GCC Champion award finalist data ────────────────────────
async function computeGccChampion(
  season: string,
  allMatches: any[],
  allMatchups: any[],
  allPlayers: any[],
  allTeams: any[]
): Promise<any | null> {
  function extractYear(s: string) { const m = s.match(/\d{4}/); return m ? m[0] : s; }
  const bdYear = extractYear(season);

  const allGcc = await db.select().from(gccTournamentsTable);
  const gccTournaments = allGcc.filter(t => extractYear(t.season) === bdYear);
  if (gccTournaments.length === 0) return null;

  const finalized = gccTournaments.find(t => (t.finalizedResults as any)?.champion != null);
  if (!finalized) return null;

  const championTeamId: number = (finalized.finalizedResults as any).champion;
  const championTeam = allTeams.find(t => t.id === championTeamId);
  if (!championTeam) return null;

  // GCC-only matchup IDs (same logic as mergeGccMatchups)
  const gccTournamentIds = gccTournaments.map(t => t.id);
  const gccTournamentIdSet = new Set(gccTournamentIds);
  const linkedIds = new Set(
    allMatches.filter(m => m.gccTournamentId != null && gccTournamentIdSet.has(m.gccTournamentId)).map(m => m.id)
  );
  const gccFixtures = await db.select().from(gccFixturesTable)
    .where(inArray(gccFixturesTable.tournamentId, gccTournamentIds));
  const gccPairKeys = new Set(
    gccFixtures.map(fx => `${Math.min(fx.homeTeamId, fx.awayTeamId)}-${Math.max(fx.homeTeamId, fx.awayTeamId)}`)
  );
  const legacyIds = new Set(
    allMatches
      .filter(m =>
        m.leagueId === null && m.gccTournamentId === null &&
        (m.notes?.startsWith("GCC") ?? false) &&
        gccPairKeys.has(`${Math.min(m.team1Id, m.team2Id)}-${Math.max(m.team1Id, m.team2Id)}`)
      )
      .map(m => m.id)
  );
  const gccMatchIds = new Set([...linkedIds, ...legacyIds]);
  const gccOnlyMatchups = allMatchups.filter(mu => gccMatchIds.has(mu.matchId));

  // Count GCC wins for the champion team
  const gccTeamWins = new Map<number, number>();
  for (const match of allMatches) {
    if (!gccMatchIds.has(match.id)) continue;
    const score1 = match.score1 ?? 0;
    const score2 = match.score2 ?? 0;
    if (score1 > score2 && match.team1Id) {
      gccTeamWins.set(match.team1Id, (gccTeamWins.get(match.team1Id) || 0) + 1);
    } else if (score2 > score1 && match.team2Id) {
      gccTeamWins.set(match.team2Id, (gccTeamWins.get(match.team2Id) || 0) + 1);
    }
  }
  const championWins = gccTeamWins.get(championTeamId) || 0;

  return {
    name: championTeam.name,
    image: championTeam.logoUrl || null,
    team: finalized.season,
    rank: 3,
    statLabel: "GCC Wins",
    statValue: championWins,
  };
}

router.get("/ceremony/state", async (_req, res) => {
  try {
    const state = await ensureCeremonyState();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.post("/ceremony/state", requireAdmin, async (req, res) => {
  try {
    const state = await ensureCeremonyState();
    const updates: any = { ...req.body, updatedAt: new Date() };
    const [updated] = await db
      .update(ceremonyStateTable)
      .set(updates)
      .where(eq(ceremonyStateTable.id, state.id))
      .returning();
    _io?.emit("ceremony:state", updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.get("/ceremony/messages", async (_req, res) => {
  try {
    const msgs = await db.select().from(ceremonyMessagesTable).orderBy(asc(ceremonyMessagesTable.createdAt));
    res.json(msgs);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.post("/ceremony/messages", async (req, res) => {
  try {
    const { userName, message } = req.body;
    if (!userName || !message) return res.status(400).json({ error: "userName and message required" });
    const [msg] = await db.insert(ceremonyMessagesTable).values({ userName, message }).returning();
    _io?.emit("ceremony:message", msg);
    res.json(msg);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.delete("/ceremony/messages", requireAdmin, async (_req, res) => {
  try {
    await db.delete(ceremonyMessagesTable);
    _io?.emit("ceremony:messages:cleared");
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.get("/ceremony/attendees", async (_req, res) => {
  try {
    const attendees = await db.select().from(ceremonyAttendeesTable).orderBy(desc(ceremonyAttendeesTable.joinedAt));
    res.json(attendees);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.post("/ceremony/join", async (req, res) => {
  try {
    const { userName } = req.body;
    if (!userName) return res.status(400).json({ error: "userName required" });
    const [attendee] = await db.insert(ceremonyAttendeesTable).values({ userName }).returning();
    _io?.emit("ceremony:joined", attendee);
    res.json(attendee);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.get("/ceremony/ballon-dor-seasons", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select({ season: ballonDorTable.season }).from(ballonDorTable);
    res.json(rows.map((r) => r.season));
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Calculate all auto awards for a season
router.get("/ceremony/calculate-special-awards", requireAdmin, async (req, res) => {
  try {
    const season = req.query.season as string;
    if (!season) return res.status(400).json({ error: "season is required" });

    const allLeagues = await db.select().from(leaguesTable);
    const seasonLeagues = allLeagues.filter(l => l.season === season);
    const seasonLeagueIds = new Set(seasonLeagues.map(l => l.id));

    const allMatches = await db.select().from(matchesTable);
    const seasonMatches = allMatches.filter(m => m.leagueId && seasonLeagueIds.has(m.leagueId!));
    const seasonMatchIds = new Set(seasonMatches.map(m => m.id));

    const allMatchups = await db.select().from(playerMatchupsTable);
    const leagueMatchups = allMatchups.filter(mu => seasonMatchIds.has(mu.matchId));
    const gccMatchups = await mergeGccMatchups(season, allMatches, allMatchups, seasonMatchIds);
    const seasonMatchups = [...leagueMatchups, ...gccMatchups];

    const allPlayers = await db.select().from(playersTable);
    const allTeams = await db.select().from(teamsTable);
    const teamMap = new Map(allTeams.map(t => [t.id, t]));
    const allTrophies = await db.select().from(trophiesTable);

    // Per-player stats
    const goalsByPlayer = new Map<number, number>();
    const concededByPlayer = new Map<number, number>();
    const matchCountByPlayer = new Map<number, number>();

    for (const mu of seasonMatchups) {
      const p1g = mu.player1Goals || 0;
      const p2g = mu.player2Goals || 0;
      goalsByPlayer.set(mu.player1Id, (goalsByPlayer.get(mu.player1Id) || 0) + p1g);
      goalsByPlayer.set(mu.player2Id, (goalsByPlayer.get(mu.player2Id) || 0) + p2g);
      concededByPlayer.set(mu.player1Id, (concededByPlayer.get(mu.player1Id) || 0) + p2g);
      concededByPlayer.set(mu.player2Id, (concededByPlayer.get(mu.player2Id) || 0) + p1g);
      matchCountByPlayer.set(mu.player1Id, (matchCountByPlayer.get(mu.player1Id) || 0) + 1);
      matchCountByPlayer.set(mu.player2Id, (matchCountByPlayer.get(mu.player2Id) || 0) + 1);
    }

    const playerCards = allPlayers
      .filter(p => goalsByPlayer.has(p.id) || concededByPlayer.has(p.id))
      .map(p => {
        const team = p.teamId ? teamMap.get(p.teamId) : null;
        const matches = matchCountByPlayer.get(p.id) || 0;
        const goals = goalsByPlayer.get(p.id) || 0;
        const conceded = concededByPlayer.get(p.id) || 0;
        // Bayesian adjusted conceded/match: prior = 1.5 goals/match over 5 phantom matches
        // Ensures players with more real matches rank better at equal raw rates
        const bayesianCPM = (conceded + 7.5) / (matches + 5);
        return {
          playerId: p.id,
          name: p.name,
          image: p.imageUrl || null,
          team: team?.name || null,
          teamLogo: team?.logoUrl || null,
          goals,
          conceded,
          matches,
          concededPerMatch: matches > 0 ? conceded / matches : 999,
          bayesianCPM,
          // Bayesian goals/match: prior = 1 goal/match over 4 phantom matches
          bayesianGPM: (goals + 4) / (matches + 4),
        };
      });

    // Phenomenal Finisher — full ranked list by Bayesian goals/match
    const phenomenalRanked = [...playerCards]
      .sort((a, b) => b.bayesianGPM - a.bayesianGPM)
      .slice(0, 20)
      .map((p, i) => ({
        rank: i + 1,
        playerId: p.playerId,
        name: p.name,
        image: p.image,
        team: p.team,
        statLabel: "Goals",
        statValue: p.goals,
        statSub: `${p.matches} games`,
      }));

    // GK Defense — full ranked list by fewest Bayesian conceded/match
    const gkRanked = [...playerCards]
      .filter(p => p.matches >= 1)
      .sort((a, b) => a.bayesianCPM - b.bayesianCPM)
      .slice(0, 20)
      .map((p, i) => ({
        rank: i + 1,
        playerId: p.playerId,
        name: p.name,
        image: p.image,
        team: p.team,
        statLabel: "Conceded/Match",
        statValue: Math.round(p.concededPerMatch * 10) / 10,
        statSub: `${p.matches} games`,
      }));

    // Best Team — full ranked list by score (trophies × 120 + winRate × 60 + goalDiff × 2)
    const trophyCountByTeam = new Map<number, number>();
    for (const t of allTrophies) {
      if (t.winnerTeamId) trophyCountByTeam.set(t.winnerTeamId, (trophyCountByTeam.get(t.winnerTeamId) || 0) + 1);
    }
    const teamMatchStats = new Map<number, { goals: number; conceded: number; matches: number; wins: number }>();
    for (const mu of seasonMatchups) {
      const p1 = allPlayers.find(p => p.id === mu.player1Id);
      const p2 = allPlayers.find(p => p.id === mu.player2Id);
      const p1g = mu.player1Goals || 0; const p2g = mu.player2Goals || 0;
      if (p1?.teamId) { const s = teamMatchStats.get(p1.teamId) || { goals: 0, conceded: 0, matches: 0, wins: 0 }; s.goals += p1g; s.conceded += p2g; s.matches++; if (p1g > p2g) s.wins++; teamMatchStats.set(p1.teamId, s); }
      if (p2?.teamId) { const s = teamMatchStats.get(p2.teamId) || { goals: 0, conceded: 0, matches: 0, wins: 0 }; s.goals += p2g; s.conceded += p1g; s.matches++; if (p2g > p1g) s.wins++; teamMatchStats.set(p2.teamId, s); }
    }
    const bestTeamRanked = allTeams
      .filter(t => teamMatchStats.has(t.id) || trophyCountByTeam.has(t.id))
      .map(team => {
        const stats = teamMatchStats.get(team.id);
        const trophies = trophyCountByTeam.get(team.id) || 0;
        const winRate = stats && stats.matches > 0 ? stats.wins / stats.matches : 0;
        const goalDiff = stats ? stats.goals - stats.conceded : 0;
        return { teamId: team.id, name: team.name, image: team.logoUrl || null, team: team.name, trophies, matches: stats?.matches || 0, wins: stats?.wins || 0, goals: stats?.goals || 0, winRate: Math.round(winRate * 100), score: trophies * 120 + winRate * 60 + goalDiff * 2 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((t, i) => ({
        rank: i + 1,
        teamId: t.teamId,
        name: t.name,
        image: t.image,
        team: t.name,
        statLabel: "Win Rate",
        statValue: `${t.winRate}%`,
        statSub: `${t.trophies} 🏆 · ${t.wins}W/${t.matches}G`,
      }));

    const gccChampionFinalist = await computeGccChampion(season, allMatches, allMatchups, allPlayers, allTeams);

    res.json({ phenomenalRanked, gkRanked, bestTeamRanked, gccChampion: gccChampionFinalist, season });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Save manually chosen finalists for any award
router.post("/ceremony/save-award-finalists", requireAdmin, async (req, res) => {
  try {
    const { awardId, finalists } = req.body;
    if (!awardId || !Array.isArray(finalists)) return res.status(400).json({ error: "awardId and finalists[] required" });

    const state = await ensureCeremonyState();
    const data: any = state.data || {};
    const awards: any[] = data.awards || DEFAULT_AWARDS;

    const awardIds = new Set(awards.map((a: any) => a.id));
    const awardsWithSlot = awardIds.has(awardId)
      ? awards
      : [...awards, { ...(DEFAULT_AWARDS.find(a => a.id === awardId) || { id: awardId, name: awardId, type: "finalists_auto", finalists: null, finalistRevealIndex: -1, winner: null }) }];

    const updated = awardsWithSlot.map((a: any) => a.id === awardId ? { ...a, finalists, finalistRevealIndex: -1 } : a);
    const newData = { ...data, awards: updated };
    const [newState] = await db.update(ceremonyStateTable).set({ data: newData, updatedAt: new Date() }).where(eq(ceremonyStateTable.id, state.id)).returning();
    _io?.emit("ceremony:state", newState);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Import special awards into ceremony state (GCC Champion + legacy fallback)
router.post("/ceremony/import-special-awards", requireAdmin, async (req, res) => {
  try {
    const { season } = req.body;
    if (!season) return res.status(400).json({ error: "season required" });

    const allLeagues = await db.select().from(leaguesTable);
    const seasonLeagues = allLeagues.filter(l => l.season === season);
    const seasonLeagueIds = new Set(seasonLeagues.map(l => l.id));

    const allMatches = await db.select().from(matchesTable);
    const seasonMatches = allMatches.filter(m => m.leagueId && seasonLeagueIds.has(m.leagueId!));
    const seasonMatchIds = new Set(seasonMatches.map(m => m.id));

    const allMatchups = await db.select().from(playerMatchupsTable);
    const leagueMatchups = allMatchups.filter(mu => seasonMatchIds.has(mu.matchId));
    const gccMatchups = await mergeGccMatchups(season, allMatches, allMatchups, seasonMatchIds);
    const seasonMatchups = [...leagueMatchups, ...gccMatchups];

    const allPlayers = await db.select().from(playersTable);
    const allTeams = await db.select().from(teamsTable);
    const teamMap = new Map(allTeams.map(t => [t.id, t]));
    const allTrophies = await db.select().from(trophiesTable);

    const goalsByPlayer = new Map<number, number>();
    const concededByPlayer = new Map<number, number>();
    const matchCountByPlayer = new Map<number, number>();

    for (const mu of seasonMatchups) {
      const p1g = mu.player1Goals || 0;
      const p2g = mu.player2Goals || 0;
      goalsByPlayer.set(mu.player1Id, (goalsByPlayer.get(mu.player1Id) || 0) + p1g);
      goalsByPlayer.set(mu.player2Id, (goalsByPlayer.get(mu.player2Id) || 0) + p2g);
      concededByPlayer.set(mu.player1Id, (concededByPlayer.get(mu.player1Id) || 0) + p2g);
      concededByPlayer.set(mu.player2Id, (concededByPlayer.get(mu.player2Id) || 0) + p1g);
      matchCountByPlayer.set(mu.player1Id, (matchCountByPlayer.get(mu.player1Id) || 0) + 1);
      matchCountByPlayer.set(mu.player2Id, (matchCountByPlayer.get(mu.player2Id) || 0) + 1);
    }

    const playerCards = allPlayers
      .filter(p => goalsByPlayer.has(p.id) || concededByPlayer.has(p.id))
      .map(p => {
        const team = p.teamId ? teamMap.get(p.teamId) : null;
        const matches = matchCountByPlayer.get(p.id) || 0;
        const goals = goalsByPlayer.get(p.id) || 0;
        const conceded = concededByPlayer.get(p.id) || 0;
        const bayesianCPM = (conceded + 7.5) / (matches + 5);
        const bayesianGPM = (goals + 4) / (matches + 4);
        return {
          playerId: p.id,
          name: p.name,
          image: p.imageUrl || null,
          team: team?.name || null,
          goals,
          conceded,
          matches,
          concededPerMatch: matches > 0 ? conceded / matches : 999,
          bayesianCPM,
          bayesianGPM,
        };
      });

    const topScorers = [...playerCards].sort((a, b) => b.bayesianGPM - a.bayesianGPM).slice(0, 3).reverse()
      .map((p, i) => ({ name: p.name, image: p.image, team: p.team, rank: i + 1, statLabel: "Goals", statValue: p.goals }));

    const gkTop = [...playerCards].filter(p => p.matches >= 1)
      .sort((a, b) => a.bayesianCPM - b.bayesianCPM).slice(0, 3).reverse()
      .map((p, i) => ({ name: p.name, image: p.image, team: p.team, rank: i + 1, statLabel: "Conceded/Match", statValue: Math.round(p.concededPerMatch * 10) / 10 }));

    const trophyCountByTeam = new Map<number, number>();
    for (const t of allTrophies) {
      if (t.winnerTeamId) trophyCountByTeam.set(t.winnerTeamId, (trophyCountByTeam.get(t.winnerTeamId) || 0) + 1);
    }
    const teamMatchStats = new Map<number, { goals: number; conceded: number; matches: number; wins: number }>();
    for (const mu of seasonMatchups) {
      const p1 = allPlayers.find(p => p.id === mu.player1Id);
      const p2 = allPlayers.find(p => p.id === mu.player2Id);
      const p1g = mu.player1Goals || 0; const p2g = mu.player2Goals || 0;
      if (p1?.teamId) { const s = teamMatchStats.get(p1.teamId) || { goals: 0, conceded: 0, matches: 0, wins: 0 }; s.goals += p1g; s.conceded += p2g; s.matches++; if (p1g > p2g) s.wins++; teamMatchStats.set(p1.teamId, s); }
      if (p2?.teamId) { const s = teamMatchStats.get(p2.teamId) || { goals: 0, conceded: 0, matches: 0, wins: 0 }; s.goals += p2g; s.conceded += p1g; s.matches++; if (p2g > p1g) s.wins++; teamMatchStats.set(p2.teamId, s); }
    }
    const bestTeamData = allTeams
      .filter(t => teamMatchStats.has(t.id) || trophyCountByTeam.has(t.id))
      .map(team => {
        const stats = teamMatchStats.get(team.id);
        const trophies = trophyCountByTeam.get(team.id) || 0;
        const winRate = stats && stats.matches > 0 ? stats.wins / stats.matches : 0;
        const goalDiff = stats ? stats.goals - stats.conceded : 0;
        return { team, trophies, stats, winRate, goalDiff, score: trophies * 120 + winRate * 60 + goalDiff * 2 };
      })
      .sort((a, b) => b.score - a.score)[0];

    const gccChampionFinalist = await computeGccChampion(season, allMatches, allMatchups, allPlayers, allTeams);

    const currentState = await ensureCeremonyState();
    const currentData: any = currentState.data || {};
    const existingAwards: any[] = currentData.awards || DEFAULT_AWARDS;

    // Ensure gcc_champion award slot exists even if not in existing state
    const awardIds = new Set(existingAwards.map((a: any) => a.id));
    const awardsWithGcc = awardIds.has("gcc_champion")
      ? existingAwards
      : [...existingAwards, { ...DEFAULT_AWARDS.find(a => a.id === "gcc_champion")! }];

    const updatedAwards = awardsWithGcc.map((award: any) => {
      if (award.id === "phenomenal_finisher") {
        return { ...award, finalists: topScorers.length ? topScorers : award.finalists };
      }
      if (award.id === "gk_defense") {
        return { ...award, finalists: gkTop.length ? gkTop : award.finalists };
      }
      if (award.id === "best_team" && bestTeamData) {
        const winner = {
          name: bestTeamData.team.name,
          image: bestTeamData.team.logoUrl || null,
          team: bestTeamData.team.name,
          trophies: bestTeamData.trophies,
          wins: bestTeamData.stats?.wins || 0,
          matches: bestTeamData.stats?.matches || 0,
          winRate: Math.round(bestTeamData.winRate * 100),
          goals: bestTeamData.stats?.goals || 0,
        };
        return { ...award, winner };
      }
      if (award.id === "gcc_champion" && gccChampionFinalist) {
        return { ...award, finalists: [gccChampionFinalist] };
      }
      return award;
    });

    const newData = { ...currentData, awards: updatedAwards };
    const [updated] = await db
      .update(ceremonyStateTable)
      .set({ data: newData, updatedAt: new Date() })
      .where(eq(ceremonyStateTable.id, currentState.id))
      .returning();
    _io?.emit("ceremony:state", updated);

    res.json({ ok: true, season, awards: updatedAwards.map((a: any) => a.id) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Update a single award's finalist reveal index
router.post("/ceremony/award-finalist-reveal", requireAdmin, async (req, res) => {
  try {
    const { awardId, finalistRevealIndex } = req.body;
    const state = await ensureCeremonyState();
    const data: any = state.data || {};
    const awards: any[] = data.awards || DEFAULT_AWARDS;
    const updated = awards.map((a: any) =>
      a.id === awardId ? { ...a, finalistRevealIndex } : a
    );
    const newData = { ...data, awards: updated };
    const [newState] = await db
      .update(ceremonyStateTable)
      .set({ data: newData, updatedAt: new Date() })
      .where(eq(ceremonyStateTable.id, state.id))
      .returning();
    _io?.emit("ceremony:state", newState);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.post("/ceremony/import-ballondor", requireAdmin, async (req, res) => {
  try {
    const { season } = req.body;
    if (!season) return res.status(400).json({ error: "season required" });

    const [bdRow] = await db.select().from(ballonDorTable).where(eq(ballonDorTable.season, season));
    if (!bdRow) return res.status(404).json({ error: `No Ballon d'Or results for season "${season}"` });

    const top50: any[] = (bdRow.top50 as any[]) || [];

    const allTrophies = await db.select().from(trophiesTable);
    const allPlayers = await db.select().from(playersTable);

    // Build a fresh image map from the live players table (snapshot in top50 may be stale)
    const freshImageById = new Map<number, string>();
    for (const p of allPlayers) {
      if (p.imageUrl) freshImageById.set(p.id, p.imageUrl);
    }

    const trophyCountByPlayer = new Map<number, number>();
    for (const t of allTrophies) {
      if (t.winnerPlayerId) {
        trophyCountByPlayer.set(t.winnerPlayerId, (trophyCountByPlayer.get(t.winnerPlayerId) || 0) + 1);
      }
      if (t.winnerTeamId) {
        const teamPlayers = allPlayers.filter((p) => p.teamId === t.winnerTeamId);
        for (const p of teamPlayers) {
          trophyCountByPlayer.set(p.id, (trophyCountByPlayer.get(p.id) || 0) + 1);
        }
      }
    }

    const rankings = top50
      .map((p: any) => ({
        playerId: String(p.playerId),
        name: p.playerName,
        team: p.teamName || "",
        image: freshImageById.get(Number(p.playerId)) || p.imageUrl || "",
        stats: {
          goals: p.stats?.goals ?? p.goals ?? 0,
          wins: p.stats?.wins ?? p.wins ?? 0,
          trophies: trophyCountByPlayer.get(p.playerId) || 0,
          rating: p.ovr || 0,
          mvps: p.stats?.mvps ?? p.mvps ?? 0,
          matches: p.stats?.matches ?? p.matches ?? 0,
          winRate: p.stats?.winRate ?? p.winRate ?? 0,
        },
        points: Math.round(p.score || 0),
        rank: p.rank,
      }))
      .sort((a: any, b: any) => b.rank - a.rank);

    const rank1 = rankings.find((r: any) => r.rank === 1);
    const winner = rank1 ? {
      name: rank1.name,
      team: rank1.team,
      image: freshImageById.get(Number(rank1.playerId)) || rank1.image,
      stats: rank1.stats,
      points: rank1.points,
    } : null;

    const currentState = await ensureCeremonyState();
    const currentData: any = currentState.data || {};

    const playerLookup = new Map<string, any>();
    for (const p of rankings) {
      playerLookup.set(p.name.toLowerCase().trim(), p);
      if (p.playerId) playerLookup.set(String(p.playerId), p);
    }

    const existingAwards: any[] = currentData.awards?.length ? currentData.awards : DEFAULT_AWARDS;
    const updatedAwards = existingAwards.map((award: any) => {
      if (!award.winner?.name) return award;
      const match = playerLookup.get(award.winner.name.toLowerCase().trim());
      if (!match) return award;
      // Always prefer fresh image from players table over stale snapshot
      const freshImg = match.playerId ? freshImageById.get(Number(match.playerId)) : null;
      return {
        ...award,
        winner: {
          ...award.winner,
          team: award.winner.team || match.team,
          image: freshImg || match.image || award.winner.image,
          stats: {
            rating: match.stats?.rating ?? 0,
            goals: match.stats?.goals ?? 0,
            wins: match.stats?.wins ?? 0,
            mvps: match.stats?.mvps ?? 0,
            trophies: match.stats?.trophies ?? 0,
            winRate: match.stats?.winRate ?? 0,
          },
        },
      };
    });

    const newData = { ...currentData, rankings, winner, awards: updatedAwards };
    const [updated] = await db
      .update(ceremonyStateTable)
      .set({ data: newData, updatedAt: new Date() })
      .where(eq(ceremonyStateTable.id, currentState.id))
      .returning();
    _io?.emit("ceremony:state", updated);

    res.json({ ok: true, imported: rankings.length, season });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.post("/ceremony/reset", requireAdmin, async (_req, res) => {
  try {
    const state = await ensureCeremonyState();
    const [updated] = await db
      .update(ceremonyStateTable)
      .set({
        status: "waiting",
        phase: "intro",
        currentStep: "0",
        revealIndex: "0",
        isPaused: false,
        data: {
          intro: { title: "Ballon d'Or Ceremony", message: "Welcome to the GEF Ballon d'Or Award Ceremony!" },
          awards: DEFAULT_AWARDS,
          rankings: [],
          winner: null,
        },
        updatedAt: new Date(),
      })
      .where(eq(ceremonyStateTable.id, state.id))
      .returning();
    await db.delete(ceremonyMessagesTable);
    await db.delete(ceremonyAttendeesTable);
    _io?.emit("ceremony:state", updated);
    _io?.emit("ceremony:messages:cleared");
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
