import { NextResponse } from "next/server";

// Offentlige stier der IKKE kræver medarbejder-login
const PUBLIC_PATHS = ["/login", "/api/login"];

function isPublic(pathname) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/track/")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/track")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const cookie = request.cookies.get("nordlys_session");
  if (!cookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
