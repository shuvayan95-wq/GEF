import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  captainUsersTable,
  captainLoginHistoryTable,
  captainAuditLogTable,
  teamsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function getIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────
router.post("/captain/register", async (req, res) => {
  const { name, email, password, phone } = req.body ?? {};
  if (!name || !email || !password)
    return res.status(400).json({ error: "Name, email and password are required" });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters" });

  const existing = await db
    .select({ id: captainUsersTable.id })
    .from(captainUsersTable)
    .where(eq(captainUsersTable.email, email.toLowerCase().trim()))
    .limit(1);
  if (existing.length)
    return res.status(409).json({ error: "An account with this email already exists" });

  const passwordHash = await bcrypt.hash(password, 12);
  const [captain] = await db
    .insert(captainUsersTable)
    .values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      phone: phone?.trim() || null,
      status: "pending",
    })
    .returning();

  res.status(201).json({
    message: "Registration successful. Your account is pending admin approval.",
    captainId: captain.id,
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/captain/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  const [captain] = await db
    .select()
    .from(captainUsersTable)
    .where(eq(captainUsersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!captain)
    return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, captain.passwordHash);
  if (!valid)
    return res.status(401).json({ error: "Invalid email or password" });

  if (captain.status === "pending")
    return res.status(403).json({ error: "Your account is pending admin approval. Please wait." });
  if (captain.status === "rejected")
    return res.status(403).json({ error: "Your registration has been rejected. Contact the admin." });
  if (captain.status === "suspended")
    return res.status(403).json({ error: "Your account has been suspended. Contact the admin." });
  if (captain.status === "deactivated")
    return res.status(403).json({ error: "Your account has been deactivated." });
  if (captain.status !== "active")
    return res.status(403).json({ error: "Your account is not active." });

  // Fetch team info
  let team = null;
  if (captain.teamId) {
    const [t] = await db.select().from(teamsTable).where(eq(teamsTable.id, captain.teamId)).limit(1);
    team = t ?? null;
  }

  req.session.regenerate(async (regenErr) => {
    if (regenErr) return res.status(500).json({ error: "Session error" });
    (req.session as any).captainId = captain.id;
    (req.session as any).captainTeamId = captain.teamId;
    req.session.save(async (saveErr) => {
      if (saveErr) return res.status(500).json({ error: "Session save error" });

      // Update lastLoginAt and record history
      const ip = getIp(req);
      await db
        .update(captainUsersTable)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(captainUsersTable.id, captain.id));
      await db.insert(captainLoginHistoryTable).values({
        captainId: captain.id,
        ipAddress: ip,
        userAgent: req.headers["user-agent"] ?? null,
      });
      await db.insert(captainAuditLogTable).values({
        captainId: captain.id,
        teamId: captain.teamId ?? null,
        action: "LOGIN",
        details: "Captain logged in",
        ipAddress: ip,
      });

      res.json({
        success: true,
        captain: {
          id: captain.id,
          name: captain.name,
          email: captain.email,
          teamId: captain.teamId,
          teamName: team?.name ?? null,
          teamLogoUrl: team?.logoUrl ?? null,
          status: captain.status,
        },
      });
    });
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/captain/logout", async (req, res) => {
  const captainId = (req.session as any).captainId;
  const teamId = (req.session as any).captainTeamId;
  if (captainId) {
    await db.insert(captainAuditLogTable).values({
      captainId,
      teamId: teamId ?? null,
      action: "LOGOUT",
      details: "Captain logged out",
      ipAddress: getIp(req),
    }).catch(() => {});
  }
  req.session.destroy(() => res.json({ success: true }));
});

// ─── Me ───────────────────────────────────────────────────────────────────────
router.get("/captain/me", async (req, res) => {
  const captainId = (req.session as any).captainId;
  if (!captainId) return res.json({ captain: null });

  const [captain] = await db
    .select()
    .from(captainUsersTable)
    .where(eq(captainUsersTable.id, captainId))
    .limit(1);
  if (!captain) return res.json({ captain: null });

  let team = null;
  if (captain.teamId) {
    const [t] = await db.select().from(teamsTable).where(eq(teamsTable.id, captain.teamId)).limit(1);
    team = t ?? null;
  }

  res.json({
    captain: {
      id: captain.id,
      name: captain.name,
      email: captain.email,
      phone: captain.phone,
      teamId: captain.teamId,
      teamName: team?.name ?? null,
      teamLogoUrl: team?.logoUrl ?? null,
      status: captain.status,
      lastLoginAt: captain.lastLoginAt,
    },
  });
});

export default router;
