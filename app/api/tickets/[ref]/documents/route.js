import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { saveDocument, listDocuments } from "../../../../../lib/documents";
import { getTicketByRef } from "../../../../../lib/tickets";

const MAX_SIZE = 80 * 1024 * 1024; // 80 MB, som i referencen

export async function GET(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const data = getTicketByRef(params.ref);
  if (!data) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });
  return NextResponse.json({ documents: listDocuments(data.ticket.id) });
}

export async function POST(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Ingen fil modtaget" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Filen er for stor (maks 80 MB)" }, { status: 400 });
  }

  try {
    const doc = await saveDocument(params.ref, file, employee);
    return NextResponse.json({ ok: true, doc });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
