import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { closeTicket, reopenTicket } from "../../../../../lib/tickets";

export async function POST(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  try {
    const ticket = body.reopen
      ? reopenTicket(params.ref, employee)
      : closeTicket(params.ref, employee);
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
