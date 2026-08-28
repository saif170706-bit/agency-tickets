import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { getLead, convertLeadToTicket } from "../../../../../lib/leads";
import { createTicket } from "../../../../../lib/tickets";
import { notifyTicketCreated } from "../../../../../lib/notify";

export async function POST(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const lead = getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead ikke fundet" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const phone = body.phone || lead.telefon;
  const email = body.email || lead.email;

  if (!phone || !email) {
    return NextResponse.json(
      { error: "Angiv telefon og e-mail på kunden (CVR indeholder det sjældent selv)." },
      { status: 400 }
    );
  }

  const customer = {
    name: lead.navn,
    phone,
    email,
    address: body.address || [lead.vej, lead.postnummer && lead.by ? `${lead.postnummer} ${lead.by}` : ""].filter(Boolean).join(", "),
    cvr: String(lead.cvrNummer),
  };

  const ticket = createTicket(
    {
      type: body.type === "build" ? "build" : "support",
      title: body.title || `Salgshenvendelse — ${lead.navn}`,
      description: body.description || `Oprettet fra CVR-lead (${lead.branchetekst || "ukendt branche"}).`,
      customer,
      roadmap: body.roadmap,
    },
    employee
  );

  convertLeadToTicket(params.id, employee);
  notifyTicketCreated(ticket).catch((err) => console.error("Notifikation fejlede:", err));

  return NextResponse.json({ ok: true, ref: ticket.ref });
}
