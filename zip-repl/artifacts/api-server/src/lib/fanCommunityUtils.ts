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
            content: `You are generating virtual fan reactions for GEF (Global eFootball Federation) — a 5v5 eFootball esports tournament where players compete in the eFootball video game.

Your job is to generate realistic, varied fan comments that feel like a real football Twitter/Reddit feed. NEVER use generic phrases like "Great win", "Nice game", "Well played", or "Good effort". Every comment must be specific to the match, teams, and context.

Return ONLY a valid JSON array, no other text.`
          },
          {
            role: "user",
            content: `Match: ${ctx.scoreline} (${ctx.competitionLabel})
${ctx.isDraw ? `Both teams drew ${homeScore}-${awayScore}.` : `${ctx.winner} beat ${ctx.loser} ${ctx.winnerScore}-${ctx.loserScore}.`}

Generate exactly 14 fan comments. Vary personalities dramatically:
- 4 comments from ${ctx.isDraw ? homeTeamName : ctx.winner} fans
- 3 comments from ${ctx.isDraw ? awayTeamName : ctx.loser} fans  
- 2 rival fan comments mocking the opponent
- 2 neutral observers/pundits
- 2 tactical analysts
- 1 transfer-obsessed fan

Each comment must be specific, varied in length (some short, some long), and feel authentic. Reference team names directly.

Return JSON array:
[{"personality": "optimistic|angry|sarcastic|tactical|transfer_addict|neutral|die_hard|media_pundit", "teamId": ${homeTeamId}|${awayTeamId}|null, "comment": "...", "isRival": true|false, "rivalTeamId": ${homeTeamId}|${awayTeamId}|null}]

Note: isRival=true means this fan is FROM the rival team mocking. rivalTeamId is the team they support. teamId for non-rivals is their own team.`
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
            content: `You are a football journalist writing for GEF (Global eFootball Federation) — a 5v5 eFootball esports platform. Write in the style of BBC Sport / OneFootball. Be dramatic but factual. Return ONLY valid JSON.`
          },
          {
            role: "user",
            content: `Write a match reaction article for: ${ctx.scoreline} (${ctx.competitionLabel})
${ctx.isDraw ? "The match ended in a draw." : `${ctx.winner} won convincingly${ctx.winnerScore - ctx.loserScore >= 3 ? " with a dominant performance" : ""}.`}

Return JSON:
{
  "headline": "Punchy 6-10 word headline like a real newspaper",
  "summary": "2-3 sentence match summary. Be specific and dramatic.",
  "starPlayer": "Generic description of star performer (no specific player name needed, just role like 'the ${homeTeamName} striker')",
  "talkingPoint": "The biggest talking point from this match in 1-2 sentences",
  "mediaRating": ${ctx.isDraw ? "6" : ctx.winnerScore - ctx.loserScore >= 3 ? "9" : "7"},
  "winnerMood": "${ctx.isDraw ? "satisfied" : "ecstatic"}",
  "loserMood": "${ctx.isDraw ? "satisfied" : ctx.loserScore === 0 ? "furious" : ctx.winnerScore - ctx.loserScore >= 3 ? "angry" : "frustrated"}",
  "momentumChange": "One sentence on how this result affects momentum/standings"
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
        { teamId: homeTeamId, personality: "frustrated", comment: `A draw? After all that possession, ${ctx.homeWon ? "" : ctx.winner} should be doing better.`, isRival: false },
        { teamId: awayTeamId, personality: "tactical", comment: `A point away from home is never bad. We take it and move on.`, isRival: false },
        { teamId: homeTeamId, personality: "optimistic", comment: `The resilience shown today gives me hope. We'll get the wins soon.`, isRival: false },
        { teamId: awayTeamId, personality: "sarcastic", comment: `A draw. The most boring outcome in eFootball. Both teams bottled it.`, isRival: false },
      ]
    : [
        { teamId: homeTeamId, personality: ctx.homeWon ? "optimistic" : "angry", comment: ctx.homeWon ? `${ctx.winner} are on another level right now. The table is starting to look very interesting.` : `That was an absolute disaster. We need to do better.`, isRival: false },
        { teamId: awayTeamId, personality: ctx.homeWon ? "angry" : "optimistic", comment: ctx.homeWon ? `Terrible result. There's no excuse for losing like that.` : `${ctx.winner} showing they mean business this season.`, isRival: false },
        { teamId: ctx.homeWon ? awayTeamId : homeTeamId, personality: "sarcastic", comment: `${ctx.loser} tried their best. It just wasn't good enough. Again.`, isRival: true, rivalTeamId: ctx.homeWon ? homeTeamId : awayTeamId },
        { teamId: ctx.homeWon ? homeTeamId : awayTeamId, personality: "die_hard", comment: `${ctx.winner}! The way we played today was something special. Onwards!`, isRival: false },
        { teamId: ctx.homeWon ? awayTeamId : homeTeamId, personality: "tactical", comment: `The defensive shape completely fell apart in the second half. Manager needs to address this immediately.`, isRival: false },
        { teamId: ctx.homeWon ? homeTeamId : awayTeamId, personality: "media_pundit", comment: `${ctx.winner} ${ctx.winnerScore - ctx.loserScore >= 3 ? "emphatically" : "narrowly"} claim all three points. A result that tells a story beyond just the scoreline.`, isRival: false },
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
    ? [`${ctx.homeWon ? "" : `${homeScore}-${awayScore}`} — Honours Even As Both Sides Cancel Out`, `${homeScore}-${homeScore} Draw Settles Nothing In Fiercely Contested Clash`]
    : [
        `${ctx.winner} ${ctx.winnerScore >= 4 ? "Demolish" : ctx.winnerScore - ctx.loserScore >= 2 ? "Overcome" : "Edge Past"} ${ctx.loser} In ${ctx.isGCC ? "Champions Cup" : "League"} Showdown`,
        `${ctx.winner} Claim All Three Points As ${ctx.loser} Suffer Another Setback`,
      ];

  await db.insert(fanArticlesTable).values({
    matchId,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    headline: headlines[0],
    summary: ctx.isDraw
      ? `${homeTeamId === awayTeamId ? "The" : `${ctx.homeWon ? "Home side" : "Both sides"}`} cancel each other out in a closely-contested ${ctx.competitionLabel}. Neither team could find a decisive moment as the spoils were shared.`
      : `${ctx.winner} secured a ${ctx.winnerScore - ctx.loserScore >= 3 ? "commanding" : "hard-fought"} victory over ${ctx.loser} in today's ${ctx.competitionLabel}. ${ctx.loser} will need to regroup quickly as the pressure mounts.`,
    starPlayer: null,
    talkingPoint: ctx.isDraw
      ? `Can either side build enough momentum from this draw to mount a genuine challenge?`
      : `${ctx.winner}'s ability to ${ctx.loserScore === 0 ? "keep a clean sheet" : "find the net consistently"} is becoming a real weapon this season.`,
    mediaRating: ctx.isDraw ? 6 : ctx.winnerScore - ctx.loserScore >= 3 ? 8 : 7,
    winnerMood: ctx.isDraw ? "satisfied" : ctx.winnerScore - ctx.loserScore >= 3 ? "ecstatic" : "happy",
    loserMood: ctx.isDraw ? "satisfied" : ctx.loserScore === 0 ? "furious" : "frustrated",
    momentumChange: ctx.isDraw
      ? `Both teams share the points and remain level in the standings.`
      : `${ctx.winner} extend their positive run while ${ctx.loser} face questions about their form.`,
    matchType,
  });
}
