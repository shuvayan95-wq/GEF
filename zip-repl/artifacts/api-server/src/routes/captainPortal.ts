import { Router } from "express";
import { db } from "@workspace/db";
import {
  captainUsersTable,
  captainNotificationsTable,
  captainAuditLogTable,
  clubViolationsTable,
  playersTable,
  playerContractsTable,
  transfersTable,
  budgetTransactionsTable,
  teamFinancialsTable,
  teamsTable,
  matchesTable,
  leaguesTable,
} from "@workspace/db";
import { eq, and, or, desc, isNull } from "drizzle-orm";

const router = Router();

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireCaptain(req: any, res: any, next: any) {
  if (!(req.session as any).captainId) {
    return res.status(401).json({ error: "Captain authentication required" });
  }
  next();
}

function getIp(req: any): string {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

async function audit(captainId: number, teamId: number | null, action: string, details?: string, ip?: string) {
  await db.insert(captainAuditLogTable).values({ captainId, teamId, action, details: details ?? null, ipAddress: ip ?? null }).catch(() => {});
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/captain/dashboard", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const teamId = (req.session as any).captainTeamId as number;

  const [captain] = await db.select().from(captainUsersTable).where(eq(captainUsersTable.id, captainId)).limit(1);
  if (!captain?.teamId) return res.status(403).json({ error: "No club assigned to your account" });

  const tid = captain.teamId;

  const [team, financials, players, recentMatches, unreadCount] = await Promise.all([
    db.select().from(teamsTable).where(eq(teamsTable.id, tid)).limit(1),
    db.select().from(teamFinancialsTable).where(eq(teamFinancialsTable.teamId, tid)).limit(1),
    db.select().from(playersTable).where(and(eq(playersTable.teamId, tid), eq(playersTable.status, "active"))),
    db.select().from(matchesTable)
      .where(or(eq((matchesTable as any).homeTeamId, tid), eq((matchesTable as any).awayTeamId, tid)))
      .orderBy(desc((matchesTable as any).date))
      .limit(5)
      .catch(() => [] as any[]),
    db.select().from(captainNotificationsTable)
      .where(and(
        or(eq(captainNotificationsTable.captainId, captainId), isNull(captainNotificationsTable.captainId)),
        eq(captainNotificationsTable.isRead, false),
      )).then(r => r.length).catch(() => 0),
  ]);

  await audit(captainId, tid, "VIEW_DASHBOARD", "Viewed dashboard", getIp(req));

  res.json({
    team: team[0] ?? null,
    financials: financials[0] ?? null,
    playerCount: players.length,
    totalWageBill: players.reduce((s, p) => s + Number(p.salary || 10000), 0),
    recentMatches,
    unreadNotifications: unreadCount,
  });
});

// ─── Squad ────────────────────────────────────────────────────────────────────
router.get("/captain/squad", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const teamId = (req.session as any).captainTeamId as number;

  const [captain] = await db.select({ teamId: captainUsersTable.teamId }).from(captainUsersTable).where(eq(captainUsersTable.id, captainId)).limit(1);
  if (!captain?.teamId) return res.status(403).json({ error: "No club assigned" });
  const tid = captain.teamId;

  const players = await db.select().from(playersTable).where(eq(playersTable.teamId, tid));
  await audit(captainId, tid, "VIEW_SQUAD", "Viewed squad", getIp(req));
  res.json(players);
});

// ─── Contracts ────────────────────────────────────────────────────────────────
router.get("/captain/contracts", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const [captain] = await db.select({ teamId: captainUsersTable.teamId }).from(captainUsersTable).where(eq(captainUsersTable.id, captainId)).limit(1);
  if (!captain?.teamId) return res.status(403).json({ error: "No club assigned" });
  const tid = captain.teamId;

  const contracts = await db
    .select({
      contract: playerContractsTable,
      player: { id: playersTable.id, name: playersTable.name, nationality: playersTable.nationality },
    })
    .from(playerContractsTable)
    .innerJoin(playersTable, eq(playerContractsTable.playerId, playersTable.id))
    .where(eq(playerContractsTable.teamId, tid));

  await audit(captainId, tid, "VIEW_CONTRACTS", "Viewed contracts", getIp(req));
  res.json(contracts);
});

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get("/captain/transactions", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const [captain] = await db.select({ teamId: captainUsersTable.teamId }).from(captainUsersTable).where(eq(captainUsersTable.id, captainId)).limit(1);
  if (!captain?.teamId) return res.status(403).json({ error: "No club assigned" });
  const tid = captain.teamId;

  const transactions = await db
    .select()
    .from(budgetTransactionsTable)
    .where(eq(budgetTransactionsTable.teamId, tid))
    .orderBy(desc(budgetTransactionsTable.createdAt));

  await audit(captainId, tid, "VIEW_TRANSACTIONS", "Viewed transactions", getIp(req));
  res.json(transactions);
});

// ─── Violations ───────────────────────────────────────────────────────────────
router.get("/captain/violations", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const [captain] = await db.select({ teamId: captainUsersTable.teamId }).from(captainUsersTable).where(eq(captainUsersTable.id, captainId)).limit(1);
  if (!captain?.teamId) return res.status(403).json({ error: "No club assigned" });
  const tid = captain.teamId;

  const violations = await db
    .select()
    .from(clubViolationsTable)
    .where(eq(clubViolationsTable.teamId, tid))
    .orderBy(desc(clubViolationsTable.createdAt));

  await audit(captainId, tid, "VIEW_VIOLATIONS", "Viewed violations", getIp(req));
  res.json(violations);
});

// ─── Transfers ────────────────────────────────────────────────────────────────
router.get("/captain/transfers", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const [captain] = await db.select({ teamId: captainUsersTable.teamId }).from(captainUsersTable).where(eq(captainUsersTable.id, captainId)).limit(1);
  if (!captain?.teamId) return res.status(403).json({ error: "No club assigned" });
  const tid = captain.teamId;

  const transfers = await db
    .select({
      transfer: transfersTable,
      player: { id: playersTable.id, name: playersTable.name, nationality: playersTable.nationality },
    })
    .from(transfersTable)
    .innerJoin(playersTable, eq(transfersTable.playerId, playersTable.id))
    .where(or(eq(transfersTable.fromTeamId, tid), eq(transfersTable.toTeamId, tid)))
    .orderBy(desc(transfersTable.createdAt));

  res.json(transfers);
});

// ─── Notifications ────────────────────────────────────────────────────────────
router.get("/captain/notifications", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const [captain] = await db.select({ teamId: captainUsersTable.teamId }).from(captainUsersTable).where(eq(captainUsersTable.id, captainId)).limit(1);

  const notifications = await db
    .select()
    .from(captainNotificationsTable)
    .where(or(
      eq(captainNotificationsTable.captainId, captainId),
      and(
        isNull(captainNotificationsTable.captainId),
        captain?.teamId ? eq(captainNotificationsTable.teamId, captain.teamId) : undefined,
      ),
    ))
    .orderBy(desc(captainNotificationsTable.createdAt));

  res.json(notifications);
});

router.patch("/captain/notifications/:id/read", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const id = Number(req.params.id);
  await db
    .update(captainNotificationsTable)
    .set({ isRead: true })
    .where(and(eq(captainNotificationsTable.id, id), eq(captainNotificationsTable.captainId, captainId)));
  res.json({ success: true });
});

router.patch("/captain/notifications/:id/pin", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const id = Number(req.params.id);
  const { isPinned } = req.body;
  await db
    .update(captainNotificationsTable)
    .set({ isPinned: !!isPinned })
    .where(and(eq(captainNotificationsTable.id, id), eq(captainNotificationsTable.captainId, captainId)));
  res.json({ success: true });
});

router.post("/captain/notifications/read-all", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const { sql } = await import("drizzle-orm");
  await db
    .update(captainNotificationsTable)
    .set({ isRead: true })
    .where(eq(captainNotificationsTable.captainId, captainId));
  res.json({ success: true });
});

// ─── Budget Allocation ────────────────────────────────────────────────────────
router.get("/captain/budget", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const [captain] = await db.select({ teamId: captainUsersTable.teamId }).from(captainUsersTable).where(eq(captainUsersTable.id, captainId)).limit(1);
  if (!captain?.teamId) return res.status(403).json({ error: "No club assigned" });
  const tid = captain.teamId;

  const [fin] = await db.select().from(teamFinancialsTable).where(eq(teamFinancialsTable.teamId, tid)).limit(1);
  res.json(fin ?? null);
});

router.patch("/captain/budget/allocation", requireCaptain, async (req, res) => {
  const captainId = (req.session as any).captainId as number;
  const [captain] = await db.select({ teamId: captainUsersTable.teamId }).from(captainUsersTable).where(eq(captainUsersTable.id, captainId)).limit(1);
  if (!captain?.teamId) return res.status(403).json({ error: "No club assigned" });
  const tid = captain.teamId;

  const { transferBudget, wageBudget } = req.body;
  const tb = Number(transferBudget);
  const wb = Number(wageBudget);
  if (isNaN(tb) || isNaN(wb) || tb < 0 || wb < 0)
    return res.status(400).json({ error: "Invalid budget values" });

  const [fin] = await db.select().from(teamFinancialsTable).where(eq(teamFinancialsTable.teamId, tid)).limit(1);
  if (!fin) return res.status(404).json({ error: "No financials found for your club" });

  const total = Number(fin.budget);
  if (tb + wb > total)
    return res.status(400).json({ error: `Allocation (${(tb + wb).toLocaleString()}) exceeds total budget (${total.toLocaleString()})` });

  await db.update(teamFinancialsTable).set({
    transferBudget: String(tb),
    wageBudget: String(wb),
  }).where(eq(teamFinancialsTable.teamId, tid));

  await audit(captainId, tid, "BUDGET_ALLOCATION_CHANGED",
    `Transfer: ${tb}, Wage: ${wb}`, getIp(req));

  res.json({ success: true, transferBudget: tb, wageBudget: wb });
});

export default router;
