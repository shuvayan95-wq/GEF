import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  playersTable, teamsTable, matchesTable, playerMatchupsTable,
  awardsTable, ballonDorTable, trophiesTable, aiSportsDeskTable,
  leaguesTable, gccTournamentsTable, gccFixturesTable, gccEntriesTable,
  matchAnalysisTable,
} from "@workspace/db";
import { desc, eq, isNotNull } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOpenAI() {
  // Use Groq (free, OpenAI-compatible) if key is available
  if (process.env.GROQ_API_KEY) {
    const { default: OpenAI } = await import("openai");
    return new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  // Fall back to Replit AI integration
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

const BROADCASTER_SYSTEM = `You are the lead broadcaster for the GEF (Global eFootball Federation) Ballon d'Or Ceremony — the most prestigious individual award in competitive eFootball esports. GEF is a 5v5 eFootball esports tournament — players compete digitally in the eFootball video game, not real football. Your voice is authoritative, passionate, and deeply knowledgeable about competitive esports. You craft commentary that feels like a live, unmissable esports moment.

Your rules:
- Speak like a live esports broadcaster mid-ceremony, never like a data report.
- Always reference at least 2 specific stats in a meaningful, contextual way (e.g. "a staggering win rate", "clinical in the digital box", "untouchable in his consistency on the sticks").
- Compare the player to the field average or top performers where the data is provided.
- Build emotional weight around the rank — a top-3 reveal should feel monumental.
- Use natural pauses (ellipsis "...") and rhythmic sentence structures that work well with text-to-speech.
- Keep it to 3 sentences maximum. Make every word count.
- Never start with the player's name.
- Never use markdown, bullet points, or lists.
- This is eFootball esports — you may reference "the game", "the digital pitch", "on the controller", but never treat this as real-world football.`;

function buildBroadcasterPrompt(player: any, allPlayers: any[], context: "rankings" | "award"): string {
  const sorted = [...allPlayers].sort((a, b) => (b.stats?.goals ?? 0) - (a.stats?.goals ?? 0));
  const topScorer = sorted[0];
  const avgGoals = allPlayers.length
    ? allPlayers.reduce((s, p) => s + (p.stats?.goals ?? 0), 0) / allPlayers.length
    : null;
  const avgWinRate = allPlayers.length
    ? allPlayers.reduce((s, p) => s + (p.stats?.winRate ?? 0), 0) / allPlayers.length
    : null;
  const avgOvr = allPlayers.length
    ? allPlayers.reduce((s, p) => s + (p.stats?.rating ?? 0), 0) / allPlayers.length
    : null;

  const isTopScorer = topScorer?.name === player.name;
  const rank = player.rank;
  const isWinner = rank === 1;
  const isPodium = rank <= 3;
  const isTopFive = rank <= 5;

  const rankContext = isWinner
    ? "THIS IS THE WINNER — THE BALLON D'OR CHAMPION. Make this the most dramatic moment of the night."
    : rank === 2
    ? "Second place. So close to the title. Honour this performance accordingly."
    : rank === 3
    ? "Third place — on the podium. A remarkable achievement."
    : isTopFive
    ? "Top five in the world. Elite company."
    : rank <= 10
    ? "Top ten — among the very best this season has produced."
    : "A notable entry in the Ballon d'Or rankings.";

  const goals = player.stats?.goals ?? null;
  const winRate = player.stats?.winRate ?? null;
  const mvps = player.stats?.mvps ?? null;
  const trophies = player.stats?.trophies ?? null;
  const ovr = player.stats?.rating ?? null;
  const points = player.points ?? null;

  const goalsVsAvg = goals !== null && avgGoals !== null
    ? goals > avgGoals * 1.4
      ? `(${Math.round(((goals - avgGoals) / avgGoals) * 100)}% above the field average of ${Math.round(avgGoals * 10) / 10})`
      : goals < avgGoals
      ? `(below the field average of ${Math.round(avgGoals * 10) / 10})`
      : `(right at the field average)`
    : "";

  const winRateVsAvg = winRate !== null && avgWinRate !== null
    ? winRate > avgWinRate + 10
      ? `(${Math.round(winRate - avgWinRate)} points above the field average of ${Math.round(avgWinRate)}%)`
      : winRate < avgWinRate - 10
      ? `(below the field average of ${Math.round(avgWinRate)}%)`
      : ""
    : "";

  return `Generate live Ballon d'Or ceremony commentary for the following player reveal.

RANK CONTEXT: ${rankContext}

Player: ${player.name}
Team: ${player.team || "Unknown"}
Rank: #${rank} of ${allPlayers.length}
${points !== null ? `Ballon d'Or Points: ${points}` : ""}

Season Performance:
${goals !== null ? `- Goals scored: ${goals} ${goalsVsAvg}` : ""}
${winRate !== null ? `- Win rate: ${winRate}% ${winRateVsAvg}` : ""}
${mvps !== null ? `- MVP awards: ${mvps}` : ""}
${trophies !== null ? `- Trophies: ${trophies}` : ""}
${ovr !== null ? `- OVR rating: ${ovr}${avgOvr !== null ? ` (field avg: ${Math.round(avgOvr)})` : ""}` : ""}
${isTopScorer ? `\nNOTE: This player is THE TOP SCORER of the entire Ballon d'Or field.` : topScorer ? `\nTop scorer in the field: ${topScorer.name} with ${topScorer.stats?.goals ?? 0} goals.` : ""}

Write 3 sentences of live broadcaster commentary. Dramatic, specific, emotionally resonant. No bullet points.`;
}

// POST /ai/player-commentary — generate AI commentary for a single player
router.post("/ai/player-commentary", async (req, res) => {
  try {
    const openai = await getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI integration not configured" });

    const { player, allPlayers = [] } = req.body;
    if (!player) return res.status(400).json({ error: "player required" });

    const userPrompt = buildBroadcasterPrompt(player, allPlayers, "rankings");

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages: [
        { role: "system", content: BROADCASTER_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    });

    const commentary = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ commentary });
  } catch (err: any) {
    console.error("AI commentary error:", err?.message);
    res.status(500).json({ error: err?.message });
  }
});

// POST /ai/generate-all-commentary — generate commentary for all ranked players (SSE stream)
router.post("/ai/generate-all-commentary", requireAdmin, async (req, res) => {
  try {
    const openai = await getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI integration not configured" });

    const { players } = req.body;
    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ error: "players array required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const results: Record<string, string> = {};

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      try {
        const userPrompt = buildBroadcasterPrompt(player, players, "rankings");

        const response = await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 300,
          messages: [
            { role: "system", content: BROADCASTER_SYSTEM },
            { role: "user", content: userPrompt },
          ],
        });

        const commentary = response.choices[0]?.message?.content?.trim() ?? "";
        results[player.name] = commentary;

        res.write(`data: ${JSON.stringify({ done: false, progress: i + 1, total: players.length, playerName: player.name, commentary })}\n\n`);

        if (i < players.length - 1) {
          await new Promise(r => setTimeout(r, 250));
        }
      } catch (e: any) {
        console.error(`Commentary error for ${player.name}:`, e?.message);
        results[player.name] = "";
        res.write(`data: ${JSON.stringify({ done: false, progress: i + 1, total: players.length, playerName: player.name, commentary: "" })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, results })}\n\n`);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /api/ai/sports-desk — public: return latest published edition
router.get("/ai/sports-desk", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(aiSportsDeskTable)
      .where(eq(aiSportsDeskTable.isPublished, true))
      .orderBy(desc(aiSportsDeskTable.generatedAt))
      .limit(1);

    if (!rows.length) return res.json({ articles: [], generatedAt: null });
    const row = rows[0];
    res.json({
      articles: (row.articles as any[]) ?? [],
      generatedAt: row.generatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    console.error("AI sports-desk GET error:", err?.message);
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/ai/sports-desk/generate — admin only: generate + publish new edition
router.post("/ai/sports-desk/generate", requireAdmin, async (req, res) => {
  try {
    const openai = await getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI integration not configured" });

    // ── Fetch all data in parallel ────────────────────────────────────────────
    const [
      teams, players, allMatches, matchups, awards,
      bdResults, trophies, leagues, gccTournaments, gccFixtures, gccEntries,
    ] = await Promise.all([
      db.select().from(teamsTable),
      db.select().from(playersTable),
      db.select().from(matchesTable).orderBy(desc(matchesTable.createdAt)),
      db.select().from(playerMatchupsTable),
      db.select().from(awardsTable).orderBy(desc(awardsTable.createdAt)),
      db.select().from(ballonDorTable).orderBy(desc(ballonDorTable.calculatedAt)),
      db.select().from(trophiesTable).orderBy(desc(trophiesTable.createdAt)),
      db.select().from(leaguesTable).orderBy(desc(leaguesTable.createdAt)),
      db.select().from(gccTournamentsTable).orderBy(desc(gccTournamentsTable.createdAt)),
      db.select().from(gccFixturesTable),
      db.select().from(gccEntriesTable),
    ]);

    // ── Detect current season ─────────────────────────────────────────────────
    // Use the most recent season found across leagues and matches
    const allSeasons = [
      ...leagues.map(l => l.season).filter(Boolean),
      ...allMatches.map(m => m.season).filter(Boolean),
    ] as string[];
    const currentSeason = allSeasons[0] ?? null;

    // Filter matches to current season only (fall back to all if no season data)
    const matches = currentSeason
      ? allMatches.filter(m => m.season === currentSeason)
      : allMatches.slice(0, 100);

    // ── Lookup maps ───────────────────────────────────────────────────────────
    const teamMap = new Map(teams.map(t => [t.id, t.name]));
    const playerMap = new Map(players.map(p => [p.id, p]));
    const leagueMap = new Map(leagues.map(l => [l.id, l]));

    // ── Per-match-id lookup for matchups ──────────────────────────────────────
    const matchIdSet = new Set(matches.map(m => m.id));
    const currentMatchups = matchups.filter(mu => matchIdSet.has(mu.matchId));

    // ── Per-player goal/MVP stats (current season) ────────────────────────────
    const playerGoals: Record<number, number> = {};
    const playerMVPs: Record<number, number> = {};
    for (const mu of currentMatchups) {
      playerGoals[mu.player1Id] = (playerGoals[mu.player1Id] ?? 0) + mu.player1Goals;
      playerGoals[mu.player2Id] = (playerGoals[mu.player2Id] ?? 0) + mu.player2Goals;
      if (mu.mvpPlayerId) playerMVPs[mu.mvpPlayerId] = (playerMVPs[mu.mvpPlayerId] ?? 0) + 1;
    }

    // ── Per-team overall record (current season) ──────────────────────────────
    const teamW: Record<number, number> = {};
    const teamL: Record<number, number> = {};
    const teamD: Record<number, number> = {};
    const teamGF: Record<number, number> = {};
    const teamGA: Record<number, number> = {};

    for (const m of matches) {
      for (const id of [m.team1Id, m.team2Id]) {
        if (!teamW[id]) { teamW[id] = 0; teamL[id] = 0; teamD[id] = 0; teamGF[id] = 0; teamGA[id] = 0; }
      }
      teamGF[m.team1Id] += m.team1Score; teamGA[m.team1Id] += m.team2Score;
      teamGF[m.team2Id] += m.team2Score; teamGA[m.team2Id] += m.team1Score;
      if (m.team1Score > m.team2Score)      { teamW[m.team1Id]++; teamL[m.team2Id]++; }
      else if (m.team2Score > m.team1Score) { teamW[m.team2Id]++; teamL[m.team1Id]++; }
      else                                  { teamD[m.team1Id]++; teamD[m.team2Id]++; }
    }

    // ── Per-league standings ──────────────────────────────────────────────────
    const leagueMatches: Record<number, typeof matches> = {};
    for (const m of matches) {
      if (m.leagueId) {
        if (!leagueMatches[m.leagueId]) leagueMatches[m.leagueId] = [];
        leagueMatches[m.leagueId].push(m);
      }
    }

    const leagueStandingsContext = leagues.map(lg => {
      const lms = leagueMatches[lg.id] ?? [];
      if (!lms.length) return null;

      const pts: Record<number, number> = {};
      const lW: Record<number, number> = {};
      const lL: Record<number, number> = {};
      const lD: Record<number, number> = {};
      const lGF: Record<number, number> = {};
      const lGA: Record<number, number> = {};

      for (const m of lms) {
        for (const id of [m.team1Id, m.team2Id]) {
          if (!pts[id]) { pts[id] = 0; lW[id] = 0; lL[id] = 0; lD[id] = 0; lGF[id] = 0; lGA[id] = 0; }
        }
        lGF[m.team1Id] += m.team1Score; lGA[m.team1Id] += m.team2Score;
        lGF[m.team2Id] += m.team2Score; lGA[m.team2Id] += m.team1Score;
        if (m.team1Score > m.team2Score)      { pts[m.team1Id] += 3; lW[m.team1Id]++; lL[m.team2Id]++; }
        else if (m.team2Score > m.team1Score) { pts[m.team2Id] += 3; lW[m.team2Id]++; lL[m.team1Id]++; }
        else { pts[m.team1Id]++; pts[m.team2Id]++; lD[m.team1Id]++; lD[m.team2Id]++; }
      }

      const table = Object.keys(pts)
        .map(id => {
          const tid = Number(id);
          const g = (lW[tid] ?? 0) + (lL[tid] ?? 0) + (lD[tid] ?? 0);
          const gd = (lGF[tid] ?? 0) - (lGA[tid] ?? 0);
          return { name: teamMap.get(tid) ?? "?", p: pts[tid] ?? 0, w: lW[tid] ?? 0, d: lD[tid] ?? 0, l: lL[tid] ?? 0, gf: lGF[tid] ?? 0, ga: lGA[tid] ?? 0, gd, g };
        })
        .sort((a, b) => b.p - a.p || b.gd - a.gd || b.gf - a.gf)
        .slice(0, 10);

      const rows = table.map((r, i) =>
        `  ${i + 1}. ${r.name}: ${r.p}pts | W${r.w} D${r.d} L${r.l} | GF${r.gf} GA${r.ga} GD${r.gd}`
      ).join("\n");

      return `── ${lg.name} (${lg.season ?? "current"}, ${lg.leagueType}) — ${lms.length} matches played:\n${rows}`;
    }).filter(Boolean).join("\n\n");

    // ── GCC / Champions Cup context ───────────────────────────────────────────
    const currentGcc = gccTournaments[0] ?? null;
    let gccContext = "No Champions Cup data.";

    if (currentGcc) {
      const entries = gccEntries.filter(e => e.tournamentId === currentGcc.id);
      const fixtures = gccFixtures.filter(f => f.tournamentId === currentGcc.id);
      const played = fixtures.filter(f => f.played);

      // Per-team GCC record
      const gccW: Record<number, number> = {};
      const gccL: Record<number, number> = {};
      const gccD: Record<number, number> = {};
      const gccGF: Record<number, number> = {};
      const gccGA: Record<number, number> = {};

      for (const f of played) {
        for (const id of [f.homeTeamId, f.awayTeamId]) {
          if (!gccW[id]) { gccW[id] = 0; gccL[id] = 0; gccD[id] = 0; gccGF[id] = 0; gccGA[id] = 0; }
        }
        const hs = f.homeScore ?? 0, as_ = f.awayScore ?? 0;
        gccGF[f.homeTeamId] += hs; gccGA[f.homeTeamId] += as_;
        gccGF[f.awayTeamId] += as_; gccGA[f.awayTeamId] += hs;
        if (hs > as_)      { gccW[f.homeTeamId]++; gccL[f.awayTeamId]++; }
        else if (as_ > hs) { gccW[f.awayTeamId]++; gccL[f.homeTeamId]++; }
        else               { gccD[f.homeTeamId]++; gccD[f.awayTeamId]++; }
      }

      const gccPts: Record<number, number> = {};
      for (const id of Object.keys(gccW).map(Number)) {
        gccPts[id] = (gccW[id] ?? 0) * 3 + (gccD[id] ?? 0);
      }

      const leagueTable = Object.keys(gccPts)
        .map(id => {
          const tid = Number(id);
          const gd = (gccGF[tid] ?? 0) - (gccGA[tid] ?? 0);
          return { name: teamMap.get(tid) ?? "?", p: gccPts[tid] ?? 0, w: gccW[tid] ?? 0, d: gccD[tid] ?? 0, l: gccL[tid] ?? 0, gf: gccGF[tid] ?? 0, ga: gccGA[tid] ?? 0, gd };
        })
        .sort((a, b) => b.p - a.p || b.gd - a.gd)
        .slice(0, 12);

      const tableRows = leagueTable.map((r, i) =>
        `  ${i + 1}. ${r.name}: ${r.p}pts | W${r.w} D${r.d} L${r.l} | GF${r.gf} GA${r.ga} GD${r.gd}`
      ).join("\n");

      // Recent knockout results
      const knockoutStages = ["r16", "qf", "sf", "final"];
      const knockoutResults = knockoutStages.flatMap(stage => {
        const stageFix = played.filter(f => f.stage === stage);
        return stageFix.map(f => {
          const hs = f.homeScore ?? 0, as_ = f.awayScore ?? 0;
          const home = teamMap.get(f.homeTeamId) ?? "?";
          const away = teamMap.get(f.awayTeamId) ?? "?";
          return `  [${stage.toUpperCase()} Leg ${f.leg}] ${home} ${hs}-${as_} ${away}`;
        });
      }).join("\n");

      // Finalized results
      const fin = currentGcc.finalizedResults as any;
      const champion = fin?.champion ? teamMap.get(fin.champion) ?? "?" : null;
      const runnerUp = fin?.runnerUp ? teamMap.get(fin.runnerUp) ?? "?" : null;

      gccContext = `Champions Cup: ${currentGcc.name} (Season ${currentGcc.season}) — Status: ${currentGcc.status}
${entries.length} teams entered | ${played.length} fixtures played
${champion ? `CHAMPION: ${champion}${runnerUp ? ` | Runner-up: ${runnerUp}` : ""}` : ""}

League Phase Standings:
${tableRows || "  No completed fixtures yet"}

${knockoutResults ? `Knockout Results:\n${knockoutResults}` : ""}`.trim();
    }

    // ── Recent match results (current season, last 30) ────────────────────────
    const recentMatchesContext = matches.slice(0, 30).map(m => {
      const t1 = teamMap.get(m.team1Id) ?? "?";
      const t2 = teamMap.get(m.team2Id) ?? "?";
      const result = m.team1Score > m.team2Score ? `${t1} WIN` : m.team2Score > m.team1Score ? `${t2} WIN` : "DRAW";
      const lg = m.leagueId ? leagueMap.get(m.leagueId)?.name : m.gccTournamentId ? "Champions Cup" : "Friendly";
      return `${t1} ${m.team1Score}-${m.team2Score} ${t2} [${result}] (${lg ?? "?"})${m.date ? ` — ${m.date}` : ""}`;
    }).join("\n");

    // ── Overall team summary (current season) ─────────────────────────────────
    const overallTeamsContext = teams.map(t => {
      const w = teamW[t.id] ?? 0, l = teamL[t.id] ?? 0, d = teamD[t.id] ?? 0;
      const gf = teamGF[t.id] ?? 0, ga = teamGA[t.id] ?? 0;
      const total = w + l + d;
      if (!total) return null;
      const winPct = Math.round((w / total) * 100);
      return `${t.name}: W${w} L${l} D${d} (${winPct}% win rate) | GF:${gf} GA:${ga} GD:${gf - ga} | ${total} games`;
    }).filter(Boolean).join("\n");

    // ── Top players (current season) ──────────────────────────────────────────
    const topPlayers = players
      .map(p => ({
        name: p.name,
        team: teamMap.get(p.teamId ?? 0) ?? "Unknown",
        position: p.position ?? "?",
        ovr: p.cardOvr,
        goals: playerGoals[p.id] ?? 0,
        mvps: playerMVPs[p.id] ?? 0,
      }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 25);

    const playersContext = topPlayers
      .map((p, i) => `${i + 1}. ${p.name} (${p.team}, ${p.position}): ${p.goals} goals, ${p.mvps} MVPs${p.ovr ? `, OVR ${p.ovr}` : ""}`)
      .join("\n");

    // ── Ballon d'Or context (rich top-10 + history) ───────────────────────────
    const latestBD = bdResults.find(r => r.winner) ?? null;
    let bdContext = "No Ballon d'Or data yet.";

    if (latestBD) {
      const w = latestBD.winner as any;
      const top10 = ((latestBD.top50 as any[]) ?? []).slice(0, 10);
      const top10Str = top10.map((p: any, i: number) => {
        const pts = p?.points !== undefined ? ` (${p.points} pts)` : "";
        const stats = [
          p?.stats?.goals !== undefined ? `${p.stats.goals} goals` : null,
          p?.stats?.winRate !== undefined ? `${Math.round(p.stats.winRate)}% WR` : null,
          p?.stats?.mvps !== undefined ? `${p.stats.mvps} MVPs` : null,
          p?.stats?.trophies !== undefined ? `${p.stats.trophies} trophies` : null,
        ].filter(Boolean).join(", ");
        return `  ${i + 1}. ${p?.name ?? "?"}${p?.team ? ` (${p.team})` : ""}${pts}${stats ? ` — ${stats}` : ""}`;
      }).join("\n");

      const bdHistory = bdResults.filter(r => r.winner && r.season !== latestBD.season).slice(0, 5).map(r => {
        const pw = r.winner as any;
        return `  Season ${r.season}: ${pw?.name ?? "?"} (${pw?.team ?? "?"})`;
      }).join("\n");

      bdContext = `CURRENT SEASON (${latestBD.season}) BALLON D'OR TOP 10:
${top10Str || "  No rankings yet"}

PREVIOUS BALLON D'OR WINNERS:
${bdHistory || "  No history"}`;
    }

    // ── Trophies / winners ────────────────────────────────────────────────────
    const currentSeasonTrophies = trophies.filter(t => !currentSeason || t.season === currentSeason);
    const trophiesContext = (currentSeasonTrophies.length ? currentSeasonTrophies : trophies).slice(0, 15).map(t => {
      const winner = t.winnerTeamId ? teamMap.get(t.winnerTeamId) : t.winnerPlayerId ? playerMap.get(t.winnerPlayerId)?.name : "Unknown";
      const lg = t.leagueId ? leagueMap.get(t.leagueId)?.name : null;
      return `"${t.name}" (${t.season}): ${winner ?? "TBD"}${lg ? ` — ${lg}` : ""}`;
    }).join("\n");

    // ── Individual awards ─────────────────────────────────────────────────────
    const awardsContext = awards.slice(0, 20).map(a => {
      const p = playerMap.get(a.playerId);
      return `${p?.name ?? "Unknown"} (${teamMap.get(p?.teamId ?? 0) ?? "?"}): "${a.title}" — ${a.awardedAt}`;
    }).join("\n");

    // ── Build the mega prompt ─────────────────────────────────────────────────
    const prompt = `You are the "GEF SPORTS DESK" — the most ruthless, data-obsessed esports journalist in the Global eFootball Federation. GEF is a competitive 5v5 eFootball esports tournament — players compete in the eFootball video game, NOT real football. Your voice is a savage blend of esports commentator energy and sharp sports journalism. You are witty, dramatic, forensic with numbers, and never diplomatic. Your job is to entertain AND inform.

CRITICAL CONTEXT: This is eFootball ESPORTS. Players are gamers competing in a digital tournament. Do NOT write as if this is real-world football. References to "pitch", "goals", "wins" are all in the context of the eFootball video game. You may reference controllers, in-game mechanics, and esports culture.

YOUR ABSOLUTE RULES:
- ONLY use names, teams, scores, and statistics EXACTLY as given in the data below. Do NOT invent numbers.
- Current season is: ${currentSeason ?? "unknown — use all available data"}. Write about THIS season only.
- Reference SPECIFIC numbers (goals, points, win rates, GD, exact scores, OVR) exactly as provided.
- Each article must be a proper long-form piece: 3 paragraphs, each 2-4 sentences long.
- Include at least 1 fictional direct quote per article (player, team captain, or "GEF insider") formatted as: "Quote." — Name
- ROAST: use the subject's own numbers against them. Devastating and specific.
- PRAISE: cite exact stats that make them elite. Reverence, historical context in esports terms.
- RIVALRY: contrast two teams'/players' head-to-head stats exactly. Who leads and by how much?
- ANALYSIS: explain WHY a team performs as they do — cite GD, win rate, goals scored/conceded in the game.
- BREAKING: frame as a shocking revelation using actual data turning points.
- Headlines must be ALL CAPS — punchy, front-page quality.
- Cover a MIX of leagues, the Champions Cup, Ballon d'Or, and player spotlights.
- Never repeat the same subject twice.
- FORBIDDEN WORDS — never use: defender, midfielder, striker, formation, pressing, possession, defensive line, high line, full back, winger, tactical shape, counter attack, or any real-world football tactics. GEF is an eFootball esports franchise league — write about individual player results, roster performance, scorelines, win streaks, standings, transfers, captain decisions, and trophy races ONLY.

=== GEF DATA — CURRENT SEASON: ${currentSeason ?? "ALL TIME"} ===

OVERALL TEAM RECORDS THIS SEASON:
${overallTeamsContext || "No match data for current season"}

LEAGUE STANDINGS BY COMPETITION:
${leagueStandingsContext || "No league data"}

CHAMPIONS CUP (GCC):
${gccContext}

TOP SCORERS & PLAYER STATS THIS SEASON:
${playersContext || "No player data"}

RECENT MATCH RESULTS:
${recentMatchesContext || "No recent matches"}

BALLON D'OR:
${bdContext}

TROPHIES / COMPETITION WINNERS:
${trophiesContext || "No trophy data"}

INDIVIDUAL AWARDS:
${awardsContext || "No awards data"}
========================================

Generate exactly 7 news articles covering DIFFERENT aspects of GEF. Spread coverage across:
- At least 1 article about a LEAGUE competition (use specific league name from standings)
- At least 1 article about the CHAMPIONS CUP (GCC)
- At least 1 BALLON D'OR article (current rankings, race, analysis)
- At least 2 PLAYER spotlights (top scorers / MVPs)
- At least 1 TEAM report (use exact win rate / GD from data)
- 1 wildcard (rivalry, breaking news, historical analysis)

Each article body must have 3 paragraphs separated by \\n\\n:
- Paragraph 1: The hook / situation (2-3 sentences)
- Paragraph 2: The data evidence + fictional quote (2-4 sentences)
- Paragraph 3: The verdict / conclusion (2-3 sentences)

Return ONLY valid JSON — no markdown, no code fences:
{
  "articles": [
    {
      "headline": "ALL CAPS PUNCHY HEADLINE",
      "tone": "ROAST",
      "subject": "Who/what this is about",
      "category": "Team Report",
      "body": "Para 1.\\n\\nPara 2 with stats and \\"quote\\" — Source.\\n\\nPara 3 verdict."
    }
  ]
}

TONE: ROAST | PRAISE | ANALYSIS | BREAKING | RIVALRY
CATEGORY: "Player Spotlight" | "Team Report" | "League Coverage" | "Champions Cup" | "Ballon d'Or Watch" | "Rivalry" | "History Files"
Distribution: at least 2 ROASTs, 1 PRAISE, 1 RIVALRY, 1 ANALYSIS, rest varies.`;

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 5000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch { parsed = { articles: [] }; }

    const articles = parsed.articles ?? [];

    // Unpublish all previous editions, then insert new published one
    await db
      .update(aiSportsDeskTable)
      .set({ isPublished: false })
      .where(eq(aiSportsDeskTable.isPublished, true));

    await db.insert(aiSportsDeskTable).values({ articles, isPublished: true });

    res.json({ articles, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("AI sports-desk generate error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to generate sports news" });
  }
});

// GET /api/ai/player-analysis/:id — generate AI performance analysis for a player
router.get("/ai/player-analysis/:id", async (req, res) => {
  try {
    const openai = await getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI integration not configured" });

    const playerId = parseInt(req.params.id);
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, playerId));
    if (!player) return res.status(404).json({ error: "Player not found" });

    const [matchups, awards, teams] = await Promise.all([
      db.select().from(playerMatchupsTable).where(
        isNotNull(playerMatchupsTable.matchId)
      ),
      db.select().from(awardsTable).where(eq(awardsTable.playerId, playerId)),
      db.select().from(teamsTable),
    ]);

    const playerMatchups = matchups.filter(
      m => m.player1Id === playerId || m.player2Id === playerId
    );

    let wins = 0, losses = 0, draws = 0, goals = 0, conceded = 0, mvps = 0;
    for (const m of playerMatchups) {
      const isP1 = m.player1Id === playerId;
      const myGoals = isP1 ? m.player1Goals : m.player2Goals;
      const theirGoals = isP1 ? m.player2Goals : m.player1Goals;
      goals += myGoals;
      conceded += theirGoals;
      if (myGoals > theirGoals) wins++;
      else if (myGoals < theirGoals) losses++;
      else draws++;
      if (m.mvpPlayerId === playerId) mvps++;
    }
    const total = wins + losses + draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const gpg = total > 0 ? (goals / total).toFixed(2) : "0";

    const teamName = player.teamId ? (teams.find(t => t.id === player.teamId)?.name ?? "Unknown") : "Free Agent";
    const recentForm = playerMatchups.slice(-5).map(m => {
      const isP1 = m.player1Id === playerId;
      const myG = isP1 ? m.player1Goals : m.player2Goals;
      const theirG = isP1 ? m.player2Goals : m.player1Goals;
      return myG > theirG ? "W" : myG < theirG ? "L" : "D";
    }).join(" ");

    const awardsList = awards.map(a => a.title).join(", ") || "None";

    const prompt = `You are a world-class football analyst writing a detailed scouting and performance report for a GEF (Global eFootball Federation) player. Write in an authoritative, analytical tone — like a premier scout or elite football journalist.

PLAYER DATA:
Name: ${player.name}
Team: ${teamName}
Position: ${player.position ?? "Unknown"}
Card OVR: ${player.cardOvr ?? "—"}
Playing Style: ${player.cardPlayingStyle ?? "—"}
Card Type: ${player.cardType ?? "—"}
Nationality: ${player.nationality ?? "—"}
Rank: ${player.rank ?? "—"}

PERFORMANCE STATS:
Matches Played: ${total}
Wins: ${wins} | Draws: ${draws} | Losses: ${losses}
Win Rate: ${winRate}%
Goals Scored: ${goals}
Goals Conceded: ${conceded}
Goal Difference: ${goals - conceded}
Goals Per Match: ${gpg}
MVP Awards (match): ${mvps}
Recent Form (last 5): ${recentForm || "No recent data"}
Individual Awards: ${awardsList}

Write a detailed performance analysis report with these sections:
1. **Overview** — 2-3 sentences summarizing who this player is and their standing in GEF
2. **Attacking Output** — Analyze their goal-scoring and offensive contribution
3. **Consistency & Form** — Analyze their win rate, recent form, and reliability
4. **Strengths** — 2-3 key strengths backed by the stats
5. **Areas to Watch** — 1-2 areas where the data suggests vulnerability or room for growth
6. **Verdict** — A punchy 2-sentence conclusion on their overall level

Rules:
- Only reference stats exactly as provided. Do not invent numbers.
- Be specific — cite exact figures, not vague statements.
- Keep each section 2-4 sentences.
- No markdown headers with #, use bold labels like **Overview:**
- Total length: 300-450 words.`;

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ playerId, playerName: player.name, analysis, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("AI player analysis error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to generate analysis" });
  }
});

// GET /api/ai/team-analysis/:id — generate AI performance analysis for a team
router.get("/ai/team-analysis/:id", async (req, res) => {
  try {
    const openai = await getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI integration not configured" });

    const teamId = parseInt(req.params.id);
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
    if (!team) return res.status(404).json({ error: "Team not found" });

    const [allPlayers, allMatches, allMatchups, trophies] = await Promise.all([
      db.select().from(playersTable).where(eq(playersTable.teamId, teamId)),
      db.select().from(matchesTable),
      db.select().from(playerMatchupsTable),
      db.select().from(trophiesTable),
    ]);

    const teamMatches = allMatches.filter(m => m.team1Id === teamId || m.team2Id === teamId);
    let wins = 0, losses = 0, draws = 0, gf = 0, ga = 0;
    for (const m of teamMatches) {
      const isT1 = m.team1Id === teamId;
      const myScore = isT1 ? m.team1Score : m.team2Score;
      const theirScore = isT1 ? m.team2Score : m.team1Score;
      gf += myScore; ga += theirScore;
      if (myScore > theirScore) wins++;
      else if (myScore < theirScore) losses++;
      else draws++;
    }
    const total = wins + losses + draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    const recentMatches = teamMatches.slice(-5);
    const recentForm = recentMatches.map(m => {
      const isT1 = m.team1Id === teamId;
      const myS = isT1 ? m.team1Score : m.team2Score;
      const theirS = isT1 ? m.team2Score : m.team1Score;
      return myS > theirS ? "W" : myS < theirS ? "L" : "D";
    }).join(" ");

    const teamTrophies = trophies.filter(t => t.winnerTeamId === teamId);
    const rosterSize = allPlayers.filter(p => p.status === "active").length;
    const captain = allPlayers.find(p => p.teamRole === "captain");
    const vc = allPlayers.find(p => p.teamRole === "vice_captain");

    const avgOvr = allPlayers.length > 0
      ? Math.round(allPlayers.reduce((s, p) => s + (p.cardOvr ?? 60), 0) / allPlayers.length)
      : null;

    const prompt = `You are a world-class football analyst writing a comprehensive team performance report for a GEF (Global eFootball Federation) franchise. Be analytical, specific, and authoritative.

TEAM DATA:
Team Name: ${team.name}
Active Roster Size: ${rosterSize}
Captain: ${captain?.name ?? "Not assigned"}
Vice Captain: ${vc?.name ?? "Not assigned"}
Average Squad OVR: ${avgOvr ?? "—"}
Trophies Won: ${teamTrophies.length > 0 ? teamTrophies.map(t => t.name).join(", ") : "None yet"}

PERFORMANCE RECORD:
Total Matches: ${total}
Wins: ${wins} | Draws: ${draws} | Losses: ${losses}
Win Rate: ${winRate}%
Goals Scored: ${gf}
Goals Conceded: ${ga}
Goal Difference: ${gf - ga}
Goals Per Match: ${total > 0 ? (gf / total).toFixed(2) : "0"}
Recent Form (last 5): ${recentForm || "No recent data"}

Write a detailed team analysis report with these sections:
1. **Club Overview** — 2-3 sentences on the team's identity and GEF standing
2. **Attack & Scoring** — Analyze their offensive output and goal-scoring efficiency
3. **Defensive Record** — Analyze goals conceded and defensive resilience
4. **Form & Consistency** — Recent form, win rate trend, and reliability
5. **Squad Strength** — Comments on roster size, OVR, leadership
6. **Verdict** — A punchy 2-sentence assessment of where this team stands in GEF

Rules:
- Only reference stats exactly as provided. Do not invent numbers.
- Be specific — cite exact figures.
- Keep each section 2-4 sentences.
- No markdown headers with #, use bold labels like **Club Overview:**
- Total length: 300-450 words.`;

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ teamId, teamName: team.name, analysis, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("AI team analysis error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to generate analysis" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI MATCH ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

async function getVisionAI(): Promise<{ client: any; model: string; supportsVision: boolean }> {
  // Try Replit OpenAI integration first (GPT-4o supports vision)
  try {
    const mod = await import("@workspace/integrations-openai-ai-server");
    if (mod.openai) return { client: mod.openai, model: "gpt-4o", supportsVision: true };
  } catch {}
  // Fall back to whatever getOpenAI() returns (Groq, etc.) — no vision but still works
  const client = await getOpenAI();
  return { client, model: "llama-3.3-70b-versatile", supportsVision: false };
}

// GET /api/ai/match-analysis — list all analyses
router.get("/ai/match-analysis", async (req, res) => {
  try {
    const analyses = await db
      .select()
      .from(matchAnalysisTable)
      .where(eq(matchAnalysisTable.isPublished, true))
      .orderBy(desc(matchAnalysisTable.generatedAt));
    res.json(analyses);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /api/ai/match-analysis/:matchId — get analysis for a specific match
router.get("/ai/match-analysis/:matchId", async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    const [analysis] = await db
      .select()
      .from(matchAnalysisTable)
      .where(eq(matchAnalysisTable.matchId, matchId));
    if (!analysis) return res.status(404).json({ error: "No analysis found for this match" });
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/ai/match-analysis/generate — generate analysis for a match
router.post("/ai/match-analysis/generate", requireAdmin, async (req, res) => {
  try {
    const { matchId, contextNotes, matchups: matchupInputs = [] } = req.body;
    if (!matchId) return res.status(400).json({ error: "matchId required" });

    const { client, model, supportsVision } = await getVisionAI();
    if (!client) return res.status(503).json({ error: "AI integration not configured" });

    // Fetch match
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId));
    if (!match) return res.status(404).json({ error: "Match not found" });

    // Fetch teams, players, matchups
    const [team1, team2] = await Promise.all([
      db.select().from(teamsTable).where(eq(teamsTable.id, match.team1Id)),
      db.select().from(teamsTable).where(eq(teamsTable.id, match.team2Id)),
    ]);
    const t1 = team1[0], t2 = team2[0];

    const dbMatchups = await db.select().from(playerMatchupsTable).where(eq(playerMatchupsTable.matchId, matchId));
    const matchupsEnriched = await Promise.all(
      dbMatchups.map(async (m) => {
        const [[p1], [p2]] = await Promise.all([
          db.select().from(playersTable).where(eq(playersTable.id, m.player1Id)),
          db.select().from(playersTable).where(eq(playersTable.id, m.player2Id)),
        ]);
        return {
          ...m,
          player1Name: p1?.name ?? "Unknown",
          player2Name: p2?.name ?? "Unknown",
          mvpName: m.mvpPlayerId === m.player1Id ? (p1?.name ?? null) : m.mvpPlayerId === m.player2Id ? (p2?.name ?? null) : null,
        };
      })
    );

    const matchTypeLabel = match.matchType === "supercup"
      ? `Super Cup Leg ${match.superCupLeg ?? "?"}`
      : match.matchType === "friendly" ? "Friendly" : "League";

    // Fetch head-to-head history and recent form for both teams
    const recentAllMatches = await db.select().from(matchesTable).orderBy(desc(matchesTable.date)).limit(30);
    const h2h = recentAllMatches.filter(
      m => m.id !== matchId &&
        ((m.team1Id === match.team1Id && m.team2Id === match.team2Id) ||
         (m.team1Id === match.team2Id && m.team2Id === match.team1Id))
    ).slice(0, 5);
    const t1Recent = recentAllMatches.filter(
      m => m.id !== matchId && (m.team1Id === match.team1Id || m.team2Id === match.team1Id)
    ).slice(0, 5);
    const t2Recent = recentAllMatches.filter(
      m => m.id !== matchId && (m.team1Id === match.team2Id || m.team2Id === match.team2Id)
    ).slice(0, 5);

    const fmtH2H = (m: any) => {
      const isNorm = m.team1Id === match.team1Id;
      const s1 = isNorm ? m.team1Score : m.team2Score;
      const s2 = isNorm ? m.team2Score : m.team1Score;
      const d = m.date ? new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "?";
      return `  ${d}: ${t1?.name} ${s1}-${s2} ${t2?.name} (${s1 > s2 ? t1?.name : s2 > s1 ? t2?.name : "Draw"})`;
    };
    const fmtForm = (m: any, teamId: number) => {
      const isT1 = m.team1Id === teamId;
      const gs = isT1 ? m.team1Score : m.team2Score;
      const gc = isT1 ? m.team2Score : m.team1Score;
      const d = m.date ? new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "?";
      return `${d}: ${gs > gc ? "W" : gc > gs ? "L" : "D"} ${gs}-${gc}`;
    };

    const historyText = h2h.length > 0
      ? `HEAD-TO-HEAD (last ${h2h.length} meetings):\n${h2h.map(fmtH2H).join("\n")}`
      : "HEAD-TO-HEAD: First recorded meeting between these sides.";
    const t1FormText = t1Recent.length > 0 ? `${t1?.name} recent form: ${t1Recent.map(m => fmtForm(m, match.team1Id)).join(" | ")}` : "";
    const t2FormText = t2Recent.length > 0 ? `${t2?.name} recent form: ${t2Recent.map(m => fmtForm(m, match.team2Id)).join(" | ")}` : "";

    const matchupsText = matchupsEnriched.map((m, i) => {
      const note = matchupInputs[i]?.notes ?? "";
      return `  Game ${i + 1}: ${m.player1Name} ${m.player1Goals}-${m.player2Goals} ${m.player2Name}${m.mvpName ? ` (MVP: ${m.mvpName})` : ""}${note ? `\n    Notes: "${note}"` : ""}`;
    }).join("\n");

    const p1name0 = matchupsEnriched[0]?.player1Name ?? "P1";
    const p2name0 = matchupsEnriched[0]?.player2Name ?? "P2";
    const nGames = matchupsEnriched.length;
    const t1name = t1?.name ?? "Team 1";
    const t2name = t2?.name ?? "Team 2";
    const matchDate = match.date ? new Date(match.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Unknown";
    const resultStr = match.team1Score > match.team2Score ? t1name + " WIN" : match.team2Score > match.team1Score ? t2name + " WIN" : "DRAW";

    const textPrompt = `You are the GEF MATCH ANALYST writing a newspaper match report for the Global eFootball Federation. Your voice is Roy Keane's brutal honesty meets The Athletic's tactical depth meets tabloid roast energy. Write like a journalist, not a data machine.

MATCH DATA:
Date: ${matchDate}
Competition: ${matchTypeLabel}
${t1name} ${match.team1Score} — ${match.team2Score} ${t2name}
Result: ${resultStr}

INDIVIDUAL GAME MATCHUPS (5 games, each player controls one player):
${matchupsText}

${historyText}
${t1FormText}
${t2FormText}
${contextNotes ? "LORE/CONTEXT:\n" + contextNotes : ""}

Return ONLY valid JSON with no markdown or code fences:

{
  "headline": "ALL CAPS NEWSPAPER HEADLINE — make it dramatic and punchy",
  "subheadline": "One-line subheading with a cutting insight or extra context",
  "tone": "DOMINANT_WIN|TIGHT_BATTLE|SHOCK_UPSET|ROUTINE",
  "mvpOfTheMatch": "player name",
  "team1Rating": 0,
  "team2Rating": 0,
  "fullArticle": "WRITE 5-6 PARAGRAPHS OF FLOWING NEWSPAPER PROSE separated by actual newlines. Para 1: punchy lede — the result, the drama, what it means. Para 2: the winners broken down — which games, which players, why they won, tactical reasons. Para 3: the losers — what went wrong, who underperformed, reference their recent form. Para 4: standout individual battles from the 5 matchups — who stepped up, who bottled it. Para 5: historical context from h2h data, what this result means for both sides going forward. Para 6 optional: next steps and advice. NO bullet points, NO headers. Name actual players. Reference actual game scores from the matchup data.",
  "pullQuote": "ONE unforgettable quotable sentence from the article — the kind blown up huge on the page",
  "roast": "3-5 sentences savage roast of the worst performer or losing team. Name names, cite exact game scores. Be specific and brutal. No diplomacy.",
  "matchupBreakdowns": [
    {
      "game": 1,
      "player1Name": "${p1name0}",
      "player2Name": "${p2name0}",
      "score": "X-Y",
      "winnerName": "winner name or DRAW",
      "verdict": "One punchy sentence verdict on this game",
      "player1Rating": 0,
      "player2Rating": 0,
      "possessionTeam1": 50,
      "possessionTeam2": 50,
      "shotsTeam1": 0,
      "shotsTeam2": 0
    }
  ],
  "finalCall": "The definitive last line — one memorable sentence",
  "chartData": {
    "goalsPerGame": [{"game": "G1", "player1": "name", "player2": "name", "team1Goals": 0, "team2Goals": 0}],
    "playerRatings": [{"name": "player", "rating": 0, "goals": 0, "side": "team1"}]
  }
}

RULES:
- All scores from match data only. Never invent numbers.
- matchupBreakdowns must cover ALL ${nGames} games in order.
- chartData.goalsPerGame must have exactly ${nGames} entries matching the matchups.
- fullArticle must be flowing prose paragraphs — ONE article, not sections.
- roast must cite specific player names and actual scores from the matchups above.
- Use h2h history and form data when writing the article body.`;

    // Build message content (add images if vision is supported)
    const messageContent: any[] = supportsVision ? [] : [{ type: "text", text: textPrompt }];

    if (supportsVision) {
      messageContent.push({ type: "text", text: textPrompt });
      for (let i = 0; i < matchupsEnriched.length; i++) {
        const input = matchupInputs[i] ?? {};
        if (input.imageBase64) {
          const mimeType = input.imageMime ?? "image/jpeg";
          messageContent.push({
            type: "text",
            text: `\n--- Screenshot for Game ${i + 1}: ${matchupsEnriched[i].player1Name} vs ${matchupsEnriched[i].player2Name} ---`,
          });
          messageContent.push({
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${input.imageBase64}`, detail: "auto" },
          });
        }
      }
    }

    const response = await client.chat.completions.create({
      model,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: supportsVision ? messageContent : textPrompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let report: any;
    try { report = JSON.parse(raw); } catch { report = { error: "Failed to parse AI response", raw }; }

    // Store notes only (not images) for each matchup
    const notesToStore = matchupInputs.map((m: any) => ({
      notes: m.notes ?? "",
      hadImage: !!m.imageBase64,
    }));

    // Upsert (update if exists, insert if not)
    const existing = await db.select().from(matchAnalysisTable).where(eq(matchAnalysisTable.matchId, matchId));
    if (existing.length > 0) {
      await db.update(matchAnalysisTable)
        .set({ report, contextNotes: contextNotes ?? null, matchupNotes: notesToStore, generatedAt: new Date(), isPublished: true })
        .where(eq(matchAnalysisTable.matchId, matchId));
    } else {
      await db.insert(matchAnalysisTable).values({
        matchId, report, contextNotes: contextNotes ?? null,
        matchupNotes: notesToStore, generatedAt: new Date(), isPublished: true,
      });
    }

    res.json({ success: true, report, supportsVision, model });
  } catch (err: any) {
    console.error("AI match analysis error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to generate analysis" });
  }
});

export default router;
