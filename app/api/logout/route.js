import { NextResponse } from "next/server";
import { COOKIE_NAME } from "../../../lib/auth";

export async function POST(request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
