import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { trophiesTable, leaguesTable, teamsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function buildTrophy(trophy: any) {
  let leagueName: string | null = null;
  let winnerTeamName: string | null = null;
  let winnerTeamLogo: string | null = null;
  let winnerPlayerName: string | null = null;
  let winnerPlayerImage: string | null = null;

  if (trophy.leagueId) {
    const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, trophy.leagueId));
    leagueName = league?.name ?? null;
  }
  if (trophy.winnerTeamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, trophy.winnerTeamId));
    winnerTeamName = team?.name ?? null;
    winnerTeamLogo = team?.logoUrl ?? null;
  }
  if (trophy.winnerPlayerId) {
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, trophy.winnerPlayerId));
    winnerPlayerName = player?.name ?? null;
    winnerPlayerImage = player?.imageUrl ?? null;
  }

  return {
    id: trophy.id,
    name: trophy.name,
    season: trophy.season,
    type: trophy.type,
    description: trophy.description ?? null,
    leagueId: trophy.leagueId ?? null,
    leagueName,
    winnerTeamId: trophy.winnerTeamId ?? null,
    winnerTeamName,
    winnerTeamLogo,
    winnerPlayerId: trophy.winnerPlayerId ?? null,
    winnerPlayerName,
    winnerPlayerImage,
    createdAt: trophy.createdAt.toISOString(),
  };
}

router.get("/trophies", async (req, res) => {
  try {
    const trophies = await db.select().from(trophiesTable).orderBy(trophiesTable.season);
    const result = await Promise.all(trophies.map(buildTrophy));
    res.json(result);
  } catch (err: any) {
    console.error("Error fetching trophies:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch trophies" });
  }
});

router.post("/trophies", requireAdmin, async (req, res) => {
  try {
    const { name, season, leagueId, winnerTeamId, winnerPlayerId, description, type } = req.body;
    const [trophy] = await db.insert(trophiesTable).values({
      name, season, leagueId: leagueId || null, winnerTeamId: winnerTeamId || null,
      winnerPlayerId: winnerPlayerId || null, description, type: type || "league_champion"
    }).returning();
    res.status(201).json(await buildTrophy(trophy));
  } catch (err: any) {
    console.error("Error creating trophy:", err);
    res.status(500).json({ error: err?.message || "Failed to create trophy" });
  }
});

router.delete("/trophies/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(trophiesTable).where(eq(trophiesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting trophy:", err);
    res.status(500).json({ error: err?.message || "Failed to delete trophy" });
  }
});

export default router;
