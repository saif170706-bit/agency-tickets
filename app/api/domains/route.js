import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../lib/session";
import { listAllDomains } from "../../../lib/domains";

export async function GET() {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  return NextResponse.json({ domains: listAllDomains() });
}
