import { NextResponse } from "next/server";
import { updateInquiryStatus } from "../../../../lib/inquiries";
import { COOKIE_NAME, employeeIdFromCookie, getEmployeeById } from "../../../../lib/auth";

// PATCH — opdater status på henvendelse (ny / set / arkiveret)
export async function PATCH(request, { params }) {
  const cookie = request.cookies.get(COOKIE_NAME);
  const employeeId = cookie ? employeeIdFromCookie(cookie.value) : null;
  if (!employeeId || !getEmployeeById(employeeId)) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  try {
    const { id } = params;
    const { status } = await request.json();

    if (!["ny", "set", "arkiveret"].includes(status)) {
      return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
    }

    const updated = updateInquiryStatus(id, status);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[inquiries PATCH]", err);
    return NextResponse.json({ error: err.message || "Intern fejl" }, { status: 500 });
  }
}
