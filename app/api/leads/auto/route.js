import { getCurrentEmployee } from "../../../../lib/session";
import { autoDiscoverLeads } from "../../../../lib/autoLeads";

export const dynamic = "force-dynamic";
export const maxDuration = 3600;

// Søgningen kan tage mange minutter: den bliver ved indtil målet af leads er
// nået, og hvert net-opslag koster en halv snes sekunder. Derfor svares der
// ikke med ét JSON-svar til sidst, men med en strøm af linjer undervejs.
// Uden den ville forbindelsen ligge tavs og blive lukket af browseren eller
// af Railway længe før søgningen var færdig.
export async function POST(request) {
  const employee = getCurrentEmployee();
  if (!employee) {
    return new Response(JSON.stringify({ error: "Ikke logget ind" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { brancheQueries, postnummer, target } = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const result = await autoDiscoverLeads(
          {
            brancheQueries,
            postnummer,
            target: Math.min(Math.max(Number(target) || 15, 1), 50),
          },
          employee,
          (p) => send({ type: "progress", ...p })
        );
        send({ type: "done", ...result });
      } catch (err) {
        send({ type: "error", error: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
