import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../lib/session";
import { createCustomer, listCustomers } from "../../../lib/customers";

export async function GET() {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  const customers = listCustomers();
  return NextResponse.json(customers);
}

export async function POST(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!body.navn?.trim()) {
    return NextResponse.json({ error: "Navn er påkrævet" }, { status: 400 });
  }

  try {
    const kunde = createCustomer(body, employee);
    return NextResponse.json(kunde, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
