import { db } from "@workspace/db";
import { fanReactionsTable, fanArticlesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const FAN_PERSONALITIES = [
  "optimistic",
  "angry",
  "sarcastic",
  "tactical",
  "transfer_addict",
  "young_supporter",
  "old_guard",
  "glory_hunter",
  "die_hard",
  "media_pundit",
  "legend",
  "neutral_observer",
];

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

function getAIModel(apiKey: string | undefined): string {
  if (process.env.GROQ_API_KEY) return "llama-3.1-70b-versatile";
  return "gpt-4o-mini";
}

function getMatchContext(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  matchType: string
) {
  const isDraw = homeScore === awayScore;
  const homeWon = homeScore > awayScore;
  const winner = homeWon ? homeTeam : awayTeam;
  const loser = homeWon ? awayTeam : homeTeam;
  const winnerScore = Math.max(homeScore, awayScore);
  const loserScore = Math.min(homeScore, awayScore);
  const isGCC = matchType === "gcc";
  const scoreline = `${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`;
  const competitionLabel = isGCC ? "GEF Champions Cup" : "league match";
  return { isDraw, homeWon, winner, loser, winnerScore, loserScore, scoreline, competitionLabel, isGCC };
}

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
    // Skip if reactions already exist for this match
    const existing = await db
      .select({ id: fanReactionsTable.id })
      .from(fanReactionsTable)
      .where(eq(fanReactionsTable.matchId, matchId))
      .limit(1);
    if (existing.length > 0) return;

    const ctx = getMatchContext(homeTeamName, awayTeamName, homeScore, awayScore, matchType);
    const ai = await getOpenAI();

    if (!ai) {
      // Generate template-based reactions without AI
      await generateTemplateReactions(matchId, homeTeamId, awayTeamId, ctx);
      await generateTemplateArticle(matchId, homeTeamId, awayTeamId, homeScore, awayScore, ctx, matchType);
      return;
    }

    const model = process.env.GROQ_API_KEY ? "llama-3.1-70b-versatile" : "gpt-4o-mini";

    // Generate fan comments and article in parallel
    const [reactionsResult, articleResult] = await Promise.allSettled([
      ai.chat.completions.create({
        model,
        temperature: 1.0,
        messages: [
          {
            role: "system",
            content: `You are generating virtual fan reactions for GEF (Global eFootball Federation) — a 5v5 eFootball esports franchise league where each club fields five individual players competing in the eFootball video game.

Write like a real esports community: Reddit threads, Twitter/X posts, and Discord messages from passionate GEF fans. Comments should feel like competitive gaming culture — not real football punditry.

NEVER use generic phrases like "Great win", "Nice game", "Well played", or "Good effort". Every comment must be specific to the match, teams, and context provided.

FORBIDDEN — never mention these real football concepts: defenders, midfielders, strikers, formation, pressing, possession, defensive line, high line, full backs, wingers, tactical shape, counter attack, or any real-world football tactics. None of these exist in GEF.

Instead, fans talk about: which players scored, individual player performance and form, winning/losing streaks, roster moves and transfers, captain decisions, league table positions, GCC standings, trophy races, player rivalries, and matchup results.

Return ONLY a valid JSON array, no other text.`
          },
          {
            role: "user",
            content: `Match: ${ctx.scoreline} (${ctx.competitionLabel})
${ctx.isDraw ? `Both teams drew ${homeScore}-${awayScore}.` : `${ctx.winner} beat ${ctx.loser} ${ctx.winnerScore}-${ctx.loserScore}.`}

Generate exactly 14 fan comments from the GEF community. Vary personalities dramatically:
- 4 comments from ${ctx.isDraw ? homeTeamName : ctx.winner} fans (hype, relief, celebration, or cautious optimism about standings)
- 3 comments from ${ctx.isDraw ? awayTeamName : ctx.loser} fans (frustration about the result, player criticism, or concern about the table)
- 2 rival fan comments mocking the opponent's result or their players' form
- 2 neutral observers / GEF community analysts talking about what this result means for the standings or trophy race
- 2 esports stats nerds breaking down player scores and form from the match data
- 1 transfer-obsessed fan speculating about roster changes or signings after this result

Each comment must feel authentic to competitive gaming communities. Some short (one-liners), some longer (2-3 sentences). Reference team names and the scoreline directly.

Return JSON array:
[{"personality": "optimistic|angry|sarcastic|stats_nerd|transfer_addict|neutral|die_hard|media_pundit", "teamId": ${homeTeamId}|${awayTeamId}|null, "comment": "...", "isRival": true|false, "rivalTeamId": ${homeTeamId}|${awayTeamId}|null}]

Note: isRival=true means this fan supports the rival team and is mocking. rivalTeamId is the team they support. teamId for non-rivals is their own team.`
          }
        ],
        max_tokens: 2000,
      }),
      ai.chat.completions.create({
        model,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: `You are a GEF esports journalist writing match reaction pieces for the Global eFootball Federation community. GEF is a 5v5 eFootball franchise league — each club fields five individual players who compete in the eFootball video game. Write in the style of an esports media outlet, not a real football newspaper.

FORBIDDEN — never mention: defenders, midfielders, strikers, formation, pressing, possession, defensive line, high line, full backs, wingers, tactical shape, counter attack. These concepts do not exist in GEF.

Instead write about: individual player scores, team roster strength, player form and streaks, standings impact, trophy race implications, captain performance, and the overall match scoreline. Be dramatic, specific, and fan-focused. Return ONLY valid JSON.`
          },
          {
            role: "user",
            content: `Write a match reaction article for: ${ctx.scoreline} (${ctx.competitionLabel})
${ctx.isDraw ? "The match ended in a draw." : `${ctx.winner} won convincingly${ctx.winnerScore - ctx.loserScore >= 3 ? " with a dominant display from their roster" : ""}.`}

Return JSON:
{
  "headline": "Punchy 6-10 word esports headline",
  "summary": "2-3 sentence match summary focused on the result, the scoreline, and what it means for the standings. Be specific and dramatic.",
  "starPlayer": "Generic description of the standout performer — reference their club, not a real football position (e.g. '${homeTeamName}'s captain delivered' or '${ctx.isDraw ? homeTeamName : ctx.winner}'s top scorer stepped up')",
  "talkingPoint": "The biggest talking point from this match — roster decisions, player form, standings implications, or the scoreline itself. 1-2 sentences.",
  "mediaRating": ${ctx.isDraw ? "6" : ctx.winnerScore - ctx.loserScore >= 3 ? "9" : "7"},
  "winnerMood": "${ctx.isDraw ? "satisfied" : "ecstatic"}",
  "loserMood": "${ctx.isDraw ? "satisfied" : ctx.loserScore === 0 ? "furious" : ctx.winnerScore - ctx.loserScore >= 3 ? "angry" : "frustrated"}",
  "momentumChange": "One sentence on how this result shifts the standings or trophy race."
}`
          }
        ],
        max_tokens: 600,
      })
    ]);

    // Process reactions
    if (reactionsResult.status === "fulfilled") {
      try {
        const raw = reactionsResult.value.choices[0]?.message?.content ?? "[]";
        const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const reactions: any[] = JSON.parse(jsonStr);
        if (Array.isArray(reactions) && reactions.length > 0) {
          await db.insert(fanReactionsTable).values(
            reactions.map((r: any) => ({
              matchId,
              teamId: r.teamId ?? (Math.random() > 0.5 ? homeTeamId : awayTeamId),
              eventType: ctx.isDraw ? "match_draw" : (
                r.teamId === homeTeamId
                  ? (ctx.homeWon ? (matchType === "gcc" ? "gcc_win" : "match_win") : (matchType === "gcc" ? "gcc_loss" : "match_loss"))
                  : (ctx.homeWon ? (matchType === "gcc" ? "gcc_loss" : "match_loss") : (matchType === "gcc" ? "gcc_win" : "match_win"))
              ),
              fanPersonality: r.personality ?? "neutral",
              comment: r.comment ?? "",
              isRival: !!r.isRival,
              rivalTeamId: r.rivalTeamId ?? null,
              isPinned: false,
            })).filter(r => r.comment.length > 0)
          );
        }
      } catch (e) {
        console.error("[FanCommunity] Failed to parse reactions:", e);
        await generateTemplateReactions(matchId, homeTeamId, awayTeamId, ctx);
      }
    } else {
      await generateTemplateReactions(matchId, homeTeamId, awayTeamId, ctx);
    }

    // Process article
    if (articleResult.status === "fulfilled") {
      try {
        const raw = articleResult.value.choices[0]?.message?.content ?? "{}";
        const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const article = JSON.parse(jsonStr);
        if (article.headline && article.summary) {
          await db.insert(fanArticlesTable).values({
            matchId,
            homeTeamId,
            awayTeamId,
            homeScore,
            awayScore,
            headline: article.headline,
            summary: article.summary,
            starPlayer: article.starPlayer ?? null,
            talkingPoint: article.talkingPoint ?? null,
            mediaRating: article.mediaRating ? Number(article.mediaRating) : null,
            winnerMood: article.winnerMood ?? null,
            loserMood: article.loserMood ?? null,
            momentumChange: article.momentumChange ?? null,
            matchType,
          });
        }
      } catch (e) {
        console.error("[FanCommunity] Failed to parse article:", e);
        await generateTemplateArticle(matchId, homeTeamId, awayTeamId, homeScore, awayScore, ctx, matchType);
      }
    } else {
      await generateTemplateArticle(matchId, homeTeamId, awayTeamId, homeScore, awayScore, ctx, matchType);
    }
  } catch (err: any) {
    console.error("[FanCommunity] generateMatchReactions error:", err?.message);
  }
}

async function generateTemplateReactions(
  matchId: number,
  homeTeamId: number,
  awayTeamId: number,
  ctx: ReturnType<typeof getMatchContext>
) {
  const templates = ctx.isDraw
    ? [
        { teamId: homeTeamId, personality: "frustrated", comment: `A draw?? ${homeTeamName} needed those three points. The standings aren't going to fix themselves.`, isRival: false },
        { teamId: awayTeamId, personality: "stats_nerd", comment: `A point on the road is still a point. We stay alive in the table and move on.`, isRival: false },
        { teamId: homeTeamId, personality: "optimistic", comment: `Look at the scoreline and look at where we are in the table. We're fine. Trust the roster.`, isRival: false },
        { teamId: awayTeamId, personality: "sarcastic", comment: `${homeTeamName} vs ${awayTeamName} and it ends ${homeScore}-${awayScore}. Both clubs left points on the board today.`, isRival: false },
      ]
    : [
        { teamId: homeTeamId, personality: ctx.homeWon ? "optimistic" : "angry", comment: ctx.homeWon ? `${ctx.winner} are cooking right now. That scoreline doesn't lie — the whole roster showed up.` : `${ctx.loserScore === 0 ? "Blanked. Zero." : `${ctx.loserScore} goals and still lost.`} We need to fix this roster before it's too late.`, isRival: false },
        { teamId: awayTeamId, personality: ctx.homeWon ? "angry" : "optimistic", comment: ctx.homeWon ? `${ctx.winnerScore - ctx.loserScore >= 3 ? `Down ${ctx.winnerScore - ctx.loserScore}. No excuses.` : "Frustrating result."} That's points we can't get back.` : `${ctx.winner} on a run right now. Roster looking dangerous this season.`, isRival: false },
        { teamId: ctx.homeWon ? awayTeamId : homeTeamId, personality: "sarcastic", comment: `${ctx.loser} fans really thought they had this one 💀 ${ctx.winnerScore}-${ctx.loserScore} says otherwise.`, isRival: true, rivalTeamId: ctx.homeWon ? homeTeamId : awayTeamId },
        { teamId: ctx.homeWon ? homeTeamId : awayTeamId, personality: "die_hard", comment: `LET'S GOOO ${ctx.winner}!! ${ctx.winnerScore}-${ctx.loserScore} and it wasn't even close. This club is built different.`, isRival: false },
        { teamId: ctx.homeWon ? awayTeamId : homeTeamId, personality: "stats_nerd", comment: `${ctx.loser} conceded ${ctx.winnerScore} goals and only scored ${ctx.loserScore}. That GD is going to hurt in the standings at the end of the season.`, isRival: false },
        { teamId: ctx.homeWon ? homeTeamId : awayTeamId, personality: "media_pundit", comment: `${ctx.winner} take all three points with a ${ctx.winnerScore - ctx.loserScore >= 3 ? "dominant" : "clinical"} ${ctx.winnerScore}-${ctx.loserScore} result. The standings are shifting and this club knows it.`, isRival: false },
      ];

  await db.insert(fanReactionsTable).values(
    templates.map(t => ({
      matchId,
      teamId: t.teamId,
      eventType: ctx.isDraw ? "match_draw" : (t.teamId === (ctx.homeWon ? homeTeamId : awayTeamId) ? "match_win" : "match_loss"),
      fanPersonality: t.personality,
      comment: t.comment,
      isRival: t.isRival ?? false,
      rivalTeamId: (t as any).rivalTeamId ?? null,
      isPinned: false,
    }))
  );
}

async function generateTemplateArticle(
  matchId: number,
  homeTeamId: number,
  awayTeamId: number,
  homeScore: number,
  awayScore: number,
  ctx: ReturnType<typeof getMatchContext>,
  matchType: string
) {
  const headlines = ctx.isDraw
    ? [
        `${homeScore}-${awayScore}: ${homeTeamName} And ${awayTeamName} Share The Points In ${ctx.isGCC ? "Champions Cup" : "GEF"} Clash`,
        `Honours Even — ${homeTeamName} vs ${awayTeamName} Ends All Square`,
      ]
    : [
        `${ctx.winner} ${ctx.winnerScore >= 4 ? "Dominate" : ctx.winnerScore - ctx.loserScore >= 2 ? "Beat" : "Edge"} ${ctx.loser} ${ctx.winnerScore}-${ctx.loserScore} In ${ctx.isGCC ? "Champions Cup" : "GEF League"} Fixture`,
        `${ctx.winner} Take All Three Points As ${ctx.loser} Drop More Ground`,
      ];

  await db.insert(fanArticlesTable).values({
    matchId,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    headline: headlines[0],
    summary: ctx.isDraw
      ? `${homeTeamName} and ${awayTeamName} split the points ${homeScore}-${awayScore} in today's ${ctx.competitionLabel}. Neither roster could separate themselves on the scoreline, leaving both clubs with one point each.`
      : `${ctx.winner} ran out ${ctx.winnerScore - ctx.loserScore >= 3 ? "comfortable" : "narrow"} ${ctx.winnerScore}-${ctx.loserScore} winners over ${ctx.loser} in this ${ctx.competitionLabel}. The result moves ${ctx.winner} in the right direction while ${ctx.loser} will need to bounce back quickly.`,
    starPlayer: null,
    talkingPoint: ctx.isDraw
      ? `Both clubs leave with a point — but who needed the win more, and what does it mean for their trophy race ambitions?`
      : `${ctx.winner} move the scoreboard${ctx.loserScore === 0 ? " and hold ${ctx.loser} scoreless" : ` to ${ctx.winnerScore}`} — a statement result in the ${ctx.competitionLabel} standings.`,
    mediaRating: ctx.isDraw ? 6 : ctx.winnerScore - ctx.loserScore >= 3 ? 8 : 7,
    winnerMood: ctx.isDraw ? "satisfied" : ctx.winnerScore - ctx.loserScore >= 3 ? "ecstatic" : "happy",
    loserMood: ctx.isDraw ? "satisfied" : ctx.loserScore === 0 ? "furious" : "frustrated",
    momentumChange: ctx.isDraw
      ? `Both clubs share a point and the standings stay tight heading into the next round of fixtures.`
      : `${ctx.winner} build on their run of results while ${ctx.loser} slide further from where they need to be.`,
    matchType,
  });
}
