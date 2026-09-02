import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { addSubStep } from "../../../../../lib/tickets";

export async function POST(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });

  const { ref } = params;
  const { label } = await request.json();
  if (!label?.trim()) return NextResponse.json({ error: "Label mangler" }, { status: 400 });

  const ticket = addSubStep(ref, label, employee);
  return NextResponse.json({ ok: true, subSteps: ticket.subSteps });
}
