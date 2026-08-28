import { notFound } from "next/navigation";
import { getTicketByRef, SUPPORT_STATUSES } from "../../../lib/tickets";

const COMPANY_NAME = process.env.COMPANY_NAME || "BuildOne";

export default function TrackingPage({ params }) {
  const data = getTicketByRef(params.ref);
  if (!data) notFound();
  const { ticket } = data;

  const steps = ticket.type === "support" ? SUPPORT_STATUSES : ticket.roadmap.map((s) => s.label);
  const currentIndex =
    ticket.type === "support"
      ? SUPPORT_STATUSES.indexOf(ticket.statusLabel)
      : ticket.roadmap.findIndex((s) => s.id === ticket.currentStepId);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-6 h-20 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full border border-navy flex items-center justify-center font-serif text-sm text-navy">N</span>
          <span className="font-serif text-lg text-navy">{COMPANY_NAME}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <span className="text-xs font-bold tracking-widest uppercase text-accent">
          Sagsnummer {ticket.ref}
        </span>
        <h1 className="font-serif text-3xl text-navy mt-3 mb-2">{ticket.title}</h1>
        <p className="text-muted mb-12">
          {ticket.isClosed
            ? "Denne sag er afsluttet."
            : "Følg status på din henvendelse herunder. Siden opdateres automatisk, når vi arbejder videre."}
        </p>

        <div className="card p-8">
          <ol className="space-y-0">
            {steps.map((label, i) => {
              const done = i < currentIndex || (ticket.isClosed && i <= currentIndex);
              const isCurrent = i === currentIndex && !ticket.isClosed;
              return (
                <li key={label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        done || isCurrent
                          ? "bg-navy text-white"
                          : "border border-border text-muted"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`w-px flex-1 min-h-[28px] ${done ? "bg-navy" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-8">
                    <p className={`font-medium ${isCurrent ? "text-navy" : done ? "text-navy" : "text-muted"}`}>
                      {label}
                    </p>
                    {isCurrent && <p className="text-xs text-accent mt-1">Vi er her nu</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="text-sm text-muted mt-10">
          Har du spørgsmål til din sag? Kontakt os og henvis til sagsnummer{" "}
          <span className="font-mono text-navy">{ticket.ref}</span>.
        </p>
      </main>
    </div>
  );
}
