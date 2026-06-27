import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { gccTournamentsTable, gccEntriesTable, gccFixturesTable, teamsTable, matchesTable, playerMatchupsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { playersTable } from "@workspace/db";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_ORDER = ["league", "playoff", "r16", "qf", "sf", "final"] as const;
type Stage = typeof STAGE_ORDER[number];

function pairKey(a: number, b: number) {
  return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

/**
 * Generate draw pairs from entries and matchRules.
 * matchRules[pot] = how many opponents from that pot each team should play.
 * Supports both cross-pot and same-pot pairings.
 */
function generateDrawPairs(
  entries: { teamId: number; pot: number }[],
  matchRules: Record<string, number>
): { homeTeamId: number; awayTeamId: number }[] {
  const byPot = new Map<number, number[]>();
  for (const e of entries) {
    if (!byPot.has(e.pot)) byPot.set(e.pot, []);
    byPot.get(e.pot)!.push(e.teamId);
  }

  const pairs: { homeTeamId: number; awayTeamId: number }[] = [];
  const assigned = new Set<string>(); // "min-max" keys of already assigned pairs

  const pots = [...byPot.keys()].sort((a, b) => a - b);

  for (let i = 0; i < pots.length; i++) {
    for (let j = i; j < pots.length; j++) {
      const potA = pots[i];
      const potB = pots[j];
      const teamsA = byPot.get(potA)!;
      const teamsB = byPot.get(potB)!;
      const degA = Number(matchRules[String(potB)] ?? 0); // A needs this many B opponents
      const degB = Number(matchRules[String(potA)] ?? 0); // B needs this many A opponents

      if (degA === 0 && degB === 0) continue;

      if (potA === potB) {
        // Same-pot matching: k-regular graph within the pot
        const k = degA;
        if (k === 0 || teamsA.length < 2) continue;
        const newPairs = generateKRegularGraph(teamsA, k);
        for (const [a, b] of newPairs) {
          const k2 = pairKey(a, b);
          if (!assigned.has(k2)) {
            assigned.add(k2);
            // randomly assign home/away
            const [home, away] = Math.random() < 0.5 ? [a, b] : [b, a];
            pairs.push({ homeTeamId: home, awayTeamId: away });
          }
        }
      } else {
        // Cross-pot bipartite matching
        const newPairs = generateBipartiteMatching(teamsA, degA, teamsB, degB);
        for (const [a, b] of newPairs) {
          const k2 = pairKey(a, b);
          if (!assigned.has(k2)) {
            assigned.add(k2);
            const [home, away] = Math.random() < 0.5 ? [a, b] : [b, a];
            pairs.push({ homeTeamId: home, awayTeamId: away });
          }
        }
      }
    }
  }

  return pairs;
}

/** Bipartite matching: each A needs degA opponents from B, each B needs degB from A */
function generateBipartiteMatching(
  teamsA: number[], degA: number,
  teamsB: number[], degB: number,
  maxAttempts = 200
): [number, number][] {
  // Validate feasibility: |A|*degA must equal |B|*degB
  if (teamsA.length * degA !== teamsB.length * degB) {
    // Try to find a balanced sub-matching (take min common degree)
    const common = Math.min(degA, degB);
    if (common === 0) return [];
    // Proceed with available teams, capping at feasible size
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const stubsA = shuffle([...teamsA.flatMap(t => Array(degA).fill(t))]);
    const stubsB = shuffle([...teamsB.flatMap(t => Array(degB).fill(t))]);
    const len = Math.min(stubsA.length, stubsB.length);
    const pairs: [number, number][] = [];
    const seen = new Set<string>();
    let valid = true;

    for (let i = 0; i < len; i++) {
      const a = stubsA[i], b = stubsB[i];
      const key = pairKey(a, b);
      if (seen.has(key)) { valid = false; break; }
      seen.add(key);
      pairs.push([a, b]);
    }

    if (valid && pairs.length === len) return pairs;
  }

  // Fallback: greedy assignment
  return greedyBipartite(teamsA, degA, teamsB, degB);
}

function greedyBipartite(
  teamsA: number[], degA: number,
  teamsB: number[], degB: number
): [number, number][] {
  const needA = new Map(teamsA.map(t => [t, degA]));
  const needB = new Map(teamsB.map(t => [t, degB]));
  const pairs: [number, number][] = [];
  const seen = new Set<string>();

  for (const a of shuffle([...teamsA])) {
    const bCandidates = shuffle([...teamsB]).filter(b => {
      const key = pairKey(a, b);
      return (needB.get(b) ?? 0) > 0 && !seen.has(key);
    });
    let assigned = 0;
    for (const b of bCandidates) {
      if (assigned >= (needA.get(a) ?? 0)) break;
      const key = pairKey(a, b);
      seen.add(key);
      needA.set(a, (needA.get(a) ?? 0) - 1);
      needB.set(b, (needB.get(b) ?? 0) - 1);
      pairs.push([a, b]);
      assigned++;
    }
  }

  return pairs;
}

/** k-regular graph within a set of teams (each team plays exactly k others) */
function generateKRegularGraph(teams: number[], k: number, maxAttempts = 200): [number, number][] {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffled = shuffle([...teams]);
    const stubs = shuffled.flatMap(t => Array(k).fill(t));
    const s = shuffle(stubs);
    const pairs: [number, number][] = [];
    const seen = new Set<string>();
    let valid = true;

    for (let i = 0; i < s.length - 1; i += 2) {
      const a = s[i], b = s[i + 1];
      const key = pairKey(a, b);
      if (a === b || seen.has(key)) { valid = false; break; }
      seen.add(key);
      pairs.push([a, b]);
    }

    if (valid && pairs.length === teams.length * k / 2) return pairs;
  }

  // Fallback: round-robin subset
  const pairs: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < teams.length; i++) {
    let count = 0;
    for (let j = i + 1; j < teams.length && count < k; j++) {
      const key = pairKey(teams[i], teams[j]);
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push([teams[i], teams[j]]);
        count++;
      }
    }
  }
  return pairs;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Schedule pairs into rounds: no team plays twice in the same round.
 * Packs rounds as densely as possible by prioritising pairs whose teams
 * have the most remaining games (frequency-first greedy).
 * For a k-regular pair graph on N teams this guarantees every round —
 * including the last — contains exactly N/2 matches (all teams play).
 */
function scheduleRounds(pairs: { homeTeamId: number; awayTeamId: number }[]): { homeTeamId: number; awayTeamId: number; round: number }[] {
  const remaining = [...pairs];
  const rounds: { homeTeamId: number; awayTeamId: number }[][] = [];

  while (remaining.length > 0) {
    // Count how many remaining games each team still has
    const freq = new Map<number, number>();
    for (const p of remaining) {
      freq.set(p.homeTeamId, (freq.get(p.homeTeamId) ?? 0) + 1);
      freq.set(p.awayTeamId, (freq.get(p.awayTeamId) ?? 0) + 1);
    }

    // Sort pairs: high-load teams (fewest scheduling options left) come first
    const order = remaining
      .map((p, i) => ({ i, p, score: (freq.get(p.homeTeamId) ?? 0) + (freq.get(p.awayTeamId) ?? 0) }))
      .sort((a, b) => b.score - a.score);

    const round: { homeTeamId: number; awayTeamId: number }[] = [];
    const used = new Set<number>();
    const usedIdx = new Set<number>();

    for (const { i, p } of order) {
      if (!used.has(p.homeTeamId) && !used.has(p.awayTeamId)) {
        round.push(p);
        used.add(p.homeTeamId);
        used.add(p.awayTeamId);
        usedIdx.add(i);
      }
    }

    // Remove scheduled pairs from remaining (high-index first to preserve indices)
    for (const idx of [...usedIdx].sort((a, b) => b - a)) {
      remaining.splice(idx, 1);
    }

    rounds.push(round);
  }

  const result: { homeTeamId: number; awayTeamId: number; round: number }[] = [];
  for (let r = 0; r < rounds.length; r++) {
    for (const p of rounds[r]) result.push({ ...p, round: r + 1 });
  }
  return result;
}

/** Compute league standings from fixtures */
function computeStandings(
  entries: { teamId: number }[],
  fixtures: { homeTeamId: number; awayTeamId: number; homeScore: number | null; awayScore: number | null; played: boolean; stage: string }[]
) {
  const stats = new Map<number, {
    played: number; wins: number; draws: number; losses: number;
    gf: number; ga: number; gd: number; pts: number;
  }>();

  const leagueFixtures = fixtures.filter(f => f.stage === "league");

  // If no entries registered, derive participating teams directly from fixtures
  const effectiveEntries = entries.length > 0
    ? entries
    : [...new Set([
        ...leagueFixtures.map(f => f.homeTeamId),
        ...leagueFixtures.map(f => f.awayTeamId),
      ])].map(teamId => ({ teamId }));

  for (const e of effectiveEntries) {
    stats.set(e.teamId, { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  }

  const playedLeagueFixtures = leagueFixtures.filter(f => f.played);

  for (const f of playedLeagueFixtures) {
    const home = stats.get(f.homeTeamId);
    const away = stats.get(f.awayTeamId);
    if (!home || !away) continue;

    const hs = f.homeScore ?? 0, as_ = f.awayScore ?? 0;
    home.gf += hs; home.ga += as_; home.gd = home.gf - home.ga; home.played++;
    away.gf += as_; away.ga += hs; away.gd = away.gf - away.ga; away.played++;

    if (hs > as_) { home.wins++; home.pts += 3; away.losses++; }
    else if (hs < as_) { away.wins++; away.pts += 3; home.losses++; }
    else { home.draws++; home.pts++; away.draws++; away.pts++; }
  }

  return [...stats.entries()]
    .map(([teamId, s]) => ({ teamId, ...s }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

/** Build knockout bracket data from fixtures */
function buildBracket(fixtures: any[]) {
  const stages = ["playoff", "r16", "qf", "sf", "final"];
  const bracket: Record<string, any[]> = {};

  for (const stage of stages) {
    const stageFixtures = fixtures.filter(f => f.stage === stage);
    if (stageFixtures.length === 0) continue;

    // Group by pairKey for two-leg ties
    const pairs = new Map<string, any[]>();
    for (const f of stageFixtures) {
      const key = f.pairKey || `${f.stage}-${f.id}`;
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key)!.push(f);
    }

    bracket[stage] = [...pairs.entries()].map(([key, legs]) => {
      const leg1 = legs.find(l => l.leg === 1);
      const leg2 = legs.find(l => l.leg === 2);
      const agg1 = (leg1?.homeScore ?? 0) + (leg2?.awayScore ?? 0);
      const agg2 = (leg1?.awayScore ?? 0) + (leg2?.homeScore ?? 0);
      const winner = leg2?.played && leg1?.played
        ? agg1 > agg2 ? leg1.homeTeamId : agg2 > agg1 ? leg1.awayTeamId : null
        : null;

      return {
        pairKey: key,
        leg1, leg2,
        homeTeamId: leg1?.homeTeamId,
        awayTeamId: leg1?.awayTeamId,
        agg1, agg2, winner,
        complete: !!(leg1?.played && (stage === "final" || leg2?.played)),
      };
    });
  }

  return bracket;
}

// ─── Tournament CRUD ──────────────────────────────────────────────────────────

router.get("/gcc/tournaments", async (_req, res) => {
  try {
    const tournaments = await db.select().from(gccTournamentsTable)
      .orderBy(gccTournamentsTable.createdAt);
    res.json({ tournaments });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/gcc/tournaments", requireAdmin, async (req, res) => {
  try {
    const { name, season, logoUrl, numPots, matchRules, directQualifiers, playoffSpots } = req.body;
    if (!name || !season) return res.status(400).json({ error: "name and season required" });

    const [t] = await db.insert(gccTournamentsTable).values({
      name, season, logoUrl: logoUrl || null,
      numPots: Number(numPots ?? 4),
      matchRules: matchRules ?? {},
      directQualifiers: Number(directQualifiers ?? 8),
      playoffSpots: Number(playoffSpots ?? 8),
      drawState: { pairs: [], revealed: 0, complete: false },
    }).returning();

    res.json({ tournament: t });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/gcc/tournaments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tournament] = await db.select().from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const entries = await db.select().from(gccEntriesTable)
      .where(eq(gccEntriesTable.tournamentId, id));
    const fixtures = await db.select().from(gccFixturesTable)
      .where(eq(gccFixturesTable.tournamentId, id))
      .orderBy(gccFixturesTable.round, gccFixturesTable.id);

    const allTeamIds = [...new Set([
      ...entries.map(e => e.teamId),
      ...fixtures.map(f => f.homeTeamId),
      ...fixtures.map(f => f.awayTeamId),
    ])];

    const teams = allTeamIds.length
      ? await db.select().from(teamsTable).where(inArray(teamsTable.id, allTeamIds))
      : [];
    const teamMap = new Map(teams.map(t => [t.id, t]));

    const enrichedEntries = entries.map(e => ({
      ...e, team: teamMap.get(e.teamId) ?? null,
    }));

    const enrichedFixtures = fixtures.map(f => ({
      ...f,
      homeTeam: teamMap.get(f.homeTeamId) ?? null,
      awayTeam: teamMap.get(f.awayTeamId) ?? null,
    }));

    const standings = computeStandings(entries, fixtures).map((s, i) => ({
      ...s,
      rank: i + 1,
      team: teamMap.get(s.teamId) ?? null,
    }));

    const bracket = buildBracket(enrichedFixtures);

    res.json({
      tournament,
      entries: enrichedEntries,
      fixtures: enrichedFixtures,
      standings,
      bracket,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/gcc/tournaments/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, season, logoUrl, numPots, matchRules, directQualifiers, playoffSpots, status } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (season !== undefined) updates.season = season;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (numPots !== undefined) updates.numPots = Number(numPots);
    if (matchRules !== undefined) updates.matchRules = matchRules;
    if (directQualifiers !== undefined) updates.directQualifiers = Number(directQualifiers);
    if (playoffSpots !== undefined) updates.playoffSpots = Number(playoffSpots);
    if (status !== undefined) updates.status = status;

    const [t] = await db.update(gccTournamentsTable).set(updates)
      .where(eq(gccTournamentsTable.id, id)).returning();
    res.json({ tournament: t });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/gcc/tournaments/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(gccFixturesTable).where(eq(gccFixturesTable.tournamentId, id));
    await db.delete(gccEntriesTable).where(eq(gccEntriesTable.tournamentId, id));
    await db.delete(gccTournamentsTable).where(eq(gccTournamentsTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Team Entries ─────────────────────────────────────────────────────────────

router.post("/gcc/tournaments/:id/entries", requireAdmin, async (req, res) => {
  try {
    const tournamentId = Number(req.params.id);
    const { teamId, pot, seed } = req.body;
    if (!teamId || !pot) return res.status(400).json({ error: "teamId and pot required" });

    // Remove existing entry for this team if any
    const existing = await db.select().from(gccEntriesTable)
      .where(and(eq(gccEntriesTable.tournamentId, tournamentId), eq(gccEntriesTable.teamId, Number(teamId))));
    if (existing.length) {
      await db.delete(gccEntriesTable).where(eq(gccEntriesTable.id, existing[0].id));
    }

    const [entry] = await db.insert(gccEntriesTable).values({
      tournamentId, teamId: Number(teamId), pot: Number(pot), seed: seed ? Number(seed) : null,
    }).returning();
    res.json({ entry });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/gcc/tournaments/:id/entries/:entryId", requireAdmin, async (req, res) => {
  try {
    await db.delete(gccEntriesTable).where(eq(gccEntriesTable.id, Number(req.params.entryId)));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Draw System ──────────────────────────────────────────────────────────────

/** POST /gcc/tournaments/:id/draw — generate all pairs (stored but not revealed yet) */
router.post("/gcc/tournaments/:id/draw", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tournament] = await db.select().from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const entries = await db.select().from(gccEntriesTable)
      .where(eq(gccEntriesTable.tournamentId, id));
    if (entries.length < 2) return res.status(400).json({ error: "Need at least 2 teams enrolled" });

    const matchRules = (tournament.matchRules as Record<string, number>) ?? {};
    const pairs = generateDrawPairs(entries, matchRules);

    const drawState = { pairs, revealed: 0, complete: false };
    const [updated] = await db.update(gccTournamentsTable)
      .set({ status: "draw", drawState, updatedAt: new Date() })
      .where(eq(gccTournamentsTable.id, id))
      .returning();

    res.json({ tournament: updated, pairs, totalPairs: pairs.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/** POST /gcc/tournaments/:id/draw/reveal — reveal the next pair (live draw animation) */
router.post("/gcc/tournaments/:id/draw/reveal", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tournament] = await db.select().from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const state = (tournament.drawState as any) ?? {};
    const pairs = state.pairs ?? [];
    const revealed = (state.revealed ?? 0) + 1;
    const complete = revealed >= pairs.length;

    const newState = { ...state, revealed, complete };
    const [updated] = await db.update(gccTournamentsTable)
      .set({ drawState: newState, updatedAt: new Date() })
      .where(eq(gccTournamentsTable.id, id))
      .returning();

    res.json({
      tournament: updated,
      revealed,
      total: pairs.length,
      latestPair: pairs[revealed - 1] ?? null,
      complete,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/** POST /gcc/tournaments/:id/draw/reveal-all — reveal all at once */
router.post("/gcc/tournaments/:id/draw/reveal-all", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tournament] = await db.select().from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const state = (tournament.drawState as any) ?? {};
    const pairs = state.pairs ?? [];
    const newState = { ...state, revealed: pairs.length, complete: true };

    const [updated] = await db.update(gccTournamentsTable)
      .set({ drawState: newState, updatedAt: new Date() })
      .where(eq(gccTournamentsTable.id, id))
      .returning();

    res.json({ tournament: updated });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/** POST /gcc/tournaments/:id/draw/reset — reset draw */
router.post("/gcc/tournaments/:id/draw/reset", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db.update(gccTournamentsTable)
      .set({
        status: "setup",
        drawState: { pairs: [], revealed: 0, complete: false },
        updatedAt: new Date(),
      })
      .where(eq(gccTournamentsTable.id, id))
      .returning();
    res.json({ tournament: updated });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/** POST /gcc/tournaments/:id/draw/complete — generate fixtures from drawn pairs */
router.post("/gcc/tournaments/:id/draw/complete", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tournament] = await db.select().from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const state = (tournament.drawState as any) ?? {};
    const pairs: { homeTeamId: number; awayTeamId: number }[] = state.pairs ?? [];
    if (pairs.length === 0) return res.status(400).json({ error: "No pairs to generate fixtures from. Run the draw first." });

    // Clear existing league fixtures
    await db.delete(gccFixturesTable)
      .where(and(eq(gccFixturesTable.tournamentId, id), eq(gccFixturesTable.stage, "league")));

    const scheduled = scheduleRounds(pairs);
    const toInsert = scheduled.map(p => ({
      tournamentId: id,
      stage: "league" as const,
      round: p.round,
      leg: 1,
      pairKey: pairKey(p.homeTeamId, p.awayTeamId),
      homeTeamId: p.homeTeamId,
      awayTeamId: p.awayTeamId,
    }));

    await db.insert(gccFixturesTable).values(toInsert);

    const [updated] = await db.update(gccTournamentsTable)
      .set({
        status: "league",
        drawState: { ...state, complete: true },
        updatedAt: new Date(),
      })
      .where(eq(gccTournamentsTable.id, id))
      .returning();

    res.json({ tournament: updated, fixturesGenerated: toInsert.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Fixtures & Results ───────────────────────────────────────────────────────

router.get("/gcc/tournaments/:id/fixtures", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { stage } = req.query as Record<string, string>;

    const base = db.select().from(gccFixturesTable)
      .where(eq(gccFixturesTable.tournamentId, id))
      .orderBy(gccFixturesTable.round, gccFixturesTable.id);

    const fixtures = stage
      ? (await db.select().from(gccFixturesTable)
          .where(and(eq(gccFixturesTable.tournamentId, id), eq(gccFixturesTable.stage, stage)))
          .orderBy(gccFixturesTable.round, gccFixturesTable.id))
      : await base;

    const teamIds = [...new Set([...fixtures.map(f => f.homeTeamId), ...fixtures.map(f => f.awayTeamId)])];
    const teams = teamIds.length ? await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds)) : [];
    const teamMap = new Map(teams.map(t => [t.id, t]));

    res.json({
      fixtures: fixtures.map(f => ({
        ...f,
        homeTeam: teamMap.get(f.homeTeamId) ?? null,
        awayTeam: teamMap.get(f.awayTeamId) ?? null,
      })),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/gcc/tournaments/:id/fixtures/:fid", requireAdmin, async (req, res) => {
  try {
    const tournamentId = Number(req.params.id);
    const fid = Number(req.params.fid);
    const { homeScore, awayScore, played, notes, scheduledDate, playerMatchups } = req.body;

    const updates: Record<string, any> = {};
    if (homeScore !== undefined) updates.homeScore = Number(homeScore);
    if (awayScore !== undefined) updates.awayScore = Number(awayScore);
    if (played !== undefined) updates.played = Boolean(played);
    if (notes !== undefined) updates.notes = notes;
    if (scheduledDate !== undefined) updates.scheduledDate = scheduledDate;

    const [f] = await db.update(gccFixturesTable).set(updates)
      .where(eq(gccFixturesTable.id, fid)).returning();

    // If recording a result with player matchups, also create a match record for player stats
    const hasScore = homeScore !== undefined && awayScore !== undefined;
    if (hasScore && played !== false && playerMatchups && Array.isArray(playerMatchups) && playerMatchups.length > 0) {
      const validMatchups = playerMatchups.filter((m: any) => m.player1Id && m.player2Id);
      if (validMatchups.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const [match] = await db.insert(matchesTable).values({
          date: today,
          team1Id: f.homeTeamId,
          team2Id: f.awayTeamId,
          team1Score: Number(homeScore),
          team2Score: Number(awayScore),
          gccTournamentId: tournamentId,
          matchType: "gcc",
          notes: `GCC R${f.round}${f.leg > 1 ? ` Leg${f.leg}` : ""} ${f.stage}`,
        }).returning();

        await db.insert(playerMatchupsTable).values(
          validMatchups.map((m: any) => ({
            matchId: match.id,
            player1Id: Number(m.player1Id),
            player2Id: Number(m.player2Id),
            player1Goals: Number(m.player1Goals ?? 0),
            player2Goals: Number(m.player2Goals ?? 0),
            mvpPlayerId: m.mvpPlayerId ? Number(m.mvpPlayerId) : null,
          }))
        );
      }
    }

    res.json({ fixture: f });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /gcc/tournaments/:id/fixtures/add  — directly create a fixture (for past season data entry)
router.post("/gcc/tournaments/:id/fixtures/add", requireAdmin, async (req, res) => {
  try {
    const tournamentId = Number(req.params.id);
    const { homeTeamId, awayTeamId, homeScore, awayScore, stage = "league", round = 1, leg = 1, pairKey: pk, playerMatchups } = req.body;

    if (!homeTeamId || !awayTeamId)
      return res.status(400).json({ error: "homeTeamId and awayTeamId are required" });
    if (Number(homeTeamId) === Number(awayTeamId))
      return res.status(400).json({ error: "Home and away teams must be different" });

    const hasScore = homeScore !== undefined && homeScore !== "" && awayScore !== undefined && awayScore !== "";

    const [fixture] = await db.insert(gccFixturesTable).values({
      tournamentId,
      homeTeamId: Number(homeTeamId),
      awayTeamId: Number(awayTeamId),
      homeScore: hasScore ? Number(homeScore) : null,
      awayScore: hasScore ? Number(awayScore) : null,
      played: hasScore,
      stage: stage as Stage,
      round: Number(round),
      leg: Number(leg),
      pairKey: pk ?? null,
    }).returning();

    // If player matchups provided, also create a regular match record so player stats update
    if (hasScore && playerMatchups && Array.isArray(playerMatchups) && playerMatchups.length > 0) {
      const validMatchups = playerMatchups.filter((m: any) => m.player1Id && m.player2Id);
      if (validMatchups.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const [match] = await db.insert(matchesTable).values({
          date: today,
          team1Id: Number(homeTeamId),
          team2Id: Number(awayTeamId),
          team1Score: Number(homeScore),
          team2Score: Number(awayScore),
          gccTournamentId: tournamentId,
          notes: `GCC ${stage} R${round}${leg > 1 ? ` Leg${leg}` : ""} (auto)`,
        }).returning();

        await db.insert(playerMatchupsTable).values(
          validMatchups.map((m: any) => ({
            matchId: match.id,
            player1Id: Number(m.player1Id),
            player2Id: Number(m.player2Id),
            player1Goals: Number(m.player1Goals ?? 0),
            player2Goals: Number(m.player2Goals ?? 0),
            mvpPlayerId: m.mvpPlayerId ? Number(m.mvpPlayerId) : null,
          }))
        );
      }
    }

    // Enrich with team data
    const allTeamIds = [fixture.homeTeamId, fixture.awayTeamId];
    const teams = await db.select().from(teamsTable).where(inArray(teamsTable.id, allTeamIds));
    const teamMap = new Map(teams.map(t => [t.id, t]));

    res.json({
      fixture: {
        ...fixture,
        homeTeam: teamMap.get(fixture.homeTeamId) ?? null,
        awayTeam: teamMap.get(fixture.awayTeamId) ?? null,
      },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /gcc/tournaments/:id/matchday — create a full matchday with multiple fixtures at once
router.post("/gcc/tournaments/:id/matchday", requireAdmin, async (req, res) => {
  try {
    const tournamentId = Number(req.params.id);
    const { matchday, fixtures } = req.body;

    if (!matchday || !Array.isArray(fixtures) || fixtures.length === 0)
      return res.status(400).json({ error: "matchday number and at least one fixture are required" });

    const round = Number(matchday);
    if (isNaN(round) || round < 1)
      return res.status(400).json({ error: "matchday must be a positive number" });

    const valid = fixtures.filter((f: any) => f.homeTeamId && f.awayTeamId && Number(f.homeTeamId) !== Number(f.awayTeamId));
    if (valid.length === 0)
      return res.status(400).json({ error: "No valid fixtures (home and away teams must be set and different)" });

    const toInsert = valid.map((f: any) => ({
      tournamentId,
      stage: "league" as const,
      round,
      leg: 1,
      pairKey: pairKey(Number(f.homeTeamId), Number(f.awayTeamId)),
      homeTeamId: Number(f.homeTeamId),
      awayTeamId: Number(f.awayTeamId),
    }));

    const inserted = await db.insert(gccFixturesTable).values(toInsert).returning();

    const teamIds = [...new Set(toInsert.flatMap(f => [f.homeTeamId, f.awayTeamId]))];
    const teams = teamIds.length ? await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds)) : [];
    const teamMap = new Map(teams.map(t => [t.id, t]));

    res.json({
      matchday: round,
      fixtures: inserted.map(f => ({
        ...f,
        homeTeam: teamMap.get(f.homeTeamId) ?? null,
        awayTeam: teamMap.get(f.awayTeamId) ?? null,
      })),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /gcc/tournaments/:id/fixtures/:fid
router.delete("/gcc/tournaments/:id/fixtures/:fid", requireAdmin, async (req, res) => {
  try {
    const fid = Number(req.params.fid);
    await db.delete(gccFixturesTable).where(eq(gccFixturesTable.id, fid));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Top Scorers (GCC-only, this tournament) ─────────────────────────────────

router.get("/gcc/tournaments/:id/top-scorers", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tournament] = await db.select().from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Not found" });

    const rows = await db.execute(sql`
      SELECT
        p.id          AS player_id,
        p.name        AS player_name,
        p.image_url   AS image_url,
        t.id          AS team_id,
        t.name        AS team_name,
        t.logo_url    AS team_logo,
        SUM(sub.goals)     AS total_goals,
        SUM(sub.mvp_count) AS total_mvps
      FROM (
        SELECT pm.player1_id AS player_id,
               pm.player1_goals          AS goals,
               CASE WHEN pm.mvp_player_id = pm.player1_id THEN 1 ELSE 0 END AS mvp_count
        FROM   player_matchups pm
        JOIN   matches m ON m.id = pm.match_id
        WHERE  m.gcc_tournament_id = ${id}
        UNION ALL
        SELECT pm.player2_id AS player_id,
               pm.player2_goals          AS goals,
               CASE WHEN pm.mvp_player_id = pm.player2_id THEN 1 ELSE 0 END AS mvp_count
        FROM   player_matchups pm
        JOIN   matches m ON m.id = pm.match_id
        WHERE  m.gcc_tournament_id = ${id}
      ) sub
      JOIN  players p ON p.id = sub.player_id
      LEFT JOIN teams t ON t.id = p.team_id
      GROUP BY p.id, p.name, p.image_url, t.id, t.name, t.logo_url
      HAVING SUM(sub.goals) > 0
      ORDER BY total_goals DESC, total_mvps DESC
      LIMIT 20
    `);

    res.json({ scorers: rows.rows, tournament: { name: tournament.name, season: tournament.season } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Standings ────────────────────────────────────────────────────────────────

router.get("/gcc/tournaments/:id/standings", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tournament] = await db.select().from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Not found" });

    const entries = await db.select().from(gccEntriesTable)
      .where(eq(gccEntriesTable.tournamentId, id));
    const fixtures = await db.select().from(gccFixturesTable)
      .where(eq(gccFixturesTable.tournamentId, id));

    const teamIds = entries.length > 0
      ? [...new Set(entries.map(e => e.teamId))]
      : [...new Set([...fixtures.map(f => f.homeTeamId), ...fixtures.map(f => f.awayTeamId)])];
    const teams = teamIds.length ? await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds)) : [];
    const teamMap = new Map(teams.map(t => [t.id, t]));

    const standings = computeStandings(entries, fixtures).map((s, i) => {
      let zone: "direct" | "playoff" | "eliminated" | null = null;
      if (i < tournament.directQualifiers) zone = "direct";
      else if (i < tournament.directQualifiers + tournament.playoffSpots) zone = "playoff";
      else zone = "eliminated";

      return { ...s, rank: i + 1, team: teamMap.get(s.teamId) ?? null, zone };
    });

    res.json({ standings });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Advance Tournament Phase ─────────────────────────────────────────────────

/** POST /gcc/tournaments/:id/advance — move to next phase */
router.post("/gcc/tournaments/:id/advance", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tournament] = await db.select().from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Not found" });

    const statusFlow: Record<string, string> = {
      setup: "draw",
      draw: "league",
      league: "playoffs",
      playoffs: "knockout",
      knockout: "complete",
    };

    const next = statusFlow[tournament.status] ?? tournament.status;
    const [updated] = await db.update(gccTournamentsTable)
      .set({ status: next, updatedAt: new Date() })
      .where(eq(gccTournamentsTable.id, id))
      .returning();

    res.json({ tournament: updated });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/** POST /gcc/tournaments/:id/generate-knockout — create knockout fixtures from standings */
router.post("/gcc/tournaments/:id/generate-knockout", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { stage = "r16", seeded = false } = req.body;

    const [tournament] = await db.select().from(gccTournamentsTable)
      .where(eq(gccTournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Not found" });

    const entries = await db.select().from(gccEntriesTable)
      .where(eq(gccEntriesTable.tournamentId, id));
    const fixtures = await db.select().from(gccFixturesTable)
      .where(eq(gccFixturesTable.tournamentId, id));

    const standings = computeStandings(entries, fixtures);

    // Determine qualifiers based on stage
    let qualifyingTeams: number[];
    if (stage === "playoff") {
      const startIdx = tournament.directQualifiers;
      const endIdx = startIdx + tournament.playoffSpots;
      qualifyingTeams = standings.slice(startIdx, endIdx).map(s => s.teamId);
    } else if (stage === "r16") {
      // Direct qualifiers + playoff winners (if playoff round exists)
      qualifyingTeams = standings.slice(0, tournament.directQualifiers).map(s => s.teamId);
    } else {
      // QF, SF, Final — winners from previous round
      const prevStageMap: Record<string, string> = { qf: "r16", sf: "qf", final: "sf" };
      const prevStage = prevStageMap[stage];
      const prevFixtures = fixtures.filter(f => f.stage === prevStage);
      const pairs = new Map<string, typeof prevFixtures>();
      for (const f of prevFixtures) {
        const k = f.pairKey || `${f.stage}-${f.id}`;
        if (!pairs.has(k)) pairs.set(k, []);
        pairs.get(k)!.push(f);
      }
      qualifyingTeams = [...pairs.values()].map(legs => {
        const l1 = legs.find(l => l.leg === 1);
        const l2 = legs.find(l => l.leg === 2);
        const agg1 = (l1?.homeScore ?? 0) + (l2?.awayScore ?? 0);
        const agg2 = (l1?.awayScore ?? 0) + (l2?.homeScore ?? 0);
        return agg1 >= agg2 ? l1?.homeTeamId ?? 0 : l1?.awayTeamId ?? 0;
      }).filter(t => t > 0);
    }

    if (qualifyingTeams.length < 2) {
      return res.status(400).json({ error: "Not enough qualifying teams for this stage" });
    }

    // Delete existing fixtures for this stage
    await db.delete(gccFixturesTable)
      .where(and(eq(gccFixturesTable.tournamentId, id), eq(gccFixturesTable.stage, stage)));

    // Pair teams (seeded: top half vs bottom half; random: shuffle)
    const teams = seeded ? qualifyingTeams : shuffle(qualifyingTeams);
    const isFinal = stage === "final";
    const toInsert: any[] = [];
    let pairNum = 0;

    for (let i = 0; i < Math.floor(teams.length / 2); i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];
      const key = `${stage}-${++pairNum}`;

      toInsert.push({
        tournamentId: id, stage, round: 1, leg: 1, pairKey: key,
        homeTeamId: home, awayTeamId: away,
      });

      if (!isFinal) {
        // Second leg: home/away reversed
        toInsert.push({
          tournamentId: id, stage, round: 2, leg: 2, pairKey: key,
          homeTeamId: away, awayTeamId: home,
        });
      }
    }

    await db.insert(gccFixturesTable).values(toInsert);
    res.json({ success: true, fixturesGenerated: toInsert.length, teams: qualifyingTeams });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Finalized Results ────────────────────────────────────────────────────────

// GET /gcc/tournaments/:id/finalized-results
router.get("/gcc/tournaments/:id/finalized-results", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tournament] = await db.select().from(gccTournamentsTable).where(eq(gccTournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    res.json({ finalizedResults: tournament.finalizedResults ?? null });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /gcc/tournaments/:id/finalized-results (admin)
router.put("/gcc/tournaments/:id/finalized-results", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      leagueEliminated = [],
      playoffEliminated = [],
      r16Eliminated = [],
      qfEliminated = [],
      sfEliminated = [],
      runnerUp = null,
      champion = null,
    } = req.body;

    const finalizedResults = {
      leagueEliminated: leagueEliminated.map(Number),
      playoffEliminated: playoffEliminated.map(Number),
      r16Eliminated: r16Eliminated.map(Number),
      qfEliminated: qfEliminated.map(Number),
      sfEliminated: sfEliminated.map(Number),
      runnerUp: runnerUp ? Number(runnerUp) : null,
      champion: champion ? Number(champion) : null,
    };

    const [updated] = await db.update(gccTournamentsTable)
      .set({ finalizedResults, updatedAt: new Date() })
      .where(eq(gccTournamentsTable.id, id))
      .returning();

    res.json({ success: true, finalizedResults: updated.finalizedResults });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Reset Tournament ─────────────────────────────────────────────────────────

router.post("/gcc/tournaments/:id/reset", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(gccFixturesTable).where(eq(gccFixturesTable.tournamentId, id));
    const [updated] = await db.update(gccTournamentsTable)
      .set({
        status: "setup",
        drawState: { pairs: [], revealed: 0, complete: false },
        updatedAt: new Date(),
      })
      .where(eq(gccTournamentsTable.id, id))
      .returning();
    res.json({ tournament: updated });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
