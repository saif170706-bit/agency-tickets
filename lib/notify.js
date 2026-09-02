// SMS/e-mail-afsendelse. Virker "ud af boksen" ved bare at logge til
// konsollen, indtil du udfylder API-nøgler i .env.local — så skifter den
// automatisk til at sende via de rigtige udbydere. Ingen kodeændringer krævet.

const COMPANY_NAME = process.env.COMPANY_NAME || "BuildOne";
// PUBLIC_BASE_URL bør sættes til https://buildone.dk i Railway
// Cloudflare redirect: buildone.dk/tracking/* → admin.buildone.dk/track/$1
// PUBLIC_BASE_URL skal sættes til https://admin.buildone.dk i Railway
// /tracking/:ref redirectes internt til /track/:ref via next.config.js
const BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:4100";

function trackingUrl(ref) {
  // track.buildone.dk/NS-2026-0001 — rent link uden ekstra sti
  const base = BASE_URL.replace(/\/$/, "");
  return `${base}/${ref}`;
}

function buildMessages(ticket) {
  const url = trackingUrl(ticket.ref);

  const name = ticket.customer.name ? ticket.customer.name.split(" ")[0] : "kunde";
  const smsText =
    `Hej ${name}, din sag er registreret med sagsnummeret ${ticket.ref}, du kan følge din sag via ${url}. ` +
    `Venlig hilsen ${COMPANY_NAME}`;

  const emailSubject = `Din sag ${ticket.ref} er oprettet — ${COMPANY_NAME}`;

  const emailHtml = `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#003135;border-radius:10px 10px 0 0;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#24d9a4;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Sagsstyring</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:26px;font-weight:700;">${COMPANY_NAME}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;">
            <p style="margin:0 0 8px;color:#003135;font-size:16px;">Hej ${name},</p>
            <p style="margin:0 0 24px;color:#4a6366;font-size:15px;line-height:1.6;">
              Din sag er nu registreret hos ${COMPANY_NAME}. Du kan til enhver tid følge status på din sag via knappen herunder.
            </p>

            <!-- Sagsnummer boks -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#f0f8f9;border:1px solid #cde4e6;border-radius:8px;padding:18px 24px;">
                  <p style="margin:0 0 4px;color:#5a7a7d;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Sagsnummer</p>
                  <p style="margin:0;color:#003135;font-size:22px;font-weight:700;letter-spacing:1px;">${ticket.ref}</p>
                </td>
              </tr>
            </table>

            <!-- CTA knap -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${url}" style="display:inline-block;background:#003135;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;">
                    Følg din sag →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#8aa5a8;font-size:13px;line-height:1.6;">
              Gem venligst dit sagsnummer — du skal bruge det, hvis du kontakter os. Har du spørgsmål? Svar på denne mail eller kontakt os direkte.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0f8f9;border-radius:0 0 10px 10px;padding:20px 40px;text-align:center;border-top:1px solid #cde4e6;">
            <p style="margin:0;color:#8aa5a8;font-size:12px;">
              Venlig hilsen · ${COMPANY_NAME}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { smsText, emailSubject, emailHtml, url };
}

async function sendSms(phone, text) {
  // Kræver GATEWAY_API_TOKEN fra Railway Variables.
  // GatewayAPI: https://gatewayapi.com — ~0,30 kr/SMS til DK, ingen månedlig pris.
  const token = process.env.GATEWAY_API_TOKEN;
  if (!token) {
    console.log(`[SMS - ikke konfigureret, simuleret] Til: ${phone}\n${text}`);
    return { sent: false, reason: "no_provider_configured" };
  }

  // Normaliser til GatewayAPI-format: heltal uden + (fx 4512345678)
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = "45" + digits.slice(1);
  else if (!digits.startsWith("45") && digits.length === 8) digits = "45" + digits;
  const recipient = parseInt(digits, 10);

  // Afsendernavn maks 11 tegn (alphanumeric sender ID)
  const sender = COMPANY_NAME.replace(/\s/g, "").slice(0, 11);

  try {
    const res = await fetch("https://messaging.gatewayapi.com/mobile/single", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ sender, message: text, recipient }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `GatewayAPI svarede ${res.status}`);
    console.log(`[SMS] Sendt til ${recipient} via GatewayAPI — id: ${data.msg_id}`);
    return { sent: true, id: data.msg_id };
  } catch (err) {
    console.error("SMS-afsendelse fejlede:", err);
    return { sent: false, reason: String(err) };
  }
}

async function sendEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "noreply@buildone.dk";
  if (!apiKey) {
    console.log(`[E-mail - ikke konfigureret, simuleret] Til: ${to}\nEmne: ${subject}`);
    return { sent: false, reason: "no_provider_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) throw new Error(`E-mail-udbyder svarede ${res.status}`);
    return { sent: true };
  } catch (err) {
    console.error("E-mail-afsendelse fejlede:", err);
    return { sent: false, reason: String(err) };
  }
}

async function notifyTicketCreated(ticket) {
  const { smsText, emailSubject, emailHtml } = buildMessages(ticket);
  const results = {};
  if (ticket.customer.phone) {
    results.sms = await sendSms(ticket.customer.phone, smsText);
  }
  if (ticket.customer.email) {
    results.email = await sendEmail(ticket.customer.email, emailSubject, emailHtml);
  }
  return results;
}

// Send en manuelt skrevet/valgt SMS (fra medarbejder via modal)
async function sendManualSms(phone, text) {
  return sendSms(phone, text);
}

module.exports = { notifyTicketCreated, sendManualSms, trackingUrl };
