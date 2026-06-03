import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { matchesTable, teamsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/team-records", async (req, res) => {
  try {
    const [matches, teams] = await Promise.all([
      db.select().from(matchesTable),
      db.select().from(teamsTable),
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));

    // Build pairwise records: key = `${minId}-${maxId}`
    // For each team, store a map of opponent -> stats
    const teamRecords = new Map<number, Map<number, { won: number; drawn: number; lost: number; gf: number; ga: number }>>();

    for (const team of teams) {
      teamRecords.set(team.id, new Map());
    }

    for (const match of matches) {
      const { team1Id, team2Id, team1Score, team2Score } = match;
      if (!teamMap.has(team1Id) || !teamMap.has(team2Id)) continue;

      // Update team1 vs team2
      const r1 = teamRecords.get(team1Id) ?? new Map();
      const prev1 = r1.get(team2Id) ?? { won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
      const t1won = team1Score > team2Score;
      const drawn = team1Score === team2Score;
      r1.set(team2Id, {
        won: prev1.won + (t1won ? 1 : 0),
        drawn: prev1.drawn + (drawn ? 1 : 0),
        lost: prev1.lost + (!t1won && !drawn ? 1 : 0),
        gf: prev1.gf + team1Score,
        ga: prev1.ga + team2Score,
      });
      teamRecords.set(team1Id, r1);

      // Update team2 vs team1
      const r2 = teamRecords.get(team2Id) ?? new Map();
      const prev2 = r2.get(team1Id) ?? { won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
      r2.set(team1Id, {
        won: prev2.won + (!t1won && !drawn ? 1 : 0),
        drawn: prev2.drawn + (drawn ? 1 : 0),
        lost: prev2.lost + (t1won ? 1 : 0),
        gf: prev2.gf + team2Score,
        ga: prev2.ga + team1Score,
      });
      teamRecords.set(team2Id, r2);
    }

    const result = teams.map(team => {
      const opponents = teamRecords.get(team.id) ?? new Map();
      const records = Array.from(opponents.entries())
        .map(([oppId, s]) => {
          const opp = teamMap.get(oppId);
          const played = s.won + s.drawn + s.lost;
          return {
            opponentId: oppId,
            opponentName: opp?.name ?? "Unknown",
            opponentLogoUrl: opp?.logoUrl ?? null,
            played,
            won: s.won,
            drawn: s.drawn,
            lost: s.lost,
            goalsFor: s.gf,
            goalsAgainst: s.ga,
            goalDiff: s.gf - s.ga,
            winRate: played > 0 ? Math.round((s.won / played) * 1000) / 10 : 0,
          };
        })
        .sort((a, b) => b.played - a.played || b.won - a.won);

      const totalWon = records.reduce((s, r) => s + r.won, 0);
      const totalDrawn = records.reduce((s, r) => s + r.drawn, 0);
      const totalLost = records.reduce((s, r) => s + r.lost, 0);
      const totalPlayed = totalWon + totalDrawn + totalLost;

      return {
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl ?? null,
        totalPlayed,
        totalWon,
        totalDrawn,
        totalLost,
        totalGoalsFor: records.reduce((s, r) => s + r.goalsFor, 0),
        totalGoalsAgainst: records.reduce((s, r) => s + r.goalsAgainst, 0),
        records,
      };
    })
      .filter(t => t.totalPlayed > 0)
      .sort((a, b) => b.totalWon - a.totalWon || a.totalLost - b.totalLost);

    res.json({ teams: result });
  } catch (err: any) {
    console.error("Error fetching team records:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch team records" });
  }
});

export default router;
