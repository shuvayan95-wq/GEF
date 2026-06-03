import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  ballonDorTable, matchesTable, playerMatchupsTable,
  playersTable, teamsTable, leaguesTable, trophiesTable, cmsSettingsTable, awardsTable,
  incidentsTable, gccTournamentsTable, gccEntriesTable, gccFixturesTable,
} from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";
import { calcOVR } from "../lib/marketValue.js";
import { resolveEffectiveDelta } from "./incidents.js";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ─── Position Detection ───────────────────────────────────────────────────────

type PosType = "fw" | "mf" | "df" | "gk";

function detectPosition(pos: string | null): PosType {
  if (!pos) return "mf";
  const p = pos.toLowerCase().trim();
  if (p.includes("goal") || p === "gk" || p === "goalkeeper") return "gk";
  if (p.includes("defend") || ["df","cb","lb","rb","rwb","lwb"].includes(p)) return "df";
  if (
    p.includes("forward") || p.includes("striker") || p.includes("winger") || p.includes("attack") ||
    ["fw","st","cf","lw","rw","ss","at"].includes(p)
  ) return "fw";
  return "mf";
}

// ─── Default Weights ─────────────────────────────────────────────────────────

export const DEFAULT_WEIGHTS: Record<string, number> = {
  // Forward
  fw_goals: 28,
  fw_clean_sheets: 3,
  fw_efficiency: 20,
  // Midfielder
  mf_goals: 16,
  mf_clean_sheets: 6,
  mf_efficiency: 12,
  // Defender
  df_goals: 8,
  df_clean_sheets: 18,
  df_efficiency: 6,
  // Goalkeeper
  gk_goals: 3,
  gk_clean_sheets: 30,
  gk_efficiency: 3,
  // Shared
  win_bonus: 18,
  mvp_bonus: 60,
  appearance_bonus: 2,
  efficiency_scale: 10,
  team_multiplier: 0.4,
  trophy_champion: 60,
  trophy_runner_up: 25,
  trophy_other: 15,
  // Individual awards (from awards table — Best Captain, Golden Boot, etc.)
  individual_award_bonus: 40,
  // GEF Champions Cup
  gcc_win_bonus: 15,
  gcc_stage_r16: 40,
  gcc_stage_qf: 70,
  gcc_stage_sf: 100,
  gcc_stage_final: 140,
  gcc_champion: 200,
  // GCC Stage Score Multipliers — applied to the full final score
  // League-only exit penalises the player; advancing past R16 rewards them
  gcc_factor_league:   0.70,  // knocked out in league stage: −30%
  gcc_factor_playoff:  0.82,  // knocked out in playoff: −18%
  gcc_factor_r16:      0.93,  // reached R16: −7%
  gcc_factor_qf:       1.05,  // reached QF: +5%
  gcc_factor_sf:       1.12,  // reached SF: +12%
  gcc_factor_final:    1.18,  // reached Final: +18%
  gcc_factor_champion: 1.30,  // won the Cup: +30%
};

const WEIGHT_META: Record<string, { label: string; group: string; description: string }> = {
  fw_goals:        { label: "Forward: Goals",         group: "Forward",    description: "Points per goal scored by a forward" },
  fw_clean_sheets: { label: "Forward: Clean Sheets",  group: "Forward",    description: "Points per clean sheet for a forward" },
  fw_efficiency:   { label: "Forward: Efficiency",    group: "Forward",    description: "Goals-per-match efficiency multiplier for forwards" },
  mf_goals:        { label: "Midfielder: Goals",      group: "Midfielder", description: "Points per goal scored by a midfielder" },
  mf_clean_sheets: { label: "Midfielder: Clean Sheets",group:"Midfielder", description: "Points per clean sheet for a midfielder" },
  mf_efficiency:   { label: "Midfielder: Efficiency", group: "Midfielder", description: "Goals-per-match efficiency multiplier for midfielders" },
  df_goals:        { label: "Defender: Goals",        group: "Defender",   description: "Points per goal scored by a defender" },
  df_clean_sheets: { label: "Defender: Clean Sheets", group: "Defender",   description: "Points per clean sheet for a defender" },
  df_efficiency:   { label: "Defender: Efficiency",   group: "Defender",   description: "Goals-per-match efficiency multiplier for defenders" },
  gk_goals:        { label: "Goalkeeper: Goals",      group: "Goalkeeper", description: "Points per goal scored by a goalkeeper" },
  gk_clean_sheets: { label: "Goalkeeper: Clean Sheets",group:"Goalkeeper", description: "Points per clean sheet for a goalkeeper (most important)" },
  gk_efficiency:   { label: "Goalkeeper: Efficiency", group: "Goalkeeper", description: "Efficiency multiplier for goalkeepers" },
  win_bonus:       { label: "Win Bonus",              group: "Shared",     description: "Points per match win (all positions)" },
  mvp_bonus:       { label: "MVP Award",              group: "Shared",     description: "Points per MVP award" },
  appearance_bonus:{ label: "Appearance Bonus",       group: "Shared",     description: "Points per match played (capped at 30)" },
  efficiency_scale:{ label: "Efficiency Scale",       group: "Shared",     description: "Scales the efficiency bonus formula" },
  team_multiplier: { label: "Team Win Rate Multiplier",group:"Team",       description: "How much team's win rate boosts the score (0.4 = 40% boost at 100% win rate)" },
  trophy_champion: { label: "Trophy: Champion",       group: "Team",       description: "Bonus points per league/tournament title" },
  trophy_runner_up:{ label: "Trophy: Runner-up",      group: "Team",       description: "Bonus points for runner-up finishes" },
  trophy_other:    { label: "Trophy: Other",          group: "Team",       description: "Bonus for other trophy types" },
  individual_award_bonus: { label: "Individual Award Bonus", group: "Shared", description: "Points per individual award (Golden Boot, Best Captain, etc.)" },
  gcc_win_bonus:   { label: "GCC: Win Bonus",          group: "Champions Cup", description: "Points per Champions Cup match win" },
  gcc_stage_r16:   { label: "GCC: Round of 16 Bonus",  group: "Champions Cup", description: "Bonus for reaching the Round of 16" },
  gcc_stage_qf:    { label: "GCC: Quarter-Final Bonus",group: "Champions Cup", description: "Bonus for reaching the Quarter-Finals" },
  gcc_stage_sf:    { label: "GCC: Semi-Final Bonus",   group: "Champions Cup", description: "Bonus for reaching the Semi-Finals" },
  gcc_stage_final: { label: "GCC: Final Bonus",        group: "Champions Cup", description: "Bonus for reaching the Final" },
  gcc_champion:    { label: "GCC: Champion Bonus",     group: "Champions Cup", description: "Bonus for winning the GEF Champions Cup" },
  gcc_factor_league:   { label: "GCC Factor: League Exit",   group: "Champions Cup Multiplier", description: "Score multiplier for teams knocked out in the league stage (0.70 = −30% penalty)" },
  gcc_factor_playoff:  { label: "GCC Factor: Playoff Exit",  group: "Champions Cup Multiplier", description: "Score multiplier for teams knocked out in the playoff round (0.82 = −18%)" },
  gcc_factor_r16:      { label: "GCC Factor: Reached R16",   group: "Champions Cup Multiplier", description: "Score multiplier for teams reaching Round of 16 (0.93 = −7%)" },
  gcc_factor_qf:       { label: "GCC Factor: Reached QF",    group: "Champions Cup Multiplier", description: "Score multiplier for teams reaching Quarter-Finals (1.05 = +5%)" },
  gcc_factor_sf:       { label: "GCC Factor: Reached SF",    group: "Champions Cup Multiplier", description: "Score multiplier for teams reaching Semi-Finals (1.12 = +12%)" },
  gcc_factor_final:    { label: "GCC Factor: Reached Final", group: "Champions Cup Multiplier", description: "Score multiplier for teams reaching the Final (1.18 = +18%)" },
  gcc_factor_champion: { label: "GCC Factor: Cup Champion",  group: "Champions Cup Multiplier", description: "Score multiplier for the cup-winning team (1.30 = +30%)" },
};

// ─── Load Weights from DB ────────────────────────────────────────────────────

async function loadWeights(): Promise<Record<string, number>> {
  const rows = await db.select().from(cmsSettingsTable);
  const weights = { ...DEFAULT_WEIGHTS };
  for (const row of rows) {
    if (row.key.startsWith("bdw_")) {
      const key = row.key.slice(4);
      const val = parseFloat(row.value);
      if (!isNaN(val)) weights[key] = val;
    }
  }
  return weights;
}

// ─── Multi-Factor Score Engine ────────────────────────────────────────────────

function calcAdvancedScore(params: {
  posType: PosType;
  matches: number;
  wins: number;
  goals: number;
  cleanSheets: number;
  mvps: number;
  teamWinRate: number;
  trophyChampion: number;
  trophyRunnerUp: number;
  trophyOther: number;
  weights: Record<string, number>;
}) {
  const { posType, matches, wins, goals, cleanSheets, mvps, teamWinRate, trophyChampion, trophyRunnerUp, trophyOther, weights } = params;

  const baseScore =
    goals       * weights[`${posType}_goals`] +
    cleanSheets * weights[`${posType}_clean_sheets`] +
    wins        * weights.win_bonus +
    mvps        * weights.mvp_bonus +
    Math.min(matches, 30) * weights.appearance_bonus;

  const goalsPerMatch = matches > 0 ? goals / matches : 0;
  const efficiencyBonus = goalsPerMatch * weights[`${posType}_efficiency`] * (weights.efficiency_scale / 10);

  const trophyBonus =
    trophyChampion  * weights.trophy_champion +
    trophyRunnerUp  * weights.trophy_runner_up +
    trophyOther     * weights.trophy_other;

  const teamMultiplier = 1 + (teamWinRate * weights.team_multiplier);
  const finalScore = Math.round(((baseScore + efficiencyBonus + trophyBonus) * teamMultiplier) * 100) / 100;

  return {
    baseScore:       Math.round(baseScore * 100) / 100,
    efficiencyBonus: Math.round(efficiencyBonus * 100) / 100,
    trophyBonus:     Math.round(trophyBonus * 100) / 100,
    teamMultiplier:  Math.round(teamMultiplier * 100) / 100,
    finalScore,
  };
}

function getRankTier(rank: number): string {
  if (rank === 1) return "winner";
  if (rank <= 3) return "podium";
  if (rank <= 10) return "elite";
  if (rank <= 20) return "gold";
  if (rank <= 30) return "silver";
  return "bronze";
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// GET /ballon-dor/weights
router.get("/ballon-dor/weights", async (_req, res) => {
  try {
    const weights = await loadWeights();
    res.json({ weights, meta: WEIGHT_META, defaults: DEFAULT_WEIGHTS });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /ballon-dor/weights (admin)
router.put("/ballon-dor/weights", requireAdmin, async (req, res) => {
  try {
    const updates: Record<string, number> = req.body;
    for (const [key, val] of Object.entries(updates)) {
      if (typeof val !== "number" || isNaN(val)) continue;
      const dbKey = `bdw_${key}`;
      const existing = await db.select().from(cmsSettingsTable).where(eq(cmsSettingsTable.key, dbKey));
      if (existing.length > 0) {
        await db.update(cmsSettingsTable).set({ value: String(val), updatedAt: new Date() }).where(eq(cmsSettingsTable.key, dbKey));
      } else {
        await db.insert(cmsSettingsTable).values({ key: dbKey, value: String(val) });
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /ballon-dor
router.get("/ballon-dor", async (_req, res) => {
  const rows = await db.select().from(ballonDorTable).orderBy(sql`${ballonDorTable.calculatedAt} DESC`);
  res.json(rows.map(r => ({
    id: r.id, season: r.season, winner: r.winner,
    totalCandidates: Number(r.totalCandidates),
    calculatedAt: r.calculatedAt.toISOString(), notes: r.notes ?? null,
    revealed: r.revealed ?? false,
    hofAwards: r.hofAwards ?? [],
  })));
});

// GET /ballon-dor/:season
router.get("/ballon-dor/:season", async (req, res) => {
  const season = decodeURIComponent(req.params.season);
  const [row] = await db.select().from(ballonDorTable).where(eq(ballonDorTable.season, season));
  if (!row) return res.status(404).json({ error: "No Ballon d'Or results for this season" });
  res.json({
    id: row.id, season: row.season, winner: row.winner, top50: row.top50,
    totalCandidates: Number(row.totalCandidates),
    calculatedAt: row.calculatedAt.toISOString(), notes: row.notes ?? null,
  });
});

// POST /ballon-dor/calculate (admin)
router.post("/ballon-dor/calculate", requireAdmin, async (req, res) => {
  const { season } = req.body;
  if (!season || typeof season !== "string")
    return res.status(400).json({ error: "season is required" });

  const weights = await loadWeights();

  const allLeagues = await db.select().from(leaguesTable);
  const seasonLeagues = allLeagues.filter(l => l.season === season);
  const seasonLeagueIds = new Set(seasonLeagues.map(l => l.id));
  if (seasonLeagueIds.size === 0)
    return res.status(400).json({ error: `No leagues found for season "${season}".` });

  const allMatches = await db.select().from(matchesTable);
  const seasonMatches = allMatches.filter(m => m.leagueId !== null && seasonLeagueIds.has(m.leagueId!));
  if (seasonMatches.length === 0)
    return res.status(400).json({ error: `No matches found for season "${season}".` });

  const seasonMatchIds = new Set(seasonMatches.map(m => m.id));
  const allMatchups = await db.select().from(playerMatchupsTable);
  let seasonMatchups = allMatchups.filter(mu => seasonMatchIds.has(mu.matchId));

  const playerIdsInSeason = new Set<number>();
  for (const mu of seasonMatchups) {
    playerIdsInSeason.add(mu.player1Id);
    playerIdsInSeason.add(mu.player2Id);
  }
  if (playerIdsInSeason.size === 0)
    return res.status(400).json({ error: `No player matchups found for season "${season}".` });

  const allPlayers = await db.select().from(playersTable);
  const allTeams = await db.select().from(teamsTable);
  const allTrophies = await db.select().from(trophiesTable);
  const allAwards = await db.select().from(awardsTable);
  const allIncidents = await db.select().from(incidentsTable).where(eq(incidentsTable.season, season));

  // ── GCC (Champions Cup) data for this season ───────────────────────────────
  // Use flexible season matching: extract the first 4-digit year from each season
  // string and compare, so "2024-25", "2024-2025", "GCC 2024-25" all match each other.
  const allGccTournaments = await db.select().from(gccTournamentsTable);
  function extractYear(s: string): string {
    const m = s.match(/\d{4}/);
    return m ? m[0] : s;
  }
  const bdYear = extractYear(season);
  const gccTournaments = allGccTournaments.filter(t => extractYear(t.season) === bdYear);
  const gccTournamentIds = gccTournaments.map(t => t.id);

  // ── Merge player matchups from GCC matches into season matchups ───────────
  // GCC matches are created in the matches table with gccTournamentId set but
  // leagueId = null, so they were previously excluded from player stats.
  // allGccMatchIds is declared at outer scope so the team-stats supplement below can use it.
  let allGccMatchIds = new Set<number>();

  if (gccTournamentIds.length > 0) {
    const gccTournamentIdSet = new Set(gccTournamentIds);

    // 1) Matches stamped with gccTournamentId (new approach — going forward)
    const linkedGccMatchIds = new Set(
      allMatches
        .filter(m => m.gccTournamentId != null && gccTournamentIdSet.has(m.gccTournamentId!))
        .map(m => m.id)
    );

    // 2) Legacy fallback: orphaned matches with leagueId=null and notes starting with "GCC"
    //    that involve teams enrolled in any of the matching GCC tournaments.
    //    (Catches matches added before gccTournamentId column existed.)
    const gccFixturesFallback = await db.select().from(gccFixturesTable)
      .where(inArray(gccFixturesTable.tournamentId, gccTournamentIds));
    const gccTeamPairKeys = new Set(
      gccFixturesFallback.map(fx => `${Math.min(fx.homeTeamId, fx.awayTeamId)}-${Math.max(fx.homeTeamId, fx.awayTeamId)}`)
    );
    const legacyGccMatchIds = new Set(
      allMatches
        .filter(m =>
          m.leagueId === null &&
          m.gccTournamentId === null &&
          (m.notes?.startsWith("GCC") ?? false) &&
          gccTeamPairKeys.has(`${Math.min(m.team1Id, m.team2Id)}-${Math.max(m.team1Id, m.team2Id)}`)
        )
        .map(m => m.id)
    );

    allGccMatchIds = new Set([...linkedGccMatchIds, ...legacyGccMatchIds]);

    if (allGccMatchIds.size > 0) {
      const existingMatchupIds = new Set(seasonMatchups.map(mu => mu.id));
      const gccMatchups = allMatchups.filter(mu => allGccMatchIds.has(mu.matchId) && !existingMatchupIds.has(mu.id));
      seasonMatchups = [...seasonMatchups, ...gccMatchups];
    }
  }

  const GCC_STAGE_ORDER = ["league", "playoff", "r16", "qf", "sf", "final"];

  // Maps teamId → { matches, wins, gf, ga, furthestKnockoutStage, wonCup }
  const gccTeamStats = new Map<number, {
    matches: number; wins: number; draws: number; losses: number;
    gf: number; ga: number; furthestStage: string; wonCup: boolean;
  }>();

  if (gccTournamentIds.length > 0) {
    const gccFixtures = await db.select().from(gccFixturesTable)
      .where(inArray(gccFixturesTable.tournamentId, gccTournamentIds));

    // First, collect match stats for every team
    for (const fx of gccFixtures) {
      if (!fx.played || fx.homeScore === null || fx.awayScore === null) continue;
      const homeId = fx.homeTeamId;
      const awayId = fx.awayTeamId;
      const homeGoals = fx.homeScore ?? 0;
      const awayGoals = fx.awayScore ?? 0;

      for (const [teamId, isHome] of [[homeId, true], [awayId, false]] as [number, boolean][]) {
        if (!gccTeamStats.has(teamId)) {
          gccTeamStats.set(teamId, { matches: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, furthestStage: "league", wonCup: false });
        }
        const s = gccTeamStats.get(teamId)!;
        const myG = isHome ? homeGoals : awayGoals;
        const thG = isHome ? awayGoals : homeGoals;
        s.matches++;
        s.gf += myG;
        s.ga += thG;
        if (myG > thG) s.wins++;
        else if (myG < thG) s.losses++;
        else s.draws++;

        // Track furthest knockout stage reached (from fixture data - may be overridden by finalizedResults)
        const stageIdx = GCC_STAGE_ORDER.indexOf(fx.stage ?? "league");
        const curIdx = GCC_STAGE_ORDER.indexOf(s.furthestStage);
        if (stageIdx > curIdx) s.furthestStage = fx.stage ?? s.furthestStage;

        // Mark cup winner from fixture data (may be overridden by finalizedResults)
        if (fx.stage === "final" && myG > thG) s.wonCup = true;
      }
    }

    // ── Override with finalizedResults if set on any tournament ──────────────
    // finalizedResults explicitly tells us which teams were eliminated at each
    // stage, which is critical when all matches were added as league-stage fixtures.
    for (const tournament of gccTournaments) {
      const fr = tournament.finalizedResults as any;
      if (!fr) continue;

      const stageMap: { key: string; stage: string }[] = [
        { key: "leagueEliminated",  stage: "league" },
        { key: "playoffEliminated", stage: "playoff" },
        { key: "r16Eliminated",     stage: "r16" },
        { key: "qfEliminated",      stage: "qf" },
        { key: "sfEliminated",      stage: "sf" },
      ];

      // For each elimination bucket, set furthestStage to that stage
      for (const { key, stage } of stageMap) {
        const teamIds: number[] = Array.isArray(fr[key]) ? fr[key] : [];
        for (const teamId of teamIds) {
          if (!gccTeamStats.has(teamId)) {
            gccTeamStats.set(teamId, { matches: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, furthestStage: stage, wonCup: false });
          } else {
            gccTeamStats.get(teamId)!.furthestStage = stage;
            gccTeamStats.get(teamId)!.wonCup = false;
          }
        }
      }

      // Runner-up: reached the final but didn't win
      if (fr.runnerUp) {
        const tid = Number(fr.runnerUp);
        if (!gccTeamStats.has(tid)) {
          gccTeamStats.set(tid, { matches: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, furthestStage: "final", wonCup: false });
        } else {
          gccTeamStats.get(tid)!.furthestStage = "final";
          gccTeamStats.get(tid)!.wonCup = false;
        }
      }

      // Champion: won the cup
      if (fr.champion) {
        const tid = Number(fr.champion);
        if (!gccTeamStats.has(tid)) {
          gccTeamStats.set(tid, { matches: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, furthestStage: "final", wonCup: true });
        } else {
          gccTeamStats.get(tid)!.furthestStage = "final";
          gccTeamStats.get(tid)!.wonCup = true;
        }
      }
    }
  }

  // ── Supplement gccTeamStats goals/matches from matchesTable ─────────────
  // If GCC match results were entered via the regular match UI (matchesTable) but
  // the corresponding gccFixturesTable entries don't have scores, team goals remain 0.
  // This pass fills in missing goals/matches from matchesTable GCC matches.
  if (allGccMatchIds.size > 0) {
    // Accumulate team-level goals from GCC matches in matchesTable
    const matchTableGcc = new Map<number, { gf: number; ga: number; matches: number; wins: number; draws: number; losses: number }>();
    for (const m of allMatches) {
      if (!allGccMatchIds.has(m.id)) continue;
      if (m.team1Score === null || m.team2Score === null) continue;
      const t1g = m.team1Score ?? 0;
      const t2g = m.team2Score ?? 0;
      for (const [teamId, isHome] of [[m.team1Id, true], [m.team2Id, false]] as [number, boolean][]) {
        const e = matchTableGcc.get(teamId) ?? { gf: 0, ga: 0, matches: 0, wins: 0, draws: 0, losses: 0 };
        const myG = isHome ? t1g : t2g;
        const thG = isHome ? t2g : t1g;
        e.gf += myG;
        e.ga += thG;
        e.matches++;
        if (myG > thG) e.wins++;
        else if (myG < thG) e.losses++;
        else e.draws++;
        matchTableGcc.set(teamId, e);
      }
    }
    // Merge into gccTeamStats: create missing entries, supplement 0-goal entries
    for (const [teamId, mtg] of matchTableGcc.entries()) {
      if (!gccTeamStats.has(teamId)) {
        // Team has GCC matches in matchesTable but no fixture data — create entry
        gccTeamStats.set(teamId, { matches: mtg.matches, wins: mtg.wins, draws: mtg.draws, losses: mtg.losses, gf: mtg.gf, ga: mtg.ga, furthestStage: "league", wonCup: false });
      } else {
        const s = gccTeamStats.get(teamId)!;
        // Supplement goals if fixture data has none
        if (s.gf === 0 && s.ga === 0 && (mtg.gf > 0 || mtg.ga > 0)) {
          s.gf = mtg.gf;
          s.ga = mtg.ga;
        }
        // Supplement match counts if fixture data has none
        if (s.matches === 0 && mtg.matches > 0) {
          s.matches = mtg.matches;
          s.wins = mtg.wins;
          s.draws = mtg.draws;
          s.losses = mtg.losses;
        }
      }
    }
  }

  const teamMap = new Map(allTeams.map(t => [t.id, t]));
  const seasonPlayers = allPlayers.filter(p => playerIdsInSeason.has(p.id));
  const seasonTrophies = allTrophies.filter(t => t.season === season);

  // Count individual awards per player (all-time, since awards have no season field)
  const awardCountByPlayer = new Map<number, number>();
  for (const a of allAwards) {
    awardCountByPlayer.set(a.playerId, (awardCountByPlayer.get(a.playerId) || 0) + 1);
  }

  // Build incident delta per player: positive = bonus, negative = penalty on final score
  const incidentDeltaByPlayer = new Map<number, { delta: number; incidents: typeof allIncidents }>();
  for (const inc of allIncidents) {
    const delta = resolveEffectiveDelta(inc);
    const existing = incidentDeltaByPlayer.get(inc.playerId) ?? { delta: 0, incidents: [] };
    existing.delta += delta;
    existing.incidents.push(inc);
    incidentDeltaByPlayer.set(inc.playerId, existing);
  }

  // Team win rates for season
  const teamMatchStats = new Map<number, { wins: number; total: number }>();
  for (const m of seasonMatches) {
    for (const teamId of [m.team1Id, m.team2Id]) {
      if (!teamMatchStats.has(teamId)) teamMatchStats.set(teamId, { wins: 0, total: 0 });
      const s = teamMatchStats.get(teamId)!;
      s.total++;
      const isT1 = teamId === m.team1Id;
      const myScore = isT1 ? m.team1Score : m.team2Score;
      const thScore = isT1 ? m.team2Score : m.team1Score;
      if (myScore > thScore) s.wins++;
    }
  }

  const playerStats = seasonPlayers.map(player => {
    const myMatchups = seasonMatchups.filter(mu => mu.player1Id === player.id || mu.player2Id === player.id);
    let wins = 0, draws = 0, losses = 0, goals = 0, conceded = 0, mvps = 0, cleanSheets = 0;

    for (const mu of myMatchups) {
      const isP1 = mu.player1Id === player.id;
      const myG = isP1 ? mu.player1Goals : mu.player2Goals;
      const thG = isP1 ? mu.player2Goals : mu.player1Goals;
      goals += myG;
      conceded += thG;
      if (myG > thG) wins++;
      else if (myG < thG) losses++;
      else draws++;
      if (thG === 0) cleanSheets++;
      if (mu.mvpPlayerId === player.id) mvps++;
    }

    const matches = myMatchups.length;
    const team = player.teamId ? teamMap.get(player.teamId) : null;
    const ts = player.teamId ? (teamMatchStats.get(player.teamId) ?? { wins: 0, total: 1 }) : { wins: 0, total: 1 };
    const teamWinRate = ts.total > 0 ? ts.wins / ts.total : 0;

    const myTeamId = player.teamId;
    const playerTrophies = seasonTrophies.filter(t =>
      t.winnerPlayerId === player.id || (myTeamId && t.winnerTeamId === myTeamId)
    );
    const trophyChampion = playerTrophies.filter(t => ["league_champion","champion"].includes(t.type)).length;
    const trophyRunnerUp  = playerTrophies.filter(t => t.type === "runner_up").length;
    const trophyOther     = playerTrophies.filter(t => !["league_champion","champion","runner_up"].includes(t.type)).length;

    // Individual awards (Best Captain, Golden Boot, etc.) from the awards table
    const individualAwardCount = awardCountByPlayer.get(player.id) || 0;
    const individualAwardBonus = individualAwardCount * (weights.individual_award_bonus ?? 40);

    const posType = detectPosition(player.position);
    const breakdown = calcAdvancedScore({ posType, matches, wins, goals, cleanSheets, mvps, teamWinRate, trophyChampion, trophyRunnerUp, trophyOther, weights });
    const ovr = calcOVR(matches, wins, losses, draws, goals, conceded, mvps);

    // Incident adjustments: penalties subtract, positive incidents add
    const incidentData = incidentDeltaByPlayer.get(player.id);
    const incidentDelta = incidentData?.delta ?? 0; // can be negative (penalty) or positive (bonus)
    const playerIncidents = incidentData?.incidents.map(inc => ({
      id: inc.id,
      type: inc.type,
      competition: inc.competition,
      stage: inc.stage,
      description: inc.description,
      delta: resolveEffectiveDelta(inc),
    })) ?? [];

    // ── GCC (Champions Cup) bonus ──────────────────────────────────────────
    const gcc = myTeamId ? (gccTeamStats.get(myTeamId) ?? null) : null;
    const gccMatches     = gcc?.matches ?? 0;
    const gccWins        = gcc?.wins ?? 0;
    const gccGoals       = gcc?.gf ?? 0;
    const gccConceded    = gcc?.ga ?? 0;
    const gccFurthest    = gcc?.furthestStage ?? "none";
    const gccWonCup      = gcc?.wonCup ?? false;

    // Player's PERSONAL goals in GCC matches (from their own matchups, not team totals)
    const gccPersonalMatchups = myMatchups.filter(mu => allGccMatchIds.has(mu.matchId));
    const gccPersonalGoals = gccPersonalMatchups.reduce((sum, mu) => {
      return sum + (mu.player1Id === player.id ? mu.player1Goals : mu.player2Goals);
    }, 0);
    const gccPersonalConceded = gccPersonalMatchups.reduce((sum, mu) => {
      return sum + (mu.player1Id === player.id ? mu.player2Goals : mu.player1Goals);
    }, 0);
    const gccPersonalMatches = gccPersonalMatchups.length;

    const GCC_STAGE_BONUS: Record<string, number> = {
      r16:    weights.gcc_stage_r16 ?? 40,
      qf:     weights.gcc_stage_qf ?? 70,
      sf:     weights.gcc_stage_sf ?? 100,
      final:  weights.gcc_stage_final ?? 140,
    };
    const gccWinBonus   = gccWins * (weights.gcc_win_bonus ?? 15);
    const gccStageBonus = gccWonCup
      ? (weights.gcc_champion ?? 200)
      : (GCC_STAGE_BONUS[gccFurthest] ?? 0);
    const gccTotalBonus = gccMatches > 0 ? Math.round((gccWinBonus + gccStageBonus) * 100) / 100 : 0;

    // ── GCC Stage Score Multiplier ────────────────────────────────────────────
    // Teams knocked out early get a score penalty; advancing teams get a bonus.
    // Teams not in the GCC at all are unaffected (factor = 1.0).
    let gccStageFactor = 1.0;
    if (gccMatches > 0) {
      if (gccWonCup) {
        gccStageFactor = weights.gcc_factor_champion ?? 1.18;
      } else {
        const GCC_FACTOR_MAP: Record<string, number> = {
          league:  weights.gcc_factor_league  ?? 0.92,
          playoff: weights.gcc_factor_playoff ?? 0.96,
          r16:     weights.gcc_factor_r16     ?? 1.00,
          qf:      weights.gcc_factor_qf      ?? 1.03,
          sf:      weights.gcc_factor_sf      ?? 1.07,
          final:   weights.gcc_factor_final   ?? 1.12,
        };
        gccStageFactor = GCC_FACTOR_MAP[gccFurthest] ?? 1.0;
      }
    }

    // Add individual award bonus and apply incident delta on top of the advanced score,
    // then multiply the whole thing by the GCC stage factor
    const preMulScore = breakdown.finalScore + individualAwardBonus + incidentDelta + gccTotalBonus;
    const finalScore = Math.round(preMulScore * gccStageFactor * 100) / 100;

    return {
      playerId: player.id,
      playerName: player.name,
      imageUrl: player.imageUrl ?? null,
      teamId: player.teamId ?? null,
      teamName: team?.name ?? null,
      teamLogoUrl: team?.logoUrl ?? null,
      position: player.position ?? null,
      positionType: posType,
      nationality: player.nationality ?? null,
      ovr,
      stats: {
        matches, wins, draws, losses, goals, conceded, cleanSheets, mvps,
        goalDiff: goals - conceded,
        winRate: matches > 0 ? Math.round((wins / matches) * 1000) / 10 : 0,
        goalsPerMatch: matches > 0 ? Math.round((goals / matches) * 100) / 100 : 0,
        teamWinRate: Math.round(teamWinRate * 1000) / 10,
        trophies: trophyChampion + trophyRunnerUp + trophyOther,
        individualAwards: individualAwardCount,
      },
      gcc: (gccMatches > 0 || gccPersonalMatches > 0) ? {
        matches: gccMatches || gccPersonalMatches,
        wins:    gccWins,
        draws:   gcc?.draws ?? 0,
        losses:  gcc?.losses ?? 0,
        goals:   gccGoals,
        conceded: gccConceded,
        personalGoals:    gccPersonalGoals,
        personalConceded: gccPersonalConceded,
        personalMatches:  gccPersonalMatches,
        furthestStage: gccFurthest,
        wonCup:  gccWonCup,
        winBonus:    Math.round(gccWinBonus * 100) / 100,
        stageBonus:  Math.round(gccStageBonus * 100) / 100,
        totalBonus:  gccTotalBonus,
        stageFactor: Math.round(gccStageFactor * 1000) / 1000,
      } : null,
      baseScore:           breakdown.baseScore,
      efficiencyBonus:     breakdown.efficiencyBonus,
      trophyBonus:         breakdown.trophyBonus,
      individualAwardBonus,
      gccBonus:            gccTotalBonus,
      gccStageFactor:      Math.round(gccStageFactor * 1000) / 1000,
      incidentDelta,       // net score adjustment from all incidents
      incidents:           playerIncidents,
      teamMultiplier:      breakdown.teamMultiplier,
      finalScore,
      score:               finalScore,
      rank: 0,
      tier: "",
    };
  });

  playerStats.sort((a, b) => b.finalScore - a.finalScore);

  const top50 = playerStats.slice(0, 50).map((p, i) => ({
    ...p, rank: i + 1, tier: getRankTier(i + 1),
  }));

  const winner = top50[0] ?? null;

  const existing = await db.select().from(ballonDorTable).where(eq(ballonDorTable.season, season));
  const diagNotes = JSON.stringify({
    gccTournamentsFound: gccTournaments.length,
    gccTournamentSeasons: gccTournaments.map(t => `${t.name} (${t.season})`),
    gccTeamsWithStats: gccTeamStats.size,
    bdYearExtracted: bdYear,
  });
  if (existing.length > 0) {
    await db.update(ballonDorTable).set({
      winner: winner as any, top50: top50 as any,
      totalCandidates: String(playerStats.length), calculatedAt: sql`now()`,
      notes: diagNotes,
    }).where(eq(ballonDorTable.season, season));
  } else {
    await db.insert(ballonDorTable).values({
      season, winner: winner as any, top50: top50 as any,
      totalCandidates: String(playerStats.length),
      notes: diagNotes,
    });
  }

  // Build elimination summary for admin review
  const GCC_STAGE_LABEL_MAP: Record<string, string> = {
    league: "League Stage Exit",
    playoff: "Playoff Exit",
    r16: "Round of 16 Exit",
    qf: "Quarter-Final Exit",
    sf: "Semi-Final Exit",
    final: "Finalist (Runner-up)",
    champion: "Champion 🏆",
  };

  const eliminationSummary: Record<string, { teamId: number; teamName: string; factor: number }[]> = {};
  for (const [teamId, stats] of gccTeamStats.entries()) {
    const stageKey = stats.wonCup ? "champion" : stats.furthestStage;
    const teamName = teamMap.get(teamId)?.name ?? `Team #${teamId}`;
    const GCC_FACTOR_MAP_SUMMARY: Record<string, number> = {
      league:   weights.gcc_factor_league   ?? 0.92,
      playoff:  weights.gcc_factor_playoff  ?? 0.96,
      r16:      weights.gcc_factor_r16      ?? 1.00,
      qf:       weights.gcc_factor_qf       ?? 1.03,
      sf:       weights.gcc_factor_sf       ?? 1.07,
      final:    weights.gcc_factor_final    ?? 1.12,
      champion: weights.gcc_factor_champion ?? 1.18,
    };
    const factor = GCC_FACTOR_MAP_SUMMARY[stageKey] ?? 1.0;
    if (!eliminationSummary[stageKey]) eliminationSummary[stageKey] = [];
    eliminationSummary[stageKey].push({ teamId, teamName, factor });
  }

  res.json({
    success: true, season,
    totalCandidates: playerStats.length,
    matchesAnalyzed: seasonMatches.length,
    matchupsAnalyzed: seasonMatchups.length,
    weightsUsed: weights,
    winner, top50Length: top50.length,
    gccEliminationSummary: eliminationSummary,
    gccStageLabels: GCC_STAGE_LABEL_MAP,
    gccDiagnostics: {
      tournamentsFound: gccTournaments.length,
      tournamentSeasons: gccTournaments.map(t => `${t.name} (${t.season})`),
      fixturesFound: gccTournamentIds.length > 0 ? "see elimination summary" : "none — GCC stage factors not applied",
      teamsWithGccStats: gccTeamStats.size,
      bdSeasonUsed: season,
      bdYearExtracted: bdYear,
    },
  });
});

// DELETE /ballon-dor/:season
router.delete("/ballon-dor/:season", requireAdmin, async (req, res) => {
  const season = decodeURIComponent(req.params.season);
  await db.delete(ballonDorTable).where(eq(ballonDorTable.season, season));
  res.json({ success: true });
});

// POST /ballon-dor/:season/reveal (admin) — toggle Hall of Fame visibility
router.post("/ballon-dor/:season/reveal", requireAdmin, async (req, res) => {
  const season = decodeURIComponent(req.params.season);
  const { revealed } = req.body;
  if (typeof revealed !== "boolean")
    return res.status(400).json({ error: "revealed must be a boolean" });
  await db.update(ballonDorTable).set({ revealed }).where(eq(ballonDorTable.season, season));
  res.json({ success: true, revealed });
});

// PUT /ballon-dor/:season/hof-awards (admin) — save special awards for a season
router.put("/ballon-dor/:season/hof-awards", requireAdmin, async (req, res) => {
  const season = decodeURIComponent(req.params.season);
  const { awards } = req.body;
  if (!Array.isArray(awards))
    return res.status(400).json({ error: "awards must be an array" });
  await db.update(ballonDorTable).set({ hofAwards: awards as any }).where(eq(ballonDorTable.season, season));
  res.json({ success: true });
});

export default router;
