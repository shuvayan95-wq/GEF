import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  leaguesTable, teamsTable, matchesTable, playerMatchupsTable,
  playersTable, leagueParticipantsTable, leagueFixturesTable,
} from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";
import { recalculateAllMarketValues } from "../lib/marketValue.js";
import { recalculateAllTeamIncomes } from "../lib/incomeCalculator.js";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Helper: get team IDs participating in a league
async function getParticipantTeamIds(leagueId: number): Promise<number[]> {
  const rows = await db
    .select({ teamId: leagueParticipantsTable.teamId })
    .from(leagueParticipantsTable)
    .where(eq(leagueParticipantsTable.leagueId, leagueId));
  return rows.map(r => r.teamId);
}

// GET /leagues — list all leagues with participant counts
router.get("/leagues", async (req, res) => {
  try {
    const isAdmin = !!(req.session as any).isAdmin;
    const allLeagues = await db.select().from(leaguesTable);
    const leagues = isAdmin ? allLeagues : allLeagues.filter(l => !l.isLocked);

    // Fetch all participants in one query
    const allParticipants = await db.select().from(leagueParticipantsTable);
    const countByLeague = new Map<number, number>();
    for (const p of allParticipants) {
      countByLeague.set(p.leagueId, (countByLeague.get(p.leagueId) ?? 0) + 1);
    }

    const result = leagues.map(league => ({
      id: league.id,
      name: league.name,
      description: league.description ?? null,
      season: league.season ?? null,
      logoUrl: league.logoUrl ?? null,
      leagueType: league.leagueType ?? "league",
      isLocked: league.isLocked,
      teamCount: countByLeague.get(league.id) ?? 0,
      fixtureRounds: league.fixtureRounds ?? 1,
      leagueRules: league.leagueRules ?? null,
      createdAt: league.createdAt.toISOString(),
    }));
    res.json(result);
  } catch (err: any) {
    console.error("Error fetching leagues:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch leagues" });
  }
});

// GET /leagues/:id/participants — list teams enrolled in this league (admin)
router.get("/leagues/:id/participants", requireAdmin, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.id);
    const teamIds = await getParticipantTeamIds(leagueId);
    res.json({ leagueId, teamIds });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /leagues/:id/participants — replace participant list (admin)
router.put("/leagues/:id/participants", requireAdmin, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.id);
    const { teamIds } = req.body as { teamIds: number[] };
    if (!Array.isArray(teamIds)) return res.status(400).json({ error: "teamIds array required" });

    // Delete existing, then insert new
    await db.delete(leagueParticipantsTable).where(eq(leagueParticipantsTable.leagueId, leagueId));
    if (teamIds.length > 0) {
      await db.insert(leagueParticipantsTable).values(
        teamIds.map(teamId => ({ leagueId, teamId }))
      );
    }
    res.json({ leagueId, teamIds });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /leagues/:id — full league detail with standings + player stats
router.get("/leagues/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const isAdmin = !!(req.session as any).isAdmin;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, id));
  if (!league) return res.status(404).json({ error: "League not found" });
  if (league.isLocked && !isAdmin) return res.status(403).json({ error: "This season has been archived and is no longer publicly accessible." });

  // Get participating teams for this league season
  const participantTeamIds = await getParticipantTeamIds(id);

  let teams: any[];
  if (participantTeamIds.length > 0) {
    teams = await db.select().from(teamsTable).where(inArray(teamsTable.id, participantTeamIds));
  } else {
    // Fallback: legacy behaviour — use teamsTable.leagueId if no participants set
    teams = await db.select().from(teamsTable).where(eq(teamsTable.leagueId, id));
  }

  const matches = await db.select().from(matchesTable).where(eq(matchesTable.leagueId, id));
  const teamIds = new Set(teams.map(t => t.id));

  const standings = await Promise.all(teams.map(async (team) => {
    const teamMatches = matches.filter(m => m.team1Id === team.id || m.team2Id === team.id);
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    for (const m of teamMatches) {
      const isT1 = m.team1Id === team.id;
      const myGoals = isT1 ? m.team1Score : m.team2Score;
      const theirGoals = isT1 ? m.team2Score : m.team1Score;
      gf += myGoals; ga += theirGoals;
      if (myGoals > theirGoals) w++;
      else if (myGoals < theirGoals) l++;
      else d++;
    }
    return {
      teamId: team.id,
      teamName: team.name,
      teamLogoUrl: team.logoUrl ?? null,
      played: teamMatches.length,
      won: w, drawn: d, lost: l,
      goalsFor: gf, goalsAgainst: ga,
      goalDiff: gf - ga,
      points: w * 3 + d,
    };
  }));

  standings.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);

  // Player stats within this league
  const leagueMatchups: any[] = [];
  for (const m of matches) {
    const mups = await db.select().from(playerMatchupsTable).where(eq(playerMatchupsTable.matchId, m.id));
    for (const mu of mups) leagueMatchups.push(mu);
  }

  const allPlayers = await db.select().from(playersTable);
  const leaguePlayers = allPlayers.filter(p => p.teamId && teamIds.has(p.teamId));

  const playerStats = await Promise.all(leaguePlayers.map(async (player) => {
    const myMatchups = leagueMatchups.filter(mu => mu.player1Id === player.id || mu.player2Id === player.id);
    let wins = 0, losses = 0, draws = 0, goals = 0, conceded = 0, mvps = 0;
    for (const mu of myMatchups) {
      const isP1 = mu.player1Id === player.id;
      const myG = isP1 ? mu.player1Goals : mu.player2Goals;
      const thG = isP1 ? mu.player2Goals : mu.player1Goals;
      goals += myG; conceded += thG;
      if (myG > thG) wins++;
      else if (myG < thG) losses++;
      else draws++;
      if (mu.mvpPlayerId === player.id) mvps++;
    }
    const team = teams.find(t => t.id === player.teamId);
    return {
      playerId: player.id,
      playerName: player.name,
      playerImageUrl: player.imageUrl ?? null,
      teamId: player.teamId ?? null,
      teamName: team?.name ?? null,
      matchesPlayed: myMatchups.length,
      wins, losses, draws, goals, conceded, mvps,
      winRate: myMatchups.length > 0 ? Math.round((wins / myMatchups.length) * 1000) / 10 : 0,
      goalDiff: goals - conceded,
    };
  }));

  playerStats.sort((a, b) => b.goals - a.goals || b.wins - a.wins);

  res.json({
    id: league.id,
    name: league.name,
    description: league.description ?? null,
    season: league.season ?? null,
    logoUrl: league.logoUrl ?? null,
    leagueType: league.leagueType ?? "league",
    standings,
    playerStats,
    matchCount: matches.length,
    participantTeamIds,
    leagueRules: league.leagueRules ?? null,
    createdAt: league.createdAt.toISOString(),
  });
});

// GET /leagues/:id/fixtures
router.get("/leagues/:id/fixtures", async (req, res) => {
  const id = parseInt(req.params.id);
  const isAdmin = !!(req.session as any).isAdmin;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, id));
  if (!league) return res.status(404).json({ error: "Not found" });
  if (league.isLocked && !isAdmin) return res.status(403).json({ error: "This season has been archived and is no longer publicly accessible." });

  const [matches, allMatchups, teams, players] = await Promise.all([
    db.select().from(matchesTable).where(eq(matchesTable.leagueId, id)).orderBy(sql`${matchesTable.date} DESC`),
    db.select().from(playerMatchupsTable),
    db.select().from(teamsTable),
    db.select().from(playersTable),
  ]);

  const teamMap = new Map(teams.map(t => [t.id, t]));
  const playerMap = new Map(players.map(p => [p.id, p]));
  const matchupsByMatch = new Map<number, any[]>();
  for (const mu of allMatchups) {
    if (!matchupsByMatch.has(mu.matchId)) matchupsByMatch.set(mu.matchId, []);
    matchupsByMatch.get(mu.matchId)!.push(mu);
  }

  const fixtures = matches.map(m => {
    const team1 = teamMap.get(m.team1Id);
    const team2 = teamMap.get(m.team2Id);
    const matchups = (matchupsByMatch.get(m.id) ?? []).map((mu: any) => ({
      id: mu.id,
      player1Id: mu.player1Id,
      player1Name: playerMap.get(mu.player1Id)?.name ?? "?",
      player1ImageUrl: playerMap.get(mu.player1Id)?.imageUrl ?? null,
      player2Id: mu.player2Id,
      player2Name: playerMap.get(mu.player2Id)?.name ?? "?",
      player2ImageUrl: playerMap.get(mu.player2Id)?.imageUrl ?? null,
      player1Goals: mu.player1Goals,
      player2Goals: mu.player2Goals,
      mvpPlayerId: mu.mvpPlayerId ?? null,
    }));
    return {
      id: m.id,
      date: m.date,
      team1Id: m.team1Id,
      team1Name: team1?.name ?? "TBD",
      team1LogoUrl: team1?.logoUrl ?? null,
      team2Id: m.team2Id,
      team2Name: team2?.name ?? "TBD",
      team2LogoUrl: team2?.logoUrl ?? null,
      team1Score: m.team1Score,
      team2Score: m.team2Score,
      notes: m.notes ?? null,
      matchups,
    };
  });

  res.json({ leagueId: id, leagueName: league.name, season: league.season, fixtures });
});

// POST /leagues — create new league/season
router.post("/leagues", requireAdmin, async (req, res) => {
  try {
    const { name, description, season, logoUrl, leagueType, teamIds } = req.body;
    const [league] = await db
      .insert(leaguesTable)
      .values({ name, description, season, logoUrl, leagueType: leagueType ?? "league" })
      .returning();

    // Set participants if provided
    if (Array.isArray(teamIds) && teamIds.length > 0) {
      await db.insert(leagueParticipantsTable).values(
        teamIds.map((teamId: number) => ({ leagueId: league.id, teamId }))
      );
    }

    res.status(201).json({ ...league, teamCount: teamIds?.length ?? 0 });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /leagues/:id — update league metadata
router.put("/leagues/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, season, logoUrl, leagueType, isLocked, teamIds } = req.body;
  const updateData: any = { name, description, season, logoUrl };
  if (leagueType !== undefined) updateData.leagueType = leagueType;
  if (isLocked !== undefined) updateData.isLocked = isLocked;
  const [league] = await db.update(leaguesTable).set(updateData).where(eq(leaguesTable.id, id)).returning();
  if (!league) return res.status(404).json({ error: "Not found" });

  // Update participants if provided
  if (Array.isArray(teamIds)) {
    await db.delete(leagueParticipantsTable).where(eq(leagueParticipantsTable.leagueId, id));
    if (teamIds.length > 0) {
      await db.insert(leagueParticipantsTable).values(
        teamIds.map((teamId: number) => ({ leagueId: id, teamId }))
      );
    }
  }

  res.json(league);
});

// DELETE /leagues/:id
router.delete("/leagues/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(leagueParticipantsTable).where(eq(leagueParticipantsTable.leagueId, id));
  await db.delete(leaguesTable).where(eq(leaguesTable.id, id));
  res.json({ success: true });
});

// ─── Fixture Schedule ───────────────────────────────────────────────────────

// Round-robin generator — returns { matchday, homeTeamId, awayTeamId }[]
function generateRoundRobin(teamIds: number[], rounds: number) {
  const fixtures: { matchday: number; homeTeamId: number; awayTeamId: number }[] = [];
  const teams = [...teamIds];
  const isOdd = teams.length % 2 !== 0;
  if (isOdd) teams.push(-1); // -1 = bye slot

  const n = teams.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;

  for (let round = 0; round < totalRounds; round++) {
    for (let m = 0; m < matchesPerRound; m++) {
      const home = teams[m];
      const away = teams[n - 1 - m];
      if (home !== -1 && away !== -1) {
        fixtures.push({ matchday: round + 1, homeTeamId: home, awayTeamId: away });
      }
    }
    // Rotate: keep index 0 fixed, rotate the rest clockwise
    const last = teams.splice(n - 1, 1)[0];
    teams.splice(1, 0, last);
  }

  // Additional rounds: swap home/away for even rounds
  for (let r = 2; r <= rounds; r++) {
    const firstPass = fixtures.filter(f => f.matchday <= totalRounds);
    for (const f of firstPass) {
      fixtures.push({
        matchday: f.matchday + totalRounds * (r - 1),
        homeTeamId: r % 2 === 0 ? f.awayTeamId : f.homeTeamId,
        awayTeamId: r % 2 === 0 ? f.homeTeamId : f.awayTeamId,
      });
    }
  }

  return fixtures;
}

// GET /leagues/:id/fixture-schedule
router.get("/leagues/:id/fixture-schedule", async (req, res) => {
  try {
    const leagueId = parseInt(req.params.id);
    const [fixtures, teams, matches] = await Promise.all([
      db.select().from(leagueFixturesTable).where(eq(leagueFixturesTable.leagueId, leagueId)),
      db.select().from(teamsTable),
      db.select().from(matchesTable).where(eq(matchesTable.leagueId, leagueId)),
    ]);
    const teamMap = new Map(teams.map(t => [t.id, t]));
    const matchMap = new Map(matches.map(m => [m.id, m]));

    const result = fixtures
      .sort((a, b) => a.matchday - b.matchday || a.id - b.id)
      .map(f => {
        const home = teamMap.get(f.homeTeamId);
        const away = teamMap.get(f.awayTeamId);
        const match = f.matchId ? matchMap.get(f.matchId) : null;
        return {
          id: f.id,
          leagueId: f.leagueId,
          matchday: f.matchday,
          homeTeamId: f.homeTeamId,
          homeTeamName: home?.name ?? "TBD",
          homeTeamLogoUrl: home?.logoUrl ?? null,
          awayTeamId: f.awayTeamId,
          awayTeamName: away?.name ?? "TBD",
          awayTeamLogoUrl: away?.logoUrl ?? null,
          scheduledDate: f.scheduledDate ?? null,
          matchId: f.matchId ?? null,
          status: f.status,
          homeScore: match?.team1Id === f.homeTeamId ? match?.team1Score : match?.team2Score ?? null,
          awayScore: match?.team1Id === f.homeTeamId ? match?.team2Score : match?.team1Score ?? null,
        };
      });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /leagues/:id/fixture-schedule/generate
router.post("/leagues/:id/fixture-schedule/generate", requireAdmin, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.id);
    const { rounds = 1, clearExisting = true } = req.body as { rounds?: number; clearExisting?: boolean };

    const teamIds = await getParticipantTeamIds(leagueId);
    if (teamIds.length < 2) {
      return res.status(400).json({ error: "Need at least 2 participating teams to generate fixtures" });
    }

    if (clearExisting) {
      await db.delete(leagueFixturesTable).where(eq(leagueFixturesTable.leagueId, leagueId));
    }

    const generated = generateRoundRobin(teamIds, Math.max(1, Math.min(rounds, 4)));

    if (generated.length > 0) {
      await db.insert(leagueFixturesTable).values(
        generated.map(f => ({ leagueId, matchday: f.matchday, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, status: "pending" }))
      );
    }

    // Update rounds setting on league
    await db.update(leaguesTable).set({ fixtureRounds: rounds }).where(eq(leaguesTable.id, leagueId));

    res.json({ generated: generated.length, matchdays: Math.max(...generated.map(f => f.matchday), 0) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /leagues/:id/fixture-schedule
router.delete("/leagues/:id/fixture-schedule", requireAdmin, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.id);
    await db.delete(leagueFixturesTable).where(eq(leagueFixturesTable.leagueId, leagueId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PATCH /fixture-schedule/:id/result — enter or update result, creates/updates a match record
router.patch("/fixture-schedule/:id/result", requireAdmin, async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.id);
    const { date, homeScore, awayScore, playerMatchups, notes } = req.body;

    const [fixture] = await db.select().from(leagueFixturesTable).where(eq(leagueFixturesTable.id, fixtureId));
    if (!fixture) return res.status(404).json({ error: "Fixture not found" });

    const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, fixture.leagueId));

    let matchId = fixture.matchId;

    if (matchId) {
      // Update existing match
      await db.update(matchesTable).set({
        date: date ?? new Date().toISOString(),
        team1Score: Number(homeScore),
        team2Score: Number(awayScore),
        notes: notes ?? null,
      }).where(eq(matchesTable.id, matchId));

      await db.delete(playerMatchupsTable).where(eq(playerMatchupsTable.matchId, matchId));
    } else {
      // Create new match
      const [newMatch] = await db.insert(matchesTable).values({
        date: date ?? new Date().toISOString(),
        team1Id: fixture.homeTeamId,
        team2Id: fixture.awayTeamId,
        team1Score: Number(homeScore),
        team2Score: Number(awayScore),
        leagueId: fixture.leagueId,
        season: league?.season ?? null,
        matchType: "league",
        notes: notes ?? null,
      }).returning();
      matchId = newMatch.id;
    }

    // Insert player matchups
    if (playerMatchups && playerMatchups.length > 0) {
      await db.insert(playerMatchupsTable).values(
        playerMatchups.map((m: any) => ({
          matchId: matchId!,
          player1Id: Number(m.player1Id),
          player2Id: Number(m.player2Id),
          player1Goals: Number(m.player1Goals),
          player2Goals: Number(m.player2Goals),
          mvpPlayerId: m.mvpPlayerId ? Number(m.mvpPlayerId) : null,
        }))
      );
    }

    // Mark fixture as played
    await db.update(leagueFixturesTable).set({ status: "played", matchId }).where(eq(leagueFixturesTable.id, fixtureId));

    recalculateAllMarketValues("Fixture result entered").catch(console.error);
    recalculateAllTeamIncomes("Fixture result entered").catch(console.error);

    res.json({ success: true, matchId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PATCH /fixture-schedule/:id/date — update scheduled date
router.patch("/fixture-schedule/:id/date", requireAdmin, async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.id);
    const { scheduledDate } = req.body;
    await db.update(leagueFixturesTable).set({ scheduledDate: scheduledDate ?? null }).where(eq(leagueFixturesTable.id, fixtureId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /fixture-schedule/:id
router.delete("/fixture-schedule/:id", requireAdmin, async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.id);
    const [fixture] = await db.select().from(leagueFixturesTable).where(eq(leagueFixturesTable.id, fixtureId));
    if (!fixture) return res.status(404).json({ error: "Fixture not found" });

    // If linked to a match, delete the match too
    if (fixture.matchId) {
      await db.delete(playerMatchupsTable).where(eq(playerMatchupsTable.matchId, fixture.matchId));
      await db.delete(matchesTable).where(eq(matchesTable.id, fixture.matchId));
    }

    await db.delete(leagueFixturesTable).where(eq(leagueFixturesTable.id, fixtureId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /leagues/:id/rules — save promotion/relegation/playoff rules
router.put("/leagues/:id/rules", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rules } = req.body;
    await db.update(leaguesTable).set({ leagueRules: JSON.stringify(rules) }).where(eq(leaguesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /leagues/:id — full league detail with standings + player stats

router.get("/leagues/:id/supercup", async (req, res) => {
  try {
    const leagueId = parseInt(req.params.id);
    const [allMatches, allMatchups, allTeams, allPlayers] = await Promise.all([
      db.select().from(matchesTable).where(
        sql`${matchesTable.leagueId} = ${leagueId} AND ${matchesTable.matchType} = 'supercup'`
      ),
      db.select().from(playerMatchupsTable),
      db.select().from(teamsTable),
      db.select().from(playersTable),
    ]);

    const teamMap = new Map(allTeams.map(t => [t.id, t]));
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));
    const matchupsByMatch = new Map<number, any[]>();
    for (const mu of allMatchups) {
      if (!matchupsByMatch.has(mu.matchId)) matchupsByMatch.set(mu.matchId, []);
      matchupsByMatch.get(mu.matchId)!.push({
        id: mu.id,
        player1Id: mu.player1Id,
        player2Id: mu.player2Id,
        player1Goals: mu.player1Goals,
        player2Goals: mu.player2Goals,
        mvpPlayerId: mu.mvpPlayerId ?? null,
        player1Name: playerMap.get(mu.player1Id)?.name ?? "?",
        player1ImageUrl: playerMap.get(mu.player1Id)?.imageUrl ?? null,
        player2Name: playerMap.get(mu.player2Id)?.name ?? "?",
        player2ImageUrl: playerMap.get(mu.player2Id)?.imageUrl ?? null,
      });
    }

    const result = allMatches.map(m => ({
      id: m.id,
      date: m.date,
      team1Id: m.team1Id,
      team2Id: m.team2Id,
      team1Name: teamMap.get(m.team1Id)?.name ?? "?",
      team1LogoUrl: teamMap.get(m.team1Id)?.logoUrl ?? null,
      team2Name: teamMap.get(m.team2Id)?.name ?? "?",
      team2LogoUrl: teamMap.get(m.team2Id)?.logoUrl ?? null,
      team1Score: m.team1Score,
      team2Score: m.team2Score,
      superCupLeg: m.superCupLeg,
      matchType: m.matchType,
      notes: m.notes ?? null,
      matchups: matchupsByMatch.get(m.id) ?? [],
    })).sort((a, b) => (a.superCupLeg ?? 0) - (b.superCupLeg ?? 0));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
