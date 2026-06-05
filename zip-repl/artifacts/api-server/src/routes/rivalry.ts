import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable, teamsTable, playerMatchupsTable, matchesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();

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

// POST /api/ai/rivalry — generate AI rivalry narrative between two players
router.post("/ai/rivalry", async (req, res) => {
  try {
    const { player1Id, player2Id } = req.body as { player1Id: number; player2Id: number };
    if (!player1Id || !player2Id || player1Id === player2Id)
      return res.status(400).json({ error: "Two distinct player IDs required" });

    const openai = await getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI integration not configured" });

    const [players, teams, matchups, matches] = await Promise.all([
      db.select().from(playersTable),
      db.select().from(teamsTable),
      db.select().from(playerMatchupsTable),
      db.select().from(matchesTable),
    ]);

    const p1 = players.find(p => p.id === player1Id);
    const p2 = players.find(p => p.id === player2Id);
    if (!p1 || !p2) return res.status(404).json({ error: "Player not found" });

    const teamMap = new Map(teams.map(t => [t.id, t]));
    const t1Name = p1.teamId ? (teamMap.get(p1.teamId)?.name ?? "Free Agent") : "Free Agent";
    const t2Name = p2.teamId ? (teamMap.get(p2.teamId)?.name ?? "Free Agent") : "Free Agent";

    // Head-to-head matchups between these two players
    const h2hMatchups = matchups.filter(
      mu => (mu.player1Id === player1Id && mu.player2Id === player2Id) ||
            (mu.player1Id === player2Id && mu.player2Id === player1Id)
    );

    let p1Wins = 0, p2Wins = 0, draws = 0;
    let p1Goals = 0, p2Goals = 0;
    let p1Mvps = 0, p2Mvps = 0;

    for (const mu of h2hMatchups) {
      const isP1First = mu.player1Id === player1Id;
      const g1 = isP1First ? mu.player1Goals : mu.player2Goals;
      const g2 = isP1First ? mu.player2Goals : mu.player1Goals;
      p1Goals += g1; p2Goals += g2;
      if (g1 > g2) p1Wins++; else if (g2 > g1) p2Wins++; else draws++;
      if (mu.mvpPlayerId === player1Id) p1Mvps++;
      else if (mu.mvpPlayerId === player2Id) p2Mvps++;
    }

    // Overall stats from all matchups
    const allP1Matchups = matchups.filter(mu => mu.player1Id === player1Id || mu.player2Id === player1Id);
    const allP2Matchups = matchups.filter(mu => mu.player1Id === player2Id || mu.player2Id === player2Id);

    let p1TotalGoals = 0, p1TotalWins = 0, p1TotalGames = 0;
    let p2TotalGoals = 0, p2TotalWins = 0, p2TotalGames = 0;
    let p1TotalMvps = 0, p2TotalMvps = 0;

    for (const mu of allP1Matchups) {
      const isFirst = mu.player1Id === player1Id;
      const g = isFirst ? mu.player1Goals : mu.player2Goals;
      const og = isFirst ? mu.player2Goals : mu.player1Goals;
      p1TotalGoals += g; p1TotalGames++;
      if (g > og) p1TotalWins++;
      if (mu.mvpPlayerId === player1Id) p1TotalMvps++;
    }
    for (const mu of allP2Matchups) {
      const isFirst = mu.player1Id === player2Id;
      const g = isFirst ? mu.player1Goals : mu.player2Goals;
      const og = isFirst ? mu.player2Goals : mu.player1Goals;
      p2TotalGoals += g; p2TotalGames++;
      if (g > og) p2TotalWins++;
      if (mu.mvpPlayerId === player2Id) p2TotalMvps++;
    }

    const totalH2H = p1Wins + p2Wins + draws;
    const p1Wr = p1TotalGames ? Math.round((p1TotalWins / p1TotalGames) * 100) : 0;
    const p2Wr = p2TotalGames ? Math.round((p2TotalWins / p2TotalGames) * 100) : 0;

    const prompt = `You are the GEF Rivalry Commentator — the most dramatic football narrator in the game. Your job is to craft an EPIC rivalry story between two GEF players, drawing on their real stats. Think Sky Sports meets WWE hype. Be bold, theatrical, and use the data.

=== PLAYER 1: ${p1.name} ===
Team: ${t1Name}
Position: ${p1.position ?? "Unknown"}
OVR: ${p1.cardOvr ?? "N/A"}
Overall record: ${p1TotalWins}W from ${p1TotalGames} games | Goals: ${p1TotalGoals} | MVPs: ${p1TotalMvps} | Win Rate: ${p1Wr}%

=== PLAYER 2: ${p2.name} ===
Team: ${t2Name}
Position: ${p2.position ?? "Unknown"}
OVR: ${p2.cardOvr ?? "N/A"}
Overall record: ${p2TotalWins}W from ${p2TotalGames} games | Goals: ${p2TotalGoals} | MVPs: ${p2TotalMvps} | Win Rate: ${p2Wr}%

=== HEAD-TO-HEAD ===
Total clashes: ${totalH2H}
${p1.name} leads: ${p1Wins} wins | ${p2.name} leads: ${p2Wins} wins | Draws: ${draws}
${p1.name} H2H goals: ${p1Goals} | ${p2.name} H2H goals: ${p2Goals}
${p1.name} H2H MVPs: ${p1Mvps} | ${p2.name} H2H MVPs: ${p2Mvps}

Now write an EPIC rivalry breakdown. Be dramatic. Use superlatives. Reference the actual stats.

Return ONLY valid JSON (no markdown):
{
  "title": "Short epic rivalry title (e.g. 'THE ETERNAL CLASH' or 'FIRE vs ICE')",
  "subtitle": "1-line epic tagline",
  "intro": "3-4 sentence opening that sets the scene dramatically, referencing real stats",
  "p1Chapter": "2-3 sentences about Player 1 — their strengths, style, reputation, backed by stats",
  "p2Chapter": "2-3 sentences about Player 2 — their strengths, style, reputation, backed by stats",
  "clashNarrative": "3-4 sentences narrating the H2H history dramatically using the actual head-to-head record",
  "verdict": "2-3 sentences — who currently holds the edge, and why it could flip",
  "edgeHolder": "${totalH2H === 0 ? "EVEN" : (p1Wins > p2Wins ? p1.name : (p2Wins > p1Wins ? p2.name : "EVEN"))}",
  "intensityScore": <number 1-10 based on closeness of the rivalry>,
  "tagline1": "3-word battle cry for ${p1.name}",
  "tagline2": "3-word battle cry for ${p2.name}"
}`;

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let narrative: any;
    try { narrative = JSON.parse(raw); } catch { narrative = {}; }

    res.json({
      player1: { ...p1, teamName: t1Name, totalGoals: p1TotalGoals, totalWins: p1TotalWins, totalGames: p1TotalGames, totalMvps: p1TotalMvps, winRate: p1Wr },
      player2: { ...p2, teamName: t2Name, totalGoals: p2TotalGoals, totalWins: p2TotalWins, totalGames: p2TotalGames, totalMvps: p2TotalMvps, winRate: p2Wr },
      h2h: { p1Wins, p2Wins, draws, p1Goals, p2Goals, p1Mvps, p2Mvps, total: totalH2H },
      narrative,
    });
  } catch (err: any) {
    console.error("Rivalry AI error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to generate rivalry" });
  }
});

// GET /api/players-dropdown — lightweight player list for dropdowns
router.get("/players-dropdown", async (_req, res) => {
  try {
    const players = await db.select({
      id: playersTable.id,
      name: playersTable.name,
      teamId: playersTable.teamId,
      position: playersTable.position,
      imageUrl: playersTable.imageUrl,
      cardOvr: playersTable.cardOvr,
    }).from(playersTable).where(eq(playersTable.status, "active"));

    const teams = await db.select().from(teamsTable);
    const teamMap = new Map(teams.map(t => [t.id, t.name]));
    res.json(players.map(p => ({ ...p, teamName: p.teamId ? (teamMap.get(p.teamId) ?? "") : "" })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
