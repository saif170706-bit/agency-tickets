"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// VIGTIGT: Skal defineres uden for komponentfunktionen — ellers mister inputs fokus ved hvert bogstav
function FormSection({ title, children }) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <h2 style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5a7a7d", marginBottom: "14px", paddingBottom: "8px", borderBottom: "1px solid #e4f1f2" }}>{title}</h2>
      {children}
    </div>
  );
}

export default function NyKundeForm({ prefill = {} }) {
  const router = useRouter();
  // Firmaoplysninger
  const [navn, setNavn] = useState(prefill.navn || "");
  const [cvrNummer, setCvrNummer] = useState(prefill.cvrNummer || "");
  const [kontaktperson, setKontaktperson] = useState("");
  const [telefon, setTelefon] = useState(prefill.telefon || "");
  const [email, setEmail] = useState(prefill.email || "");
  const [adresse, setAdresse] = useState(prefill.adresse || "");
  const [domæne, setDomæne] = useState("");
  // Hjemmeside-intake
  const [hjemmesideØnsker, setHjemmesideØnsker] = useState("");
  const [farverOgStil, setFarverOgStil] = useState("");
  const [antalSider, setAntalSider] = useState("");
  const [harLogo, setHarLogo] = useState(false);
  const [harBilleder, setHarBilleder] = useState(false);
  const [noter, setNoter] = useState("");
  // Submit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        navn, cvrNummer, kontaktperson, telefon, email, adresse, domæne,
        hjemmesideØnsker, farverOgStil, antalSider, harLogo, harBilleder, noter,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Der skete en fejl"); return; }

    const kundeId = data.id;

    // Opret automatisk en bygge-sag til hjemmesiden
    const sagBeskrivelse = [
      hjemmesideØnsker && `Ønsker: ${hjemmesideØnsker}`,
      farverOgStil && `Farver & stil: ${farverOgStil}`,
      antalSider && `Antal sider: ${antalSider}`,
      `Logo: ${harLogo ? "Kunden har logo" : "Ingen logo — skal laves"}`,
      `Billeder: ${harBilleder ? "Kunden har billeder" : "Ingen billeder — skal skaffes"}`,
      noter && `Note: ${noter}`,
    ].filter(Boolean).join("\n");

    await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "build",
        title: `Hjemmeside til ${navn}`,
        description: sagBeskrivelse || `Nyt hjemmesidebyggeri for ${navn}.`,
        kundeId,
        roadmap: ["Opstartet", "I design", "I udvikling", "Klar til gennemsyn", "Live"],
      }),
    }).catch(() => {});

    // Hvis konverteret fra lead, marker det
    if (prefill.leadId) {
      await fetch(`/api/leads/${prefill.leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convertedToCustomer: true }),
      }).catch(() => {});
    }

    router.push(`/kunder/${kundeId}`);
  }

  return (
    <form onSubmit={onSubmit}>
      <FormSection title="Firmaoplysninger">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div>
            <label className="label">Virksomhedsnavn *</label>
            <input className="input" value={navn} onChange={e => setNavn(e.target.value)} required placeholder="Fx Teamtand ApS" />
          </div>
          <div>
            <label className="label">CVR-nummer</label>
            <input className="input" value={cvrNummer} onChange={e => setCvrNummer(e.target.value)} placeholder="12345678" />
          </div>
          <div>
            <label className="label">Kontaktperson</label>
            <input className="input" value={kontaktperson} onChange={e => setKontaktperson(e.target.value)} placeholder="Navn på beslutningstageren" />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input className="input" value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="12 34 56 78" />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="kontakt@firma.dk" />
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Vejnavn 1, 1234 By" />
          </div>
          <div>
            <label className="label">Ønsket domæne</label>
            <input className="input" value={domæne} onChange={e => setDomæne(e.target.value)} placeholder="firmaNavn.dk" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Hjemmeside-intake — hvad ønsker kunden?">
        <div style={{ marginBottom: "14px" }}>
          <label className="label">Kundens ønsker & formål</label>
          <textarea
            className="input"
            rows={4}
            value={hjemmesideØnsker}
            onChange={e => setHjemmesideØnsker(e.target.value)}
            placeholder="Hvad vil de have ud af hjemmesiden? Salg, booking, præsentation? Specifikke funktioner?"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div>
            <label className="label">Farver & stil</label>
            <input className="input" value={farverOgStil} onChange={e => setFarverOgStil(e.target.value)} placeholder="Fx: minimalistisk, mørk, naturtoner" />
          </div>
          <div>
            <label className="label">Antal sider</label>
            <input className="input" value={antalSider} onChange={e => setAntalSider(e.target.value)} placeholder="Fx: 5 sider" />
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", marginBottom: "14px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" checked={harLogo} onChange={e => setHarLogo(e.target.checked)} />
            Kunden har et logo
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" checked={harBilleder} onChange={e => setHarBilleder(e.target.checked)} />
            Kunden har billeder / materiale
          </label>
        </div>
        <div>
          <label className="label">Interne noter</label>
          <textarea
            className="input"
            rows={3}
            value={noter}
            onChange={e => setNoter(e.target.value)}
            placeholder="Andet vigtigt fra samtalen..."
          />
        </div>
      </FormSection>

      {error && <p style={{ color: "#8c2f2f", fontSize: "0.85rem", marginBottom: "16px" }}>{error}</p>}

      <div style={{ display: "flex", gap: "12px" }}>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Opretter…" : "Opret kundeprofil"}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => router.back()}>Annuller</button>
      </div>
    </form>
  );
}
