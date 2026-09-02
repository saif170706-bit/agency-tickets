import { notFound } from "next/navigation";
import { getTicketByRef, SUPPORT_STATUSES } from "../../../lib/tickets";

const COMPANY_NAME = process.env.COMPANY_NAME || "BuildOne";
const CONTACT_URL = "https://buildone.dk/kontakt";

const TYPE_LABELS = {
  support: "Support / rettelse",
  vedligeholdelse: "Vedligeholdelse",
  byggeri: "Nyt hjemmesidebyggeri",
  opdatering: "Hjemmeside opdatering",
  build: "Hjemmeside byggeri",
};

const ROADMAP_TYPES = ["build", "byggeri", "opdatering"];

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// Find dato for hvert trin fra logs
function buildStepDates(logs, steps) {
  const dates = {};
  for (const log of logs) {
    if (log.meta?.type === "status" && log.meta?.to) {
      const idx = steps.indexOf(log.meta.to);
      if (idx !== -1 && !dates[idx]) {
        dates[idx] = log.createdAt;
      }
    }
  }
  return dates;
}

export default function TrackingPage({ params }) {
  const data = getTicketByRef(params.ref);
  if (!data) notFound();
  const { ticket, logs } = data;

  const isRoadmap = ROADMAP_TYPES.includes(ticket.type);
  const steps = isRoadmap
    ? ticket.roadmap.map((s) => s.label)
    : SUPPORT_STATUSES;

  const currentIndex = isRoadmap
    ? ticket.roadmap.findIndex((s) => s.id === ticket.currentStepId)
    : SUPPORT_STATUSES.indexOf(ticket.statusLabel);

  const stepDates = buildStepDates(logs || [], steps);
  // Første trin har altid oprettelsesdatoen
  if (!stepDates[0]) stepDates[0] = ticket.createdAt;

  const currentLabel = ticket.isClosed ? "Sagen er afsluttet" : (steps[currentIndex] || ticket.statusLabel);
  const typeLabel = TYPE_LABELS[ticket.type] || ticket.type;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f3f3", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 60px" }}>

        {/* Status banner — ren og professionel */}
        <div style={{
          background: "#fff",
          borderRadius: 10,
          padding: "20px 24px",
          marginBottom: 16,
          borderLeft: `4px solid ${ticket.isClosed ? "#6b8a8c" : "#003135"}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9db3b5" }}>
            {ticket.isClosed ? "Afsluttet" : "Aktuel status"}
          </p>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#1a2e2e", lineHeight: 1.4 }}>
            {currentLabel}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6b8a8c", lineHeight: 1.5 }}>
            {ticket.isClosed
              ? `Sagen er afsluttet. Kontakt os hvis du har spørgsmål.`
              : `Vi arbejder på din sag. Siden opdateres løbende.`}
          </p>
        </div>

        {/* Tidslinje */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,49,53,0.07)" }}>
          <p style={{ margin: "0 0 20px", fontWeight: 700, fontSize: 15, color: "#003135" }}>Status</p>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {steps.map((label, i) => {
              const done = i < currentIndex || (ticket.isClosed && i <= currentIndex);
              const isCurrent = i === currentIndex && !ticket.isClosed;
              const isLast = i === steps.length - 1;
              const date = stepDates[i] ? formatDate(stepDates[i]) : null;

              return (
                <li key={label} style={{ display: "flex", gap: 14, position: "relative" }}>
                  {/* Linje */}
                  {!isLast && (
                    <div style={{
                      position: "absolute", left: 11, top: 24, bottom: 0,
                      width: 2,
                      background: done ? "#24d9a4" : "#e0ecea",
                    }} />
                  )}
                  {/* Cirkel */}
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, zIndex: 1,
                    background: done ? "#24d9a4" : isCurrent ? "#003135" : "#e0ecea",
                    color: done ? "#003135" : isCurrent ? "#fff" : "#8aa5a8",
                    border: isCurrent ? "2px solid #003135" : "none",
                    marginTop: 2,
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  {/* Tekst */}
                  <div style={{ paddingBottom: isLast ? 0 : 24, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <p style={{
                        margin: 0, fontSize: 14,
                        fontWeight: isCurrent || done ? 600 : 400,
                        color: isCurrent ? "#003135" : done ? "#003135" : "#8aa5a8",
                      }}>{label}</p>
                      {date && (
                        <span style={{ fontSize: 12, color: "#8aa5a8", whiteSpace: "nowrap" }}>{date}</span>
                      )}
                    </div>
                    {isCurrent && (
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "#24d9a4", fontWeight: 700 }}>Vi er her nu</p>
                    )}
                    {/* Sub-trin hierarkisk under "i gang"-trinnet */}
                    {isCurrent && !isRoadmap && ticket.subSteps?.length > 0 && (
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        {ticket.subSteps.map((step) => (
                          <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                              background: step.done ? "#24d9a4" : "#e0ecea",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 700,
                              color: step.done ? "#003135" : "#8aa5a8",
                            }}>{step.done ? "✓" : ""}</div>
                            <span style={{
                              fontSize: 13,
                              color: step.done ? "#8aa5a8" : "#003135",
                              textDecoration: step.done ? "line-through" : "none",
                              fontWeight: step.done ? 400 : 500,
                            }}>{step.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>


        {/* Sagsdetaljer */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,49,53,0.07)" }}>
          <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 15, color: "#003135" }}>Sagsdetaljer</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "SAGSNUMMER", value: ticket.ref },
              { label: "SAGSTYPE", value: typeLabel },
              { label: "SAG OPRETTET", value: formatDate(ticket.createdAt) },
              { label: "SIDST OPDATERET", value: formatDate(ticket.updatedAt) },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: "#f4f7f6", borderRadius: 8, padding: "12px 16px",
              }}>
                <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#8aa5a8" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#003135" }}>{value || "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Kontakt */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#8aa5a8" }}>
            Har du spørgsmål til din sag?
          </p>
          <a href={CONTACT_URL} style={{
            display: "inline-block",
            background: "#003135", color: "#fff",
            textDecoration: "none", fontWeight: 700,
            fontSize: 14, padding: "12px 28px", borderRadius: 8,
          }}>
            Kontakt os
          </a>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e0ecea", padding: "20px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 12, color: "#8aa5a8" }}>© {new Date().getFullYear()} {COMPANY_NAME}</p>
      </footer>
    </div>
  );
}
