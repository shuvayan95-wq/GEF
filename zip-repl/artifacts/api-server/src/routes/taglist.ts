import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/taglist", async (req, res) => {
  try {
    const isAdmin = (req.session as any).isAdmin;
    const [players, teams] = await Promise.all([
      db.select().from(playersTable),
      db.select().from(teamsTable),
    ]);

    const teamList = teams.map(team => {
      const roster = players
        .filter(p => p.teamId === team.id)
        .map(p => ({
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl ?? null,
          position: p.position ?? null,
          nationality: p.nationality ?? null,
          efootballId: p.efootballId ?? null,
          rank: p.rank ?? null,
          crewName: p.crewName ?? null,
          whatsappNumber: p.whatsappNumber ?? null,
          status: p.status ?? "active",
          teamRole: p.teamRole ?? null,
        }));

      // For public view, only count active players
      const activePlayers = isAdmin ? roster : roster.filter(p => p.status === "active");

      return {
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl ?? null,
        leagueId: team.leagueId ?? null,
        status: team.status ?? "active",
        playerCount: activePlayers.length,
        players: activePlayers,
      };
    });

    const freeAgents = players
      .filter(p => !p.teamId && (isAdmin || p.status === "active"))
      .map(p => ({
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl ?? null,
        position: p.position ?? null,
        nationality: p.nationality ?? null,
        efootballId: p.efootballId ?? null,
        rank: p.rank ?? null,
        crewName: p.crewName ?? null,
        whatsappNumber: p.whatsappNumber ?? null,
        status: p.status ?? "active",
        teamRole: p.teamRole ?? null,
      }));

    res.json({ teams: teamList, freeAgents });
  } catch (err: any) {
    console.error("Error fetching taglist:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch taglist" });
  }
});

export default router;
