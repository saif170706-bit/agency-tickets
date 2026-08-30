"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";

function readMode() {
  try { return localStorage.getItem("nordlys_mode") || "alt"; } catch { return "alt"; }
}

function StatCard({ label, count, href, sub }) {
  return (
    <Link href={href} className="card p-6 hover:border-dark transition-colors block">
      <div className="text-sm font-semibold text-dark mb-8">{label}</div>
      <div className="font-sans text-4xl text-accent">{count}</div>
      {sub && <div className="text-xs text-muted mt-2">{sub}</div>}
    </Link>
  );
}

export default function DashboardClient({ employee, mineStats, ticketStats }) {
  // useLayoutEffect kører synkront INDEN browseren maler → ingen flash
  const [mode, setMode] = useState("alt");

  useLayoutEffect(() => {
    setMode(readMode());
    function handler() { setMode(readMode()); }
    window.addEventListener("nordlys_mode_change", handler);
    return () => window.removeEventListener("nordlys_mode_change", handler);
  }, []);

  const isSaelger = mode === "saelger";
  const isSupport = mode === "support";

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <h1 className="font-sans text-3xl text-dark mb-1">Dashboard</h1>
          <p className="text-muted text-sm">Velkommen, {employee.name}.</p>
        </div>
        {/* Workspace-knapper skjult i sælger-mode */}
        {!isSaelger && (
          <div className="flex gap-3">
            <Link href="/workspace" className="btn btn-outline">Åbn workspace</Link>
            <Link href="/tickets/new" title="Ny sag" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "44px", height: "44px", borderRadius: "50%",
              background: "#003135", color: "#fff",
              fontSize: "1.6rem", fontWeight: 700, lineHeight: 1,
            }}>+</Link>
          </div>
        )}
      </div>

      {/* Kunder & økonomi — KUN i sælger- og alt-mode, IKKE support */}
      {!isSupport && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
            Dine salg & økonomi
          </h2>
          <div className="grid grid-cols-4 gap-5 mb-10">
            <StatCard label="Mine aktive kunder" count={mineStats.aktive} href="/kunder?status=aktiv" sub="med abonnement" />
            <StatCard label="Potentielle" count={mineStats.potentielle} href="/kunder?status=potentiel" sub="ikke aktiveret endnu" />
            <StatCard label="Min MRR" count={`${mineStats.mrr.toLocaleString("da-DK")} kr`} href="/salg" sub="månedlig omsætning" />
            <StatCard label="Min ARR" count={`${(mineStats.mrr * 12).toLocaleString("da-DK")} kr`} href="/salg" sub="annualiseret" />
          </div>
        </>
      )}

      {/* Sager — KUN i support- og alt-mode, IKKE sælger */}
      {!isSaelger && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Sager</h2>
          <div className="grid grid-cols-4 gap-5 mb-12">
            <StatCard label="Alle åbne sager" count={ticketStats.totalActive} href="/workspace" />
            <StatCard label="Support-sager" count={ticketStats.totalSupport} href="/workspace" />
            <StatCard label="Byggerier" count={ticketStats.totalBuild} href="/workspace" />
            <StatCard label="Lukkede / arkiv" count={ticketStats.totalClosed} href="/workspace" />
          </div>

          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Status i aktive sager</h2>
          {ticketStats.statusCards.length === 0 ? (
            <p className="text-muted text-sm">Ingen aktive sager endnu.</p>
          ) : (
            <div className="grid grid-cols-4 gap-5">
              {ticketStats.statusCards.map((s) => (
                <StatCard key={s.label} label={s.label} count={s.count} href="/workspace" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
