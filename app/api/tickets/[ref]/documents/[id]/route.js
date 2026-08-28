import { NextResponse } from "next/server";
import fs from "fs";
import { getCurrentEmployee } from "../../../../../../lib/session";
import { getDocument, deleteDocument } from "../../../../../../lib/documents";

export async function GET(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const result = getDocument(params.ref, params.id);
  if (!result) return NextResponse.json({ error: "Dokument ikke fundet" }, { status: 404 });

  const buffer = fs.readFileSync(result.filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": result.doc.contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(result.doc.originalName)}"`,
    },
  });
}

export async function DELETE(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  try {
    deleteDocument(params.ref, params.id, employee);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
