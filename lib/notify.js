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
  // Bruger /tracking/ path så URL'en ser ud som buildone.dk/tracking/NS-2026-0001
  const base = BASE_URL.replace(/\/$/, "");
  return `${base}/tracking/${ref}`;
}

function buildMessages(ticket) {
  const url = trackingUrl(ticket.ref);

  const name = ticket.customer.name ? ticket.customer.name.split(" ")[0] : "kunde";
  const smsText =
    `Hej ${name}, din sag er registreret med sagsnummeret ${ticket.ref}, du kan følge din sag via ${url}. ` +
    `Med venlig hilsen ${COMPANY_NAME}`;

  const emailSubject = `Din sag ${ticket.ref} er oprettet — ${COMPANY_NAME}`;
  // E-mail-tekst matcher SMS-teksten for konsistens
  const emailText = smsText;

  return { smsText, emailSubject, emailText, url };
}

async function sendSms(phone, text) {
  // Kræver ELKS_USERNAME + ELKS_PASSWORD fra Railway Variables.
  // Opret konto på 46elks.com — betal kun pr. SMS (~0,41 kr til DK).
  const username = process.env.ELKS_USERNAME;
  const password = process.env.ELKS_PASSWORD;
  if (!username || !password) {
    console.log(`[SMS - ikke konfigureret, simuleret] Til: ${phone}\n${text}`);
    return { sent: false, reason: "no_provider_configured" };
  }

  // Normaliser til E.164 — tilføj +45 hvis dansk nummer uden landekode
  let normalized = phone.replace(/\s|-/g, "");
  if (!normalized.startsWith("+")) {
    if (normalized.startsWith("00")) normalized = "+" + normalized.slice(2);
    else normalized = "+45" + normalized;
  }

  // Afsendernavn maks 11 tegn (alphanumeric sender ID)
  const sender = COMPANY_NAME.replace(/\s/g, "").slice(0, 11);

  try {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const body = new URLSearchParams({ from: sender, to: normalized, message: text });

    const res = await fetch("https://api.46elks.com/a1/sms", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `46elks svarede ${res.status}`);
    console.log(`[SMS] Sendt til ${normalized} via 46elks — id: ${data.id}`);
    return { sent: true, id: data.id };
  } catch (err) {
    console.error("SMS-afsendelse fejlede:", err);
    return { sent: false, reason: String(err) };
  }
}

async function sendEmail(to, subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "noreply@buildone.dk";
  if (!apiKey) {
    console.log(`[E-mail - ikke konfigureret, simuleret] Til: ${to}\nEmne: ${subject}\n${text}`);
    return { sent: false, reason: "no_provider_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) throw new Error(`E-mail-udbyder svarede ${res.status}`);
    return { sent: true };
  } catch (err) {
    console.error("E-mail-afsendelse fejlede:", err);
    return { sent: false, reason: String(err) };
  }
}

async function notifyTicketCreated(ticket) {
  const { smsText, emailSubject, emailText } = buildMessages(ticket);
  const results = {};
  if (ticket.customer.phone) {
    results.sms = await sendSms(ticket.customer.phone, smsText);
  }
  if (ticket.customer.email) {
    results.email = await sendEmail(ticket.customer.email, emailSubject, emailText);
  }
  return results;
}

// Send en manuelt skrevet/valgt SMS (fra medarbejder via modal)
async function sendManualSms(phone, text) {
  return sendSms(phone, text);
}

module.exports = { notifyTicketCreated, sendManualSms, trackingUrl };
