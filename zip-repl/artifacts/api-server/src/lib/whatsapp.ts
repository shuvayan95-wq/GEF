import { db } from "@workspace/db";
import { captainAccountsTable, notificationsLogTable, teamsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const INSTANCE_ID = process.env.WHATSAPP_INSTANCE_ID;
const API_TOKEN = process.env.WHATSAPP_API_TOKEN;

function formatChatId(number: string): string {
  const digits = number.replace(/\D/g, "");
  return `${digits}@c.us`;
}

async function sendSingleMessage(whatsappNumber: string, message: string): Promise<boolean> {
  if (!INSTANCE_ID || !API_TOKEN) return false;
  try {
    const url = `https://api.green-api.com/waInstance${INSTANCE_ID}/sendMessage/${API_TOKEN}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: formatChatId(whatsappNumber), message }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function notifyCaptains(
  message: string,
  type: string,
  teamIds?: number[],
): Promise<void> {
  try {
    let query = db.select().from(captainAccountsTable).where(eq(captainAccountsTable.status, "approved"));
    const allApproved = await query;

    const targets = teamIds && teamIds.length > 0
      ? allApproved.filter(c => teamIds.includes(c.teamId))
      : allApproved;

    const whatsappEnabled = !!(INSTANCE_ID && API_TOKEN);
    let status = whatsappEnabled ? "sent" : "skipped";
    let errorMsg: string | null = null;

    if (whatsappEnabled && targets.length > 0) {
      const results = await Promise.all(
        targets.map(c => sendSingleMessage(c.whatsappNumber, `🏆 *GEF*\n\n${message}`))
      );
      const anyFailed = results.some(r => !r);
      if (anyFailed) {
        status = results.every(r => !r) ? "failed" : "partial";
        errorMsg = "One or more messages failed to deliver";
      }
    }

    await db.insert(notificationsLogTable).values({
      type,
      message,
      teamIds: teamIds ? JSON.stringify(teamIds) : null,
      whatsappStatus: status,
      errorMessage: errorMsg,
    });
  } catch (err: any) {
    console.error("[WhatsApp] notifyCaptains error:", err?.message);
  }
}

export async function getTeamName(teamId: number): Promise<string> {
  const [t] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  return t?.name ?? `Team #${teamId}`;
}
