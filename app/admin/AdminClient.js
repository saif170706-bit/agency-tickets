"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function StatBox({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: "18px" }}>
      <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#5a7a7d", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#003135" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.7rem", color: "#5a7a7d", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

// VIGTIGT: defineret UDENFOR AdminClient for at undgå fokus-tab ved input
function NyMedarbejderForm({ onDone }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rolle, setRolle] = useState("medarbejder");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true); setErr("");
    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, rolle }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Fejl"); return; }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
      <div>
        <label className="label">Navn</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="Fulde navn" />
      </div>
      <div>
        <label className="label">E-mail</label>
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="navn@buildone.dk" />
      </div>
      <div>
        <label className="label">Rolle</label>
        <select className="input" value={rolle} onChange={e => setRolle(e.target.value)}>
          <option value="medarbejder">Medarbejder / Sælger</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </div>
      <div style={{ gridColumn: "1/-1", background: "#f0f8f9", borderRadius: "4px", padding: "10px 12px", fontSize: "0.78rem", color: "#5a7a7d" }}>
        💡 Ingen adgangskode nødvendig — brugeren logger ind med sin e-mail og sætter selv sin kode første gang.
      </div>
      {err && <div style={{ gridColumn: "1/-1", color: "#8c2f2f", fontSize: "0.82rem" }}>{err}</div>}
      <div style={{ gridColumn: "1/-1", display: "flex", gap: "8px" }}>
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Opretter…" : "Opret bruger"}</button>
        <button type="button" className="btn btn-outline" onClick={onDone}>Annuller</button>
      </div>
    </form>
  );
}

export default function AdminClient({ employees, stats, currentEmployeeId }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [resetMsg, setResetMsg] = useState("");

  async function onDelete(id, name) {
    if (!confirm(`Slet bruger "${name}"? Dette kan ikke fortrydes.`)) return;
    setDeleting(id);
    await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  async function onResetPassword(id, name) {
    if (!confirm(`Nulstil adgangskode for "${name}"? De skal sætte en ny næste gang de logger ind.`)) return;
    setResetting(id);
    const res = await fetch(`/api/admin/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-password" }),
    });
    setResetting(null);
    if (res.ok) {
      setResetMsg(`✓ Adgangskode nulstillet for ${name}`);
      setTimeout(() => setResetMsg(""), 4000);
      router.refresh();
    }
  }

  function onFormDone() {
    setShowForm(false);
    router.refresh();
  }

  return (
    <div>
      {/* Stats */}
      <h2 style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5a7a7d", marginBottom: "12px" }}>Overblik</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "10px", marginBottom: "32px" }}>
        <StatBox label="Medarbejdere" value={stats.totalEmployees} />
        <StatBox label="Kunder i alt" value={stats.totalCustomers} />
        <StatBox label="Aktive" value={stats.aktiveKunder} sub="med abonnement" />
        <StatBox label="Potentielle" value={stats.potentielleKunder} />
        <StatBox label="Total MRR" value={`${stats.totalMrr.toLocaleString("da-DK")} kr`} />
      </div>

      {/* Medarbejdere */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5a7a7d" }}>Medarbejdere & sælgere</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {resetMsg && <span style={{ fontSize: "0.75rem", color: "#0fa4af" }}>{resetMsg}</span>}
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ fontSize: "0.78rem", padding: "6px 14px" }}>+ Ny bruger</button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: "20px", marginBottom: "16px", border: "1.5px solid #0fa4af" }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#003135" }}>Opret ny bruger</div>
          <NyMedarbejderForm onDone={onFormDone} />
        </div>
      )}

      <div className="card" style={{ overflow: "hidden", marginBottom: "32px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid #e4f1f2" }}>
              {["Navn", "E-mail", "Rolle", "Adgangskode", "Lukkede salg", "MRR", ""].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5a7a7d" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => (
              <tr key={emp.id} style={{ borderBottom: i < employees.length - 1 ? "1px solid #f0f8f9" : "none" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: "0.87rem", color: "#003135" }}>{emp.name}</td>
                <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: "#5a7a7d" }}>{emp.email}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 700,
                    background: emp.rolle === "superadmin" ? "#fff0f0" : "#f0f8f9",
                    color: emp.rolle === "superadmin" ? "#8c2f2f" : "#5a7a7d",
                  }}>
                    {emp.rolle === "superadmin" ? "Superadmin" : "Medarbejder"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {emp.hasPassword
                    ? <span style={{ fontSize: "0.72rem", color: "#1a7a47" }}>✓ Sat</span>
                    : <span style={{ fontSize: "0.72rem", color: "#f0a500", fontWeight: 600 }}>⚠ Afventer første login</span>
                  }
                </td>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#003135" }}>{emp.lukkedeSalg}</td>
                <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: emp.mrr > 0 ? "#0fa4af" : "#5a7a7d", fontWeight: emp.mrr > 0 ? 600 : 400 }}>
                  {emp.mrr.toLocaleString("da-DK")} kr
                </td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                  {emp.id !== currentEmployeeId && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => onResetPassword(emp.id, emp.name)}
                        disabled={resetting === emp.id}
                        title="Nulstil adgangskode"
                        style={{ fontSize: "0.72rem", color: "#5a7a7d", background: "#f0f8f9", border: "1px solid #cde4e6", cursor: "pointer", padding: "4px 8px", borderRadius: "3px" }}
                      >
                        {resetting === emp.id ? "…" : "Nulstil kode"}
                      </button>
                      <button
                        onClick={() => onDelete(emp.id, emp.name)}
                        disabled={deleting === emp.id}
                        style={{ fontSize: "0.72rem", color: "#8c2f2f", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
                      >
                        {deleting === emp.id ? "Sletter…" : "Slet"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
