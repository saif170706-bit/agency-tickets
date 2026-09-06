import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../lib/session";
import { selfTest } from "../../../../lib/claudeCheck";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Diagnose: virker Claude-opslaget overhovedet på serveren? Uden det her er
// eneste symptom at en søgning står stille, fordi fejlen kun havner i
// serverloggen.
export async function GET(request) {
  const token = process.env.LEADS_API_TOKEN;
  const header = request.headers.get("authorization") || "";
  const authed = (token && header === `Bearer ${token}`) || (() => {
    try {
      return Boolean(getCurrentEmployee());
    } catch {
      return false;
    }
  })();
  if (!authed) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });

  return NextResponse.json(await selfTest());
}
