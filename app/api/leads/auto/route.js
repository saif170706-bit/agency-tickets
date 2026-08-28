import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../lib/session";
import { autoDiscoverLeads } from "../../../../lib/autoLeads";

export async function POST(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { brancheQueries, postnummer, perBranche } = await request.json();

  try {
    const result = await autoDiscoverLeads(
      { brancheQueries, postnummer, perBranche: Math.min(perBranche || 15, 50) },
      employee
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
