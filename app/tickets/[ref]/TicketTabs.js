"use client";

import { useState } from "react";
import StatusControl from "./StatusControl";
import NotesPanel from "./NotesPanel";
import SecretNotesPanel from "./SecretNotesPanel";
import LogPanel from "./LogPanel";
import DocumentsPanel from "./DocumentsPanel";
import DomainsPanel from "./DomainsPanel";

export default function TicketTabs({ ticket, notes, secretNotes, logs, documents = [], domains = [], onChanged }) {
  const [tab, setTab] = useState("service");

  return (
    <div>
      <div className="tabbar">
        <button className={tab === "service" ? "active" : ""} onClick={() => setTab("service")}>
          Service
        </button>
        <button className={tab === "domains" ? "active" : ""} onClick={() => setTab("domains")}>
          Domæner
          {domains.length > 0 && <span className="count">{domains.length}</span>}
        </button>
        <button className={tab === "secret" ? "active" : ""} onClick={() => setTab("secret")}>
          Følsomme oplysninger
          {secretNotes.length > 0 && <span className="count">{secretNotes.length}</span>}
        </button>
        <button className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}>
          Dokumenter
          {documents.length > 0 && <span className="count">{documents.length}</span>}
        </button>
        <button className={tab === "log" ? "active" : ""} onClick={() => setTab("log")}>
          Log
        </button>
      </div>

      {tab === "service" && (
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-8">
            {ticket.description && (
              <div>
                <h2 className="font-sans text-lg text-dark mb-3">Beskrivelse</h2>
                <div className="panel">
                  <p className="text-sm text-dark whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </div>
            )}
            <NotesPanel ticket={ticket} notes={notes} onChanged={onChanged} />
          </div>
          <div>
            <StatusControl ticket={ticket} onChanged={onChanged} />
          </div>
        </div>
      )}

      {tab === "domains" && (
        <DomainsPanel ticket={ticket} domains={domains} onChanged={onChanged} />
      )}

      {tab === "secret" && (
        <SecretNotesPanel ticket={ticket} secretNotes={secretNotes} onChanged={onChanged} />
      )}

      {tab === "documents" && (
        <DocumentsPanel ticket={ticket} documents={documents} onChanged={onChanged} />
      )}

      {tab === "log" && <LogPanel logs={logs} />}
    </div>
  );
}
