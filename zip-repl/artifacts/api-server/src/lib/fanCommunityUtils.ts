import { db } from "@workspace/db";
import {
  fanReactionsTable,
  fanArticlesTable,
  playerMatchupsTable,
  playersTable,
  matchesTable,
  teamsTable,
  gccFixturesTable,
} from "@workspace/db";
import { eq, and, desc, ne, inArray } from "drizzle-orm";

// ─── AI client helper ─────────────────────────────────────────────────────────

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

function getModel() {
  return process.env.GROQ_API_KEY ? "llama-3.1-70b-versatile" : "gpt-4o-mini";
}

// ─── Match intensity (affects reaction volume + drama) ────────────────────────

type Intensity = "standard" | "elevated" | "high" | "very_high" | "maximum";

function getIntensity(matchType: string, gccStage?: string | null): Intensity {
  if (matchType !== "gcc") return "standard";
  if (!gccStage || gccStage === "league") return "elevated";
  if (gccStage === "r16" || gccStage === "qf") return "high";
  if (gccStage === "sf") return "very_high";
  if (gccStage === "final") return "maximum";
  return "elevated";
}

const INTENSITY_LABELS: Record<Intensity, string> = {
  standard: "League match — normal community discussion",
  elevated: "Champions Cup group stage — bigger reactions than a league match",
  high: "Champions Cup knockout round — high-stakes, fans are heated",
  very_high: "SEMI-FINAL — massive community debate, everything is on the line",
  maximum: "THE FINAL — historic moment, maximum celebrations or heartbreak",
};

// ─── Player matchup context builder ──────────────────────────────────────────

interface MatchupLine {
  player1Name: string;
  player2Name: string;
  player1Goals: number;
  player2Goals: number;
  winnerName: string | null;
  loserName: string | null;
  isDraw: boolean;
  mvpName: string | null;
  team1Side: "home" | "away";
}

async function buildMatchupContext(
  matchId: number,
  homeTeamId: number,
  awayTeamId: number
): Promise<{ lines: MatchupLine[]; homeWins: number; awayWins: number; draws: number; mvpName: string | null }> {
  const rawMatchups = await db
    .select()
    .from(playerMatchupsTable)
    .where(eq(playerMatchupsTable.matchId, matchId));

  if (rawMatchups.length === 0) {
    return { lines: [], homeWins: 0, awayWins: 0, draws: 0, mvpName: null };
  }

  const allPlayerIds = rawMatchups.flatMap((m: any) => [m.player1Id, m.player2Id, m.mvpPlayerId].filter(Boolean) as number[]);
  const uniqueIds = [...new Set(allPlayerIds)];
  const playerRows = await db.select().from(playersTable).where(inArray(playersTable.id, uniqueIds));
  const playerMap = new Map(playerRows.map((p: any) => [p.id, p] as [number, typeof p]));

  let homeWins = 0, awayWins = 0, draws = 0;
  let overallMvpId: number | null = null;
  const mvpCounts: Record<number, number> = {};
  for (const m of rawMatchups) {
    if (m.mvpPlayerId) mvpCounts[m.mvpPlayerId] = (mvpCounts[m.mvpPlayerId] ?? 0) + 1;
  }
  if (Object.keys(mvpCounts).length > 0) {
    overallMvpId = Number(Object.entries(mvpCounts).sort((a, b) => b[1] - a[1])[0][0]);
  }

  const lines: MatchupLine[] = rawMatchups.map((m: any) => {
    const p1: any = playerMap.get(m.player1Id);
    const p2: any = playerMap.get(m.player2Id);
    const mvp: any = m.mvpPlayerId ? playerMap.get(m.mvpPlayerId) : null;

    // Determine which player belongs to home team
    const p1IsHome = p1?.teamId === homeTeamId;
    const p1Goals = m.player1Goals;
    const p2Goals = m.player2Goals;
    const isDraw = p1Goals === p2Goals;

    if (!isDraw) {
      if ((p1Goals > p2Goals && p1IsHome) || (p2Goals > p1Goals && !p1IsHome)) homeWins++;
      else awayWins++;
    } else {
      draws++;
    }

    const winnerName = isDraw ? null : (p1Goals > p2Goals ? p1?.name : p2?.name) ?? null;
    const loserName = isDraw ? null : (p1Goals > p2Goals ? p2?.name : p1?.name) ?? null;

    return {
      player1Name: p1?.name ?? `Player ${m.player1Id}`,
      player2Name: p2?.name ?? `Player ${m.player2Id}`,
      player1Goals: p1Goals,
      player2Goals: p2Goals,
      winnerName,
      loserName,
      isDraw,
      mvpName: mvp?.name ?? null,
      team1Side: p1IsHome ? "home" : "away",
    } as MatchupLine;
  });

  const mvpName = overallMvpId ? (playerMap.get(overallMvpId)?.name ?? null) : null;
  return { lines, homeWins, awayWins, draws, mvpName };
}

// ─── Recent form helper ───────────────────────────────────────────────────────

async function getRecentForm(teamId: number, excludeMatchId: number): Promise<string> {
  const recent = await db
    .select()
    .from(matchesTable)
    .where(
      and(
        ne(matchesTable.id, excludeMatchId),
      )
    )
    .orderBy(desc(matchesTable.createdAt))
    .limit(50);

  const teamMatches = recent
    .filter(m => m.team1Id === teamId || m.team2Id === teamId)
    .slice(0, 5);

  if (teamMatches.length === 0) return "No recent form data";

  return teamMatches.map(m => {
    const isHome = m.team1Id === teamId;
    const gf = isHome ? m.team1Score : m.team2Score;
    const ga = isHome ? m.team2Score : m.team1Score;
    if (gf > ga) return `W ${gf}-${ga}`;
    if (ga > gf) return `L ${gf}-${ga}`;
    return `D ${gf}-${ga}`;
  }).join(", ");
}

// ─── Rival team selector ──────────────────────────────────────────────────────

async function getRivalTeams(
  homeTeamId: number,
  awayTeamId: number,
  limit = 3
): Promise<Array<{ id: number; name: string }>> {
  // Get teams that have faced either club recently
  const recentMatches = await db
    .select()
    .from(matchesTable)
    .orderBy(desc(matchesTable.createdAt))
    .limit(100);

  const relatedIds = new Set<number>();
  for (const m of recentMatches) {
    if (m.team1Id === homeTeamId || m.team2Id === homeTeamId) {
      relatedIds.add(m.team1Id === homeTeamId ? m.team2Id : m.team1Id);
    }
    if (m.team1Id === awayTeamId || m.team2Id === awayTeamId) {
      relatedIds.add(m.team1Id === awayTeamId ? m.team2Id : m.team1Id);
    }
  }
  relatedIds.delete(homeTeamId);
  relatedIds.delete(awayTeamId);

  if (relatedIds.size === 0) {
    // Fall back to any other team
    const all = await db.select({ id: teamsTable.id, name: teamsTable.name })
      .from(teamsTable)
      .where(and(ne(teamsTable.id, homeTeamId), ne(teamsTable.id, awayTeamId)))
      .limit(limit);
    return all;
  }

  const ids = [...relatedIds].slice(0, limit);
  const teams = await db.select({ id: teamsTable.id, name: teamsTable.name })
    .from(teamsTable)
    .where(inArray(teamsTable.id, ids));
  return teams;
}

// ─── GCC stage lookup ─────────────────────────────────────────────────────────

async function getGccStage(matchId: number): Promise<string | null> {
  const match = await db.select({ gccFixtureId: matchesTable.gccFixtureId })
    .from(matchesTable)
    .where(eq(matchesTable.id, matchId))
    .then(r => r[0] ?? null);

  if (!match?.gccFixtureId) return null;

  const fixture = await db.select({ stage: gccFixturesTable.stage })
    .from(gccFixturesTable)
    .where(eq(gccFixturesTable.id, match.gccFixtureId))
    .then(r => r[0] ?? null);

  return fixture?.stage ?? null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateMatchReactions(
  matchId: number,
  homeTeamId: number,
  awayTeamId: number,
  homeTeamName: string,
  awayTeamName: string,
  homeScore: number,
  awayScore: number,
  matchType: "league" | "gcc" = "league"
): Promise<void> {
  try {
    // Skip if reactions already exist
    const existing = await db
      .select({ id: fanReactionsTable.id })
      .from(fanReactionsTable)
      .where(eq(fanReactionsTable.matchId, matchId))
      .limit(1);
    if (existing.length > 0) return;

    // ── Gather rich context in parallel ────────────────────────────────────────
    const [matchupData, homeForm, awayForm, rivalTeams, gccStage] = await Promise.all([
      buildMatchupContext(matchId, homeTeamId, awayTeamId),
      getRecentForm(homeTeamId, matchId),
      getRecentForm(awayTeamId, matchId),
      getRivalTeams(homeTeamId, awayTeamId),
      matchType === "gcc" ? getGccStage(matchId) : Promise.resolve(null),
    ]);

    const intensity = getIntensity(matchType, gccStage);
    const isDraw = homeScore === awayScore;
    const homeWon = homeScore > awayScore;
    const winner = homeWon ? homeTeamName : awayTeamName;
    const loser = homeWon ? awayTeamName : homeTeamName;
    const winnerId = homeWon ? homeTeamId : awayTeamId;
    const loserId = homeWon ? awayTeamId : homeTeamId;
    const scoreline = `${homeTeamName} ${homeScore}-${awayScore} ${awayTeamName}`;
    const competitionLabel = matchType === "gcc"
      ? (gccStage && gccStage !== "league" ? `GCC ${gccStage.toUpperCase()}` : "GEF Champions Cup group stage")
      : "GEF League";

    // ── Individual matchup summary for prompt ────────────────────────────────
    let matchupSummary = "No individual matchup data available.";
    if (matchupData.lines.length > 0) {
      const lines = matchupData.lines.map(l => {
        if (l.isDraw) return `DRAW: ${l.player1Name} ${l.player1Goals}-${l.player2Goals} ${l.player2Name}`;
        return `WIN: ${l.winnerName} beat ${l.loserName} ${Math.max(l.player1Goals, l.player2Goals)}-${Math.min(l.player1Goals, l.player2Goals)}`;
      });
      matchupSummary = lines.join("\n");
      matchupSummary += `\n\nMatchup tally: ${homeTeamName} won ${matchupData.homeWins}, ${awayTeamName} won ${matchupData.awayWins}, Draws: ${matchupData.draws}`;
      if (matchupData.mvpName) matchupSummary += `\nMatch MVP: ${matchupData.mvpName}`;
    }

    // ── Rival teams for prompt ────────────────────────────────────────────────
    const rivalList = rivalTeams.map(t => t.name).join(", ");
    const allAvailableRivalNames = [
      ...rivalTeams.map(t => t.name),
      homeTeamName,
      awayTeamName,
    ];

    const ai = await getOpenAI();

    if (!ai) {
      await generateTemplateReactions(matchId, homeTeamId, awayTeamId, matchupData, homeTeamName, awayTeamName, homeScore, awayScore, isDraw, homeWon, winner, loser, winnerId, loserId);
      await generateTemplateArticle(matchId, homeTeamId, awayTeamId, homeScore, awayScore, matchupData, homeTeamName, awayTeamName, isDraw, homeWon, winner, loser, scoreline, competitionLabel, matchType);
      return;
    }

    const model = getModel();

    // ── Single AI call for both reactions + article ───────────────────────────
    const systemPrompt = `You are the GEF community AI — generating authentic fan reactions and match reports for the Global eFootball Federation, a competitive 5v5 eFootball franchise league where each club fields FIVE individual players who each play one matchup. The club that wins the most individual matchups wins the fixture.

TONE: Write like Dexerto, Dot Esports, Liquipedia, competitive gaming Twitter and Reddit — NOT like a football newspaper.

VOCABULARY TO USE: roster, series, matchup, clutch, carry, bounce back, momentum, form, upset, statement win, power ranking, title favourite, elite performance, ice cold, cracked, dominated, folded, collapsed, reverse momentum, huge pickup, roster upgrade, monster performance.

ABSOLUTE RULES:
- NEVER mention: defenders, midfielders, strikers, formation, possession, pressing, defensive line, high line, full backs, wingers, tactical shape, counter attacks, build-up play. These do not exist in GEF.
- ALWAYS reference individual player names from the matchup data when available.
- Fans discuss: which players won their matchup, who carried the team, player form, winning/losing streaks, roster quality, standings, transfers, captain decisions, trophy races.
- Instead of "the team defended well" → say "the roster won four of the five matchups"
- Instead of "the midfield collapsed" → say "three players lost their individual matchups and the team never recovered"
- Rival fans are from REAL NAMED CLUBS (${rivalList || "other GEF clubs"}), NEVER from a generic "(Rival Fan)" label.
- Fan comments must feel like real community posts — some short one-liners, some longer 2-3 sentence takes.

Return ONLY valid JSON, no markdown or code fences.`;

    const userPrompt = `Generate fan reactions and a match article for this GEF fixture.

MATCH: ${scoreline} (${competitionLabel})
RESULT: ${isDraw ? `Draw ${homeScore}-${awayScore}` : `${winner} beat ${loser} ${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)}`}
INTENSITY: ${INTENSITY_LABELS[intensity]}

INDIVIDUAL PLAYER MATCHUPS:
${matchupSummary}

TEAM FORM:
${homeTeamName} recent: ${homeForm}
${awayTeamName} recent: ${awayForm}

AVAILABLE RIVAL CLUBS FOR FAN COMMENTS: ${allAvailableRivalNames.join(", ")}

---

Generate this JSON structure:

{
  "threads": [
    {
      "key": "t1",
      "comments": [
        {
          "personality": "die_hard|optimistic|angry|sarcastic|stats_nerd|transfer_addict|neutral|media_pundit",
          "teamName": "${homeTeamName}",
          "teamId": ${homeTeamId},
          "comment": "...",
          "isRival": false,
          "rivalTeamId": null
        },
        {
          "personality": "angry",
          "teamName": "${awayTeamName}",
          "teamId": ${awayTeamId},
          "comment": "...",
          "isRival": true,
          "rivalTeamId": ${homeTeamId}
        }
      ]
    }
  ],
  "article": {
    "headline": "PUNCHY ALL-CAPS ESPORTS HEADLINE NAMING KEY PLAYERS",
    "summary": "2-3 sentences. Name the players who won/lost their matchups. Use esports language.",
    "starPlayer": "Name the standout performer from the matchup data and why they were elite",
    "talkingPoint": "The biggest community talking point — a player's performance, the scoreline impact on standings, or a roster question. 1-2 sentences.",
    "mediaRating": ${isDraw ? 6 : Math.max(homeScore, awayScore) - Math.min(homeScore, awayScore) >= 3 ? 9 : 7},
    "winnerMood": "${isDraw ? "satisfied" : "ecstatic"}",
    "loserMood": "${isDraw ? "satisfied" : Math.min(homeScore, awayScore) === 0 ? "furious" : Math.max(homeScore, awayScore) - Math.min(homeScore, awayScore) >= 3 ? "angry" : "frustrated"}",
    "momentumChange": "One sentence on standings or trophy race impact."
  }
}

THREAD RULES:
- Generate ${intensity === "maximum" ? "6" : intensity === "very_high" ? "5" : intensity === "high" ? "4" : "3"} threads.
- Each thread = 2-4 comments that reply to each other (like a Reddit chain or Discord thread).
- Thread 1: ${isDraw ? "frustration from both sides about the draw" : `${winner} fans celebrating, a ${loser} fan responding bitterly`}. Reference specific player names from the matchup data.
- Thread 2: A stats nerd or neutral breaking down which players won their matchups and what it means for the standings.
- Thread 3: Transfer speculation or roster talk triggered by this result.
${intensity !== "standard" ? `- Thread 4+: High-stakes drama about the ${competitionLabel} implications. Fans from rival clubs ${rivalList} reacting.` : ""}
- At least one comment per thread MUST name a specific player from the matchup data.
- Rival fans (isRival: true) must have a real club name from the available list as their teamName, and their rivalTeamId must point to the team they're mocking.
- teamId field must be the numeric ID: ${homeTeamId} for ${homeTeamName} fans, ${awayTeamId} for ${awayTeamName} fans, or the rival team's ID for rival fans.

ARTICLE RULES:
- The headline must name at least one player or the scoreline.
- The summary must reference individual matchup results (e.g. "won X of 5 matchups", name the players who carried).
- Use esports language throughout. Never mention real football positions or tactics.`;

    const response = await ai.chat.completions.create({
      model,
      temperature: 0.95,
      max_tokens: 3000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("[FanCommunity] JSON parse failed, using templates");
      await generateTemplateReactions(matchId, homeTeamId, awayTeamId, matchupData, homeTeamName, awayTeamName, homeScore, awayScore, isDraw, homeWon, winner, loser, winnerId, loserId);
      await generateTemplateArticle(matchId, homeTeamId, awayTeamId, homeScore, awayScore, matchupData, homeTeamName, awayTeamName, isDraw, homeWon, winner, loser, scoreline, competitionLabel, matchType);
      return;
    }

    // ── Insert threaded reactions ─────────────────────────────────────────────
    const threads: any[] = Array.isArray(parsed.threads) ? parsed.threads : [];
    const reactionRows: (typeof fanReactionsTable.$inferInsert)[] = [];

    for (const thread of threads) {
      const key = thread.key ?? `t${Math.random().toString(36).slice(2, 6)}`;
      const comments: any[] = Array.isArray(thread.comments) ? thread.comments : [];

      comments.forEach((c, idx) => {
        if (!c.comment || typeof c.comment !== "string" || c.comment.trim().length === 0) return;

        const teamId = typeof c.teamId === "number" ? c.teamId
          : c.teamName === homeTeamName ? homeTeamId
          : c.teamName === awayTeamName ? awayTeamId
          : homeTeamId;

        const eventType = isDraw ? "match_draw"
          : teamId === winnerId
            ? (matchType === "gcc" ? "gcc_win" : "match_win")
            : (matchType === "gcc" ? "gcc_loss" : "match_loss");

        reactionRows.push({
          matchId,
          teamId,
          eventType,
          fanPersonality: c.personality ?? "neutral",
          comment: c.comment.trim(),
          isRival: !!c.isRival,
          rivalTeamId: c.rivalTeamId ?? null,
          isPinned: false,
          threadKey: key,
          replyOrder: idx,
        });
      });
    }

    if (reactionRows.length > 0) {
      await db.insert(fanReactionsTable).values(reactionRows);
    } else {
      await generateTemplateReactions(matchId, homeTeamId, awayTeamId, matchupData, homeTeamName, awayTeamName, homeScore, awayScore, isDraw, homeWon, winner, loser, winnerId, loserId);
    }

    // ── Insert article ────────────────────────────────────────────────────────
    const art = parsed.article;
    if (art?.headline && art?.summary) {
      await db.insert(fanArticlesTable).values({
        matchId,
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
        headline: art.headline,
        summary: art.summary,
        starPlayer: art.starPlayer ?? null,
        talkingPoint: art.talkingPoint ?? null,
        mediaRating: art.mediaRating ? Number(art.mediaRating) : null,
        winnerMood: art.winnerMood ?? null,
        loserMood: art.loserMood ?? null,
        momentumChange: art.momentumChange ?? null,
        matchType,
      });
    } else {
      await generateTemplateArticle(matchId, homeTeamId, awayTeamId, homeScore, awayScore, matchupData, homeTeamName, awayTeamName, isDraw, homeWon, winner, loser, scoreline, competitionLabel, matchType);
    }

  } catch (err: any) {
    console.error("[FanCommunity] generateMatchReactions error:", err?.message);
  }
}

// ─── Template fallbacks (no AI) ───────────────────────────────────────────────

async function generateTemplateReactions(
  matchId: number,
  homeTeamId: number,
  awayTeamId: number,
  matchupData: { lines: MatchupLine[]; homeWins: number; awayWins: number; draws: number; mvpName: string | null },
  homeTeamName: string,
  awayTeamName: string,
  homeScore: number,
  awayScore: number,
  isDraw: boolean,
  homeWon: boolean,
  winner: string,
  loser: string,
  winnerId: number,
  loserId: number,
) {
  const mvp = matchupData.mvpName;
  const topWinner = matchupData.lines.find(l => !l.isDraw);
  const winnerMatchups = homeWon ? matchupData.homeWins : matchupData.awayWins;
  const loserMatchups = homeWon ? matchupData.awayWins : matchupData.homeWins;

  const templates = isDraw
    ? [
        {
          teamId: homeTeamId, personality: "frustrated", threadKey: "t1", replyOrder: 0,
          comment: `${homeScore}-${homeScore}. We needed those three points and we dropped them. The roster has to do better.`,
        },
        {
          teamId: awayTeamId, personality: "stats_nerd", threadKey: "t1", replyOrder: 1,
          comment: `A point on the road is still a point. Both rosters split the matchups down the middle today.`,
        },
        {
          teamId: homeTeamId, personality: "optimistic", threadKey: "t2", replyOrder: 0,
          comment: `Look at the standings. We're still in this. One point is better than zero.`,
        },
        {
          teamId: awayTeamId, personality: "sarcastic", threadKey: "t2", replyOrder: 1,
          comment: `${homeTeamName} vs ${awayTeamName} and neither roster can close it out. ${homeScore}-${homeScore} and everyone leaves disappointed.`,
        },
      ]
    : [
        {
          teamId: winnerId, personality: "die_hard", threadKey: "t1", replyOrder: 0,
          comment: mvp
            ? `${mvp} was the difference today. ${winner} roster showing why they're serious contenders.`
            : `${winner} ${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)}. The roster delivered when it mattered.`,
        },
        {
          teamId: loserId, personality: "angry", threadKey: "t1", replyOrder: 1,
          comment: topWinner
            ? `${topWinner.loserName} lost their matchup and the whole series fell apart from there. Unacceptable.`
            : `${loserMatchups} matchup win${loserMatchups !== 1 ? "s" : ""} out of five. That's not good enough.`,
        },
        {
          teamId: winnerId, personality: "stats_nerd", threadKey: "t2", replyOrder: 0,
          comment: `${winner} won ${winnerMatchups} of 5 individual matchups. That series wasn't close.`,
        },
        {
          teamId: loserId, personality: "transfer_addict", threadKey: "t2", replyOrder: 1,
          comment: `${loser} need a roster upgrade after that. The matchup numbers don't lie.`,
        },
        {
          teamId: winnerId, personality: "optimistic", threadKey: "t3", replyOrder: 0,
          comment: `${winner} on a roll right now. This roster is built for the trophy race.`,
        },
        {
          teamId: loserId, personality: "sarcastic", threadKey: "t3", replyOrder: 1,
          comment: `${loser} folded again. When does the captain make changes?`,
        },
      ];

  await db.insert(fanReactionsTable).values(
    templates.map(t => ({
      matchId,
      teamId: t.teamId,
      eventType: isDraw ? "match_draw" : t.teamId === winnerId ? "match_win" : "match_loss",
      fanPersonality: t.personality,
      comment: t.comment,
      isRival: false,
      rivalTeamId: null,
      isPinned: false,
      threadKey: t.threadKey,
      replyOrder: t.replyOrder,
    }))
  );
}

async function generateTemplateArticle(
  matchId: number,
  homeTeamId: number,
  awayTeamId: number,
  homeScore: number,
  awayScore: number,
  matchupData: { lines: MatchupLine[]; homeWins: number; awayWins: number; draws: number; mvpName: string | null },
  homeTeamName: string,
  awayTeamName: string,
  isDraw: boolean,
  homeWon: boolean,
  winner: string,
  loser: string,
  scoreline: string,
  competitionLabel: string,
  matchType: string
) {
  const mvp = matchupData.mvpName;
  const winnerMatchups = homeWon ? matchupData.homeWins : matchupData.awayWins;
  const loserMatchups = homeWon ? matchupData.awayWins : matchupData.homeWins;
  const margin = Math.abs(homeScore - awayScore);

  const headline = isDraw
    ? `${homeScore}-${homeScore}: ${homeTeamName.toUpperCase()} AND ${awayTeamName.toUpperCase()} SPLIT THE SERIES`
    : margin >= 3
      ? `${winner.toUpperCase()} DOMINATE — ${scoreline.toUpperCase()} IN ${competitionLabel.toUpperCase()}`
      : `${winner.toUpperCase()} EDGE THE SERIES ${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)} IN ${competitionLabel.toUpperCase()}`;

  const summary = isDraw
    ? `${homeTeamName} and ${awayTeamName} could not be separated, splitting their individual matchups to share the points ${homeScore}-${homeScore} in this ${competitionLabel} fixture. Both rosters leave with one point each and questions about what could have been.`
    : matchupData.lines.length > 0
      ? `${winner} won ${winnerMatchups} of ${matchupData.lines.length} individual matchups to take the ${competitionLabel} fixture ${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)} against ${loser}. ${loser} only won ${loserMatchups} matchup${loserMatchups !== 1 ? "s" : ""} and could not mount a comeback.`
      : `${winner} secured a ${margin >= 3 ? "dominant" : "hard-fought"} ${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)} series win over ${loser} in today's ${competitionLabel} fixture.`;

  await db.insert(fanArticlesTable).values({
    matchId,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    headline,
    summary,
    starPlayer: mvp ? `${mvp} took MVP honours in a standout individual performance` : null,
    talkingPoint: isDraw
      ? `Both clubs leave with a point — but the standings don't care about moral victories.`
      : `${winner} won ${winnerMatchups} of ${matchupData.lines.length || 5} matchups. ${loser} need to look at their roster before the next fixture.`,
    mediaRating: isDraw ? 6 : margin >= 3 ? 8 : 7,
    winnerMood: isDraw ? "satisfied" : margin >= 3 ? "ecstatic" : "happy",
    loserMood: isDraw ? "satisfied" : Math.min(homeScore, awayScore) === 0 ? "furious" : "frustrated",
    momentumChange: isDraw
      ? `Both clubs share the points and the standings stay tight.`
      : `${winner} build momentum in the ${competitionLabel} while ${loser} drop ground.`,
    matchType,
  });
}
