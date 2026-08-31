import { NextResponse } from "next/server";
import { createInquiry, listInquiries } from "../../../lib/inquiries";
import { sendInquiryNotification } from "../../../lib/mailer";
import { COOKIE_NAME, employeeIdFromCookie, getEmployeeById } from "../../../lib/auth";

// CORS-headers — tillader POST fra buildone.dk og andre origins
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// OPTIONS — preflight til CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// POST — offentlig, modtager henvendelse fra kontaktformularen
export async function POST(request) {
  try {
    const body = await request.json();
    const { navn, email, telefon, besked, kilde } = body;

    if (!email?.trim() && !navn?.trim()) {
      return NextResponse.json(
        { error: "Udfyld mindst navn eller e-mail" },
        { status: 400, headers: CORS }
      );
    }

    const inquiry = createInquiry({ navn, email, telefon, besked, kilde });

    // Send email-notifikation asynkront — fejl her stopper ikke svaret
    sendInquiryNotification(inquiry).catch((err) =>
      console.error("[mailer] Kunne ikke sende notifikation:", err.message)
    );

    return NextResponse.json({ ok: true, id: inquiry.id }, { status: 201, headers: CORS });
  } catch (err) {
    console.error("[inquiries POST]", err);
    return NextResponse.json({ error: "Intern fejl" }, { status: 500, headers: CORS });
  }
}

// GET — kræver login, henter alle henvendelser
export async function GET(request) {
  const cookie = request.cookies.get(COOKIE_NAME);
  const employeeId = cookie ? employeeIdFromCookie(cookie.value) : null;
  if (!employeeId || !getEmployeeById(employeeId)) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  try {
    const inquiries = listInquiries();
    return NextResponse.json(inquiries);
  } catch (err) {
    console.error("[inquiries GET]", err);
    return NextResponse.json({ error: "Intern fejl" }, { status: 500 });
  }
}
