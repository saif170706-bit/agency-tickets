"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import TicketDetailView from "../tickets/[ref]/TicketDetailView";

function TicketListItem({ t, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-border transition-colors ${
        active ? "bg-bgalt border-l-4 border-l-navy" : "hover:bg-bgalt/60"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-sans text-dark text-[0.98rem] truncate">{t.customer.name}</span>
      </div>
      <div className="text-xs text-muted mb-1">
        {{ build: "Byggeri", byggeri: "Byggeri", opdatering: "Opdatering", support: "Support", vedligeholdelse: "Vedligeholdelse" }[t.type] || t.type} · {t.ref}
        {t.isClosed && " · Lukket"}
      </div>
      <div className="text-sm text-dark font-medium truncate mb-1">{t.title}</div>
      <div className="text-xs text-accent">{t.statusLabel}</div>
    </button>
  );
}

export default function WorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [view, setView] = useState("active");
  const [tickets, setTickets] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedRef, setSelectedRef] = useState(searchParams.get("ref"));
  const [detail, setDetail] = useState(null);
  const [initialDetailLoading, setInitialDetailLoading] = useState(true);

  const loadList = useCallback(async (archived) => {
    setLoadingList(true);
    const res = await fetch(`/api/tickets?archived=${archived ? "true" : "false"}`);
    const data = await res.json();
    setTickets(data.tickets || []);
    setLoadingList(false);
    return data.tickets || [];
  }, []);

  const loadSearch = useCallback(async (q) => {
    setLoadingList(true);
    const res = await fetch(`/api/tickets/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setTickets(data.tickets || []);
    setLoadingList(false);
    return data.tickets || [];
  }, []);

  // ref-parameter fjernes stille fra url'en efter første indlæsning
  const loadDetail = useCallback(async (ref, { silent = false } = {}) => {
    if (!ref) {
      setDetail(null);
      setInitialDetailLoading(false);
      return;
    }
    if (!silent) setInitialDetailLoading(true);
    const res = await fetch(`/api/tickets/${ref}`);
    if (res.ok) {
      setDetail(await res.json());
    } else if (!silent) {
      setDetail(null);
    }
    setInitialDetailLoading(false);
  }, []);

  useEffect(() => {
    const loader = query ? loadSearch(query) : loadList(view === "archived");
    loader.then((list) => {
      if (!selectedRef && list.length > 0) {
        setSelectedRef(list[0].ref);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, query]);

  useEffect(() => {
    loadDetail(selectedRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRef]);

  function selectTicket(ref) {
    setSelectedRef(ref);
    const suffix = query ? `&q=${encodeURIComponent(query)}` : "";
    router.replace(`/workspace?ref=${ref}${suffix}`, { scroll: false });
  }

  // Baggrundsopdatering efter en mutation (note, status, luk osv.) — beholder
  // den valgte sag og fane synlige i stedet for at skifte til en loading-tekst.
  async function refreshAll() {
    const list = await (query ? loadSearch(query) : loadList(view === "archived"));
    await loadDetail(selectedRef, { silent: true });
    if (!query && selectedRef && !list.find((t) => t.ref === selectedRef)) {
      const other = await loadList(view !== "archived");
      if (other.length) selectTicket(other[0].ref);
    }
  }

  return (
    <div className="flex" style={{ height: "calc(100vh - 65px)" }}>
      {/* Sidebar */}
      <div className="w-[320px] shrink-0 border-r border-border bg-surface overflow-y-auto">
        {query ? (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bgalt">
            <span className="text-xs text-muted truncate">Søgning: “{query}”</span>
            <Link href="/workspace" className="text-xs text-dark underline shrink-0 ml-2">
              Ryd
            </Link>
          </div>
        ) : (
          <div className="flex border-b border-border">
            <button
              onClick={() => {
                setView("active");
                setSelectedRef(null);
              }}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide ${
                view === "active" ? "text-dark border-b-2 border-dark" : "text-muted"
              }`}
            >
              Aktive
            </button>
            <button
              onClick={() => {
                setView("archived");
                setSelectedRef(null);
              }}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide ${
                view === "archived" ? "text-dark border-b-2 border-dark" : "text-muted"
              }`}
            >
              Lukkede
            </button>
          </div>
        )}

        {loadingList ? (
          <p className="text-muted text-sm p-4">Indlæser…</p>
        ) : tickets.length === 0 ? (
          <p className="text-muted text-sm p-4">
            {query ? "Ingen sager matcher søgningen." : "Ingen sager."}
          </p>
        ) : (
          tickets.map((t) => (
            <TicketListItem
              key={t.id}
              t={t}
              active={t.ref === selectedRef}
              onClick={() => selectTicket(t.ref)}
            />
          ))
        )}
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {initialDetailLoading ? (
            <p className="text-muted text-sm">Indlæser sag…</p>
          ) : !detail ? (
            <p className="text-muted text-sm">Vælg en sag i listen til venstre.</p>
          ) : (
            <TicketDetailView
              ticket={detail.ticket}
              notes={detail.notes}
              secretNotes={detail.secretNotes}
              logs={detail.logs}
              documents={detail.documents}
              domains={detail.domains}
              trackingUrl={`/track/${detail.ticket.ref}`}
              onChanged={refreshAll}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}
