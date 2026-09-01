import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTicketByRef } from "@/lib/tickets";
import { sendManualSms } from "@/lib/notify";

export async function POST(request, { params }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });

  const { ref } = params;
  const { text } = await request.json();

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Besked mangler" }, { status: 400 });
  }
  if (text.length > 320) {
    return NextResponse.json({ error: "Beskeden er for lang" }, { status: 400 });
  }

  const data = getTicketByRef(ref);
  if (!data) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });

  const { ticket } = data;
  if (!ticket.customer.phone) {
    return NextResponse.json({ error: "Ingen telefonnummer på kunden" }, { status: 400 });
  }

  const result = await sendManualSms(ticket.customer.phone, text.trim());
  return NextResponse.json(result);
}
