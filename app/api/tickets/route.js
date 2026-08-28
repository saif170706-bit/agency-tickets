import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../lib/session";
import { createTicket, listTickets } from "../../../lib/tickets";
import { notifyTicketCreated } from "../../../lib/notify";

export async function GET(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";
  const tickets = listTickets({ archived });
  return NextResponse.json({ tickets });
}

export async function POST(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const body = await request.json();
  const { type, title, description, customer, roadmap } = body;

  if (!type || !["build", "support"].includes(type)) {
    return NextResponse.json({ error: "Vælg sagstype" }, { status: 400 });
  }
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Titel er påkrævet" }, { status: 400 });
  }
  if (!customer || !customer.name || !customer.phone || !customer.email) {
    return NextResponse.json(
      { error: "Navn, telefon og e-mail på kunden er påkrævet" },
      { status: 400 }
    );
  }

  const ticket = createTicket({ type, title, description, customer, roadmap }, employee);

  // Send SMS + e-mail til kunden om at sagen er oprettet (fejler stille,
  // hvis SMS/e-mail-udbyder endnu ikke er konfigureret).
  notifyTicketCreated(ticket).catch((err) => console.error("Notifikation fejlede:", err));

  return NextResponse.json({ ok: true, ref: ticket.ref });
}
