import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { applyAnswer } from "../../../../../lib/leadPrompt";

export const dynamic = "force-dynamic";

// Tager svaret fra Claude-samtalen. De CVR-numre der nævnes, bliver til
// leads; resten af køen har en hjemmeside og udelades fremover.
export async function POST(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { text, force } = await request.json();
  if (!text || !String(text).trim()) {
    return NextResponse.json({ error: "Indsæt svaret først" }, { status: 400 });
  }

  try {
    return NextResponse.json({ ok: true, ...applyAnswer(text, employee.name, { force: Boolean(force) }) });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, kraeverBekraeftelse: Boolean(err.kraeverBekraeftelse) },
      { status: 400 }
    );
  }
}
