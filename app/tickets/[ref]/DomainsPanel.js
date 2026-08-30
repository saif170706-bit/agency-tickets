"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REGISTRARS = ["HurraDNS", "Nordicway", "Punktum dk (direkte)", "Andet"];

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function RenewalBadge({ renewalDate }) {
  const days = daysUntil(renewalDate);
  let cls = "status-pill is-open";
  let label = `Fornyes ${renewalDate}`;
  if (days < 0) {
    cls = "status-pill is-closed";
    label = "Udløbet";
  } else if (days <= 30) {
    cls = "status-pill";
    label = `Fornyes om ${days} dage`;
  }
  return (
    <span
      className={cls}
      style={days >= 0 && days <= 30 ? { background: "#f6ecd9", color: "#8a6a34" } : undefined}
    >
      <span className="dot" />
      {label}
    </span>
  );
}

function DomainForm({ ticket, initial, onCancel, onSaved }) {
  const [domainName, setDomainName] = useState(initial?.domainName || "");
  const [registrar, setRegistrar] = useState(initial?.registrar || "HurraDNS");
  const [registeredToName, setRegisteredToName] = useState(initial?.registeredToName || ticket.customer.name || "");
  const [registeredToCvr, setRegisteredToCvr] = useState(initial?.registeredToCvr || ticket.customer.cvr || "");
  const [registeredAt, setRegisteredAt] = useState(initial?.registeredAt || new Date().toISOString().slice(0, 10));
  const [renewalDate, setRenewalDate] = useState(initial?.renewalDate || "");
  const [costPrice, setCostPrice] = useState(initial?.costPrice ?? 99);
  const [customerPrice, setCustomerPrice] = useState(initial?.customerPrice ?? 249);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const url = initial ? `/api/tickets/${ticket.ref}/domains/${initial.id}` : `/api/tickets/${ticket.ref}/domains`;
    const res = await fetch(url, {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domainName,
        registrar,
        registeredToName,
        registeredToCvr,
        registeredAt,
        renewalDate: renewalDate || undefined,
        costPrice,
        customerPrice,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Kunne ikke gemme domænet.");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={submit} className="panel mb-5">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Domænenavn</label>
          <input className="input !bg-white" placeholder="dinvirksomhed.dk" value={domainName} onChange={(e) => setDomainName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Registrar</label>
          <select className="input !bg-white" value={registrar} onChange={(e) => setRegistrar(e.target.value)}>
            {REGISTRARS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Registreret til (navn)</label>
          <input className="input !bg-white" value={registeredToName} onChange={(e) => setRegisteredToName(e.target.value)} />
        </div>
        <div>
          <label className="label">CVR</label>
          <input className="input !bg-white" value={registeredToCvr} onChange={(e) => setRegisteredToCvr(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Registreringsdato</label>
          <input type="date" className="input !bg-white" value={registeredAt} onChange={(e) => setRegisteredAt(e.target.value)} required />
        </div>
        <div>
          <label className="label">Fornyelsesdato (valgfri — default +1 år)</label>
          <input type="date" className="input !bg-white" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="label">Kostpris (kr/år)</label>
          <input type="number" className="input !bg-white" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
        </div>
        <div>
          <label className="label">Kunden betaler (kr/år)</label>
          <input type="number" className="input !bg-white" value={customerPrice} onChange={(e) => setCustomerPrice(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="btn btn-outline !text-xs">Annullér</button>
        <button type="submit" disabled={loading} className="btn btn-primary !text-xs">
          {loading ? "Gemmer…" : "Gem domæne"}
        </button>
      </div>
    </form>
  );
}

export default function DomainsPanel({ ticket, domains, onChanged }) {
  const router = useRouter();
  const refresh = onChanged || (() => router.refresh());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function remove(id, name) {
    if (!confirm(`Fjern domænet "${name}" fra sagen?`)) return;
    await fetch(`/api/tickets/${ticket.ref}/domains/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-sans text-lg text-dark">Domæner</h2>
        {!open && !editing && (
          <button onClick={() => setOpen(true)} className="btn btn-outline !text-xs !py-2">+ Registrér domæne</button>
        )}
      </div>

      {open && (
        <DomainForm
          ticket={ticket}
          onCancel={() => setOpen(false)}
          onSaved={() => { setOpen(false); refresh(); }}
        />
      )}

      {editing && (
        <DomainForm
          ticket={ticket}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}

      {domains.length === 0 ? (
        <p className="text-muted text-sm">Ingen domæner registreret på denne sag endnu.</p>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <div key={d.id} className="panel">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-dark font-semibold">{d.domainName}</span>
                    <RenewalBadge renewalDate={d.renewalDate} />
                  </div>
                  <p className="text-xs text-muted">
                    {d.registrar} · Registreret til {d.registeredToName}{d.registeredToCvr ? ` (CVR ${d.registeredToCvr})` : ""}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Kostpris {d.costPrice} kr · Kunden betaler {d.customerPrice} kr · Registreret {d.registeredAt}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(d)} className="text-xs text-dark underline">Redigér</button>
                  <button onClick={() => remove(d.id, d.domainName)} className="text-muted hover:text-danger text-sm">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
