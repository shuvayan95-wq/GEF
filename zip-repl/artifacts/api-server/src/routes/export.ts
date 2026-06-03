import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  playersTable,
  teamsTable,
  matchesTable,
  playerMatchupsTable,
  leaguesTable,
  awardsTable,
  trophiesTable,
  ballonDorTable,
  ffpSettingsTable,
} from "@workspace/db";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.get("/export", requireAdmin, async (_req, res) => {
  try {
    const [players, teams, leagues, matches, matchups, awards, trophies, ballonDor, ffpSettings] =
      await Promise.all([
        db.select().from(playersTable),
        db.select().from(teamsTable),
        db.select().from(leaguesTable),
        db.select().from(matchesTable),
        db.select().from(playerMatchupsTable),
        db.select().from(awardsTable),
        db.select().from(trophiesTable),
        db.select().from(ballonDorTable),
        db.select().from(ffpSettingsTable),
      ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: {
        players,
        teams,
        leagues,
        matches,
        playerMatchups: matchups,
        awards,
        trophies,
        ballonDorResults: ballonDor,
        ffpSettings,
      },
      counts: {
        players: players.length,
        teams: teams.length,
        leagues: leagues.length,
        matches: matches.length,
        playerMatchups: matchups.length,
        awards: awards.length,
        trophies: trophies.length,
        ballonDorResults: ballonDor.length,
      },
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="gef-backup-${new Date().toISOString().split("T")[0]}.json"`,
    );
    res.json(exportData);
  } catch (err: any) {
    console.error("Export error:", err);
    res.status(500).json({ error: err?.message || "Export failed" });
  }
});

export default router;
