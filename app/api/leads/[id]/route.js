import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../lib/session";
import { updateLead, deleteLead } from "../../../../lib/leads";

export async function PATCH(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const body = await request.json();
  try {
    const lead = updateLead(params.id, body, employee);
    return NextResponse.json({ ok: true, lead });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  deleteLead(params.id);
  return NextResponse.json({ ok: true });
}
