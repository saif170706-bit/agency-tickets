import { Resend } from "resend";

/**
 * Send email-notifikation via Resend.
 * Kræver env-variabel:
 *   RESEND_API_KEY  — fra resend.com dashboard
 *   NOTIFY_EMAIL    — hvem mailen sendes til (default: kontakt@buildone.dk)
 */
export async function sendInquiryNotification(inquiry) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[mailer] RESEND_API_KEY mangler — email sendes ikke");
    return;
  }

  const resend = new Resend(apiKey);
  const to = process.env.NOTIFY_EMAIL || "kontakt@buildone.dk";

  const dato = new Date(inquiry.createdAt).toLocaleString("da-DK", {
    dateStyle: "full",
    timeStyle: "short",
  });

  await resend.emails.send({
    from: "BuildOne <kontakt@buildone.dk>",
    to,
    subject: `📬 Ny henvendelse fra ${inquiry.navn || inquiry.email || "ukendt"}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#003135;margin-bottom:4px">📬 Ny henvendelse</h2>
        <p style="color:#5a7a7d;margin-top:0">Modtaget ${dato}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#5a7a7d;font-size:0.85rem;width:90px">Navn</td><td style="padding:8px;font-weight:600">${inquiry.navn || "—"}</td></tr>
          <tr style="background:#f5fafa"><td style="padding:8px;color:#5a7a7d;font-size:0.85rem">E-mail</td><td style="padding:8px;font-weight:600">${inquiry.email || "—"}</td></tr>
          <tr><td style="padding:8px;color:#5a7a7d;font-size:0.85rem">Telefon</td><td style="padding:8px;font-weight:600">${inquiry.telefon || "—"}</td></tr>
        </table>
        ${inquiry.besked ? `
        <div style="background:#f5fafa;border-left:3px solid #0fa4af;padding:12px 16px;border-radius:0 4px 4px 0;white-space:pre-wrap;font-size:0.95rem;color:#003135">${inquiry.besked}</div>
        ` : ""}
        <p style="margin-top:20px">
          <a href="https://admin.buildone.dk/indbakke" style="background:#0fa4af;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-weight:600">Åbn i indbakken →</a>
        </p>
      </div>
    `,
  });
}
