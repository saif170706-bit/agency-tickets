import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../lib/session";
import { findCandidates } from "../../../../lib/autoLeads";
import { buildPrompt } from "../../../../lib/leadPrompt";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Henter kandidater fra CVR og bygger den tekst der skal kopieres over i en
// Claude-samtale. Der slås ikke op på nettet her — det er hele pointen.
export async function POST(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { brancheQueries, postnummer, antal } = await request.json();

  try {
    const stats = await findCandidates({
      brancheQueries,
      postnummer,
      antal: Math.min(Math.max(Number(antal) || 35, 1), 100),
    });
    return NextResponse.json({ ok: true, ...stats, ...buildPrompt(200) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// Henter prompten for det der allerede ligger i køen — så en halvfærdig
// omgang ikke går tabt hvis siden genindlæses.
export async function GET() {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  return NextResponse.json({ ok: true, ...buildPrompt(200) });
}
