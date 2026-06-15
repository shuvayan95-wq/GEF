import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable, teamsTable, playerMatchupsTable, matchesTable, powerRankingsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOpenAI() {
  if (process.env.GROQ_API_KEY) {
    const { default: OpenAI } = await import("openai");
    return new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  }
  try {
    const mod = await import("@workspace/integrations-openai-ai-server");
    return mod.openai;
  } catch {
    if (process.env.OPENAI_API_KEY) {
      const { default: OpenAI } = await import("openai");
      return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return null;
  }
}

// ─── Bayesian win rate ────────────────────────────────────────────────────────
// Prior = 5 games at 50% (league-average) — shrinks small samples toward mean.
// A player with 1W/1G gets 60% not 100%; a player with 10W/15G gets ~63%.
const WIN_RATE_PRIOR_GAMES = 5;
const WIN_RATE_PRIOR_VALUE = 0.5; // assume 50% baseline

function adjustedWinRate(wins: number, games: number): number {
  const priorWins = WIN_RATE_PRIOR_GAMES * WIN_RATE_PRIOR_VALUE;
  return ((wins + priorWins) / (games + WIN_RATE_PRIOR_GAMES)) * 100;
}

// ─── GET /api/power-rankings — latest published ───────────────────────────────
router.get("/power-rankings", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(powerRankingsTable)
      .where(eq(powerRankingsTable.isPublished, true))
      .orderBy(desc(powerRankingsTable.generatedAt))
      .limit(1);

    if (!rows.length) return res.json({ rankings: [], weekLabel: null, generatedAt: null, previousRankings: [], season: null });
    const row = rows[0];
    res.json({
      rankings: (row.rankings as any[]) ?? [],
      previousRankings: (row.previousRankings as any[]) ?? [],
      weekLabel: row.weekLabel,
      generatedAt: row.generatedAt?.toISOString() ?? null,
      season: (row as any).season ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/admin/power-rankings/seasons — distinct seasons in matches ──────
router.get("/admin/power-rankings/seasons", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .selectDistinct({ season: matchesTable.season })
      .from(matchesTable)
      .orderBy(desc(matchesTable.season));

    const seasons = rows.map(r => r.season).filter(Boolean) as string[];
    res.json({ seasons });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── POST /api/ai/power-rankings/generate ────────────────────────────────────
router.post("/ai/power-rankings/generate", requireAdmin, async (req, res) => {
  try {
    const { weekLabel, season } = req.body as { weekLabel?: string; season?: string };
    const openai = await getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI integration not configured" });

    const [players, teams] = await Promise.all([
      db.select().from(playersTable).where(eq(playersTable.status, "active")),
      db.select().from(teamsTable),
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));

    // ── Fetch matches, optionally filtered by season ──────────────────────────
    let matchQuery = db
      .select()
      .from(matchesTable)
      .orderBy(desc(matchesTable.date));

    const allMatches = season
      ? await db.select().from(matchesTable).where(eq(matchesTable.season, season)).orderBy(desc(matchesTable.date))
      : await db.select().from(matchesTable).orderBy(desc(matchesTable.date)).limit(200);

    if (!allMatches.length) {
      return res.status(400).json({ error: `No matches found${season ? ` for season "${season}"` : ""}. Record some matches first.` });
    }

    const usedSeason = season ?? allMatches[0]?.season ?? "All-time";
    const matchIds = allMatches.map(m => m.id);

    // ── Fetch matchups only for those matches ─────────────────────────────────
    // (drizzle inArray requires at least 1 element — already guaranteed above)
    const { inArray } = await import("drizzle-orm");
    const matchups = await db
      .select()
      .from(playerMatchupsTable)
      .where(inArray(playerMatchupsTable.matchId, matchIds));

    const matchDateMap = new Map(allMatches.map(m => [m.id, m.date ?? ""]));

    // ── Build per-player stats ────────────────────────────────────────────────
    interface PlayerStat {
      id: number; name: string; teamName: string; position: string | null;
      cardOvr: number | null; imageUrl: string | null;
      goals: number; wins: number; losses: number; draws: number;
      games: number; mvps: number;
      winRate: number;        // raw, for display
      adjWinRate: number;     // Bayesian-smoothed, for ranking
      goalsPerGame: number;
      recentForm: string[];
    }

    const stats: Record<number, PlayerStat> = {};
    for (const p of players) {
      stats[p.id] = {
        id: p.id, name: p.name,
        teamName: p.teamId ? (teamMap.get(p.teamId)?.name ?? "") : "",
        position: p.position, cardOvr: p.cardOvr, imageUrl: p.imageUrl,
        goals: 0, wins: 0, losses: 0, draws: 0, games: 0, mvps: 0,
        winRate: 0, adjWinRate: 0, goalsPerGame: 0,
        recentForm: [],
      };
    }

    for (const mu of matchups) {
      for (const [pid, myGoals, opGoals] of [
        [mu.player1Id, mu.player1Goals, mu.player2Goals],
        [mu.player2Id, mu.player2Goals, mu.player1Goals],
      ] as [number, number, number][]) {
        if (!stats[pid]) continue;
        const s = stats[pid];
        s.goals += myGoals;
        s.games++;
        if (myGoals > opGoals) { s.wins++; s.recentForm.push("W"); }
        else if (opGoals > myGoals) { s.losses++; s.recentForm.push("L"); }
        else { s.draws++; s.recentForm.push("D"); }
        if (mu.mvpPlayerId === pid) s.mvps++;
      }
    }

    // Finalize computed fields — minimum 3 games to appear in rankings
    const MIN_GAMES = 3;
    for (const s of Object.values(stats)) {
      s.winRate = s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0;
      s.adjWinRate = adjustedWinRate(s.wins, s.games);
      s.goalsPerGame = s.games > 0 ? Math.round((s.goals / s.games) * 100) / 100 : 0;
      s.recentForm = s.recentForm.slice(-5);
    }

    const prevRow = await db
      .select()
      .from(powerRankingsTable)
      .where(eq(powerRankingsTable.isPublished, true))
      .orderBy(desc(powerRankingsTable.generatedAt))
      .limit(1);
    const previousRankings = (prevRow[0]?.rankings as any[]) ?? [];
    const prevRankMap = new Map(previousRankings.map((r: any, i: number) => [r.playerId, i + 1]));

    // ── Sort: adjWinRate × 0.45 + goalsPerGame × 0.30 + mvps × 0.15 + ovr × 0.10 ──
    const eligible = Object.values(stats)
      .filter(s => s.games >= MIN_GAMES)
      .sort((a, b) => {
        const scoreA = a.adjWinRate * 0.45 + a.goalsPerGame * 30 + a.mvps * 2 + (a.cardOvr ?? 70) * 0.1;
        const scoreB = b.adjWinRate * 0.45 + b.goalsPerGame * 30 + b.mvps * 2 + (b.cardOvr ?? 70) * 0.1;
        return scoreB - scoreA;
      })
      .slice(0, 20);

    if (!eligible.length) {
      return res.status(400).json({
        error: `No players with ${MIN_GAMES}+ games found${season ? ` in season "${season}"` : ""}. Play more matches first.`,
      });
    }

    // ── Build AI prompt ───────────────────────────────────────────────────────
    const playerCtx = eligible.map((p, i) =>
      `#${i + 1} ${p.name} (${p.teamName}, ${p.position ?? "?"}): OVR${p.cardOvr ?? "?"} | ${p.wins}W ${p.losses}L ${p.draws}D from ${p.games} games | Goals:${p.goals} | GPG:${p.goalsPerGame} | MVPs:${p.mvps} | WR:${p.winRate}% | AdjWR:${p.adjWinRate.toFixed(1)}% | Form:${p.recentForm.join("") || "N/A"}`
    ).join("\n");

    const label = weekLabel || `Power Rankings · ${usedSeason}`;
    const prompt = `You are the GEF Power Rankings analyst — sharp, opinionated, and data-driven. Based on these player stats (${usedSeason} season), generate official Power Rankings.

${playerCtx}

Rules:
- Keep the same order as listed above (stats already sorted by adjusted performance score)
- Write a "blurb" for each player: 1 punchy sentence about their form/status
- Assign a "tier": "ELITE" (top 3), "CONTENDER" (4-8), "RISING" (improving form), "STEADY" (consistent mid-tier), "FALLING" (poor recent form)
- Reference real stats. Be direct and confident — no fluff.

Return ONLY valid JSON (no markdown):
{
  "rankings": [
    {
      "rank": 1,
      "playerId": <id>,
      "name": "<name>",
      "team": "<team>",
      "position": "<position>",
      "tier": "ELITE",
      "blurb": "1 punchy sentence",
      "keyStats": { "winRate": <number>, "goals": <number>, "mvps": <number>, "games": <number>, "goalsPerGame": <number> },
      "recentForm": ["W","L","W","W","D"]
    }
  ]
}

Include ALL ${eligible.length} players listed above, in the same order.`;

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { rankings: [] }; }

    // Enrich with imageUrl, movement, and raw win rate override (use actual games)
    const rankings = (parsed.rankings ?? []).map((r: any, i: number) => {
      const playerData = eligible[i];
      const prevRank = prevRankMap.get(r.playerId) ?? null;
      const movement = prevRank === null ? "NEW" : prevRank > r.rank ? "UP" : prevRank < r.rank ? "DOWN" : "SAME";
      const movementDelta = prevRank === null ? 0 : prevRank - r.rank;
      return {
        ...r,
        // Override keyStats.winRate with the real (non-smoothed) value for display
        keyStats: {
          ...r.keyStats,
          winRate: playerData?.winRate ?? r.keyStats?.winRate ?? 0,
          games: playerData?.games ?? r.keyStats?.games ?? 0,
        },
        imageUrl: playerData?.imageUrl ?? null,
        movement,
        movementDelta,
        prevRank,
        season: usedSeason,
      };
    });

    // Unpublish old, insert new
    await db.update(powerRankingsTable).set({ isPublished: false }).where(eq(powerRankingsTable.isPublished, true));
    await db.insert(powerRankingsTable).values({
      weekLabel: label,
      rankings,
      previousRankings,
      isPublished: true,
    });

    res.json({ rankings, weekLabel: label, generatedAt: new Date().toISOString(), season: usedSeason });
  } catch (err: any) {
    console.error("Power rankings error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to generate rankings" });
  }
});

export default router;
