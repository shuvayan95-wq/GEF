import nodemailer from "nodemailer";

// ─── Email Service ────────────────────────────────────────────────────────────

let _transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  console.log(`[Email] GMAIL_USER = ${user ?? "(not set)"}`);
  console.log(`[Email] GMAIL_APP_PASSWORD is ${pass ? "set ✓" : "NOT SET ✗"}`);

  if (!user || !pass) {
    throw new Error(
      "[Email] GMAIL_USER and GMAIL_APP_PASSWORD must be set to send emails."
    );
  }

  if (!_transporter) {
    console.log("[Email] Creating new Nodemailer transporter…");
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    // Verify SMTP connection & credentials once on first use
    try {
      await _transporter.verify();
      console.log("[Email] Transporter verified — SMTP connection OK ✓");
    } catch (verifyErr: any) {
      // Reset so next call retries
      _transporter = null;
      console.error("[Email] Transporter verification FAILED ✗");
      console.error(`[Email] Error code   : ${verifyErr?.code ?? "n/a"}`);
      console.error(`[Email] Error message: ${verifyErr?.message ?? verifyErr}`);
      console.error(`[Email] Error response: ${verifyErr?.response ?? "n/a"}`);
      throw verifyErr;
    }
  }

  return _transporter;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationEmailPayload {
  to: string;
  captainName: string;
  title: string;
  body: string;
  type?: string;
  isImportant?: boolean;
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export async function sendNotificationEmail(
  payload: NotificationEmailPayload
): Promise<void> {
  const { to, captainName, title, body, type, isImportant } = payload;

  // ── Pre-flight checks ──────────────────────────────────────────────────────
  console.log(`[Email] sendNotificationEmail called`);
  console.log(`[Email] Recipient : ${to || "(empty — WILL FAIL)"}`);
  console.log(`[Email] Captain   : ${captainName}`);
  console.log(`[Email] Subject   : ${isImportant ? "⚠️ " : ""}[GEF] ${title}`);

  if (!to || !to.includes("@")) {
    console.error(`[Email] Invalid or missing recipient address: "${to}" — skipping send.`);
    return;
  }

  // FROM is resolved at send time (not module init) so env vars are always fresh
  const from = `GEF Stats <${process.env.GMAIL_USER ?? "noreply@gmail.com"}>`;
  console.log(`[Email] From      : ${from}`);

  // ── Build HTML ─────────────────────────────────────────────────────────────
  const importantBadge = isImportant
    ? `<span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">Important</span>&nbsp;`
    : "";

  const typeBadge = type
    ? `<span style="background:#1a2e1a;color:#00ff88;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${type}</span>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#05070a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#05070a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0d1117;border-radius:12px;border:1px solid #1a2e1a;overflow:hidden;max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:#0a1a0a;padding:28px 36px;border-bottom:2px solid #00ff88;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:800;color:#00ff88;letter-spacing:0.05em;text-transform:uppercase;">GEF</span>
                    <span style="font-size:22px;font-weight:400;color:#fff;letter-spacing:0.05em;"> STATS</span>
                  </td>
                  <td align="right" style="color:#4a5568;font-size:12px;">Global eFootball Federation</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Hello, <strong style="color:#e2e8f0;">${captainName}</strong></p>
              <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">You have a new notification from the GEF Admin team.</p>

              <!-- Notification card -->
              <div style="background:#111827;border-radius:8px;border-left:3px solid #00ff88;padding:20px 24px;">
                <div style="margin-bottom:10px;">${importantBadge}${typeBadge}</div>
                <h2 style="margin:0 0 10px;color:#f8f9fa;font-size:20px;font-weight:700;">${title}</h2>
                <p style="margin:0;color:#9ca3af;font-size:15px;line-height:1.6;">${body}</p>
              </div>

              <p style="margin:28px 0 0;color:#4a5568;font-size:12px;line-height:1.6;">
                Log in to the Captain Portal to view all your notifications and manage your club.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0a1a0a;padding:18px 36px;border-top:1px solid #1a2e1a;">
              <p style="margin:0;color:#374151;font-size:11px;text-align:center;">
                © Global eFootball Federation · This is an automated notification — do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // ── Send ───────────────────────────────────────────────────────────────────
  try {
    console.log("[Email] Acquiring transporter…");
    const transporter = await getTransporter();

    console.log("[Email] Calling sendMail…");
    const info = await transporter.sendMail({
      from,
      to,
      subject: `${isImportant ? "⚠️ " : ""}[GEF] ${title}`,
      html,
    });

    console.log(`[Email] ✓ Sent successfully to ${to}`);
    console.log(`[Email] messageId : ${info.messageId}`);
    console.log(`[Email] response  : ${info.response ?? "n/a"}`);
  } catch (err: any) {
    // Never crash the server — log full error and continue
    console.error(`[Email] ✗ Failed to send to ${to}`);
    console.error(`[Email] Error code     : ${err?.code ?? "n/a"}`);
    console.error(`[Email] Error message  : ${err?.message ?? err}`);
    console.error(`[Email] Error response : ${err?.response ?? "n/a"}`);
    console.error(`[Email] Error command  : ${err?.command ?? "n/a"}`);
  }
}
