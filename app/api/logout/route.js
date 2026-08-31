import { NextResponse } from "next/server";
import { COOKIE_NAME } from "../../../lib/auth";

export async function POST(request) {
  // Brug x-forwarded-host hvis tilgængelig (Railway/reverse proxy) — undgår localhost-redirect
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const res = NextResponse.redirect(`${proto}://${host}/login`);
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
