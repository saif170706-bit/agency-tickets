import { NextResponse } from "next/server";
import { getEmployeeByUsername } from "../../../lib/employees";
import { verifyPassword, makeSessionCookie, COOKIE_NAME } from "../../../lib/auth";

export async function POST(request) {
  const { username, password } = await request.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Udfyld brugernavn og adgangskode." }, { status: 400 });
  }
  const employee = getEmployeeByUsername(username);
  if (!employee) {
    return NextResponse.json({ error: "Forkert brugernavn eller adgangskode." }, { status: 401 });
  }
  const ok = await verifyPassword(password, employee.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Forkert brugernavn eller adgangskode." }, { status: 401 });
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
