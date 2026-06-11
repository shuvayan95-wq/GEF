import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  matchesTable,
  playerMatchupsTable,
  teamsTable,
  playersTable,
  leaguesTable,
} from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";
import { recalculateAllMarketValues } from "../lib/marketValue.js";
import { recalculateAllTeamIncomes } from "../lib/incomeCalculator.js";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function buildMatch(match: any) {
  const [team1] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, match.team1Id));
  const [team2] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, match.team2Id));
  const matchups = await db
    .select()
    .from(playerMatchupsTable)
    .where(eq(playerMatchupsTable.matchId, match.id));
  const matchupsWithNames = await Promise.all(
    matchups.map(async (m) => {
      const [p1] = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.id, m.player1Id));
      const [p2] = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.id, m.player2Id));
      return {
        id: m.id,
        matchId: m.matchId,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        player1Name: p1?.name ?? "Unknown",
        player1ImageUrl: p1?.imageUrl ?? null,
        player2Name: p2?.name ?? "Unknown",
        player2ImageUrl: p2?.imageUrl ?? null,
        player1Goals: m.player1Goals,
        player2Goals: m.player2Goals,
        mvpPlayerId: m.mvpPlayerId ?? null,
      };
    }),
  );

  let leagueName: string | null = null;
  if (match.leagueId) {
    const [league] = await db
      .select()
      .from(leaguesTable)
      .where(eq(leaguesTable.id, match.leagueId));
    leagueName = league?.name ?? null;
  }

  return {
    id: match.id,
    date: match.date,
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    team1Name: team1?.name ?? "Team 1",
    team1LogoUrl: team1?.logoUrl ?? null,
    team2Name: team2?.name ?? "Team 2",
    team2LogoUrl: team2?.logoUrl ?? null,
    team1Score: match.team1Score,
    team2Score: match.team2Score,
    leagueId: match.leagueId ?? null,
    leagueName,
    matchType: match.matchType ?? "league",
    superCupLeg: match.superCupLeg ?? null,
    playerMatchups: matchupsWithNames,
    notes: match.notes ?? null,
    createdAt: match.createdAt.toISOString(),
  };
}

router.get("/matches", async (req, res) => {
  try {
    const [matches, allMatchups, teams, players, leagues] = await Promise.all([
      db.select().from(matchesTable).orderBy(sql`${matchesTable.date} DESC`),
      db.select().from(playerMatchupsTable),
      db.select().from(teamsTable),
      db.select().from(playersTable),
      db.select().from(leaguesTable),
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));
    const playerMap = new Map(players.map(p => [p.id, p]));
    const leagueMap = new Map(leagues.map(l => [l.id, l]));
    const matchupsByMatch = new Map<number, any[]>();
    for (const m of allMatchups) {
      if (!matchupsByMatch.has(m.matchId)) matchupsByMatch.set(m.matchId, []);
      matchupsByMatch.get(m.matchId)!.push(m);
    }

    const result = matches.map(match => {
      const team1 = teamMap.get(match.team1Id);
      const team2 = teamMap.get(match.team2Id);
      const league = match.leagueId ? leagueMap.get(match.leagueId) : null;
      const matchups = matchupsByMatch.get(match.id) ?? [];
      const matchupsWithNames = matchups.map(m => ({
        id: m.id,
        matchId: m.matchId,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        player1Name: playerMap.get(m.player1Id)?.name ?? "Unknown",
        player1ImageUrl: playerMap.get(m.player1Id)?.imageUrl ?? null,
        player2Name: playerMap.get(m.player2Id)?.name ?? "Unknown",
        player2ImageUrl: playerMap.get(m.player2Id)?.imageUrl ?? null,
        player1Goals: m.player1Goals,
        player2Goals: m.player2Goals,
        mvpPlayerId: m.mvpPlayerId ?? null,
      }));
      return {
        id: match.id,
        date: match.date,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        team1Name: team1?.name ?? "Team 1",
        team1LogoUrl: team1?.logoUrl ?? null,
        team2Name: team2?.name ?? "Team 2",
        team2LogoUrl: team2?.logoUrl ?? null,
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        leagueId: match.leagueId ?? null,
        leagueName: league?.name ?? null,
        matchType: match.matchType ?? "league",
        superCupLeg: match.superCupLeg ?? null,
        playerMatchups: matchupsWithNames,
        notes: match.notes ?? null,
        createdAt: match.createdAt.toISOString(),
      };
    });

    res.json(result);
  } catch (err: any) {
    console.error("Error fetching matches:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch matches" });
  }
});

router.get("/matches/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(await buildMatch(match));
  } catch (err: any) {
    console.error("Error fetching match:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch match" });
  }
});

router.post("/matches", requireAdmin, async (req, res) => {
  try {
    const {
      date,
      team1Id,
      team2Id,
      team1Score,
      team2Score,
      playerMatchups,
      notes,
      leagueId,
      matchType,
      superCupLeg,
    } = req.body;

    const resolvedType = matchType ?? "league";

    if (resolvedType === "league" && !leagueId) {
      return res.status(400).json({ error: "League is required" });
    }

    let league = null;
    if (leagueId) {
      const rows = await db.select().from(leaguesTable).where(eq(leaguesTable.id, Number(leagueId)));
      league = rows[0] ?? null;
      if (!league) return res.status(400).json({ error: "Invalid league — league not found" });
    }

    const [match] = await db
      .insert(matchesTable)
      .values({
        date,
        team1Id: Number(team1Id),
        team2Id: Number(team2Id),
        team1Score: Number(team1Score),
        team2Score: Number(team2Score),
        notes: notes ?? null,
        leagueId: leagueId ? Number(leagueId) : null,
        season: league?.season ?? null,
        matchType: resolvedType,
        superCupLeg: superCupLeg ? Number(superCupLeg) : null,
      })
      .returning();

    if (playerMatchups && playerMatchups.length > 0) {
      await db.insert(playerMatchupsTable).values(
        playerMatchups.map((m: any) => ({
          matchId: match.id,
          player1Id: Number(m.player1Id),
          player2Id: Number(m.player2Id),
          player1Goals: Number(m.player1Goals),
          player2Goals: Number(m.player2Goals),
          mvpPlayerId: m.mvpPlayerId ? Number(m.mvpPlayerId) : null,
        })),
      );
    }

    recalculateAllMarketValues("Match result added").catch(console.error);
    recalculateAllTeamIncomes("Match added").catch(console.error);

    res.status(201).json(await buildMatch(match));
  } catch (err: any) {
    console.error("Error creating match:", err);
    res.status(500).json({ error: err?.message || "Failed to save match" });
  }
});

router.put("/matches/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { date, team1Score, team2Score, playerMatchups, notes } = req.body;

  const [match] = await db
    .update(matchesTable)
    .set({ date, team1Score, team2Score, notes })
    .where(eq(matchesTable.id, id))
    .returning();

  if (!match) return res.status(404).json({ error: "Match not found" });

  if (playerMatchups !== undefined) {
    await db
      .delete(playerMatchupsTable)
      .where(eq(playerMatchupsTable.matchId, id));
    if (playerMatchups.length > 0) {
      await db.insert(playerMatchupsTable).values(
        playerMatchups.map((m: any) => ({
          matchId: id,
          player1Id: m.player1Id,
          player2Id: m.player2Id,
          player1Goals: m.player1Goals,
          player2Goals: m.player2Goals,
          mvpPlayerId: m.mvpPlayerId ?? null,
        })),
      );
    }
  }

  recalculateAllMarketValues("Match result updated").catch(console.error);
  recalculateAllTeamIncomes("Match updated").catch(console.error);

  res.json(await buildMatch(match));
});

router.delete("/matches/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db
    .delete(playerMatchupsTable)
    .where(eq(playerMatchupsTable.matchId, id));
  await db.delete(matchesTable).where(eq(matchesTable.id, id));
  recalculateAllTeamIncomes("Match deleted").catch(console.error);
  res.json({ success: true, message: "Match deleted" });
});

router.get("/h2h", async (req, res) => {
  const matchups = await db.select().from(playerMatchupsTable);
  const pairMap = new Map<string, any>();

  for (const m of matchups) {
    const key = [
      Math.min(m.player1Id, m.player2Id),
      Math.max(m.player1Id, m.player2Id),
    ].join("_");
    if (!pairMap.has(key)) {
      pairMap.set(key, {
        player1Id: Math.min(m.player1Id, m.player2Id),
        player2Id: Math.max(m.player1Id, m.player2Id),
        totalGames: 0,
        player1Wins: 0,
        player2Wins: 0,
        draws: 0,
        player1Goals: 0,
        player2Goals: 0,
      });
    }
    const entry = pairMap.get(key)!;
    entry.totalGames++;

    const isNaturalOrder = m.player1Id === entry.player1Id;
    const p1Goals = isNaturalOrder ? m.player1Goals : m.player2Goals;
    const p2Goals = isNaturalOrder ? m.player2Goals : m.player1Goals;
    entry.player1Goals += p1Goals;
    entry.player2Goals += p2Goals;

    if (p1Goals > p2Goals) entry.player1Wins++;
    else if (p2Goals > p1Goals) entry.player2Wins++;
    else entry.draws++;
  }

  const allPlayers = await db.select().from(playersTable);
  const playerMap = new Map(allPlayers.map(p => [p.id, p]));

  const records = Array.from(pairMap.values()).map((r) => {
    const p1 = playerMap.get(r.player1Id);
    const p2 = playerMap.get(r.player2Id);
    const closeness =
      r.totalGames > 0
        ? 1 - Math.abs(r.player1Wins - r.player2Wins) / r.totalGames
        : 0;
    const rivalryScore = r.totalGames * closeness;
    return {
      ...r,
      player1Name: p1?.name ?? "Unknown",
      player2Name: p2?.name ?? "Unknown",
      player1ImageUrl: p1?.imageUrl ?? null,
      player2ImageUrl: p2?.imageUrl ?? null,
      rivalryScore: Math.round(rivalryScore * 100) / 100,
    };
  });

  records.sort((a, b) => b.rivalryScore - a.rivalryScore);
  res.json(records);
});

router.get("/h2h/player", async (req, res) => {
  const player1Id = parseInt(req.query.player1Id as string);
  const player2Id = parseInt(req.query.player2Id as string);

  const [p1] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, player1Id));
  const [p2] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, player2Id));
  if (!p1 || !p2) return res.status(404).json({ error: "Player not found" });

  const matchups = await db
    .select()
    .from(playerMatchupsTable)
    .where(
      sql`(${playerMatchupsTable.player1Id} = ${player1Id} AND ${playerMatchupsTable.player2Id} = ${player2Id}) OR (${playerMatchupsTable.player1Id} = ${player2Id} AND ${playerMatchupsTable.player2Id} = ${player1Id})`,
    );

  let p1Wins = 0,
    p2Wins = 0,
    draws = 0,
    p1Goals = 0,
    p2Goals = 0;
  const matchIds = new Set<number>();
  for (const m of matchups) {
    matchIds.add(m.matchId);
    const p1g = m.player1Id === player1Id ? m.player1Goals : m.player2Goals;
    const p2g = m.player1Id === player2Id ? m.player1Goals : m.player2Goals;
    p1Goals += p1g;
    p2Goals += p2g;
    if (p1g > p2g) p1Wins++;
    else if (p2g > p1g) p2Wins++;
    else draws++;
  }

  const matchIdArr = Array.from(matchIds);
  const [allMatchRows, allMatchupRows, allTeams, allPlayerRows] = await Promise.all([
    matchIdArr.length > 0
      ? db.select().from(matchesTable).where(inArray(matchesTable.id, matchIdArr))
      : Promise.resolve([] as any[]),
    matchIdArr.length > 0
      ? db.select().from(playerMatchupsTable).where(inArray(playerMatchupsTable.matchId, matchIdArr))
      : Promise.resolve([] as any[]),
    db.select().from(teamsTable),
    db.select().from(playersTable),
  ]);

  const matchRowMap = new Map(allMatchRows.map(m => [m.id, m]));
  const teamRowMap = new Map(allTeams.map(t => [t.id, t]));
  const playerRowMap = new Map(allPlayerRows.map(p => [p.id, p]));
  const matchupsByMatchId = new Map<number, any[]>();
  for (const mu of allMatchupRows) {
    if (!matchupsByMatchId.has(mu.matchId)) matchupsByMatchId.set(mu.matchId, []);
    matchupsByMatchId.get(mu.matchId)!.push(mu);
  }

  const matchesList = matchIdArr.map((mid) => {
    const match = matchRowMap.get(mid);
    if (!match) return null;
    const t1 = teamRowMap.get(match.team1Id);
    const t2 = teamRowMap.get(match.team2Id);
    const muList = matchupsByMatchId.get(mid) ?? [];
    const matchupsWithNames = muList.map((mu) => ({
      id: mu.id,
      matchId: mu.matchId,
      player1Id: mu.player1Id,
      player2Id: mu.player2Id,
      player1Name: playerRowMap.get(mu.player1Id)?.name ?? "Unknown",
      player2Name: playerRowMap.get(mu.player2Id)?.name ?? "Unknown",
      player1Goals: mu.player1Goals,
      player2Goals: mu.player2Goals,
      mvpPlayerId: mu.mvpPlayerId ?? null,
    }));
    return {
      id: match.id,
      date: match.date,
      team1Id: match.team1Id,
      team2Id: match.team2Id,
      team1Name: t1?.name ?? "Team 1",
      team2Name: t2?.name ?? "Team 2",
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      playerMatchups: matchupsWithNames,
      notes: match.notes ?? null,
      createdAt: match.createdAt.toISOString(),
    };
  });

  const closeness =
    matchups.length > 0 ? 1 - Math.abs(p1Wins - p2Wins) / matchups.length : 0;
  const rivalryScore = matchups.length * closeness;

  res.json({
    player1: {
      id: p1.id,
      name: p1.name,
      imageUrl: p1.imageUrl ?? null,
      position: p1.position ?? null,
      teamId: p1.teamId ?? null,
      teamName: null,
      nationality: p1.nationality ?? null,
      marketValue: null,
      salary: null,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      goalsScored: 0,
      goalsConceded: 0,
      mvpCount: 0,
      overallRating: 50,
      createdAt: p1.createdAt.toISOString(),
    },
    player2: {
      id: p2.id,
      name: p2.name,
      imageUrl: p2.imageUrl ?? null,
      position: p2.position ?? null,
      teamId: p2.teamId ?? null,
      teamName: null,
      nationality: p2.nationality ?? null,
      marketValue: null,
      salary: null,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      goalsScored: 0,
      goalsConceded: 0,
      mvpCount: 0,
      overallRating: 50,
      createdAt: p2.createdAt.toISOString(),
    },
    h2h: {
      player1Id,
      player2Id,
      player1Name: p1.name,
      player2Name: p2.name,
      player1ImageUrl: p1.imageUrl ?? null,
      player2ImageUrl: p2.imageUrl ?? null,
      totalGames: matchups.length,
      player1Wins: p1Wins,
      player2Wins: p2Wins,
      draws,
      player1Goals: p1Goals,
      player2Goals: p2Goals,
      rivalryScore: Math.round(rivalryScore * 100) / 100,
    },
    matches: matchesList.filter(Boolean),
  });
});

// GET /rivals — top team and player rivalries computed from match history
router.get("/rivals", async (_req, res) => {
  try {
    const [allMatches, allMatchups, allTeams, allPlayers] = await Promise.all([
      db.select().from(matchesTable),
      db.select().from(playerMatchupsTable),
      db.select().from(teamsTable),
      db.select().from(playersTable),
    ]);

    const teamMap = new Map(allTeams.map(t => [t.id, t]));
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));

    // ── Team Rivalries ──────────────────────────────────────────────
    const teamRivalMap = new Map<string, {
      teamAId: number; teamBId: number;
      teamAWins: number; teamBWins: number; draws: number; total: number;
    }>();

    for (const m of allMatches) {
      const aId = Math.min(m.team1Id, m.team2Id);
      const bId = Math.max(m.team1Id, m.team2Id);
      const key = `${aId}-${bId}`;
      const entry = teamRivalMap.get(key) ?? { teamAId: aId, teamBId: bId, teamAWins: 0, teamBWins: 0, draws: 0, total: 0 };
      entry.total++;
      if (m.team1Score > m.team2Score) {
        if (m.team1Id === aId) entry.teamAWins++; else entry.teamBWins++;
      } else if (m.team2Score > m.team1Score) {
        if (m.team2Id === aId) entry.teamAWins++; else entry.teamBWins++;
      } else {
        entry.draws++;
      }
      teamRivalMap.set(key, entry);
    }

    const teamRivals = Array.from(teamRivalMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(r => {
        const teamA = teamMap.get(r.teamAId);
        const teamB = teamMap.get(r.teamBId);
        return {
          teamAId: r.teamAId,
          teamBId: r.teamBId,
          teamAName: teamA?.name ?? "Team A",
          teamBName: teamB?.name ?? "Team B",
          teamALogoUrl: teamA?.logoUrl ?? null,
          teamBLogoUrl: teamB?.logoUrl ?? null,
          teamAWins: r.teamAWins,
          teamBWins: r.teamBWins,
          draws: r.draws,
          total: r.total,
        };
      });

    // ── Player Rivalries ────────────────────────────────────────────
    const playerRivalMap = new Map<string, {
      p1Id: number; p2Id: number;
      p1Wins: number; p2Wins: number; draws: number; total: number;
      p1Goals: number; p2Goals: number;
    }>();

    for (const mu of allMatchups) {
      const aId = Math.min(mu.player1Id, mu.player2Id);
      const bId = Math.max(mu.player1Id, mu.player2Id);
      const key = `${aId}-${bId}`;
      const entry = playerRivalMap.get(key) ?? { p1Id: aId, p2Id: bId, p1Wins: 0, p2Wins: 0, draws: 0, total: 0, p1Goals: 0, p2Goals: 0 };
      entry.total++;

      const aGoals = mu.player1Id === aId ? mu.player1Goals : mu.player2Goals;
      const bGoals = mu.player2Id === bId ? mu.player2Goals : mu.player1Goals;
      entry.p1Goals += aGoals;
      entry.p2Goals += bGoals;

      if (aGoals > bGoals) entry.p1Wins++;
      else if (bGoals > aGoals) entry.p2Wins++;
      else entry.draws++;

      playerRivalMap.set(key, entry);
    }

    const playerRivals = Array.from(playerRivalMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(r => {
        const p1 = playerMap.get(r.p1Id);
        const p2 = playerMap.get(r.p2Id);
        return {
          p1Id: r.p1Id,
          p2Id: r.p2Id,
          p1Name: p1?.name ?? "Player A",
          p2Name: p2?.name ?? "Player B",
          p1ImageUrl: p1?.imageUrl ?? null,
          p2ImageUrl: p2?.imageUrl ?? null,
          p1Wins: r.p1Wins,
          p2Wins: r.p2Wins,
          draws: r.draws,
          total: r.total,
          p1Goals: r.p1Goals,
          p2Goals: r.p2Goals,
        };
      });

    res.json({ teamRivals, playerRivals });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
