import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../../lib/session";
import { deleteSecretNote } from "../../../../../../lib/tickets";

export async function DELETE(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  try {
    deleteSecretNote(params.ref, params.id, employee);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
