import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../lib/session";
import { listVerificationQueue, applyVerification } from "../../../../lib/leads";

export const dynamic = "force-dynamic";

// Endpointet kaldes både fra browseren (logget ind) og fra scriptet
// scripts/verify-leads.mjs, som kører på en pc uden session-cookie og
// derfor bruger en delt nøgle i stedet.
function authorize(request) {
  const token = process.env.LEADS_API_TOKEN;
  const header = request.headers.get("authorization") || "";
  if (token && header === `Bearer ${token}`) return { name: "verifikations-script" };
  try {
    return getCurrentEmployee();
  } catch {
    return null;
  }
}

export async function GET(request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit")) || 50, 200);
  const items = listVerificationQueue(limit).map((l) => ({
    cvrNummer: l.cvrNummer,
    navn: l.navn,
    vej: l.vej,
    postnummer: l.postnummer,
    by: l.by,
    branchetekst: l.branchetekst,
    reason: l.reason,
  }));
  return NextResponse.json({ ok: true, count: items.length, items });
}

export async function POST(request) {
  const who = authorize(request);
  if (!who) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const verdicts = Array.isArray(body?.results) ? body.results : null;
  if (!verdicts) {
    return NextResponse.json({ error: "Forventede feltet results som liste" }, { status: 400 });
  }

  const clean = verdicts
    .filter((v) => v && v.cvrNummer)
    .map((v) => ({
      cvrNummer: String(v.cvrNummer),
      harHjemmeside: Boolean(v.harHjemmeside),
      url: typeof v.url === "string" ? v.url : null,
      sikkerhed: ["hoej", "middel", "lav"].includes(v.sikkerhed) ? v.sikkerhed : "lav",
    }));

  const result = applyVerification(clean, who.name || "automatisk verifikation");
  return NextResponse.json({ ok: true, received: clean.length, ...result });
}
