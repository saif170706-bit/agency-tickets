"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ---- Slet-modal ----
function SletModal({ kunde, sagCount, onClose }) {
  const router = useRouter();
  const [valg, setValg] = useState("behold"); // "behold" | "alt"
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSlet() {
    setLoading(true); setErr("");
    const url = `/api/customers/${kunde.id}${valg === "alt" ? "?sager=true" : ""}`;
    const res = await fetch(url, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setErr(d.error || "Fejl"); return; }
    router.push("/kunder");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,49,53,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
      <div className="card" style={{ padding: "28px", maxWidth: "440px", width: "100%" }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#003135", marginBottom: "6px" }}>Slet kundeprofil</div>
        <p style={{ fontSize: "0.82rem", color: "#5a7a7d", marginBottom: "20px" }}>
          Du er ved at slette <strong>{kunde.navn}</strong>. Hvad vil du gøre med de {sagCount} sag{sagCount !== 1 ? "er" : ""}?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <label style={{ display: "flex", gap: "12px", padding: "14px", borderRadius: "6px", border: `1.5px solid ${valg === "behold" ? "#0fa4af" : "#cde4e6"}`, cursor: "pointer", background: valg === "behold" ? "#f0fcfd" : "#fff" }}>
            <input type="radio" name="slvg" value="behold" checked={valg === "behold"} onChange={() => setValg("behold")} style={{ marginTop: "2px", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#003135" }}>Slet kun profil — behold sager</div>
              <div style={{ fontSize: "0.75rem", color: "#5a7a7d", marginTop: "2px" }}>Kundeprofilen slettes, men sagerne forbliver i workspace og kan stadig arbejdes på.</div>
            </div>
          </label>
          <label style={{ display: "flex", gap: "12px", padding: "14px", borderRadius: "6px", border: `1.5px solid ${valg === "alt" ? "#8c2f2f" : "#cde4e6"}`, cursor: "pointer", background: valg === "alt" ? "#fff5f5" : "#fff" }}>
            <input type="radio" name="slvg" value="alt" checked={valg === "alt"} onChange={() => setValg("alt")} style={{ marginTop: "2px", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#8c2f2f" }}>Slet alt — profil + alle sager</div>
              <div style={{ fontSize: "0.75rem", color: "#5a7a7d", marginTop: "2px" }}>Sletter kundeprofilen og {sagCount} sag{sagCount !== 1 ? "er" : ""} permanent. Kan ikke fortrydes.</div>
            </div>
          </label>
        </div>

        {err && <p style={{ color: "#8c2f2f", fontSize: "0.8rem", marginBottom: "12px" }}>{err}</p>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Annuller</button>
          <button
            onClick={onSlet}
            disabled={loading}
            style={{
              flex: 1, padding: "9px 16px", borderRadius: "3px", fontWeight: 600,
              fontSize: "0.85rem", cursor: "pointer", border: "none",
              background: valg === "alt" ? "#8c2f2f" : "#003135",
              color: "#fff", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Sletter…" : valg === "alt" ? "Slet alt permanent" : "Slet profil"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Hjælpekomponent — SKAL stå udenfor alle andre komponenter ----
function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5a7a7d", display: "block", marginBottom: "4px" }}>{label}</label>
      {children}
    </div>
  );
}

// ---- Rediger-form ----
function RedigerForm({ kunde, onDone }) {
  const router = useRouter();
  const [navn, setNavn] = useState(kunde.navn || "");
  const [cvrNummer, setCvrNummer] = useState(kunde.cvrNummer || "");
  const [kontaktperson, setKontaktperson] = useState(kunde.kontaktperson || "");
  const [telefon, setTelefon] = useState(kunde.telefon || "");
  const [email, setEmail] = useState(kunde.email || "");
  const [adresse, setAdresse] = useState(kunde.adresse || "");
  const [domæne, setDomæne] = useState(kunde.domæne || "");
  const [hjemmesideØnsker, setHjemmesideØnsker] = useState(kunde.hjemmesideØnsker || "");
  const [farverOgStil, setFarverOgStil] = useState(kunde.farverOgStil || "");
  const [antalSider, setAntalSider] = useState(kunde.antalSider || "");
  const [harLogo, setHarLogo] = useState(!!kunde.harLogo);
  const [harBilleder, setHarBilleder] = useState(!!kunde.harBilleder);
  const [noter, setNoter] = useState(kunde.noter || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true); setErr("");
    const res = await fetch(`/api/customers/${kunde.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ navn, cvrNummer, kontaktperson, telefon, email, adresse, domæne, hjemmesideØnsker, farverOgStil, antalSider, harLogo, harBilleder, noter }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setErr(d.error || "Fejl"); return; }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={onSubmit} style={{ padding: "20px", background: "#f0f8f9", borderRadius: "6px", marginBottom: "20px", border: "1px solid #cde4e6" }}>
      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#003135", marginBottom: "16px" }}>Rediger kundeprofil</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <FieldRow label="Virksomhedsnavn"><input className="input" value={navn} onChange={e => setNavn(e.target.value)} required /></FieldRow>
        <FieldRow label="CVR-nummer"><input className="input" value={cvrNummer} onChange={e => setCvrNummer(e.target.value)} /></FieldRow>
        <FieldRow label="Kontaktperson"><input className="input" value={kontaktperson} onChange={e => setKontaktperson(e.target.value)} /></FieldRow>
        <FieldRow label="Telefon *"><input className="input" value={telefon} onChange={e => setTelefon(e.target.value)} /></FieldRow>
        <FieldRow label="E-mail *"><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></FieldRow>
        <FieldRow label="Adresse"><input className="input" value={adresse} onChange={e => setAdresse(e.target.value)} /></FieldRow>
        <FieldRow label="Domæne"><input className="input" value={domæne} onChange={e => setDomæne(e.target.value)} /></FieldRow>
        <FieldRow label="Antal sider"><input className="input" value={antalSider} onChange={e => setAntalSider(e.target.value)} /></FieldRow>
      </div>

      <FieldRow label="Hjemmeside-ønsker">
        <textarea className="input" rows={3} value={hjemmesideØnsker} onChange={e => setHjemmesideØnsker(e.target.value)} />
      </FieldRow>
      <FieldRow label="Farver & stil">
        <input className="input" value={farverOgStil} onChange={e => setFarverOgStil(e.target.value)} />
      </FieldRow>

      <div style={{ display: "flex", gap: "20px", margin: "12px 0" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.83rem", cursor: "pointer" }}>
          <input type="checkbox" checked={harLogo} onChange={e => setHarLogo(e.target.checked)} />
          Har logo
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.83rem", cursor: "pointer" }}>
          <input type="checkbox" checked={harBilleder} onChange={e => setHarBilleder(e.target.checked)} />
          Har billeder
        </label>
      </div>

      <FieldRow label="Interne noter">
        <textarea className="input" rows={2} value={noter} onChange={e => setNoter(e.target.value)} />
      </FieldRow>

      {err && <p style={{ color: "#8c2f2f", fontSize: "0.8rem", marginBottom: "10px" }}>{err}</p>}
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Gemmer…" : "Gem ændringer"}</button>
        <button type="button" className="btn btn-outline" onClick={onDone}>Annuller</button>
      </div>
    </form>
  );
}

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

// Standardpriser per plan
const PLAN_PRISER = { basis: 349, standard: 499, premium: 699 };

// ---- Aktiver-knap ----
function AktiverBtn({ kundeId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("basis");
  const [pris, setPris] = useState(String(PLAN_PRISER.basis));
  const [startDato, setStartDato] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function onTypeChange(e) {
    const val = e.target.value;
    setType(val);
    setPris(String(PLAN_PRISER[val] || ""));
  }

  async function onAktiver(e) {
    e.preventDefault();
    if (!pris || isNaN(Number(pris))) { setErr("Angiv en gyldig pris"); return; }
    setLoading(true); setErr("");
    const res = await fetch(`/api/customers/${kundeId}/aktiver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abonnementType: type, abonnementPris: Number(pris), abonnementStartDato: new Date(startDato).toISOString() }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setErr(d.error || "Fejl"); return; }
    router.refresh();
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn btn-primary">
      ✓ Aktiver abonnement
    </button>
  );

  return (
    <div className="card" style={{ padding: "20px", minWidth: "280px", border: "1.5px solid #0fa4af" }}>
      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#003135", marginBottom: "14px" }}>Aktiver abonnement — luk salg</div>
      <form onSubmit={onAktiver}>
        <div style={{ marginBottom: "10px" }}>
          <label className="label">Abonnement</label>
          <select value={type} onChange={onTypeChange} className="input">
            <option value="basis">Basis — 349 kr/md</option>
            <option value="standard">Standard — 499 kr/md</option>
            <option value="premium">Premium — 699 kr/md</option>
          </select>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label className="label" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Månedlig pris (kr/md)</span>
            {Number(pris) !== PLAN_PRISER[type] && (
              <span style={{ color: "#0fa4af", fontSize: "0.7rem", fontWeight: 600 }}>
                Ændret fra standard ({PLAN_PRISER[type]} kr)
              </span>
            )}
          </label>
          <input
            type="number"
            min="1"
            value={pris}
            onChange={e => setPris(e.target.value)}
            className="input"
            required
          />
        </div>
        <div style={{ marginBottom: "14px" }}>
          <label className="label">Go-live dato</label>
          <input type="date" value={startDato} onChange={e => setStartDato(e.target.value)} className="input" />
        </div>
        {err && <p style={{ color: "#8c2f2f", fontSize: "0.8rem", marginBottom: "10px" }}>{err}</p>}
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? "Aktiverer…" : "Aktiver & luk salg"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Annuller</button>
        </div>
      </form>
    </div>
  );
}

// ---- Tabs ----
function InfoRow({ label, value }) {
  if (!value && value !== false) return null;
  return (
    <div style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f0f8f9" }}>
      <span style={{ fontSize: "0.78rem", color: "#5a7a7d", minWidth: "150px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "0.82rem", color: "#003135", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function OversigtsTab({ kunde }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#003135", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Kontaktoplysninger</div>
        <InfoRow label="Kontaktperson" value={kunde.kontaktperson} />
        <InfoRow label="Telefon" value={kunde.telefon} />
        <InfoRow label="E-mail" value={kunde.email} />
        <InfoRow label="Adresse" value={kunde.adresse} />
        <InfoRow label="CVR" value={kunde.cvrNummer} />
        <InfoRow label="Domæne" value={kunde.domæne} />
      </div>
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#003135", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hjemmeside-intake</div>
        <InfoRow label="Ønsker" value={kunde.hjemmesideØnsker} />
        <InfoRow label="Farver & stil" value={kunde.farverOgStil} />
        <InfoRow label="Antal sider" value={kunde.antalSider} />
        <InfoRow label="Har logo" value={kunde.harLogo ? "Ja" : "Nej"} />
        <InfoRow label="Har billeder" value={kunde.harBilleder ? "Ja" : "Nej"} />
        {kunde.noter && (
          <div style={{ marginTop: "12px", padding: "12px", background: "#f0f8f9", borderRadius: "4px", fontSize: "0.82rem", color: "#003135", lineHeight: 1.6 }}>
            {kunde.noter}
          </div>
        )}
      </div>
    </div>
  );
}

function SagerTab({ tickets, kundeId }) {
  const active = tickets.filter(t => !t.isClosed);
  const closed = tickets.filter(t => t.isClosed);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "0.82rem", color: "#5a7a7d" }}>{active.length} aktive &nbsp;·&nbsp; {closed.length} lukkede</span>
        <Link href={`/tickets/new?kundeId=${kundeId}`} className="btn btn-outline" style={{ fontSize: "0.78rem", padding: "6px 14px" }}>+ Ny sag</Link>
      </div>
      {tickets.length === 0 ? (
        <div className="card" style={{ padding: "28px", textAlign: "center" }}>
          <p style={{ color: "#5a7a7d", fontSize: "0.85rem" }}>Ingen sager endnu på denne kunde.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {tickets.map(t => (
            <Link key={t.id} href={`/tickets/${t.ref}`} className="card" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.7rem", color: "#5a7a7d", fontWeight: 600, marginRight: "8px" }}>{t.ref}</span>
                <span style={{ fontSize: "0.87rem", fontWeight: 600, color: "#003135" }}>{t.title}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "0.72rem", color: "#5a7a7d" }}>{t.statusLabel}</span>
                <span style={{
                  display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
                  background: t.isClosed ? "#cde4e6" : "#0fa4af",
                }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KundeProfilClient({ mode, kundeId, kunde, tickets, employee }) {
  const [tab, setTab] = useState("oversigt");
  const [sletModal, setSletModal] = useState(false);
  const [redigerer, setRedigerer] = useState(false);

  if (mode === "aktiver-btn") return <AktiverBtn kundeId={kundeId} />;

  const isSuperadmin = employee?.rolle === "superadmin";

  const TABS = [
    { key: "oversigt", label: "Oversigt" },
    { key: "sager", label: `Sager (${tickets?.length || 0})` },
  ];

  return (
    <div>
      {/* Handlingsknapper (superadmin) */}
      {isSuperadmin && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", justifyContent: "flex-end" }}>
          <button
            onClick={() => setRedigerer(r => !r)}
            style={{
              padding: "7px 14px", fontSize: "0.8rem", fontWeight: 600,
              background: redigerer ? "#e4f1f2" : "#f0f8f9",
              color: "#003135", border: "1px solid #cde4e6",
              borderRadius: "3px", cursor: "pointer",
            }}
          >
            {redigerer ? "✕ Annuller" : "✏️ Rediger profil"}
          </button>
          <button
            onClick={() => setSletModal(true)}
            style={{
              padding: "7px 14px", fontSize: "0.8rem", fontWeight: 600,
              background: "#fff5f5", color: "#8c2f2f",
              border: "1px solid #f0c5c5", borderRadius: "3px", cursor: "pointer",
            }}
          >
            🗑 Slet kunde
          </button>
        </div>
      )}

      {/* Rediger-form (inline, over tabs) */}
      {redigerer && (
        <RedigerForm kunde={kunde} onDone={() => setRedigerer(false)} />
      )}

      {/* Tab-bar */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1.5px solid #cde4e6", marginBottom: "20px" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px",
              fontSize: "0.83rem", fontWeight: 600,
              color: tab === t.key ? "#003135" : "#5a7a7d",
              borderBottom: tab === t.key ? "2px solid #0fa4af" : "2px solid transparent",
              marginBottom: "-1.5px",
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "oversigt" && <OversigtsTab kunde={kunde} />}
      {tab === "sager" && <SagerTab tickets={tickets || []} kundeId={kunde?.id} />}

      {/* Slet-modal */}
      {sletModal && (
        <SletModal
          kunde={kunde}
          sagCount={tickets?.length || 0}
          onClose={() => setSletModal(false)}
        />
      )}
    </div>
  );
}
