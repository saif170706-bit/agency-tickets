import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { changeStatus } from "../../../../../lib/tickets";

export async function POST(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { statusLabel } = await request.json();
  if (!statusLabel) return NextResponse.json({ error: "Status mangler" }, { status: 400 });

  try {
    const ticket = changeStatus(params.ref, statusLabel, employee);
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
