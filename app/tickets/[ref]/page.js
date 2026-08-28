import { notFound } from "next/navigation";
import { getTicketByRef } from "../../../lib/tickets";
import { listDocuments } from "../../../lib/documents";
import { listDomainsForTicket } from "../../../lib/domains";
import { trackingUrl } from "../../../lib/notify";
import TicketDetailView from "./TicketDetailView";

export default function TicketDetailPage({ params }) {
  const data = getTicketByRef(params.ref);
  if (!data) notFound();
  const { ticket, notes, secretNotes, logs } = data;
  const documents = listDocuments(ticket.id);
  const domains = listDomainsForTicket(ticket.id);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <TicketDetailView
        ticket={ticket}
        notes={notes}
        secretNotes={secretNotes}
        logs={logs}
        documents={documents}
        domains={domains}
        trackingUrl={trackingUrl(ticket.ref)}
      />
    </div>
  );
}
