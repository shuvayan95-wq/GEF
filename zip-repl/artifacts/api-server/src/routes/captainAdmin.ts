import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  captainUsersTable,
  captainLoginHistoryTable,
  captainNotificationsTable,
  captainAuditLogTable,
  clubViolationsTable,
  teamsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sendNotificationEmail } from "../lib/email.js";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ─── List all captains ────────────────────────────────────────────────────────
router.get("/admin/captains", requireAdmin, async (_req, res) => {
  const captains = await db
    .select({
      captain: captainUsersTable,
      team: { id: teamsTable.id, name: teamsTable.name, logoUrl: teamsTable.logoUrl },
    })
    .from(captainUsersTable)
    .leftJoin(teamsTable, eq(captainUsersTable.teamId, teamsTable.id))
    .orderBy(desc(captainUsersTable.createdAt));

  res.json(captains);
});

// ─── Get single captain ───────────────────────────────────────────────────────
router.get("/admin/captains/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select({
      captain: captainUsersTable,
      team: { id: teamsTable.id, name: teamsTable.name, logoUrl: teamsTable.logoUrl },
    })
    .from(captainUsersTable)
    .leftJoin(teamsTable, eq(captainUsersTable.teamId, teamsTable.id))
    .where(eq(captainUsersTable.id, id))
    .limit(1);

  if (!row) return res.status(404).json({ error: "Captain not found" });
  res.json(row);
});

// ─── Approve captain (with club assignment) ───────────────────────────────────
router.patch("/admin/captains/:id/approve", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { teamId } = req.body;
  if (!teamId) return res.status(400).json({ error: "teamId is required to approve a captain" });

  // Ensure no other active captain for this team
  const existing = await db
    .select({ id: captainUsersTable.id })
    .from(captainUsersTable)
    .where(eq(captainUsersTable.teamId, Number(teamId)))
    .limit(10);
  const activeConflict = existing.filter(e => e.id !== id);
  if (activeConflict.length > 0) {
    // Allow but warn — admin's choice
  }

  const [updated] = await db
    .update(captainUsersTable)
    .set({
      status: "active",
      teamId: Number(teamId),
      approvedAt: new Date(),
      approvedBy: "admin",
      updatedAt: new Date(),
    })
    .where(eq(captainUsersTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Captain not found" });

  // Send welcome notification
  await db.insert(captainNotificationsTable).values({
    captainId: id,
    teamId: Number(teamId),
    title: "Account Approved",
    body: "Your captain account has been approved. You can now log in and manage your club.",
    type: "announcement",
    isImportant: true,
    sentByAdmin: true,
  });

  res.json({ success: true, captain: updated });
});

// ─── Reject captain ───────────────────────────────────────────────────────────
router.patch("/admin/captains/:id/reject", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body;

  const [updated] = await db
    .update(captainUsersTable)
    .set({
      status: "rejected",
      rejectedAt: new Date(),
      rejectionReason: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(captainUsersTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Captain not found" });
  res.json({ success: true });
});

// ─── Suspend captain ──────────────────────────────────────────────────────────
router.patch("/admin/captains/:id/suspend", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body;

  const [updated] = await db
    .update(captainUsersTable)
    .set({
      status: "suspended",
      suspendedAt: new Date(),
      suspendReason: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(captainUsersTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Captain not found" });
  res.json({ success: true });
});

// ─── Reactivate captain ───────────────────────────────────────────────────────
router.patch("/admin/captains/:id/reactivate", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [updated] = await db
    .update(captainUsersTable)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(captainUsersTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Captain not found" });
  res.json({ success: true });
});

// ─── Deactivate captain ───────────────────────────────────────────────────────
router.patch("/admin/captains/:id/deactivate", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [updated] = await db
    .update(captainUsersTable)
    .set({ status: "deactivated", updatedAt: new Date() })
    .where(eq(captainUsersTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Captain not found" });
  res.json({ success: true });
});

// ─── Reset password ───────────────────────────────────────────────────────────
router.patch("/admin/captains/:id/reset-password", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ error: "New password must be at least 8 characters" });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const [updated] = await db
    .update(captainUsersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(captainUsersTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Captain not found" });
  res.json({ success: true });
});

// ─── Login history ────────────────────────────────────────────────────────────
router.get("/admin/captains/:id/login-history", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const history = await db
    .select()
    .from(captainLoginHistoryTable)
    .where(eq(captainLoginHistoryTable.captainId, id))
    .orderBy(desc(captainLoginHistoryTable.createdAt))
    .limit(50);
  res.json(history);
});

// ─── Audit log for a captain ──────────────────────────────────────────────────
router.get("/admin/captains/:id/audit", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const logs = await db
    .select()
    .from(captainAuditLogTable)
    .where(eq(captainAuditLogTable.captainId, id))
    .orderBy(desc(captainAuditLogTable.createdAt))
    .limit(100);
  res.json(logs);
});

// ─── Send notification to a captain ──────────────────────────────────────────
router.post("/admin/captains/:id/notify", requireAdmin, async (req, res) => {
  const captainId = Number(req.params.id);
  const { title, body, type, isImportant, teamId } = req.body;
  if (!title || !body) return res.status(400).json({ error: "title and body are required" });

  const [notif] = await db
    .insert(captainNotificationsTable)
    .values({
      captainId,
      teamId: teamId ?? null,
      title,
      body,
      type: type ?? "announcement",
      isImportant: !!isImportant,
      sentByAdmin: true,
    })
    .returning();

  // Send email delivery (fire-and-forget — don't block the response)
  const [captain] = await db
    .select({ email: captainUsersTable.email, name: captainUsersTable.name })
    .from(captainUsersTable)
    .where(eq(captainUsersTable.id, captainId))
    .limit(1);

  if (captain?.email) {
    sendNotificationEmail({
      to: captain.email,
      captainName: captain.name,
      title,
      body,
      type: type ?? "announcement",
      isImportant: !!isImportant,
    }).catch((err) => console.error("[Notify] Email failed:", err));
  }

  res.json({ success: true, notification: notif });
});

// ─── Violations CRUD ──────────────────────────────────────────────────────────
router.get("/admin/violations", requireAdmin, async (_req, res) => {
  const violations = await db
    .select({
      violation: clubViolationsTable,
      team: { id: teamsTable.id, name: teamsTable.name },
    })
    .from(clubViolationsTable)
    .leftJoin(teamsTable, eq(clubViolationsTable.teamId, teamsTable.id))
    .orderBy(desc(clubViolationsTable.createdAt));
  res.json(violations);
});

router.post("/admin/violations", requireAdmin, async (req, res) => {
  const { teamId, reason, type, penaltyAmount, penaltyDescription, adminNote, issuedDate } = req.body;
  if (!teamId || !reason || !issuedDate)
    return res.status(400).json({ error: "teamId, reason and issuedDate are required" });

  const [v] = await db
    .insert(clubViolationsTable)
    .values({ teamId, reason, type: type ?? "rule_violation", penaltyAmount: penaltyAmount ?? null, penaltyDescription: penaltyDescription ?? null, adminNote: adminNote ?? null, issuedDate })
    .returning();

  // Notify the captain of this team
  const [captain] = await db
    .select({ id: captainUsersTable.id, email: captainUsersTable.email, name: captainUsersTable.name })
    .from(captainUsersTable)
    .where(eq(captainUsersTable.teamId, teamId))
    .limit(1);
  if (captain) {
    const notifBody = `Your club has received a violation: ${reason}${penaltyDescription ? ` · ${penaltyDescription}` : ""}`;
    await db.insert(captainNotificationsTable).values({
      captainId: captain.id,
      teamId,
      title: "Club Violation Issued",
      body: notifBody,
      type: "violation",
      isImportant: true,
      sentByAdmin: true,
    });
    if (captain.email) {
      sendNotificationEmail({
        to: captain.email,
        captainName: captain.name,
        title: "Club Violation Issued",
        body: notifBody,
        type: "violation",
        isImportant: true,
      }).catch((err) => console.error("[Violation] Email failed:", err));
    }
  }

  res.status(201).json(v);
});

router.patch("/admin/violations/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status, adminNote } = req.body;
  const [updated] = await db
    .update(clubViolationsTable)
    .set({ status: status ?? undefined, adminNote: adminNote ?? undefined, updatedAt: new Date() })
    .where(eq(clubViolationsTable.id, id))
    .returning();
  res.json(updated);
});

router.delete("/admin/violations/:id", requireAdmin, async (req, res) => {
  await db.delete(clubViolationsTable).where(eq(clubViolationsTable.id, Number(req.params.id)));
  res.json({ success: true });
});

export default router;
