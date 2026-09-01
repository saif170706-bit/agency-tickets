import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { readDb } from "../../../../../lib/db";
import { sendManualSms } from "../../../../../lib/notify";

export async function POST(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });

  const { id } = params;
  const { text } = await request.json();

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Besked mangler" }, { status: 400 });
  }
  if (text.length > 320) {
    return NextResponse.json({ error: "Beskeden er for lang" }, { status: 400 });
  }

  const db = readDb();
  const kunde = db.customers?.find((k) => k.id === id);
  if (!kunde) return NextResponse.json({ error: "Kunde ikke fundet" }, { status: 404 });
  if (!kunde.telefon) return NextResponse.json({ error: "Ingen telefonnummer på kunden" }, { status: 400 });

  const result = await sendManualSms(kunde.telefon, text.trim());
  return NextResponse.json(result);
}
