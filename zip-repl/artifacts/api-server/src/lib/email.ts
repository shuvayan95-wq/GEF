import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "GEF Stats <notifications@gef-1--shuvayan992.replit.app>";

export interface NotificationEmailPayload {
  to: string;
  captainName: string;
  title: string;
  body: string;
  type?: string;
  isImportant?: boolean;
}

export async function sendNotificationEmail(payload: NotificationEmailPayload) {
  const { to, captainName, title, body, type, isImportant } = payload;

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

  const result = await resend.emails.send({
    from: FROM,
    to,
    subject: `${isImportant ? "⚠️ " : ""}[GEF] ${title}`,
    html,
  });

  if (result.error) {
    console.error("[Email] Resend error:", result.error);
    throw new Error(result.error.message);
  }

  console.log(`[Email] Sent to ${to} — id: ${result.data?.id}`);
  return result.data;
}
