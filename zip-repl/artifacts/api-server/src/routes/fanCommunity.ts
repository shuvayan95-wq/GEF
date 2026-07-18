import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  fanReactionsTable,
  fanArticlesTable,
  teamsTable,
  matchesTable,
} from "@workspace/db";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { generateMatchReactions } from "../lib/fanCommunityUtils.js";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// GET /fan-community/feed — recent articles + reactions
router.get("/fan-community/feed", async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "20"), 50);
    const [articles, reactions, teams] = await Promise.all([
      db.select().from(fanArticlesTable).orderBy(desc(fanArticlesTable.createdAt)).limit(limit),
      db.select().from(fanReactionsTable).orderBy(desc(fanReactionsTable.createdAt)).limit(limit * 3),
      db.select().from(teamsTable),
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));

    const enrichedArticles = articles.map(a => ({
      ...a,
      homeTeam: teamMap.get(a.homeTeamId) ?? null,
      awayTeam: teamMap.get(a.awayTeamId) ?? null,
    }));

    const enrichedReactions = reactions.map(r => ({
      ...r,
      team: teamMap.get(r.teamId) ?? null,
      rivalTeam: r.rivalTeamId ? teamMap.get(r.rivalTeamId) ?? null : null,
    }));

    res.json({ articles: enrichedArticles, reactions: enrichedReactions });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /fan-community/articles — paginated articles
router.get("/fan-community/articles", async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "12"), 50);
    const matchType = req.query.matchType as string | undefined;

    let query = db.select().from(fanArticlesTable).orderBy(desc(fanArticlesTable.createdAt)).limit(limit);

    const articles = await query;
    const teams = await db.select().from(teamsTable);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    const filtered = matchType
      ? articles.filter(a => a.matchType === matchType)
      : articles;

    res.json(filtered.map(a => ({
      ...a,
      homeTeam: teamMap.get(a.homeTeamId) ?? null,
      awayTeam: teamMap.get(a.awayTeamId) ?? null,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /fan-community/reactions — paginated reactions
router.get("/fan-community/reactions", async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "30"), 100);
    const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : null;

    let reactions;
    if (teamId) {
      reactions = await db.select().from(fanReactionsTable)
        .where(eq(fanReactionsTable.teamId, teamId))
        .orderBy(desc(fanReactionsTable.createdAt))
        .limit(limit);
    } else {
      reactions = await db.select().from(fanReactionsTable)
        .orderBy(desc(fanReactionsTable.createdAt))
        .limit(limit);
    }

    const teams = await db.select().from(teamsTable);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    res.json(reactions.map(r => ({
      ...r,
      team: teamMap.get(r.teamId) ?? null,
      rivalTeam: r.rivalTeamId ? teamMap.get(r.rivalTeamId) ?? null : null,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /fan-community/match/:matchId — all reactions and article for a match
router.get("/fan-community/match/:matchId", async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    const [reactions, articles, teams, match] = await Promise.all([
      db.select().from(fanReactionsTable).where(eq(fanReactionsTable.matchId, matchId)).orderBy(desc(fanReactionsTable.isPinned), desc(fanReactionsTable.createdAt)),
      db.select().from(fanArticlesTable).where(eq(fanArticlesTable.matchId, matchId)).limit(1),
      db.select().from(teamsTable),
      db.select().from(matchesTable).where(eq(matchesTable.id, matchId)).then(r => r[0] ?? null),
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));

    res.json({
      article: articles[0] ? { ...articles[0], homeTeam: teamMap.get(articles[0].homeTeamId), awayTeam: teamMap.get(articles[0].awayTeamId) } : null,
      reactions: reactions.map(r => ({
        ...r,
        team: teamMap.get(r.teamId) ?? null,
        rivalTeam: r.rivalTeamId ? teamMap.get(r.rivalTeamId) ?? null : null,
      })),
      match: match ? {
        ...match,
        homeTeam: teamMap.get(match.team1Id),
        awayTeam: teamMap.get(match.team2Id),
      } : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /fan-community/generate/:matchId — admin: regenerate reactions for a match
router.post("/fan-community/generate/:matchId", requireAdmin, async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    const match = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId)).then(r => r[0] ?? null);
    if (!match) return res.status(404).json({ error: "Match not found" });

    const teams = await db.select().from(teamsTable);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    const homeTeam = teamMap.get(match.team1Id);
    const awayTeam = teamMap.get(match.team2Id);

    if (!homeTeam || !awayTeam) return res.status(400).json({ error: "Teams not found" });

    // Force regenerate — delete existing first
    await db.delete(fanReactionsTable).where(eq(fanReactionsTable.matchId, matchId));
    await db.delete(fanArticlesTable).where(eq(fanArticlesTable.matchId, matchId));

    generateMatchReactions(
      matchId,
      match.team1Id,
      match.team2Id,
      homeTeam.name,
      awayTeam.name,
      match.team1Score ?? 0,
      match.team2Score ?? 0,
      (match.matchType ?? "league") as "league" | "gcc"
    ).catch(console.error);

    res.json({ success: true, message: "Generating reactions in background..." });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /fan-community/regenerate-all — admin: wipe all existing content and regenerate with new engine
router.post("/fan-community/regenerate-all", requireAdmin, async (req, res) => {
  try {
    // Delete all existing reactions and articles
    await db.delete(fanReactionsTable);
    await db.delete(fanArticlesTable);

    // Find all scored matches
    const allMatches = await db
      .select()
      .from(matchesTable)
      .orderBy(desc(matchesTable.createdAt));

    const scoredMatches = allMatches.filter(
      m => m.team1Score !== null && m.team2Score !== null
    );

    const teams = await db.select().from(teamsTable);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    res.json({
      success: true,
      message: `Regenerating reactions for ${scoredMatches.length} matches in background...`,
      matchCount: scoredMatches.length,
    });

    // Process in background — batches of 3 with a small delay to avoid rate limits
    (async () => {
      const BATCH = 3;
      for (let i = 0; i < scoredMatches.length; i += BATCH) {
        const batch = scoredMatches.slice(i, i + BATCH);
        await Promise.allSettled(
          batch.map(m => {
            const homeTeam = teamMap.get(m.team1Id);
            const awayTeam = teamMap.get(m.team2Id);
            if (!homeTeam || !awayTeam) return Promise.resolve();
            return generateMatchReactions(
              m.id,
              m.team1Id,
              m.team2Id,
              homeTeam.name,
              awayTeam.name,
              m.team1Score ?? 0,
              m.team2Score ?? 0,
              (m.matchType ?? "league") as "league" | "gcc"
            );
          })
        );
        if (i + BATCH < scoredMatches.length) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
      console.log(`[FanCommunity] Bulk regeneration complete for ${scoredMatches.length} matches`);
    })().catch(err => console.error("[FanCommunity] Bulk regeneration error:", err?.message));
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /fan-community/reactions/:id — admin: delete a reaction
router.delete("/fan-community/reactions/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(fanReactionsTable).where(eq(fanReactionsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PATCH /fan-community/reactions/:id/pin — admin: pin/unpin reaction
router.patch("/fan-community/reactions/:id/pin", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { pinned } = req.body;
    await db.update(fanReactionsTable).set({ isPinned: !!pinned }).where(eq(fanReactionsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
