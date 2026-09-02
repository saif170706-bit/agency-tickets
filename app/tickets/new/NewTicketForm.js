"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_ROADMAP = ["Opstartet", "I design", "I udvikling", "Klar til gennemsyn"];

// Typer med roadmap
const ROADMAP_TYPES = ["byggeri", "opdatering", "build"];

const TICKET_TYPES = [
  { value: "support",         label: "Support / rettelse",        desc: "Fejl eller ændring på eksisterende side" },
  { value: "vedligeholdelse", label: "Vedligeholdelse",           desc: "Løbende vedligeholdelse og opdateringer" },
  { value: "byggeri",         label: "Nyt hjemmesidebyggeri",     desc: "Ny hjemmeside med roadmap kunden kan følge" },
  { value: "opdatering",      label: "Hjemmeside opdatering",     desc: "Større redesign eller opdatering af eksisterende side" },
];

export default function NewTicketForm({ kunde = null }) {
  const router = useRouter();
  const fromKunde = !!kunde;

  const [type, setType] = useState("byggeri");
  const [title, setTitle] = useState(fromKunde ? `Hjemmeside til ${kunde.navn}` : "");
  const [description, setDescription] = useState("");
  const [roadmap, setRoadmap] = useState(DEFAULT_ROADMAP);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Bruges kun ved manuel oprettelse (uden kundeprofil)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [cvr, setCvr] = useState("");

  function updateStep(i, value) { setRoadmap((r) => r.map((s, idx) => idx === i ? value : s)); }
  function addStep() { setRoadmap((r) => [...r, ""]); }
  function removeStep(i) { setRoadmap((r) => r.filter((_, idx) => idx !== i)); }

  async function onSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);

    const body = {
      type,
      title,
      description,
      roadmap: ROADMAP_TYPES.includes(type) ? roadmap.filter((s) => s.trim()) : undefined,
    };

    if (fromKunde) {
      body.kundeId = kunde.id;
    } else {
      body.customer = { name, phone, email, address, cvr };
    }

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Der skete en fejl."); return; }
    router.push(`/tickets/${data.ref}`);
  }

  return (
    <form onSubmit={onSubmit}>
      {/* Sagstype */}
      <div className="mb-8">
        <span className="label">Sagstype</span>
        <div className="grid grid-cols-2 gap-3">
          {TICKET_TYPES.map((t) => {
            const selected = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                style={{
                  textAlign: "left",
                  borderRadius: "8px",
                  padding: "16px",
                  border: selected ? "2px solid #003135" : "2px solid #cde4e6",
                  background: selected ? "#003135" : "#fff",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  position: "relative",
                  fontFamily: "inherit",
                }}
              >
                {selected && (
                  <span style={{
                    position: "absolute", top: "10px", right: "12px",
                    background: "#24d9a4", color: "#003135",
                    borderRadius: "50%", width: "20px", height: "20px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.7rem", fontWeight: 900,
                  }}>✓</span>
                )}
                <div style={{
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  marginBottom: "4px",
                  color: selected ? "#fff" : "#003135",
                }}>{t.label}</div>
                <div style={{
                  fontSize: "0.75rem",
                  color: selected ? "rgba(255,255,255,0.7)" : "#5a7a7d",
                }}>{t.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5">
        <label className="label" htmlFor="title">Titel</label>
        <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="mb-8">
        <label className="label" htmlFor="description">Beskrivelse</label>
        <textarea id="description" className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {/* Kundeoplysninger — vises kun ved manuel oprettelse */}
      {fromKunde ? (
        <div className="card mb-8 p-5" style={{ background: "#f0f8f9", border: "1px solid #cde4e6" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#5a7a7d", marginBottom: "10px" }}>
            Kunde — {kunde.navn}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.82rem", color: "#003135" }}>
            <div><span style={{ color: "#5a7a7d" }}>Kontakt: </span>{kunde.kontaktperson || kunde.navn}</div>
            <div><span style={{ color: "#5a7a7d" }}>Tlf: </span>{kunde.telefon || <span style={{ color: "#8c2f2f" }}>Mangler!</span>}</div>
            <div><span style={{ color: "#5a7a7d" }}>E-mail: </span>{kunde.email || <span style={{ color: "#8c2f2f" }}>Mangler!</span>}</div>
            {kunde.cvrNummer && <div><span style={{ color: "#5a7a7d" }}>CVR: </span>{kunde.cvrNummer}</div>}
          </div>
          {(!kunde.telefon || !kunde.email) && (
            <p style={{ color: "#8c2f2f", fontSize: "0.78rem", marginTop: "10px" }}>
              ⚠ Opdater kundens profil med telefon og e-mail inden du opretter sagen.
            </p>
          )}
        </div>
      ) : (
        <>
          <h2 className="font-sans text-lg text-dark mb-4">Kundeoplysninger</h2>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="label" htmlFor="name">Fulde navn</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="phone">Telefonnummer *</label>
              <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
          <div className="mb-5">
            <label className="label" htmlFor="email">E-mail *</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <label className="label" htmlFor="address">Adresse (valgfri)</label>
              <input id="address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="cvr">CVR-nummer (valgfri)</label>
              <input id="cvr" className="input" value={cvr} onChange={(e) => setCvr(e.target.value)} />
            </div>
          </div>
        </>
      )}

      {/* Roadmap */}
      {ROADMAP_TYPES.includes(type) && (
        <div className="mb-8">
          <h2 className="font-sans text-lg text-dark mb-2">Status-roadmap</h2>
          <p className="text-sm text-muted mb-4">
            Disse trin vises for kunden på deres statusside.
          </p>
          <div className="space-y-2">
            {roadmap.map((step, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" value={step} onChange={(e) => updateStep(i, e.target.value)} placeholder={`Trin ${i + 1}`} />
                <button type="button" onClick={() => removeStep(i)} className="btn btn-outline !px-3">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addStep} className="btn btn-outline mt-3 !text-xs !py-2">
            + Tilføj trin
          </button>
        </div>
      )}

      {error && <p className="text-danger text-sm mb-5">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Opretter…" : "Opret sag"}
      </button>
    </form>
  );
}
