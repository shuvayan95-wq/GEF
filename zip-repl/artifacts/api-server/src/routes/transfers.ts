import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  transfersTable, playersTable, teamsTable,
  matchesTable, playerMatchupsTable, leaguesTable,
  budgetTransactionsTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { syncTeamFinancials } from "./budget";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Determine which team a player was on during a given match date
function getTeamAtDate(
  sortedTransfers: any[],
  originalTeamId: number | null,
  matchDate: string,
): number | null {
  // sortedTransfers sorted by transferDate ASC
  // Before any transfer, player was at originalTeamId (first fromTeamId or current team if none)
  let teamId: number | null = originalTeamId;
  for (const t of sortedTransfers) {
    if (t.transferDate <= matchDate) {
      teamId = t.toTeamId;
    } else {
      break;
    }
  }
  return teamId;
}

// GET /transfers — all transfers with player/team names
router.get("/transfers", async (_req, res) => {
  try {
    const transfers = await db.select().from(transfersTable).orderBy(asc(transfersTable.transferDate));
    const players = await db.select().from(playersTable);
    const teams = await db.select().from(teamsTable);
    const playerMap = new Map(players.map(p => [p.id, p]));
    const teamMap = new Map(teams.map(t => [t.id, t]));

    const result = transfers.map(t => ({
      ...t,
      playerName: playerMap.get(t.playerId)?.name ?? "Unknown",
      playerImage: playerMap.get(t.playerId)?.imageUrl ?? null,
      fromTeamName: t.fromTeamId ? (teamMap.get(t.fromTeamId)?.name ?? "Unknown") : null,
      fromTeamLogo: t.fromTeamId ? (teamMap.get(t.fromTeamId)?.logoUrl ?? null) : null,
      toTeamName: teamMap.get(t.toTeamId)?.name ?? "Unknown",
      toTeamLogo: teamMap.get(t.toTeamId)?.logoUrl ?? null,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /transfers — create a transfer and update player's teamId
router.post("/transfers", requireAdmin, async (req, res) => {
  try {
    const { playerId, fromTeamId, toTeamId, transferDate, season, fee, notes } = req.body;
    if (!playerId || !toTeamId || !transferDate) {
      return res.status(400).json({ error: "playerId, toTeamId, transferDate required" });
    }

    const [transfer] = await db.insert(transfersTable).values({
      playerId: Number(playerId),
      fromTeamId: fromTeamId ? Number(fromTeamId) : null,
      toTeamId: Number(toTeamId),
      transferDate,
      season: season || null,
      fee: fee ? String(fee) : null,
      notes: notes || null,
    }).returning();

    // Update player's current team
    await db.update(playersTable)
      .set({ teamId: Number(toTeamId) })
      .where(eq(playersTable.id, Number(playerId)));

    // Auto-create budget transactions for the transfer fee
    if (fee && Number(fee) > 0) {
      const player = await db.select().from(playersTable).where(eq(playersTable.id, Number(playerId))).then(r => r[0]);
      const playerName = player?.name ?? `Player #${playerId}`;
      const txnSeason = season || "2025-26";

      // Buying team pays out
      await db.insert(budgetTransactionsTable).values({
        teamId: Number(toTeamId),
        type: "expense",
        category: "transfer_out",
        amount: String(fee),
        description: `Transfer fee — signed ${playerName}`,
        season: txnSeason,
        referenceId: transfer.id,
      });
      await syncTeamFinancials(Number(toTeamId));

      // Selling team receives fee
      if (fromTeamId) {
        await db.insert(budgetTransactionsTable).values({
          teamId: Number(fromTeamId),
          type: "income",
          category: "transfer_in",
          amount: String(fee),
          description: `Transfer fee received — sold ${playerName}`,
          season: txnSeason,
          referenceId: transfer.id,
        });
        await syncTeamFinancials(Number(fromTeamId));
      }
    }

    const player = await db.select().from(playersTable).where(eq(playersTable.id, Number(playerId))).then(r => r[0]);
    const teams = await db.select().from(teamsTable);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    res.status(201).json({
      ...transfer,
      playerName: player?.name ?? "Unknown",
      playerImage: player?.imageUrl ?? null,
      fromTeamName: fromTeamId ? (teamMap.get(Number(fromTeamId))?.name ?? null) : null,
      toTeamName: teamMap.get(Number(toTeamId))?.name ?? "Unknown",
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /transfers/:id
router.delete("/transfers/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(transfersTable).where(eq(transfersTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /players/:id/stats-by-team — player stats split by team
router.get("/players/:id/stats-by-team", async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const player = await db.select().from(playersTable).where(eq(playersTable.id, playerId)).then(r => r[0]);
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Transfer history sorted by date
    const transfers = await db.select().from(transfersTable)
      .where(eq(transfersTable.playerId, playerId))
      .orderBy(asc(transfersTable.transferDate));

    // Original team = first transfer's fromTeamId, OR current team if no transfers
    const originalTeamId = transfers.length > 0 ? transfers[0].fromTeamId : player.teamId;

    // All matchups for this player
    const matchups = await db.select().from(playerMatchupsTable)
      .where(eq(playerMatchupsTable.player1Id, playerId));
    const matchups2 = await db.select().from(playerMatchupsTable)
      .where(eq(playerMatchupsTable.player2Id, playerId));

    const allMatches = await db.select().from(matchesTable);
    const matchDateMap = new Map(allMatches.map(m => [m.id, m.date]));
    const matchSeasonMap = new Map(allMatches.map(m => [m.id, m.season]));

    const teams = await db.select().from(teamsTable);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    // Accumulate stats per team
    const statsByTeam = new Map<number, {
      teamId: number; teamName: string; teamLogo: string | null;
      matches: number; goals: number; conceded: number;
      wins: number; draws: number; losses: number; mvps: number;
      seasons: Set<string>;
    }>();

    function getOrCreate(teamId: number) {
      if (!statsByTeam.has(teamId)) {
        const team = teamMap.get(teamId);
        statsByTeam.set(teamId, {
          teamId, teamName: team?.name ?? "Unknown", teamLogo: team?.logoUrl ?? null,
          matches: 0, goals: 0, conceded: 0, wins: 0, draws: 0, losses: 0, mvps: 0,
          seasons: new Set(),
        });
      }
      return statsByTeam.get(teamId)!;
    }

    // Player1 matchups
    for (const mu of matchups) {
      const matchDate = matchDateMap.get(mu.matchId) ?? "";
      const season = matchSeasonMap.get(mu.matchId);
      const teamId = getTeamAtDate(transfers, originalTeamId, matchDate);
      if (!teamId) continue;
      const s = getOrCreate(teamId);
      s.matches++;
      s.goals += mu.player1Goals ?? 0;
      s.conceded += mu.player2Goals ?? 0;
      if ((mu.player1Goals ?? 0) > (mu.player2Goals ?? 0)) s.wins++;
      else if ((mu.player1Goals ?? 0) === (mu.player2Goals ?? 0)) s.draws++;
      else s.losses++;
      if (mu.mvpPlayerId === playerId) s.mvps++;
      if (season) s.seasons.add(season);
    }

    // Player2 matchups
    for (const mu of matchups2) {
      const matchDate = matchDateMap.get(mu.matchId) ?? "";
      const season = matchSeasonMap.get(mu.matchId);
      const teamId = getTeamAtDate(transfers, originalTeamId, matchDate);
      if (!teamId) continue;
      const s = getOrCreate(teamId);
      s.matches++;
      s.goals += mu.player2Goals ?? 0;
      s.conceded += mu.player1Goals ?? 0;
      if ((mu.player2Goals ?? 0) > (mu.player1Goals ?? 0)) s.wins++;
      else if ((mu.player2Goals ?? 0) === (mu.player1Goals ?? 0)) s.draws++;
      else s.losses++;
      if (mu.mvpPlayerId === playerId) s.mvps++;
      if (season) s.seasons.add(season);
    }

    const result = Array.from(statsByTeam.values()).map(s => ({
      ...s,
      winRate: s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : 0,
      goalsPerMatch: s.matches > 0 ? Math.round((s.goals / s.matches) * 10) / 10 : 0,
      seasons: Array.from(s.seasons),
      isCurrent: s.teamId === player.teamId,
    })).sort((a, b) => (b.isCurrent ? 1 : 0) - (a.isCurrent ? 1 : 0));

    res.json({
      playerId,
      playerName: player.name,
      currentTeamId: player.teamId,
      transfers: transfers.map(t => ({
        ...t,
        fromTeamName: t.fromTeamId ? (teamMap.get(t.fromTeamId)?.name ?? null) : null,
        toTeamName: teamMap.get(t.toTeamId)?.name ?? "Unknown",
        fromTeamLogo: t.fromTeamId ? (teamMap.get(t.fromTeamId)?.logoUrl ?? null) : null,
        toTeamLogo: teamMap.get(t.toTeamId)?.logoUrl ?? null,
      })),
      statsByTeam: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
