import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  playersTable, teamsTable, matchesTable, playerMatchupsTable,
  leaguesTable, aiPredictionsTable, leagueFixturesTable,
  gccFixturesTable, gccTournamentsTable,
} from "@workspace/db";
import { desc, eq, inArray, and } from "drizzle-orm";

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

// POST /api/ai/predictions/generate — admin only
router.post("/ai/predictions/generate", requireAdmin, async (req, res) => {
  try {
    const openai = await getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI integration not configured" });

    // ── 1. Load all base data ─────────────────────────────────────────────────
    const [teams, players, allMatches, matchups, leagues, gccTournaments] = await Promise.all([
      db.select().from(teamsTable),
      db.select().from(playersTable),
      db.select().from(matchesTable).orderBy(desc(matchesTable.createdAt)),
      db.select().from(playerMatchupsTable),
      db.select().from(leaguesTable).orderBy(desc(leaguesTable.createdAt)),
      db.select().from(gccTournamentsTable).orderBy(desc(gccTournamentsTable.createdAt)),
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));
    const leagueMap = new Map(leagues.map(l => [l.id, l]));

    // ── 2. Find upcoming league fixtures (status = "pending") ─────────────────
    const pendingLeagueFixtures = await db
      .select()
      .from(leagueFixturesTable)
      .where(eq(leagueFixturesTable.status, "pending"))
      .orderBy(leagueFixturesTable.matchday, leagueFixturesTable.id);

    // ── 3. Find upcoming GCC fixtures (played = false) ────────────────────────
    const pendingGccFixtures = await db
      .select()
      .from(gccFixturesTable)
      .where(eq(gccFixturesTable.played, false))
      .orderBy(gccFixturesTable.id);

    // ── 4. Build team historical stats from ALL past matches ──────────────────
    const teamStats: Record<number, {
      w: number; l: number; d: number; gf: number; ga: number;
      form: string[]; recentMatches: string[];
    }> = {};

    for (const t of teams) {
      teamStats[t.id] = { w: 0, l: 0, d: 0, gf: 0, ga: 0, form: [], recentMatches: [] };
    }

    for (const m of [...allMatches].reverse()) {
      for (const id of [m.team1Id, m.team2Id]) {
        if (!teamStats[id]) teamStats[id] = { w: 0, l: 0, d: 0, gf: 0, ga: 0, form: [], recentMatches: [] };
      }
      const t1 = teamStats[m.team1Id], t2 = teamStats[m.team2Id];
      const t1Name = teamMap.get(m.team1Id)?.name ?? "?";
      const t2Name = teamMap.get(m.team2Id)?.name ?? "?";
      t1.gf += m.team1Score; t1.ga += m.team2Score;
      t2.gf += m.team2Score; t2.ga += m.team1Score;
      const resultLine = `${t1Name} ${m.team1Score}-${m.team2Score} ${t2Name}`;
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
      t1.recentMatches.push(resultLine);
      t2.recentMatches.push(resultLine);
    }

    // Per-player goals and MVPs (all time)
    const playerGoals: Record<number, number> = {};
    const playerMVPs: Record<number, number> = {};
    for (const mu of matchups) {
      playerGoals[mu.player1Id] = (playerGoals[mu.player1Id] ?? 0) + mu.player1Goals;
      playerGoals[mu.player2Id] = (playerGoals[mu.player2Id] ?? 0) + mu.player2Goals;
      if (mu.mvpPlayerId) playerMVPs[mu.mvpPlayerId] = (playerMVPs[mu.mvpPlayerId] ?? 0) + 1;
    }

    // H2H records
    const h2hMap: Record<string, { t1w: number; t2w: number; d: number }> = {};
    for (const m of allMatches) {
      const key = [Math.min(m.team1Id, m.team2Id), Math.max(m.team1Id, m.team2Id)].join("-");
      if (!h2hMap[key]) h2hMap[key] = { t1w: 0, t2w: 0, d: 0 };
      const rec = h2hMap[key];
      const isNatural = m.team1Id < m.team2Id;
      if (m.team1Score > m.team2Score) { isNatural ? rec.t1w++ : rec.t2w++; }
      else if (m.team2Score > m.team1Score) { isNatural ? rec.t2w++ : rec.t1w++; }
      else rec.d++;
    }

    // ── 5. Build team context string helper ───────────────────────────────────
    function teamContextStr(teamId: number): string {
      const t = teamMap.get(teamId);
      if (!t) return "Unknown team";
      const s = teamStats[teamId] ?? { w: 0, l: 0, d: 0, gf: 0, ga: 0, form: [], recentMatches: [] };
      const total = s.w + s.l + s.d;
      const wr = total > 0 ? Math.round((s.w / total) * 100) : 0;
      const recentForm = s.form.slice(-5).join("");
      const lastMatches = s.recentMatches.slice(-3).join(", ");
      const topPlayers = players
        .filter(p => p.teamId === teamId)
        .map(p => ({ name: p.name, goals: playerGoals[p.id] ?? 0, mvps: playerMVPs[p.id] ?? 0, ovr: p.cardOvr }))
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 3)
        .map(p => `${p.name}(${p.goals}g,${p.mvps}MVP${p.ovr ? `,OVR${p.ovr}` : ""})`)
        .join(", ");
      return `${t.name}: ${total} games | W${s.w} D${s.d} L${s.l} | GF${s.gf} GA${s.ga} GD${s.gf - s.ga} | WR${wr}% | Form:${recentForm || "N/A"} | Recent:${lastMatches || "none"} | Players:${topPlayers || "none"}`;
    }

    function h2hStr(id1: number, id2: number, name1: string, name2: string): string {
      const key = [Math.min(id1, id2), Math.max(id1, id2)].join("-");
      const h2h = h2hMap[key];
      if (!h2h) return "No H2H history";
      const isNatural = id1 < id2;
      const t1w = isNatural ? h2h.t1w : h2h.t2w;
      const t2w = isNatural ? h2h.t2w : h2h.t1w;
      return `H2H: ${name1} W${t1w} - D${h2h.d} - W${t2w} ${name2}`;
    }

    // ── 6. Collect upcoming fixtures to predict (max 8 total) ────────────────
    interface FixtureToPredict {
      homeId: number; awayId: number;
      homeName: string; awayName: string;
      competition: string; matchday: string;
      scheduledDate: string | null;
    }

    const fixturesToPredict: FixtureToPredict[] = [];
    const seenPairs = new Set<string>();

    // League fixtures first (earliest matchday pending)
    for (const f of pendingLeagueFixtures) {
      if (fixturesToPredict.length >= 7) break;
      const pairKey = [Math.min(f.homeTeamId, f.awayTeamId), Math.max(f.homeTeamId, f.awayTeamId)].join("-");
      if (seenPairs.has(pairKey)) continue;
      const home = teamMap.get(f.homeTeamId);
      const away = teamMap.get(f.awayTeamId);
      if (!home || !away) continue;
      const league = leagueMap.get(f.leagueId);
      const leagueName = league ? `${league.name}${league.season ? ` S${league.season}` : ""}` : "League";
      seenPairs.add(pairKey);
      fixturesToPredict.push({
        homeId: f.homeTeamId,
        awayId: f.awayTeamId,
        homeName: home.name,
        awayName: away.name,
        competition: leagueName,
        matchday: `Matchday ${f.matchday}`,
        scheduledDate: f.scheduledDate ?? null,
      });
    }

    // GCC fixtures next
    for (const f of pendingGccFixtures) {
      if (fixturesToPredict.length >= 9) break;
      const pairKey = [Math.min(f.homeTeamId, f.awayTeamId), Math.max(f.homeTeamId, f.awayTeamId)].join("-");
      if (seenPairs.has(pairKey)) continue;
      const home = teamMap.get(f.homeTeamId);
      const away = teamMap.get(f.awayTeamId);
      if (!home || !away) continue;
      const tournament = gccTournaments.find(t => t.id === f.tournamentId);
      const tournamentName = tournament ? `GCC ${tournament.name}${tournament.season ? ` S${tournament.season}` : ""}` : "GCC";
      const stageLabel = f.stage === "league" ? `Round ${f.round}` : f.stage.toUpperCase();
      seenPairs.add(pairKey);
      fixturesToPredict.push({
        homeId: f.homeTeamId,
        awayId: f.awayTeamId,
        homeName: home.name,
        awayName: away.name,
        competition: tournamentName,
        matchday: stageLabel,
        scheduledDate: f.scheduledDate ?? null,
      });
    }

    // Fallback: if no scheduled fixtures found at all, tell AI there's nothing to predict
    if (fixturesToPredict.length === 0) {
      return res.json({
        predictions: [],
        generatedAt: new Date().toISOString(),
        message: "No upcoming fixtures found. Generate a fixture schedule in the admin panel first.",
      });
    }

    // ── 7. Build the prompt ───────────────────────────────────────────────────
    const fixtureBlocks = fixturesToPredict.map((f, i) => {
      const dateStr = f.scheduledDate ? ` | Date: ${f.scheduledDate}` : "";
      return [
        `--- FIXTURE ${i + 1}: ${f.competition} — ${f.matchday}${dateStr} ---`,
        `HOME: ${teamContextStr(f.homeId)}`,
        `AWAY: ${teamContextStr(f.awayId)}`,
        h2hStr(f.homeId, f.awayId, f.homeName, f.awayName),
      ].join("\n");
    }).join("\n\n");

    const prompt = `You are the GEF Oracle — the legendary AI predictor for the Global eFootball Federation. You analyse real historical stats to predict UPCOMING scheduled matches. Your predictions are bold, specific, and entertaining.

YOUR RULES:
- These are REAL UPCOMING fixtures — predict each one specifically.
- Base ALL predictions strictly on the stats provided. Never invent scores or stats.
- Each prediction needs a confidence % (50–95%) based on form, H2H, and GD.
- Give an exact predicted scoreline (e.g. 3-1, 2-2).
- Pick a "Star Player to Watch" — a real player from the team data.
- "analysis": 2 sentences using real data (win rates, form, GD, H2H).
- "banter": 1 sentence of sharp, witty commentary — like a football pundit.
- "verdict": 1 short sentence naming the predicted winner and why.
- Include the "competition" and "matchday" fields EXACTLY as provided below.
- Vary the outcomes — not every match is a home win.

=== UPCOMING FIXTURES TO PREDICT ===
${fixtureBlocks}

Predict ALL ${fixturesToPredict.length} fixtures above.

Return ONLY valid JSON, no markdown:
{
  "predictions": [
    {
      "team1": "Home Team Name",
      "team2": "Away Team Name",
      "competition": "exact competition string from above",
      "matchday": "exact matchday string from above",
      "predictedScore": "2-1",
      "winner": "Team Name or Draw",
      "confidence": 78,
      "starPlayer": "Player Name (Team)",
      "analysis": "2 sentence data-driven analysis.",
      "banter": "1 sentence pundit-style banter.",
      "verdict": "1 sentence prediction verdict.",
      "mood": "BANGER" | "TIGHT" | "UPSET" | "ROUTINE"
    }
  ]
}

MOOD guide: BANGER = high-scoring expected, TIGHT = close match, UPSET = underdog likely wins, ROUTINE = favorite should cruise.`;

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { predictions: [] }; }
    const predictions = parsed.predictions ?? [];

    await db.update(aiPredictionsTable).set({ isPublished: false }).where(eq(aiPredictionsTable.isPublished, true));
    await db.insert(aiPredictionsTable).values({ predictions, isPublished: true });

    res.json({ predictions, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("AI predictions error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to generate predictions" });
  }
});

export default router;
