import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../lib/session";
import { listLeads, saveLeads, deleteAllLeads } from "../../../lib/leads";

export async function GET(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  return NextResponse.json({ leads: listLeads({ status }) });
}

export async function POST(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { results } = await request.json();
  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: "Ingen resultater at gemme" }, { status: 400 });
  }

  const outcome = saveLeads(results, employee);
  return NextResponse.json({ ok: true, ...outcome });
}

export async function DELETE(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  const count = deleteAllLeads();
  return NextResponse.json({ ok: true, deleted: count });
}
