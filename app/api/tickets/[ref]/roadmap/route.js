import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { updateRoadmapStep, addRoadmapStep } from "../../../../../lib/tickets";

export async function POST(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const body = await request.json();
  try {
    if (body.action === "setCurrent") {
      const ticket = updateRoadmapStep(params.ref, body.stepId, employee);
      return NextResponse.json({ ok: true, ticket });
    }
    if (body.action === "addStep") {
      if (!body.label || !body.label.trim()) {
        return NextResponse.json({ error: "Trin-navn mangler" }, { status: 400 });
      }
      const ticket = addRoadmapStep(params.ref, body.label.trim(), employee);
      return NextResponse.json({ ok: true, ticket });
    }
    return NextResponse.json({ error: "Ukendt handling" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
