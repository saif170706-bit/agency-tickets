import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { drainVerificationQueue, isRunning } from "../../../../../lib/verifyQueue";
import { listVerificationQueue } from "../../../../../lib/leads";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

// Køen tømmes normalt af sig selv efter en søgning. Dette endpoint er til at
// sætte den i gang igen — manuelt fra leads-siden, eller fra et cron-job hvis
// noget blev liggende fordi et opslag fejlede.
function authorize(request) {
  const token = process.env.LEADS_API_TOKEN;
  const header = request.headers.get("authorization") || "";
  if (token && header === `Bearer ${token}`) return { name: "cron" };
  try {
    return getCurrentEmployee();
  } catch {
    return null;
  }
}

export async function GET(request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    running: isRunning(),
    queued: listVerificationQueue(200).length,
  });
}

export async function POST(request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }
  const result = await drainVerificationQueue({ limit: 50 });
  return NextResponse.json({ ok: true, ...result });
}
