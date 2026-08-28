import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { getTicketByRef } from "../../../../../lib/tickets";
import { listDomainsForTicket, addDomain } from "../../../../../lib/domains";

export async function GET(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const data = getTicketByRef(params.ref);
  if (!data) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });
  return NextResponse.json({ domains: listDomainsForTicket(data.ticket.id) });
}

export async function POST(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const body = await request.json();
  if (!body.domainName || !body.domainName.trim()) {
    return NextResponse.json({ error: "Domænenavn er påkrævet" }, { status: 400 });
  }

  try {
    const domain = addDomain(params.ref, body, employee);
    return NextResponse.json({ ok: true, domain });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
