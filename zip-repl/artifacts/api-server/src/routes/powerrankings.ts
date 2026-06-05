import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable, teamsTable, playerMatchupsTable, matchesTable, powerRankingsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

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

// GET /api/power-rankings — latest published rankings
router.get("/power-rankings", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(powerRankingsTable)
      .where(eq(powerRankingsTable.isPublished, true))
      .orderBy(desc(powerRankingsTable.generatedAt))
      .limit(1);

    if (!rows.length) return res.json({ rankings: [], weekLabel: null, generatedAt: null, previousRankings: [] });
    const row = rows[0];
    res.json({
      rankings: (row.rankings as any[]) ?? [],
      previousRankings: (row.previousRankings as any[]) ?? [],
      weekLabel: row.weekLabel,
      generatedAt: row.generatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/ai/power-rankings/generate — admin: generate new rankings
router.post("/ai/power-rankings/generate", requireAdmin, async (req, res) => {
  try {
    const { weekLabel } = req.body as { weekLabel?: string };
    const openai = await getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI integration not configured" });

    const [players, teams, matchups, matches] = await Promise.all([
      db.select().from(playersTable).where(eq(playersTable.status, "active")),
      db.select().from(teamsTable),
      db.select().from(playerMatchupsTable),
      db.select().from(matchesTable).orderBy(desc(matchesTable.createdAt)).limit(200),
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));

    // Calculate comprehensive per-player stats
    interface PlayerStat {
      id: number; name: string; teamName: string; position: string | null;
      cardOvr: number | null; imageUrl: string | null;
      goals: number; wins: number; losses: number; draws: number;
      games: number; mvps: number; winRate: number; goalsPerGame: number;
      recentForm: string[];
    }

    const stats: Record<number, PlayerStat> = {};
    for (const p of players) {
      stats[p.id] = {
        id: p.id, name: p.name,
        teamName: p.teamId ? (teamMap.get(p.teamId)?.name ?? "") : "",
        position: p.position, cardOvr: p.cardOvr, imageUrl: p.imageUrl,
        goals: 0, wins: 0, losses: 0, draws: 0, games: 0, mvps: 0, winRate: 0, goalsPerGame: 0,
        recentForm: [],
      };
    }

    // Build match date map for recency
    const matchDateMap = new Map(matches.map(m => [m.id, m.date ?? ""]));

    for (const mu of matchups) {
      for (const [pid, myGoals, opGoals] of [
        [mu.player1Id, mu.player1Goals, mu.player2Goals],
        [mu.player2Id, mu.player2Goals, mu.player1Goals],
      ] as [number, number, number][]) {
        if (!stats[pid]) continue;
        const s = stats[pid];
        s.goals += myGoals; s.games++;
        if (myGoals > opGoals) { s.wins++; s.recentForm.push("W"); }
        else if (opGoals > myGoals) { s.losses++; s.recentForm.push("L"); }
        else { s.draws++; s.recentForm.push("D"); }
        if (mu.mvpPlayerId === pid) s.mvps++;
      }
    }

    // Finalize computed fields
    for (const s of Object.values(stats)) {
      s.winRate = s.games ? Math.round((s.wins / s.games) * 100) : 0;
      s.goalsPerGame = s.games ? Math.round((s.goals / s.games) * 100) / 100 : 0;
      s.recentForm = s.recentForm.slice(-5);
    }

    // Get previous rankings for movement
    const prevRow = await db.select().from(powerRankingsTable).where(eq(powerRankingsTable.isPublished, true)).orderBy(desc(powerRankingsTable.generatedAt)).limit(1);
    const previousRankings = (prevRow[0]?.rankings as any[]) ?? [];
    const prevRankMap = new Map(previousRankings.map((r: any, i: number) => [r.playerId, i + 1]));

    // Only include players with at least 1 game
    const eligible = Object.values(stats)
      .filter(s => s.games > 0)
      .sort((a, b) => {
        // Sort by: win rate * 0.4 + goals/game * 0.3 + mvps * 0.2 + ovr/100 * 0.1
        const scoreA = a.winRate * 0.4 + a.goalsPerGame * 30 + a.mvps * 2 + (a.cardOvr ?? 70) * 0.1;
        const scoreB = b.winRate * 0.4 + b.goalsPerGame * 30 + b.mvps * 2 + (b.cardOvr ?? 70) * 0.1;
        return scoreB - scoreA;
      })
      .slice(0, 20);

    // Build player context for AI
    const playerCtx = eligible.map((p, i) =>
      `#${i + 1} ${p.name} (${p.teamName}, ${p.position ?? "?"}): OVR${p.cardOvr ?? "?"} | ${p.wins}W ${p.losses}L ${p.draws}D from ${p.games} | Goals:${p.goals} | GPG:${p.goalsPerGame} | MVPs:${p.mvps} | WR:${p.winRate}% | Form:${p.recentForm.join("")||"N/A"}`
    ).join("\n");

    const label = weekLabel || `Week ${Math.ceil(matches.length / 10)} Power Rankings`;

    const prompt = `You are the GEF Power Rankings analyst — sharp, opinionated, and data-driven. Based on these player stats, generate official Power Rankings with brief pundit commentary for each player.

${playerCtx}

Rules:
- Keep the same order as listed above (stats already sorted by performance score)
- Write a "blurb" for each player: 1 punchy sentence about their current form/status
- Assign a "tier": "ELITE" (top 3), "CONTENDER" (4-8), "RISING" (improving form), "STEADY" (consistent mid-tier), "FALLING" (poor recent form)
- Use real stats in the blurbs
- Be direct and confident — no fluff

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
      "blurb": "1 punchy sentence about their status",
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

    // Enrich with imageUrl and movement
    const rankings = (parsed.rankings ?? []).map((r: any, i: number) => {
      const playerData = eligible[i];
      const prevRank = prevRankMap.get(r.playerId) ?? null;
      const movement = prevRank === null ? "NEW" : prevRank > r.rank ? "UP" : prevRank < r.rank ? "DOWN" : "SAME";
      const movementDelta = prevRank === null ? 0 : prevRank - r.rank;
      return {
        ...r,
        imageUrl: playerData?.imageUrl ?? null,
        movement,
        movementDelta,
        prevRank,
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

    res.json({ rankings, weekLabel: label, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("Power rankings error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to generate rankings" });
  }
});

export default router;
