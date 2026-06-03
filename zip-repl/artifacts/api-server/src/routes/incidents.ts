import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  incidentsTable, playersTable, teamsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOpenAI() {
  try {
    const mod = await import("@workspace/integrations-openai-ai-server");
    return mod.openai;
  } catch {
    return null;
  }
}

// ─── Incident type catalogue ──────────────────────────────────────────────────

const INCIDENT_TYPES = [
  { type: "cup_knockout",            label: "Cup Knockout",             defaultPenalty: 120, sign: -1 },
  { type: "disciplinary",            label: "Disciplinary Action",      defaultPenalty: 80,  sign: -1 },
  { type: "poor_form",               label: "Poor Form / Underperformance", defaultPenalty: 50, sign: -1 },
  { type: "missed_final",            label: "Missed Key Final",         defaultPenalty: 90,  sign: -1 },
  { type: "exceptional_performance", label: "Exceptional Performance",  defaultPenalty: 80,  sign: +1 },
  { type: "fair_play",               label: "Fair Play Award",          defaultPenalty: 30,  sign: +1 },
  { type: "other_negative",          label: "Other Negative",           defaultPenalty: 40,  sign: -1 },
  { type: "other_positive",          label: "Other Positive",           defaultPenalty: 40,  sign: +1 },
];

// ─── GET /incidents — list all (optionally filter by season) ─────────────────

router.get("/incidents", async (req, res) => {
  try {
    const { season } = req.query as Record<string, string>;
    const allIncidents = season
      ? await db.select().from(incidentsTable).where(eq(incidentsTable.season, season))
      : await db.select().from(incidentsTable);

    const allPlayers = await db.select().from(playersTable);
    const allTeams = await db.select().from(teamsTable);
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));
    const teamMap = new Map(allTeams.map(t => [t.id, t]));

    const enriched = allIncidents.map(inc => ({
      ...inc,
      playerName: playerMap.get(inc.playerId)?.name ?? null,
      playerImage: playerMap.get(inc.playerId)?.imageUrl ?? null,
      playerPosition: playerMap.get(inc.playerId)?.position ?? null,
      teamName: inc.teamId ? teamMap.get(inc.teamId)?.name ?? null : null,
      teamLogo: inc.teamId ? teamMap.get(inc.teamId)?.logoUrl ?? null : null,
      // Effective deduction: positive sign means bonus, negative means penalty
      effectiveDelta: resolveEffectiveDelta(inc),
    }));

    // Sort newest first
    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ incidents: enriched, types: INCIDENT_TYPES });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /incidents/types — return the incident type catalogue ────────────────

router.get("/incidents/types", (_req, res) => {
  res.json({ types: INCIDENT_TYPES });
});

// ─── POST /incidents — admin creates an incident ─────────────────────────────

router.post("/incidents", requireAdmin, async (req, res) => {
  try {
    const {
      playerId, teamId, season, type, competition, stage,
      description, penaltyPoints, aiSuggested, resolvedBy,
    } = req.body;

    if (!playerId || !season || !description) {
      return res.status(400).json({ error: "playerId, season, and description are required" });
    }

    const [incident] = await db.insert(incidentsTable).values({
      playerId: Number(playerId),
      teamId: teamId ? Number(teamId) : null,
      season: String(season),
      type: type || "cup_knockout",
      competition: competition || null,
      stage: stage || null,
      description: String(description),
      penaltyPoints: Number(penaltyPoints ?? 0),
      aiSuggested: Boolean(aiSuggested),
      resolvedBy: resolvedBy || null,
    }).returning();

    res.json({ incident });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /incidents/:id — admin updates an incident ──────────────────────────

router.put("/incidents/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      type, competition, stage, description, penaltyPoints, resolvedBy,
    } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (type !== undefined)         updates.type = type;
    if (competition !== undefined)  updates.competition = competition;
    if (stage !== undefined)        updates.stage = stage;
    if (description !== undefined)  updates.description = description;
    if (penaltyPoints !== undefined) updates.penaltyPoints = Number(penaltyPoints);
    if (resolvedBy !== undefined)   updates.resolvedBy = resolvedBy;

    const [updated] = await db.update(incidentsTable)
      .set(updates)
      .where(eq(incidentsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Incident not found" });
    res.json({ incident: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /incidents/:id — admin removes an incident ───────────────────────

router.delete("/incidents/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(incidentsTable).where(eq(incidentsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /incidents/ai-suggest — AI recommends penalty based on description ─

router.post("/incidents/ai-suggest", requireAdmin, async (req, res) => {
  try {
    const { description, type, competition, stage, playerName, season } = req.body;

    if (!description) return res.status(400).json({ error: "description is required" });

    const openai = await getOpenAI();

    if (!openai) {
      // Fallback: derive a suggestion from the type catalogue
      const meta = INCIDENT_TYPES.find(t => t.type === type);
      const penalty = meta?.defaultPenalty ?? 60;
      const sign    = meta?.sign ?? -1;
      return res.json({
        suggestedPenalty: penalty,
        effectiveDelta:   sign * penalty,
        rationale: `No AI available — using default penalty for "${meta?.label ?? type}".`,
        aiUsed: false,
      });
    }

    const typeLabel = INCIDENT_TYPES.find(t => t.type === type)?.label ?? type;

    const prompt = `You are a football awards committee analyst for the GEF (Global eFootball Federation), a 5v5 eFootball league.

Your job is to decide how many Ballon d'Or points should be DEDUCTED (or added) for a specific incident involving a player.

Context:
- Season: ${season ?? "Unknown"}
- Player: ${playerName ?? "Unknown"}
- Incident type: ${typeLabel}
- Competition: ${competition ?? "Unknown"}
- Stage: ${competition && stage ? `${stage} of ${competition}` : stage ?? "Unknown"}
- Description: ${description}

The Ballon d'Or scoring scale for reference:
- Top players typically score 400–900 points total
- A "cup_knockout" at group stage is a significant failure → typically 80–150 penalty pts
- A "cup_knockout" at semi-final or final → 40–80 pts (less shameful, good run)
- A "disciplinary" (red card / ban) → 50–100 pts depending on severity
- A "poor_form" match → 30–60 pts
- "exceptional_performance" (heroics in a final) → 50–100 bonus pts to add (report as negative effective delta)
- "fair_play" → 20–40 bonus pts

Respond ONLY with valid JSON matching this schema exactly:
{
  "penaltyPoints": <integer, always positive — the magnitude of the adjustment>,
  "effectiveDelta": <integer — NEGATIVE means deducted from score, POSITIVE means added to score>,
  "rationale": "<1-2 sentence explanation for the committee>"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 300,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    const penaltyPoints = Math.abs(Number(parsed.penaltyPoints ?? 60));
    const effectiveDelta = Number(parsed.effectiveDelta ?? -penaltyPoints);
    const rationale = String(parsed.rationale ?? "AI suggestion unavailable.");

    res.json({ suggestedPenalty: penaltyPoints, effectiveDelta, rationale, aiUsed: true });
  } catch (err: any) {
    console.error("AI suggest error:", err?.message);
    res.status(500).json({ error: err?.message });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Computes the net score delta for an incident.
 * penaltyPoints is always stored as a positive integer.
 * Positive types (exceptional_performance, fair_play, other_positive) ADD to score.
 * All other types SUBTRACT from score.
 */
function resolveEffectiveDelta(inc: { type: string; penaltyPoints: number }): number {
  const meta = INCIDENT_TYPES.find(t => t.type === inc.type);
  const sign = meta?.sign ?? -1;
  return sign * inc.penaltyPoints;
}

// Export the helper so ballondor.ts can use it
export { resolveEffectiveDelta, INCIDENT_TYPES };

export default router;
