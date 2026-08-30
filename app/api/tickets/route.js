import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../lib/session";
import { createTicket, listTickets } from "../../../lib/tickets";
import { getCustomer } from "../../../lib/customers";
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
  const { type, title, description, customer: manualCustomer, roadmap, kundeId } = body;

  if (!type || !["build", "support"].includes(type)) {
    return NextResponse.json({ error: "Vælg sagstype" }, { status: 400 });
  }
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Titel er påkrævet" }, { status: 400 });
  }

  let customer;

  if (kundeId) {
    // Hent kontaktinfo fra kundeprofilen — ingen manuel udfyldning nødvendig
    const kunde = getCustomer(kundeId);
    if (!kunde) return NextResponse.json({ error: "Kundeprofil ikke fundet" }, { status: 404 });

    const phone = kunde.telefon;
    const email = kunde.email;

    if (!phone || !email) {
      return NextResponse.json(
        { error: "Kundens profil mangler telefon eller e-mail — opdater profilen og prøv igen" },
        { status: 400 }
      );
    }

    customer = {
      name: kunde.kontaktperson || kunde.navn,
      phone,
      email,
      address: kunde.adresse || "",
      cvr: kunde.cvrNummer || "",
    };
  } else {
    // Manuel oprettelse — kræver alle felter
    customer = manualCustomer || {};
    if (!customer.name || !customer.phone || !customer.email) {
      return NextResponse.json(
        { error: "Navn, telefon og e-mail på kunden er påkrævet" },
        { status: 400 }
      );
    }
  }

  const ticket = createTicket({ type, title, description, customer, roadmap, kundeId: kundeId || null }, employee);

  notifyTicketCreated(ticket).catch((err) => console.error("Notifikation fejlede:", err));

  return NextResponse.json({ ok: true, ref: ticket.ref });
}
