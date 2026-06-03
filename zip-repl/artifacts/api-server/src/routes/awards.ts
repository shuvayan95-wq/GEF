import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { awardsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.get("/awards", async (req, res) => {
  try {
    const awards = await db.select().from(awardsTable);
    const result = await Promise.all(awards.map(async (a) => {
      const [p] = await db.select().from(playersTable).where(eq(playersTable.id, a.playerId));
      return {
        id: a.id,
        playerId: a.playerId,
        playerName: p?.name ?? null,
        title: a.title,
        description: a.description ?? null,
        awardedAt: a.awardedAt,
      };
    }));
    res.json(result);
  } catch (err: any) {
    console.error("Error fetching awards:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch awards" });
  }
});

router.post("/awards", requireAdmin, async (req, res) => {
  try {
    const { playerId, title, description, awardedAt } = req.body;
    const [award] = await db.insert(awardsTable).values({ playerId, title, description, awardedAt }).returning();
    const [p] = await db.select().from(playersTable).where(eq(playersTable.id, playerId));
    res.status(201).json({
      id: award.id,
      playerId: award.playerId,
      playerName: p?.name ?? null,
      title: award.title,
      description: award.description ?? null,
      awardedAt: award.awardedAt,
    });
  } catch (err: any) {
    console.error("Error creating award:", err);
    res.status(500).json({ error: err?.message || "Failed to create award" });
  }
});

router.delete("/awards/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(awardsTable).where(eq(awardsTable.id, id));
    res.json({ success: true, message: "Award deleted" });
  } catch (err: any) {
    console.error("Error deleting award:", err);
    res.status(500).json({ error: err?.message || "Failed to delete award" });
  }
});

export default router;
