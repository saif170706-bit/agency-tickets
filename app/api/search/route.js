import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../lib/session";
import { searchTickets } from "../../../lib/tickets";
import { searchCustomers } from "../../../lib/customers";

export async function GET(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ customers: [], tickets: [] });

  const customers = searchCustomers(q).map((c) => ({
    id: c.id,
    navn: c.navn,
    cvrNummer: c.cvrNummer,
    kontaktperson: c.kontaktperson,
    status: c.status,
    _type: "kunde",
  }));

  const tickets = searchTickets(q).slice(0, 6).map((t) => ({
    id: t.id,
    ref: t.ref,
    title: t.title,
    customerName: t.customer?.name || "",
    statusLabel: t.statusLabel,
    isClosed: t.isClosed,
    _type: "sag",
  }));

  return NextResponse.json({ customers, tickets });
}
