import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../../lib/session";
import { updateDomain, deleteDomain } from "../../../../../../lib/domains";

export async function PATCH(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const body = await request.json();
  try {
    const domain = updateDomain(params.id, body, employee);
    return NextResponse.json({ ok: true, domain });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  try {
    deleteDomain(params.id, employee);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
