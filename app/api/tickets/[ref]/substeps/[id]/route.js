import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../../lib/session";
import { toggleSubStep, removeSubStep, renameSubStep } from "../../../../../../lib/tickets";

export async function PATCH(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });

  const { ref, id } = params;
  const body = await request.json();

  if (body.label !== undefined) {
    // Omdøb
    const ticket = renameSubStep(ref, id, body.label, employee);
    return NextResponse.json({ ok: true, subSteps: ticket.subSteps });
  } else {
    // Toggle done
    const ticket = toggleSubStep(ref, id, employee);
    return NextResponse.json({ ok: true, subSteps: ticket.subSteps });
  }
}

export async function DELETE(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });

  const { ref, id } = params;
  const ticket = removeSubStep(ref, id, employee);
  return NextResponse.json({ ok: true, subSteps: ticket.subSteps });
}
