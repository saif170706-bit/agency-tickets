import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { aktiverAbonnement } from "../../../../../lib/customers";

export async function POST(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!body.abonnementPris) {
    return NextResponse.json({ error: "Angiv månedlig pris" }, { status: 400 });
  }

  try {
    const kunde = aktiverAbonnement(params.id, body);
    return NextResponse.json(kunde);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
