import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  playersTable, teamsTable, matchesTable, playerMatchupsTable,
  leaguesTable, aiPredictionsTable,
} from "@workspace/db";
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

// GET /api/ai/predictions — public: return latest published predictions
router.get("/ai/predictions", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(aiPredictionsTable)
      .where(eq(aiPredictionsTable.isPublished, true))
      .orderBy(desc(aiPredictionsTable.generatedAt))
      .limit(1);

    if (!rows.length) return res.json({ predictions: [], generatedAt: null });
    const row = rows[0];
    res.json({
      predictions: (row.predictions as any[]) ?? [],
      generatedAt: row.generatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/ai/predictions/generate — admin only: generate new predictions
router.post("/ai/predictions/generate", requireAdmin, async (req, res) => {
  try {
    const openai = await getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI integration not configured" });

    const [teams, players, allMatches, matchups, leagues] = await Promise.all([
      db.select().from(teamsTable),
      db.select().from(playersTable),
      db.select().from(matchesTable).orderBy(desc(matchesTable.createdAt)),
      db.select().from(playerMatchupsTable),
      db.select().from(leaguesTable).orderBy(desc(leaguesTable.createdAt)),
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));
    const playerMap = new Map(players.map(p => [p.id, p]));

    // Detect current season
    const allSeasons = [
      ...leagues.map(l => l.season),
      ...allMatches.map(m => m.season),
    ].filter(Boolean) as string[];
    const currentSeason = allSeasons[0] ?? null;

    const matches = currentSeason
      ? allMatches.filter(m => m.season === currentSeason)
      : allMatches.slice(0, 100);

    const matchIdSet = new Set(matches.map(m => m.id));
    const currentMatchups = matchups.filter(mu => matchIdSet.has(mu.matchId));

    // Per-team stats
    const teamStats: Record<number, { w: number; l: number; d: number; gf: number; ga: number; form: string[] }> = {};
    for (const t of teams) {
      teamStats[t.id] = { w: 0, l: 0, d: 0, gf: 0, ga: 0, form: [] };
    }
    for (const m of [...matches].reverse()) {
      for (const id of [m.team1Id, m.team2Id]) {
        if (!teamStats[id]) teamStats[id] = { w: 0, l: 0, d: 0, gf: 0, ga: 0, form: [] };
      }
      const t1 = teamStats[m.team1Id], t2 = teamStats[m.team2Id];
      t1.gf += m.team1Score; t1.ga += m.team2Score;
      t2.gf += m.team2Score; t2.ga += m.team1Score;
      if (m.team1Score > m.team2Score) {
        t1.w++; t2.l++;
        t1.form.push("W"); t2.form.push("L");
      } else if (m.team2Score > m.team1Score) {
        t2.w++; t1.l++;
        t2.form.push("W"); t1.form.push("L");
      } else {
        t1.d++; t2.d++;
        t1.form.push("D"); t2.form.push("D");
      }
    }

    // Per-player goals and MVPs
    const playerGoals: Record<number, number> = {};
    const playerMVPs: Record<number, number> = {};
    for (const mu of currentMatchups) {
      playerGoals[mu.player1Id] = (playerGoals[mu.player1Id] ?? 0) + mu.player1Goals;
      playerGoals[mu.player2Id] = (playerGoals[mu.player2Id] ?? 0) + mu.player2Goals;
      if (mu.mvpPlayerId) playerMVPs[mu.mvpPlayerId] = (playerMVPs[mu.mvpPlayerId] ?? 0) + 1;
    }

    // H2H records between teams
    const h2hMap: Record<string, { t1w: number; t2w: number; d: number }> = {};
    for (const m of matches) {
      const key = [Math.min(m.team1Id, m.team2Id), Math.max(m.team1Id, m.team2Id)].join("-");
      if (!h2hMap[key]) h2hMap[key] = { t1w: 0, t2w: 0, d: 0 };
      const rec = h2hMap[key];
      const isNatural = m.team1Id < m.team2Id;
      if (m.team1Score > m.team2Score) { isNatural ? rec.t1w++ : rec.t2w++; }
      else if (m.team2Score > m.team1Score) { isNatural ? rec.t2w++ : rec.t1w++; }
      else rec.d++;
    }

    // Build team context strings
    const teamContext = teams.map(t => {
      const s = teamStats[t.id] ?? { w: 0, l: 0, d: 0, gf: 0, ga: 0, form: [] };
      const total = s.w + s.l + s.d;
      if (!total) return null;
      const wr = Math.round((s.w / total) * 100);
      const recentForm = s.form.slice(-5).join(" ");
      const topPlayers = players
        .filter(p => p.teamId === t.id)
        .map(p => ({ name: p.name, goals: playerGoals[p.id] ?? 0, mvps: playerMVPs[p.id] ?? 0, ovr: p.cardOvr }))
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 3)
        .map(p => `${p.name} (${p.goals}g, ${p.mvps} MVPs${p.ovr ? `, OVR ${p.ovr}` : ""})`)
        .join(", ");
      return `${t.name}: W${s.w} L${s.l} D${s.d} | GF${s.gf} GA${s.ga} GD${s.gf - s.ga} | WR${wr}% | Form: ${recentForm || "N/A"} | Key: ${topPlayers || "none"}`;
    }).filter(Boolean).join("\n");

    // Recent matches for context
    const recentMatchesCtx = matches.slice(0, 20).map(m => {
      const t1 = teamMap.get(m.team1Id)?.name ?? "?";
      const t2 = teamMap.get(m.team2Id)?.name ?? "?";
      return `${t1} ${m.team1Score}-${m.team2Score} ${t2}`;
    }).join("\n");

    // Pick ~6 interesting upcoming matchups (teams that have played each other before, or top teams)
    const activeTeams = teams.filter(t => {
      const s = teamStats[t.id];
      return s && (s.w + s.l + s.d) > 0;
    });

    // Build pairs from recent opponents (last 10 unique pairings reversed for "next" feel)
    const seenPairs = new Set<string>();
    const suggestedMatchups: { team1: string; team2: string; t1id: number; t2id: number }[] = [];
    for (const m of [...matches].slice(0, 30)) {
      const key = [Math.min(m.team1Id, m.team2Id), Math.max(m.team1Id, m.team2Id)].join("-");
      if (!seenPairs.has(key) && suggestedMatchups.length < 6) {
        seenPairs.add(key);
        const t1 = teamMap.get(m.team1Id)?.name;
        const t2 = teamMap.get(m.team2Id)?.name;
        if (t1 && t2) {
          suggestedMatchups.push({ team1: t1, team2: t2, t1id: m.team1Id, t2id: m.team2Id });
        }
      }
    }

    // If not enough pairs, pad with top teams vs each other
    if (suggestedMatchups.length < 4 && activeTeams.length >= 2) {
      const sorted = activeTeams.sort((a, b) => {
        const sa = teamStats[a.id], sb = teamStats[b.id];
        const ta = sa.w + sa.l + sa.d, tb = sb.w + sb.l + sb.d;
        const wra = ta ? sa.w / ta : 0, wrb = tb ? sb.w / tb : 0;
        return wrb - wra;
      });
      for (let i = 0; i < sorted.length - 1 && suggestedMatchups.length < 6; i++) {
        const key = [Math.min(sorted[i].id, sorted[i + 1].id), Math.max(sorted[i].id, sorted[i + 1].id)].join("-");
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          suggestedMatchups.push({ team1: sorted[i].name, team2: sorted[i + 1].name, t1id: sorted[i].id, t2id: sorted[i + 1].id });
        }
      }
    }

    const matchupsForPrompt = suggestedMatchups.map(mu => {
      const key = [Math.min(mu.t1id, mu.t2id), Math.max(mu.t1id, mu.t2id)].join("-");
      const h2h = h2hMap[key];
      const isNatural = mu.t1id < mu.t2id;
      const t1w = h2h ? (isNatural ? h2h.t1w : h2h.t2w) : 0;
      const t2w = h2h ? (isNatural ? h2h.t2w : h2h.t1w) : 0;
      const d = h2h?.d ?? 0;
      return `${mu.team1} vs ${mu.team2} | H2H: ${mu.team1} W${t1w} D${d} W${t2w} ${mu.team2}`;
    }).join("\n");

    const prompt = `You are the GEF Oracle — the legendary AI predictor for the Global eFootball Federation. You combine deep statistical analysis with sharp banter to predict upcoming matches. Your predictions are bold, specific, and entertaining.

YOUR RULES:
- Base ALL predictions strictly on the stats provided. Never invent scores or stats.
- Each prediction needs a confidence % (50–95%) based on form, H2H, and GD.
- Give an exact predicted scoreline (e.g. 3-1, 2-2).
- Pick a "Star Player to Watch" for each match — a real player from the team data.
- "Analysis" section: 2 sentences using real data (win rates, form, GD).
- "Banter" section: 1 sentence of sharp, witty commentary — like a football pundit having fun.
- "Verdict": 1 short sentence naming the predicted winner and why.
- Vary the outcomes — don't make every match a home win.

=== TEAM STATS (Current Season: ${currentSeason ?? "All time"}) ===
${teamContext || "Limited data"}

=== RECENT RESULTS ===
${recentMatchesCtx || "No recent matches"}

=== MATCHUPS TO PREDICT ===
${matchupsForPrompt || "Generate predictions for the top 4 teams based on the data"}

Predict ALL ${suggestedMatchups.length || 4} matchups above.

Return ONLY valid JSON, no markdown:
{
  "predictions": [
    {
      "team1": "Team Name",
      "team2": "Team Name",
      "predictedScore": "2-1",
      "winner": "Team Name",
      "confidence": 78,
      "starPlayer": "Player Name (Team)",
      "analysis": "2 sentence data-driven analysis citing real stats.",
      "banter": "1 sentence pundit-style banter.",
      "verdict": "1 sentence prediction verdict.",
      "mood": "BANGER" | "TIGHT" | "UPSET" | "ROUTINE"
    }
  ]
}

MOOD guide: BANGER = high-scoring expected, TIGHT = close match, UPSET = underdog likely wins, ROUTINE = favorite should cruise.`;

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { predictions: [] }; }
    const predictions = parsed.predictions ?? [];

    // Unpublish old, insert new
    await db.update(aiPredictionsTable).set({ isPublished: false }).where(eq(aiPredictionsTable.isPublished, true));
    await db.insert(aiPredictionsTable).values({ predictions, isPublished: true });

    res.json({ predictions, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("AI predictions error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to generate predictions" });
  }
});

export default router;
