const nodemailer = require("nodemailer");

/**
 * Send email via Zoho Mail SMTP.
 * Kræver env-variabler:
 *   ZOHO_USER  — fx kontakt@buildone.dk
 *   ZOHO_PASS  — app-specifik adgangskode fra Zoho
 */
async function sendInquiryNotification(inquiry) {
  const user = process.env.ZOHO_USER;
  const pass = process.env.ZOHO_PASS;

  if (!user || !pass) {
    console.warn("[mailer] ZOHO_USER eller ZOHO_PASS mangler — email sendes ikke");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const dato = new Date(inquiry.createdAt).toLocaleString("da-DK", {
    dateStyle: "full",
    timeStyle: "short",
  });

  await transporter.sendMail({
    from: `"BuildOne Kontaktformular" <${user}>`,
    to: user, // sendes til kontakt@buildone.dk
    subject: `📬 Ny henvendelse fra ${inquiry.navn || inquiry.email}`,
    text: [
      `Ny henvendelse modtaget ${dato}`,
      "",
      `Navn:     ${inquiry.navn || "—"}`,
      `E-mail:   ${inquiry.email || "—"}`,
      `Telefon:  ${inquiry.telefon || "—"}`,
      "",
      "Besked:",
      inquiry.besked || "—",
      "",
      "---",
      "Se henvendelsen i indbakken: https://admin.buildone.dk/indbakke",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#003135;margin-bottom:4px">📬 Ny henvendelse</h2>
        <p style="color:#5a7a7d;margin-top:0">Modtaget ${dato}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#5a7a7d;font-size:0.85rem;width:90px">Navn</td><td style="padding:8px;font-weight:600">${inquiry.navn || "—"}</td></tr>
          <tr style="background:#f5fafa"><td style="padding:8px;color:#5a7a7d;font-size:0.85rem">E-mail</td><td style="padding:8px;font-weight:600">${inquiry.email || "—"}</td></tr>
          <tr><td style="padding:8px;color:#5a7a7d;font-size:0.85rem">Telefon</td><td style="padding:8px;font-weight:600">${inquiry.telefon || "—"}</td></tr>
        </table>
        <div style="background:#f5fafa;border-left:3px solid #0fa4af;padding:12px 16px;border-radius:0 4px 4px 0;white-space:pre-wrap;font-size:0.95rem">${inquiry.besked || "—"}</div>
        <p style="margin-top:20px">
          <a href="https://admin.buildone.dk/indbakke" style="background:#0fa4af;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-weight:600">Åbn i indbakken →</a>
        </p>
      </div>
    `,
  });
}

module.exports = { sendInquiryNotification };
