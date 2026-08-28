import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../lib/session";
import { searchCvr } from "../../../../lib/cvr";
import { getSavedCvrNumbers } from "../../../../lib/leads";

export async function POST(request) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const params = await request.json();

  // Skjul virksomheder der allerede er gemt som leads, medmindre man aktivt
  // har bedt om at se dem igen (fx for at dobbelttjekke noget).
  const excludeCvrNumbers = params.includeAlreadySaved ? undefined : getSavedCvrNumbers();

  try {
    const data = await searchCvr({ ...params, excludeCvrNumbers });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
