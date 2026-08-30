import { NextResponse } from "next/server";
import { getEmployeeById, setEmployeePassword } from "../../../lib/employees";
import { hashPassword, makeSessionCookie, COOKIE_NAME } from "../../../lib/auth";

export async function POST(request) {
  const { employeeId, password, confirm } = await request.json().catch(() => ({}));

  if (!employeeId || !password) {
    return NextResponse.json({ error: "Mangler data." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Adgangskoden skal være mindst 8 tegn." }, { status: 400 });
  }
  if (password !== confirm) {
    return NextResponse.json({ error: "Adgangskoderne matcher ikke." }, { status: 400 });
  }

  const employee = getEmployeeById(employeeId);
  if (!employee) {
    return NextResponse.json({ error: "Bruger ikke fundet." }, { status: 404 });
  }
  // Sikkerhed: må kun bruges til at sætte EN NY kode — ikke overskrive eksisterende
  if (employee.passwordHash) {
    return NextResponse.json({ error: "Adgangskode allerede sat — kontakt admin for nulstilling." }, { status: 403 });
  }

  const passwordHash = await hashPassword(password);
  setEmployeePassword(employeeId, passwordHash);

  // Log brugeren ind med det samme
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, makeSessionCookie(employeeId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
