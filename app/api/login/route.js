import { NextResponse } from "next/server";
import { getEmployeeByEmail } from "../../../lib/employees";
import { verifyPassword, makeSessionCookie, COOKIE_NAME } from "../../../lib/auth";

export async function POST(request) {
  const { email, password } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Udfyld e-mail." }, { status: 400 });
  }

  const employee = getEmployeeByEmail(email);
  if (!employee) {
    return NextResponse.json({ error: "Forkert e-mail eller adgangskode." }, { status: 401 });
  }

  // Første-login: ingen adgangskode sat endnu → send til set-password
  if (!employee.passwordHash) {
    return NextResponse.json({ firstLogin: true, employeeId: employee.id }, { status: 200 });
  }

  if (!password) {
    return NextResponse.json({ error: "Udfyld adgangskode." }, { status: 400 });
  }

  const ok = await verifyPassword(password, employee.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Forkert e-mail eller adgangskode." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, makeSessionCookie(employee.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
