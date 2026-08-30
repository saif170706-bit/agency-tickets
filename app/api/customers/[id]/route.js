import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../lib/session";
import { isSuperadmin } from "../../../../lib/employees";
import { getCustomer, updateCustomer, deleteCustomer, getCustomerTickets } from "../../../../lib/customers";
import { deleteTicketsByKundeId } from "../../../../lib/tickets";

export async function GET(_, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const kunde = getCustomer(params.id);
  if (!kunde) return NextResponse.json({ error: "Kunde ikke fundet" }, { status: 404 });

  const tickets = getCustomerTickets(params.id);
  return NextResponse.json({ ...kunde, tickets });
}

export async function PATCH(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  try {
    const kunde = updateCustomer(params.id, body);
    return NextResponse.json(kunde);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.message.includes("ikke fundet") ? 404 : 500 });
  }
}

export async function DELETE(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!isSuperadmin(employee)) return NextResponse.json({ error: "Kun superadmin kan slette kunder" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const deleteSager = searchParams.get("sager") === "true";

  try {
    let slettetSager = 0;
    if (deleteSager) {
      slettetSager = deleteTicketsByKundeId(params.id);
    }
    deleteCustomer(params.id);
    return NextResponse.json({ ok: true, slettetSager });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
