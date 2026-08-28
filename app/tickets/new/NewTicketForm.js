"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_ROADMAP = ["Opstartet", "I design", "I udvikling", "Klar til gennemsyn", "Live"];

export default function NewTicketForm() {
  const router = useRouter();
  const [type, setType] = useState("support");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [cvr, setCvr] = useState("");
  const [roadmap, setRoadmap] = useState(DEFAULT_ROADMAP);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateStep(i, value) {
    setRoadmap((r) => r.map((s, idx) => (idx === i ? value : s)));
  }
  function addStep() {
    setRoadmap((r) => [...r, ""]);
  }
  function removeStep(i) {
    setRoadmap((r) => r.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title,
        description,
        customer: { name, phone, email, address, cvr },
        roadmap: type === "build" ? roadmap.filter((s) => s.trim()) : undefined,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Der skete en fejl.");
      return;
    }
    router.push(`/tickets/${data.ref}`);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl">
      <div className="mb-8">
        <span className="label">Sagstype</span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setType("support")}
            className={`flex-1 card p-4 text-left ${type === "support" ? "border-navy border-2" : ""}`}
          >
            <div className="font-semibold text-navy text-sm mb-1">Support / rettelse</div>
            <div className="text-xs text-muted">Ændring eller fejl på en eksisterende side</div>
          </button>
          <button
            type="button"
            onClick={() => setType("build")}
            className={`flex-1 card p-4 text-left ${type === "build" ? "border-navy border-2" : ""}`}
          >
            <div className="font-semibold text-navy text-sm mb-1">Nyt hjemmesidebyggeri</div>
            <div className="text-xs text-muted">Egen status-roadmap som kunden kan følge</div>
          </button>
        </div>
      </div>

      <div className="mb-5">
        <label className="label" htmlFor="title">Titel</label>
        <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="mb-8">
        <label className="label" htmlFor="description">Beskrivelse</label>
        <textarea
          id="description"
          className="input"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <h2 className="font-serif text-lg text-navy mb-4">Kundeoplysninger</h2>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="label" htmlFor="name">Fulde navn</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="phone">Telefonnummer</label>
          <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
      </div>
      <div className="mb-5">
        <label className="label" htmlFor="email">E-mail</label>
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

      {type === "build" && (
        <div className="mb-8">
          <h2 className="font-serif text-lg text-navy mb-2">Status-roadmap</h2>
          <p className="text-sm text-muted mb-4">
            Disse trin vises for kunden på deres statusside. Du kan tilføje eller fjerne trin.
          </p>
          <div className="space-y-2">
            {roadmap.map((step, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input"
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  placeholder={`Trin ${i + 1}`}
                />
                <button type="button" onClick={() => removeStep(i)} className="btn btn-outline !px-3">
                  ✕
                </button>
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
        {loading ? "Opretter…" : "Opret sag og send besked til kunden"}
      </button>
    </form>
  );
}
