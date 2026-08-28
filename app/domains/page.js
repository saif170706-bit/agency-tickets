"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DomainsOverviewPage() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/domains")
      .then((r) => r.json())
      .then((d) => setDomains(d.domains || []))
      .finally(() => setLoading(false));
  }, []);

  const expiringSoon = domains.filter((d) => daysUntil(d.renewalDate) <= 30);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl text-navy mb-1">Domæner</h1>
      <p className="text-muted text-sm mb-8">
        Overblik over alle domæner registreret til kunder, sorteret efter fornyelsesdato.
      </p>

      {expiringSoon.length > 0 && (
        <div className="panel mb-8" style={{ background: "#f6ecd9" }}>
          <p className="text-sm text-navy">
            ⚠️ <b>{expiringSoon.length}</b> domæne{expiringSoon.length > 1 ? "r" : ""} skal fornyes inden for 30 dage.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Indlæser…</p>
      ) : domains.length === 0 ? (
        <p className="text-muted text-sm">Ingen domæner registreret endnu. Tilføj et under en sags "Domæner"-fane.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bgalt text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Domæne</th>
                <th className="px-4 py-3 font-semibold">Kunde</th>
                <th className="px-4 py-3 font-semibold">Registrar</th>
                <th className="px-4 py-3 font-semibold">Fornyes</th>
                <th className="px-4 py-3 font-semibold">Kostpris</th>
                <th className="px-4 py-3 font-semibold">Kunden betaler</th>
                <th className="px-4 py-3 font-semibold">Sag</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => {
                const days = daysUntil(d.renewalDate);
                const soon = days <= 30;
                return (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-navy font-medium">{d.domainName}</td>
                    <td className="px-4 py-3 text-muted">{d.customerName || d.registeredToName}</td>
                    <td className="px-4 py-3 text-muted">{d.registrar}</td>
                    <td className="px-4 py-3">
                      <span className={soon ? "text-accent font-semibold" : "text-muted"}>
                        {d.renewalDate} {days < 0 ? "(udløbet)" : soon ? `(${days} dage)` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{d.costPrice} kr</td>
                    <td className="px-4 py-3 text-muted">{d.customerPrice} kr</td>
                    <td className="px-4 py-3">
                      {d.ticketRef && (
                        <Link href={`/tickets/${d.ticketRef}`} className="text-navy underline text-xs">
                          {d.ticketRef}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
