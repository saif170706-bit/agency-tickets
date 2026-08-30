import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../lib/session";
import { isSuperadmin, listEmployees, createEmployee } from "../../../../lib/employees";

export async function GET() {
  const employee = getCurrentEmployee();
  if (!employee || !isSuperadmin(employee)) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }
  return NextResponse.json(listEmployees());
}

export async function POST(request) {
  const employee = getCurrentEmployee();
  if (!employee || !isSuperadmin(employee)) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, email, rolle = "medarbejder" } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Udfyld navn" }, { status: 400 });
  }
  if (!email?.trim()) {
    return NextResponse.json({ error: "Udfyld e-mail" }, { status: 400 });
  }

  try {
    // passwordHash = null → brugeren sætter selv kode ved første login
    const emp = createEmployee({ name: name.trim(), email: email.trim(), rolle });
    return NextResponse.json({
      id: emp.id, name: emp.name,
      email: emp.email, rolle: emp.rolle, hasPassword: false,
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
