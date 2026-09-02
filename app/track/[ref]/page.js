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
    <div style={{ minHeight: "100vh", background: "#f4f7f6", fontFamily: "Arial, sans-serif" }}>

      {/* Header */}
      <header style={{ background: "#003135", borderBottom: "1px solid #002529" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px", height: 64, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#24d9a4", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#003135",
          }}>B</div>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{COMPANY_NAME}</span>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* Aktuel status banner */}
        <div style={{
          background: ticket.isClosed ? "#003135" : "#003135",
          borderRadius: 12, padding: "24px 24px",
          marginBottom: 20,
          display: "flex", alignItems: "flex-start", gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: "#24d9a4",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
          }}>
            {ticket.isClosed ? "✓" : "⚙"}
          </div>
          <div>
            <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              {ticket.isClosed ? "Afsluttet" : "Aktuel status"}
            </p>
            <p style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
              {currentLabel}
            </p>
          </div>
        </div>

        {/* Statusbeskrivelse */}
        <div style={{
          background: "#e8f5f0", border: "1px solid #b8ddd5",
          borderRadius: 10, padding: "14px 18px", marginBottom: 20,
          fontSize: 14, color: "#2d5a52", lineHeight: 1.6,
        }}>
          {ticket.isClosed
            ? `Din sag er afsluttet. Tak fordi du valgte ${COMPANY_NAME}. Har du spørgsmål, er du altid velkommen til at kontakte os.`
            : `Vi arbejder på din sag. Du kan følge forløbet herunder — siden opdateres løbende.`}
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
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Under-trin (vises kun når sagen er "i gang") */}
        {ticket.statusLabel === "Arbejde på henvendelse er i gang" && !ticket.isClosed && ticket.subSteps?.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,49,53,0.07)" }}>
            <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 15, color: "#003135" }}>Vi arbejder på</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ticket.subSteps.map((step) => (
                <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: step.done ? "#24d9a4" : "#e0ecea",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: step.done ? "#003135" : "#8aa5a8",
                  }}>{step.done ? "✓" : ""}</div>
                  <span style={{ fontSize: 14, color: step.done ? "#8aa5a8" : "#003135", textDecoration: step.done ? "line-through" : "none" }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
