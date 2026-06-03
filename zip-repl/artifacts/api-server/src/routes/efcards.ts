import { Router, type IRouter } from "express";
import { db, efootballCardsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// GET /api/ef-cards — list all cards
router.get("/api/ef-cards", async (_req, res) => {
  try {
    const cards = await db
      .select()
      .from(efootballCardsTable)
      .orderBy(desc(efootballCardsTable.cardOvr));
    res.json(cards);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /api/ef-cards/:id — single card
router.get("/api/ef-cards/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [card] = await db.select().from(efootballCardsTable).where(eq(efootballCardsTable.id, id));
    if (!card) return res.status(404).json({ error: "Card not found" });
    res.json(card);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /api/ef-cards — create card (admin only)
router.post("/api/ef-cards", requireAdmin, async (req, res) => {
  try {
    const {
      name, imageUrl, position, nationality, clubName,
      cardOvr, cardType, playingStyle,
      cardPace, cardShooting, cardPassing,
      cardDribbling, cardDefending, cardPhysical,
    } = req.body;

    if (!name) return res.status(400).json({ error: "name is required" });

    const intOrNull = (v: any) => (v != null && v !== "" ? parseInt(v) : null);

    const [card] = await db.insert(efootballCardsTable).values({
      name,
      imageUrl: imageUrl || null,
      position: position || null,
      nationality: nationality || null,
      clubName: clubName || null,
      cardOvr: intOrNull(cardOvr),
      cardType: cardType || "Standard",
      playingStyle: playingStyle || null,
      cardPace: intOrNull(cardPace),
      cardShooting: intOrNull(cardShooting),
      cardPassing: intOrNull(cardPassing),
      cardDribbling: intOrNull(cardDribbling),
      cardDefending: intOrNull(cardDefending),
      cardPhysical: intOrNull(cardPhysical),
    }).returning();

    res.status(201).json(card);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// PUT /api/ef-cards/:id — update card (admin only)
router.put("/api/ef-cards/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      name, imageUrl, position, nationality, clubName,
      cardOvr, cardType, playingStyle,
      cardPace, cardShooting, cardPassing,
      cardDribbling, cardDefending, cardPhysical,
    } = req.body;

    const intOrNull = (v: any) => (v != null && v !== "" ? parseInt(v) : null);

    const [card] = await db.update(efootballCardsTable).set({
      name,
      imageUrl: imageUrl || null,
      position: position || null,
      nationality: nationality || null,
      clubName: clubName || null,
      cardOvr: intOrNull(cardOvr),
      cardType: cardType || "Standard",
      playingStyle: playingStyle || null,
      cardPace: intOrNull(cardPace),
      cardShooting: intOrNull(cardShooting),
      cardPassing: intOrNull(cardPassing),
      cardDribbling: intOrNull(cardDribbling),
      cardDefending: intOrNull(cardDefending),
      cardPhysical: intOrNull(cardPhysical),
    }).where(eq(efootballCardsTable.id, id)).returning();

    if (!card) return res.status(404).json({ error: "Card not found" });
    res.json(card);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// DELETE /api/ef-cards/:id — delete card (admin only)
router.delete("/api/ef-cards/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(efootballCardsTable).where(eq(efootballCardsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
