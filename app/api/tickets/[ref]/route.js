import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../lib/session";
import { getTicketByRef } from "../../../../lib/tickets";
import { listDocuments } from "../../../../lib/documents";
import { listDomainsForTicket } from "../../../../lib/domains";

export async function GET(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const data = getTicketByRef(params.ref);
  if (!data) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });

  const documents = listDocuments(data.ticket.id);
  const domains = listDomainsForTicket(data.ticket.id);
  return NextResponse.json({ ...data, documents, domains });
}
