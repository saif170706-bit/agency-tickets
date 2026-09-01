"use client";

import TicketTabs from "./TicketTabs";
import CloseButton from "./CloseButton";

function InfoRow({ label, value, href }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted">{label}</span>
      {href ? (
        <a href={href} className="text-dark font-medium">{value}</a>
      ) : (
        <span className="text-dark font-medium">{value}</span>
      )}
    </div>
  );
}

export default function TicketDetailView({ ticket, notes, secretNotes, logs, documents, domains, trackingUrl, onChanged, compact = false }) {
  return (
    <div>
      <div className={`grid ${compact ? "grid-cols-1" : "grid-cols-2"} gap-6 mb-10`}>
        <div className="card p-7">
          <h3 className="font-sans text-lg text-dark mb-4">{ticket.customer.name}</h3>
          <InfoRow label="Telefon" value={ticket.customer.phone} href={`tel:${ticket.customer.phone}`} />
          <InfoRow label="E-mail" value={ticket.customer.email} href={`mailto:${ticket.customer.email}`} />
          <InfoRow label="Adresse" value={ticket.customer.address} />
          <InfoRow label="CVR" value={ticket.customer.cvr} />
        </div>

        <div className="card p-7">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-sans text-lg text-dark">Sag – {ticket.ref}</h3>
            <span className={`status-pill ${ticket.isClosed ? "is-closed" : "is-open"}`}>
              <span className="dot" />
              {ticket.isClosed ? "Lukket" : ticket.statusLabel}
            </span>
          </div>
          <InfoRow label="Type" value={{ build: "Hjemmeside byggeri", byggeri: "Hjemmeside byggeri", opdatering: "Hjemmeside opdatering", support: "Support / rettelse", vedligeholdelse: "Vedligeholdelse" }[ticket.type] || ticket.type} />
          <InfoRow label="Oprettet" value={new Date(ticket.createdAt).toLocaleString("da-DK")} />
          <InfoRow label="Kundens statusside" value="Åbn link" href={trackingUrl} />
          <div className="pt-4">
            <CloseButton ticket={ticket} onChanged={onChanged} />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="font-sans text-2xl text-dark">{ticket.title}</h1>
      </div>

      <TicketTabs
        ticket={ticket}
        notes={notes}
        secretNotes={secretNotes}
        logs={logs}
        documents={documents}
        domains={domains}
        onChanged={onChanged}
      />
    </div>
  );
}
