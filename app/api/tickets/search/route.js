import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../lib/session";
import { searchTickets } from "../../../../lib/tickets";

export async function GET(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const tickets = searchTickets(q);
  return NextResponse.json({ tickets });
}
