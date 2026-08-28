import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { addNote } from "../../../../../lib/tickets";

export async function POST(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { body } = await request.json();
  if (!body || !body.trim()) {
    return NextResponse.json({ error: "Note må ikke være tom" }, { status: 400 });
  }
  try {
    const note = addNote(params.ref, body.trim(), employee);
    return NextResponse.json({ ok: true, note });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
