import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable, teamsTable, lineupChangesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

router.get("/taglist", async (req, res) => {
  try {
    const isAdmin = (req.session as any).isAdmin;
    const [players, teams, recentChanges] = await Promise.all([
      db.select().from(playersTable),
      db.select().from(teamsTable),
      db.select().from(lineupChangesTable).orderBy(desc(lineupChangesTable.changedAt)).limit(50),
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
          lineupRole: p.lineupRole ?? null,
        }));

      const activePlayers = isAdmin ? roster : roster.filter(p => p.status === "active");

      // Recent changes for this team (last 3)
      const teamChanges = recentChanges
        .filter(c => c.teamId === team.id)
        .slice(0, 3)
        .map(c => ({
          id: c.id,
          inPlayerId: c.inPlayerId,
          inPlayerName: c.inPlayerName,
          outPlayerId: c.outPlayerId,
          outPlayerName: c.outPlayerName,
          changedAt: c.changedAt,
        }));

      return {
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl ?? null,
        leagueId: team.leagueId ?? null,
        status: team.status ?? "active",
        playerCount: activePlayers.length,
        players: activePlayers,
        recentChanges: teamChanges,
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
        lineupRole: p.lineupRole ?? null,
      }));

    res.json({ teams: teamList, freeAgents });
  } catch (err: any) {
    console.error("Error fetching taglist:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch taglist" });
  }
});

// PATCH /api/players/:id/lineup-role — set lineup role + optionally record a swap
router.patch("/players/:id/lineup-role", requireAdmin, async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const { role, replacingPlayerId } = req.body;

    if (!["main", "bench", null].includes(role)) {
      return res.status(400).json({ error: "role must be 'main', 'bench', or null" });
    }

    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, playerId));
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Update the player's role
    await db.update(playersTable).set({ lineupRole: role }).where(eq(playersTable.id, playerId));

    // If replacing another player, demote them to bench
    let replacedPlayer: any = null;
    if (replacingPlayerId && role === "main") {
      const [rp] = await db.select().from(playersTable).where(eq(playersTable.id, replacingPlayerId));
      if (rp) {
        replacedPlayer = rp;
        await db.update(playersTable).set({ lineupRole: "bench" }).where(eq(playersTable.id, replacingPlayerId));
      }
    }

    // Record the change if promoting to main
    if (role === "main") {
      await db.insert(lineupChangesTable).values({
        teamId: player.teamId ?? null,
        inPlayerId: playerId,
        inPlayerName: player.name,
        outPlayerId: replacedPlayer?.id ?? null,
        outPlayerName: replacedPlayer?.name ?? null,
        changedAt: new Date(),
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
