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

const STATUS_COLOR = {
  Ny: { bg: "#f0f8f9", color: "#5a7a7d" },
  Kontaktet: { bg: "#e8f4ff", color: "#1a6abf" },
  Interesseret: { bg: "#e8fff0", color: "#1a7a47" },
  Afvist: { bg: "#fff0f0", color: "#8c2f2f" },
  Konverteret: { bg: "#e0f7f8", color: "#003135" },
};

// ---- StatusNote-modal — defineret UDEN FOR alle komponenter (undgår fokus-bug) ----
function StatusNoteModal({ lead, newStatus, onSave, onSkip, onCancel }) {
  const [note, setNote] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,49,53,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
      <div className="card" style={{ padding: "26px", maxWidth: "440px", width: "100%" }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#003135", marginBottom: "4px" }}>
          Status ændret → <span style={{ color: STATUS_COLOR[newStatus]?.color || "#003135" }}>{newStatus}</span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#5a7a7d", marginBottom: "14px" }}>
          Tilføj en note om hvad der skete — fx hvad kunden sagde, næste skridt osv.
        </p>
        <textarea
          autoFocus
          className="input"
          rows={4}
          placeholder={
            newStatus === "Kontaktet" ? "Fx: Ringet op kl. 14. Interesseret, vil have tilbud." :
            newStatus === "Interesseret" ? "Fx: Sendt tilbud på Standard-plan. Venter på svar." :
            newStatus === "Afvist" ? "Fx: Ikke interesseret nu, prøv igen om 6 måneder." :
            newStatus === "Konverteret" ? "Fx: Lukket salg — Standard 499 kr/md." :
            "Hvad skete der?"
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ marginBottom: "14px" }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onCancel} className="btn btn-outline" style={{ fontSize: "0.8rem" }}>Annuller</button>
          <button onClick={() => onSkip()} className="btn btn-outline" style={{ fontSize: "0.8rem", flex: 1 }}>Fortsæt uden note</button>
          <button
            onClick={() => note.trim() && onSave(note.trim())}
            disabled={!note.trim()}
            className="btn btn-primary"
            style={{ fontSize: "0.8rem", flex: 1, opacity: note.trim() ? 1 : 0.5 }}
          >
            Gem note
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- SletAlleModal ----
function SletAlleModal({ count, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,49,53,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
      <div className="card" style={{ padding: "24px", maxWidth: "380px", width: "100%" }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#003135", marginBottom: "6px" }}>Slet alle leads</div>
        <p style={{ fontSize: "0.82rem", color: "#5a7a7d", marginBottom: "20px" }}>
          Du er ved at slette alle <strong>{count}</strong> gemte leads permanent. Kan ikke fortrydes.
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Annuller</button>
          <button onClick={go} disabled={loading} style={{ flex: 1, padding: "9px", borderRadius: "3px", fontWeight: 600, fontSize: "0.83rem", cursor: "pointer", border: "none", background: "#8c2f2f", color: "#fff", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Sletter…" : "Slet alle"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConvertModal({ lead, onClose }) {
  const router = useRouter();

  function goToKundeForm() {
    const params = new URLSearchParams({
      navn: lead.navn || "",
      cvr: String(lead.cvrNummer || ""),
      telefon: lead.telefon || "",
      email: lead.email || "",
      adresse: [lead.vej, lead.postnummer && lead.by ? `${lead.postnummer} ${lead.by}` : ""].filter(Boolean).join(", "),
      leadId: lead.id,
    });
    router.push(`/kunder/ny?${params.toString()}`);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card p-7 w-full max-w-md">
        <h3 className="font-sans text-lg text-dark mb-1">Konvertér til kunde</h3>
        <p className="text-sm text-muted mb-5">{lead.navn} &nbsp;·&nbsp; CVR {lead.cvrNummer}</p>
        <p className="text-sm text-dark mb-6">
          Du sendes videre til kundeoprettelse hvor du kan udfylde alle oplysninger fra salgssamtalen — ønsker, kontaktperson, domæne og mere.
          <br /><br />
          Abonnementet aktiveres først når kunden betaler og går live.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn btn-outline flex-1">Annullér</button>
          <button onClick={goToKundeForm} className="btn btn-primary flex-1">
            Udfyld kundeprofil →
          </button>
        </div>
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
            <label className="flex items-center gap-2 text-sm text-dark cursor-pointer">
              <input
                type="checkbox"
                checked={kunUdenReklamebeskyttelse}
                onChange={(e) => setKunUdenReklamebeskyttelse(e.target.checked)}
              />
              Vis kun virksomheder uden reklamebeskyttelse
            </label>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-dark cursor-pointer mb-5">
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
                    <td className="px-3 py-3 text-dark font-medium">{r.navn}</td>
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
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("alle");
  const [convertLead, setConvertLead] = useState(null);
  // Status-note modal state
  const [pendingChange, setPendingChange] = useState(null); // { id, newStatus }
  // Slet-alle modal
  const [sletAlle, setSletAlle] = useState(false);

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

  // Kaldes fra dropdown — åbner note-modal i stedet for at ændre status direkte
  function onStatusDropdownChange(id, newStatus) {
    setPendingChange({ id, newStatus });
  }

  // Opdater ét lead i lokal state uden fuld reload — ingen scroll-jump
  function patchLocalLead(updatedLead) {
    setLeads((prev) => prev.map((l) => l.id === updatedLead.id ? updatedLead : l));
  }

  // Gem status + note (appendNote tilføjes til log-feltet i API)
  async function confirmStatusChange(appendNote) {
    if (!pendingChange) return;
    const { id, newStatus } = pendingChange;
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, ...(appendNote ? { appendNote } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.lead) patchLocalLead(data.lead);
    setPendingChange(null);
  }

  // Fortsæt uden note
  async function skipNote() {
    if (!pendingChange) return;
    const { id, newStatus } = pendingChange;
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.lead) patchLocalLead(data.lead);
    setPendingChange(null);
  }

  async function removeLead(id) {
    if (!confirm("Slet dette lead?")) return;
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    // Filtrer lokalt — ingen reload
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  async function deleteAll() {
    await fetch("/api/leads", { method: "DELETE" });
    setSletAlle(false);
    load();
  }

  const allLeads = leads;
  const filteredLeads = allLeads.filter((l) => {
    const hasContact = !!(l.telefon || l.email);
    if (contactFilter === "med") return hasContact;
    if (contactFilter === "uden") return !hasContact;
    return true;
  });

  return (
    <div>
      {/* Toolbar: filtre + slet alle */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Status filter */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button onClick={() => setStatusFilter("")} className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${statusFilter === "" ? "bg-dark text-white border-dark" : "border-border text-muted"}`}>Alle</button>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "4px 12px", fontSize: "0.72rem", fontWeight: 700, borderRadius: "20px",
                  border: `1.5px solid ${statusFilter === s ? STATUS_COLOR[s]?.color : "#cde4e6"}`,
                  background: statusFilter === s ? STATUS_COLOR[s]?.bg : "transparent",
                  color: statusFilter === s ? STATUS_COLOR[s]?.color : "#5a7a7d",
                  cursor: "pointer",
                }}
              >{s}</button>
            ))}
          </div>
          {/* Kontakt filter */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5a7a7d" }}>Kontaktinfo:</span>
            {[["alle", "Alle"], ["med", "Med kontakt"], ["uden", "Uden kontakt"]].map(([val, label]) => (
              <button key={val} onClick={() => setContactFilter(val)} className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${contactFilter === val ? "bg-accent text-white border-accent" : "border-border text-muted"}`}>{label}</button>
            ))}
          </div>
        </div>

        {/* Slet alle */}
        {allLeads.length > 0 && (
          <button
            onClick={() => setSletAlle(true)}
            style={{ padding: "7px 14px", fontSize: "0.8rem", fontWeight: 600, background: "#fff5f5", color: "#8c2f2f", border: "1px solid #f0c5c5", borderRadius: "3px", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            🗑 Slet alle leads ({allLeads.length})
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Indlæser…</p>
      ) : filteredLeads.length === 0 ? (
        <p className="text-muted text-sm">Ingen gemte leads endnu — søg i CVR-fanen og gem nogle.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredLeads.map((l) => {
            const sc = STATUS_COLOR[l.status] || STATUS_COLOR["Ny"];
            const noteLines = l.note ? l.note.split("\n") : [];
            return (
              <div key={l.id} className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                  {/* Venstre: info */}
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "1rem", color: "#003135" }}>{l.navn}</span>
                      <span style={{ fontSize: "0.72rem", color: "#5a7a7d", fontFamily: "monospace" }}>CVR {l.cvrNummer}</span>
                      <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "0.68rem", fontWeight: 700, background: sc.bg, color: sc.color }}>{l.status}</span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#5a7a7d", marginBottom: "2px" }}>
                      {l.branchetekst || l.branchekode || "Ukendt branche"} · {l.vej}{l.vej && ", "}{l.postnummer} {l.by}
                    </p>
                    {(l.telefon || l.email) && (
                      <p style={{ fontSize: "0.8rem", color: "#5a7a7d" }}>{l.telefon}{l.telefon && l.email && " · "}{l.email}</p>
                    )}
                    {l.source?.startsWith("auto") && (
                      <span style={{ display: "inline-block", marginTop: "6px", fontSize: "0.68rem", color: "#0fa4af", border: "1px solid #0fa4af", borderRadius: "12px", padding: "1px 8px" }}>
                        Ingen hjemmeside
                      </span>
                    )}
                    {/* Note-log */}
                    {noteLines.length > 0 && (
                      <div style={{ marginTop: "10px", borderLeft: "2px solid #cde4e6", paddingLeft: "10px" }}>
                        {noteLines.map((line, i) => (
                          <p key={i} style={{ fontSize: "0.75rem", color: i === 0 ? "#003135" : "#7a9ea0", margin: "0 0 2px 0", fontStyle: "italic" }}>{line}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Højre: handlinger */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <select
                      style={{ padding: "6px 10px", fontSize: "0.78rem", borderRadius: "3px", border: "1px solid #cde4e6", background: "#fff", color: "#003135", cursor: "pointer", fontFamily: "inherit" }}
                      value={l.status}
                      onChange={(e) => onStatusDropdownChange(l.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {l.status !== "Konverteret" && (
                      <button onClick={() => setConvertLead(l)} className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 12px", whiteSpace: "nowrap" }}>
                        Konvertér til kunde
                      </button>
                    )}
                    <button onClick={() => removeLead(l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5a7a7d", fontSize: "1rem", padding: "4px" }} title="Slet lead">🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status-note modal */}
      {pendingChange && (
        <StatusNoteModal
          lead={leads.find((l) => l.id === pendingChange.id)}
          newStatus={pendingChange.newStatus}
          onSave={confirmStatusChange}
          onSkip={skipNote}
          onCancel={() => setPendingChange(null)}
        />
      )}

      {/* Slet-alle modal */}
      {sletAlle && (
        <SletAlleModal
          count={allLeads.length}
          onConfirm={deleteAll}
          onClose={() => setSletAlle(false)}
        />
      )}

      {convertLead && (
        <ConvertModal
          lead={convertLead}
          onClose={() => setConvertLead(null)}
        />
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
      <form onSubmit={run} className="card p-6 mb-6">
        <label className="label mb-2 block">Vælg brancher</label>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {SUGGESTED_BRANCHES.map((b) => (
            <label key={b.branchekode} className="flex items-center gap-2 text-sm text-dark cursor-pointer">
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
          <p className="text-sm text-dark">
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
      <h1 className="font-sans text-3xl text-dark mb-1">Leads fra CVR</h1>
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
