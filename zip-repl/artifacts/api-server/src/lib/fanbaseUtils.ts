import { db } from "@workspace/db";
import {
  clubFanbaseTable,
  fanHistoryTable,
  fanSettingsTable,
  fanDivisionThresholdsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const DEFAULT_SETTINGS: Record<string, string> = {
  match_win_min: "200",
  match_win_max: "500",
  match_draw_min: "25",
  match_draw_max: "75",
  match_loss_min: "-50",
  match_loss_max: "-20",
  cup_win_min: "400",
  cup_win_max: "800",
  league_title_min: "1500",
  league_title_max: "3000",
  cup_title_min: "1200",
  cup_title_max: "2500",
  golden_boot: "250",
  best_goalkeeper: "250",
  potw: "75",
  totw_player: "40",
  star_signing_min: "100",
  star_signing_max: "500",
  star_release_min: "-300",
  star_release_max: "-100",
  streak_win_bonus: "150",
  streak_loss_penalty: "-80",
  max_gain_per_event: "5000",
  max_loss_per_event: "2000",
  auto_growth_enabled: "true",
};

const DEFAULT_DIVISIONS = [
  { name: "Local Club", minFans: 0, color: "#6b7280", sortOrder: 0 },
  { name: "Regional Club", minFans: 25000, color: "#3b82f6", sortOrder: 1 },
  { name: "National Club", minFans: 50000, color: "#8b5cf6", sortOrder: 2 },
  { name: "Elite Club", minFans: 100000, color: "#f59e0b", sortOrder: 3 },
  { name: "Continental Giant", minFans: 250000, color: "#ef4444", sortOrder: 4 },
  { name: "World Giant", minFans: 500000, color: "#ec4899", sortOrder: 5 },
  { name: "Global Powerhouse", minFans: 1000000, color: "#10b981", sortOrder: 6 },
];

export async function ensureSettingsSeeded() {
  const existing = await db.select().from(fanSettingsTable);
  if (existing.length === 0) {
    await db.insert(fanSettingsTable).values(
      Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
        key,
        value,
        description: null,
      }))
    );
  }
  const divs = await db.select().from(fanDivisionThresholdsTable);
  if (divs.length === 0) {
    await db.insert(fanDivisionThresholdsTable).values(DEFAULT_DIVISIONS);
  }
}

export async function getSettings(): Promise<Record<string, number | boolean | string>> {
  const rows = await db.select().from(fanSettingsTable);
  const out: Record<string, any> = {};
  for (const r of rows) {
    if (r.value === "true") out[r.key] = true;
    else if (r.value === "false") out[r.key] = false;
    else if (!isNaN(Number(r.value))) out[r.key] = Number(r.value);
    else out[r.key] = r.value;
  }
  return { ...DEFAULT_SETTINGS, ...out };
}

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function applyFanChange(
  teamId: number,
  change: number,
  reason: string,
  eventType: string,
  referenceId?: number
): Promise<void> {
  try {
    const settings = await getSettings();
    const maxGain = Number(settings.max_gain_per_event) || 5000;
    const maxLoss = Number(settings.max_loss_per_event) || 2000;

    const clamped = change > 0
      ? Math.min(change, maxGain)
      : Math.max(change, -maxLoss);

    const existing = await db
      .select()
      .from(clubFanbaseTable)
      .where(eq(clubFanbaseTable.teamId, teamId))
      .then((r) => r[0] ?? null);

    if (!existing) return;

    const newTotal = Math.max(0, existing.currentFans + clamped);
    const newHighest = Math.max(existing.highestEver, newTotal);
    const newLowest = existing.lowestEver === 0
      ? newTotal
      : Math.min(existing.lowestEver, newTotal);
    const newLargestGain = clamped > 0
      ? Math.max(existing.largestGain, clamped)
      : existing.largestGain;
    const newLargestLoss = clamped < 0
      ? Math.max(existing.largestLoss, Math.abs(clamped))
      : existing.largestLoss;

    await db
      .update(clubFanbaseTable)
      .set({
        currentFans: newTotal,
        highestEver: newHighest,
        lowestEver: newLowest,
        largestGain: newLargestGain,
        largestLoss: newLargestLoss,
        updatedAt: sql`now()`,
      })
      .where(eq(clubFanbaseTable.teamId, teamId));

    await db.insert(fanHistoryTable).values({
      teamId,
      changeAmount: clamped,
      newTotal,
      reason,
      eventType,
      referenceId: referenceId ?? null,
    });
  } catch (err: any) {
    console.error("[Fanbase] applyFanChange error:", err?.message);
  }
}

export async function processMatchFans(
  team1Id: number,
  team2Id: number,
  team1Score: number,
  team2Score: number,
  matchId: number
): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.auto_growth_enabled) return;

    const isDraw = team1Score === team2Score;
    const team1Won = team1Score > team2Score;

    if (isDraw) {
      const gain = randBetween(Number(settings.match_draw_min), Number(settings.match_draw_max));
      await applyFanChange(team1Id, gain, "Match draw", "match_draw", matchId);
      await applyFanChange(team2Id, gain, "Match draw", "match_draw", matchId);
    } else {
      const winnerId = team1Won ? team1Id : team2Id;
      const loserId = team1Won ? team2Id : team1Id;
      const winGain = randBetween(Number(settings.match_win_min), Number(settings.match_win_max));
      const lossLoss = randBetween(Number(settings.match_loss_min), Number(settings.match_loss_max));
      await applyFanChange(winnerId, winGain, "Match victory", "match_win", matchId);
      await applyFanChange(loserId, lossLoss, "Match defeat", "match_loss", matchId);
    }
  } catch (err: any) {
    console.error("[Fanbase] processMatchFans error:", err?.message);
  }
}

export function getDivision(fans: number, divisions: Array<{ name: string; minFans: number; color: string }>) {
  const sorted = [...divisions].sort((a, b) => b.minFans - a.minFans);
  return sorted.find((d) => fans >= d.minFans) ?? sorted[sorted.length - 1];
}
