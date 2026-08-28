"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Officielle DB07-branchekoder (Danmarks Statistiks nomenklatur), verificeret
// mod levende data — se lib/cvr.js for detaljer og kildekoder.
const SUGGESTED_BRANCHES = [
  { label: "Frisører & skønhedssaloner", branchekode: "962100" },
  { label: "Cafeer & restauranter", branchekode: "561110" },
  { label: "Tømrere & snedkere", branchekode: "433200" },
  { label: "Elektrikere", branchekode: "432100" },
  { label: "VVS-installatører", branchekode: "432200" },
  { label: "Malerfirmaer", branchekode: "433410" },
  { label: "Autoværksteder", branchekode: "953190" },
  { label: "Skønhedspleje & wellness", branchekode: "962200" },
  { label: "Detailhandel, specialforretninger", branchekode: "477800" },
  { label: "Fitnesscentre", branchekode: "931300" },
  { label: "Murerarbejde", branchekode: "439100" },
  { label: "Rengøringsfirmaer", branchekode: "812100" },
  { label: "Bedemandsforretninger", branchekode: "963000" },
  { label: "Fotografer", branchekode: "742000" },
  { label: "Tandlæger", branchekode: "862300" },
  { label: "Fysio- og ergoterapi", branchekode: "869500" },
  { label: "Alternativ behandling & massage", branchekode: "869600" },
  { label: "Grafisk design", branchekode: "741200" },
  { label: "Ejendomsmæglere", branchekode: "683110" },
  { label: "Dyrlæger", branchekode: "750000" },
];

const STATUSES = ["Ny", "Kontaktet", "Interesseret", "Afvist", "Konverteret"];

function ConvertModal({ lead, onClose, onDone }) {
  const [phone, setPhone] = useState(lead.telefon || "");
  const [email, setEmail] = useState(lead.email || "");
  const [type, setType] = useState("support");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/leads/${lead.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, email, type }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Kunne ikke oprette sag.");
      return;
    }
    onDone(data.ref);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card p-7 w-full max-w-md">
        <h3 className="font-serif text-lg text-navy mb-1">Konvertér til sag</h3>
        <p className="text-sm text-muted mb-5">{lead.navn} — CVR {lead.cvrNummer}</p>
        <form onSubmit={submit}>
          <div className="mb-4">
            <label className="label">Telefon (fra samtalen med kunden)</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="mb-4">
            <label className="label">E-mail</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="mb-5">
            <label className="label">Sagstype</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="support">Support / rettelse</option>
              <option value="build">Nyt hjemmesidebyggeri</option>
            </select>
          </div>
          {error && <p className="text-danger text-sm mb-4">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-outline flex-1">Annullér</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? "Opretter…" : "Opret sag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SearchTab() {
  const [branchekode, setBranchekode] = useState("");
  const [brancheTekst, setBrancheTekst] = useState("");
  const [postnummer, setPostnummer] = useState("");
  const [kunUdenReklamebeskyttelse, setKunUdenReklamebeskyttelse] = useState(true);
  const [includeAlreadySaved, setIncludeAlreadySaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  async function search(e) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    setSavedMsg("");
    const res = await fetch("/api/leads/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchekode: branchekode || undefined,
        brancheTekst: branchekode ? undefined : brancheTekst || undefined,
        postnummer: postnummer || undefined,
        kunUdenReklamebeskyttelse,
        kunAktive: true,
        includeAlreadySaved,
        size: 30,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Søgningen fejlede.");
      setResults(null);
      return;
    }
    setResults(data.results || []);
    setTotal(data.total || 0);
    setSelected(new Set());
  }

  function toggle(cvr) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(cvr)) next.delete(cvr);
      else next.add(cvr);
      return next;
    });
  }

  async function saveSelected(all) {
    const toSave = all ? results : results.filter((r) => selected.has(r.cvrNummer));
    if (!toSave.length) return;
    setSaving(true);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: toSave }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setSavedMsg(`Gemt ${data.added} nye lead(s)${data.skipped ? ` (${data.skipped} var allerede gemt)` : ""}.`);
      setSelected(new Set());
    }
  }

  return (
    <div>
      <form onSubmit={search} className="card p-6 mb-8">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Branche (præcis kode, anbefalet)</label>
            <select
              className="input"
              value={branchekode}
              onChange={(e) => {
                setBranchekode(e.target.value);
                if (e.target.value) setBrancheTekst("");
              }}
            >
              <option value="">— Vælg branche —</option>
              {SUGGESTED_BRANCHES.map((b) => (
                <option key={b.branchekode} value={b.branchekode}>{b.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Eller fritekst (mindre præcist)</label>
            <input
              className="input"
              placeholder="Fx: rengøring"
              value={brancheTekst}
              onChange={(e) => {
                setBrancheTekst(e.target.value);
                if (e.target.value) setBranchekode("");
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label">Postnummer</label>
            <input className="input" placeholder="Fx: 2920" value={postnummer} onChange={(e) => setPostnummer(e.target.value)} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-navy cursor-pointer">
              <input
                type="checkbox"
                checked={kunUdenReklamebeskyttelse}
                onChange={(e) => setKunUdenReklamebeskyttelse(e.target.checked)}
              />
              Vis kun virksomheder uden reklamebeskyttelse
            </label>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-navy cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={includeAlreadySaved}
            onChange={(e) => setIncludeAlreadySaved(e.target.checked)}
          />
          Vis også virksomheder jeg allerede har gemt som leads
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Søger…" : "Søg i CVR"}
        </button>
      </form>

      {error && (
        <div className="panel mb-6 !bg-[#f1e3e3]">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {results && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="text-sm text-muted">
              {results.length} resultat(er) vist (ud af {total} i alt).
            </p>
            <div className="flex gap-2 items-center">
              {savedMsg && <span className="text-xs text-accent">{savedMsg}</span>}
              <button
                onClick={() => saveSelected(false)}
                disabled={saving || selected.size === 0}
                className="btn btn-outline !text-xs !py-2"
              >
                Gem valgte ({selected.size})
              </button>
              <button
                onClick={() => saveSelected(true)}
                disabled={saving || results.length === 0}
                className="btn btn-primary !text-xs !py-2"
              >
                Gem alle
              </button>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bgalt text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-3"></th>
                  <th className="px-3 py-3 font-semibold">Firma</th>
                  <th className="px-3 py-3 font-semibold">CVR</th>
                  <th className="px-3 py-3 font-semibold">Branche</th>
                  <th className="px-3 py-3 font-semibold">Adresse</th>
                  <th className="px-3 py-3 font-semibold">Kontakt</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.cvrNummer} className="border-t border-border">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.cvrNummer)}
                        onChange={() => toggle(r.cvrNummer)}
                      />
                    </td>
                    <td className="px-3 py-3 text-navy font-medium">{r.navn}</td>
                    <td className="px-3 py-3 text-muted font-mono">{r.cvrNummer}</td>
                    <td className="px-3 py-3 text-muted">{r.branchetekst || r.branchekode || "—"}</td>
                    <td className="px-3 py-3 text-muted">
                      {r.vej}{r.vej && ", "}{r.postnummer} {r.by}
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {r.telefon || r.email ? (
                        <>
                          {r.telefon && <div>{r.telefon}</div>}
                          {r.email && <div>{r.email}</div>}
                        </>
                      ) : (
                        <span className="text-xs italic">Ikke i CVR</span>
                      )}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted">
                      Ingen resultater. Prøv en anden branche eller fjern postnummer-filteret.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SavedLeadsTab() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [convertLead, setConvertLead] = useState(null);
  const [convertedRef, setConvertedRef] = useState(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/leads${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function setStatus(id, status) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function removeLead(id) {
    if (!confirm("Slet dette lead?")) return;
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${statusFilter === "" ? "bg-navy text-white border-navy" : "border-border text-muted"}`}
          >
            Alle
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${statusFilter === s ? "bg-navy text-white border-navy" : "border-border text-muted"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Indlæser…</p>
      ) : leads.length === 0 ? (
        <p className="text-muted text-sm">Ingen gemte leads endnu — søg i CVR-fanen og gem nogle.</p>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-serif text-navy text-lg">{l.navn}</span>
                    <span className="text-xs text-muted font-mono">CVR {l.cvrNummer}</span>
                  </div>
                  <p className="text-sm text-muted">
                    {l.branchetekst || l.branchekode || "Ukendt branche"} · {l.vej}{l.vej && ", "}{l.postnummer} {l.by}
                  </p>
                  {(l.telefon || l.email) && (
                    <p className="text-sm text-muted mt-1">{l.telefon} {l.telefon && l.email && "·"} {l.email}</p>
                  )}
                  {l.source?.startsWith("auto") && (
                    <span className="inline-block mt-2 text-xs text-accent border border-accent rounded-full px-2 py-0.5">
                      🤖 Fundet automatisk — ingen hjemmeside
                    </span>
                  )}
                  {l.note && <p className="text-xs text-muted mt-2 italic">{l.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="input !py-2 !text-xs !w-auto"
                    value={l.status}
                    onChange={(e) => setStatus(l.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {l.status !== "Konverteret" && (
                    <button onClick={() => setConvertLead(l)} className="btn btn-primary !text-xs !py-2">
                      Konvertér til sag
                    </button>
                  )}
                  <button onClick={() => removeLead(l.id)} className="text-muted hover:text-danger text-sm">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {convertLead && (
        <ConvertModal
          lead={convertLead}
          onClose={() => setConvertLead(null)}
          onDone={(ref) => {
            setConvertLead(null);
            setConvertedRef(ref);
            load();
          }}
        />
      )}

      {convertedRef && (
        <div className="fixed bottom-6 right-6 card p-5 shadow-lg max-w-sm z-40">
          <p className="text-sm text-navy mb-3">Sag {convertedRef} oprettet — kunden er notificeret.</p>
          <div className="flex gap-2">
            <button onClick={() => setConvertedRef(null)} className="btn btn-outline !text-xs !py-2">Luk</button>
            <button onClick={() => router.push(`/tickets/${convertedRef}`)} className="btn btn-primary !text-xs !py-2">
              Åbn sag
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AutoTab({ onDone }) {
  const [selected, setSelected] = useState(new Set());
  const [postnummer, setPostnummer] = useState("");
  const [perBranche, setPerBranche] = useState(15);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function toggleBranche(query) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(query)) next.delete(query);
      else next.add(query);
      return next;
    });
  }

  async function run(e) {
    e.preventDefault();
    if (selected.size === 0) {
      setError("Vælg mindst én branche.");
      return;
    }
    setRunning(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/leads/auto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brancheQueries: Array.from(selected),
        postnummer: postnummer || undefined,
        perBranche: Number(perBranche) || 15,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setRunning(false);
    if (!res.ok) {
      setError(data.error || "Automatisk søgning fejlede.");
      return;
    }
    setResult(data);
    onDone?.();
  }

  return (
    <div>
      <div className="panel mb-6">
        <p className="text-sm text-navy">
          🤖 <b>Sådan virker det:</b> Vælg branche(r) nedenfor. Systemet henter aktive virksomheder fra CVR
          (uden reklamebeskyttelse), tjekker automatisk hver enkelt for en eksisterende hjemmeside, og gemmer
          <b> kun dem uden hjemmeside</b> som leads under "Gemte leads" — klar til jeres sælgere at kontakte.
        </p>
        <p className="text-xs text-muted mt-2">
          Bemærk: hjemmeside-tjekket er en automatisk vurdering (domænegætning + søgning), ikke 100% sikkert.
          Sælgere bør stadig lige tjekke selv, før de ringer.
        </p>
      </div>

      <form onSubmit={run} className="card p-6 mb-6">
        <label className="label mb-2 block">Vælg brancher</label>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {SUGGESTED_BRANCHES.map((b) => (
            <label key={b.branchekode} className="flex items-center gap-2 text-sm text-navy cursor-pointer">
              <input type="checkbox" checked={selected.has(b.branchekode)} onChange={() => toggleBranche(b.branchekode)} />
              {b.label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label">Postnummer (valgfrit)</label>
            <input className="input" placeholder="Fx: 2920" value={postnummer} onChange={(e) => setPostnummer(e.target.value)} />
          </div>
          <div>
            <label className="label">Antal pr. branche</label>
            <input
              type="number"
              min={5}
              max={50}
              className="input"
              value={perBranche}
              onChange={(e) => setPerBranche(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-danger text-sm mb-4">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={running}>
          {running ? "Kører — kan tage et minut…" : "Kør automatisk søgning"}
        </button>
      </form>

      {result && (
        <div className="panel">
          <p className="text-sm text-navy">
            Undersøgte <b>{result.candidatesChecked}</b> virksomheder — <b>{result.withoutWebsite}</b> uden
            hjemmeside blev fundet, {result.withWebsite} havde tilsyneladende allerede en side.
          </p>
          <p className="text-sm text-accent mt-2">
            {result.added} nye lead(s) gemt{result.skipped ? ` (${result.skipped} var allerede gemt fra før)` : ""}.
            Se dem under "Gemte leads".
          </p>
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const [tab, setTab] = useState("auto");

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl text-navy mb-1">Leads fra CVR</h1>
      <p className="text-muted text-sm mb-8">
        Find virksomheder, der matcher gode salgskandidater, og byg en liste til sælgerne.
      </p>

      <div className="tabbar">
        <button className={tab === "auto" ? "active" : ""} onClick={() => setTab("auto")}>
          Automatisk søgning
        </button>
        <button className={tab === "search" ? "active" : ""} onClick={() => setTab("search")}>
          Manuel søgning
        </button>
        <button className={tab === "saved" ? "active" : ""} onClick={() => setTab("saved")}>
          Gemte leads
        </button>
      </div>

      {tab === "auto" && <AutoTab onDone={() => {}} />}
      {tab === "search" && <SearchTab />}
      {tab === "saved" && <SavedLeadsTab />}
    </div>
  );
}
