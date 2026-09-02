"use client";

import { useState } from "react";

export default function SubSteps({ ticket, onUpdate }) {
  const [subSteps, setSubSteps] = useState(ticket.subSteps || []);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");

  const ref = ticket.ref;

  async function toggle(id) {
    const res = await fetch(`/api/tickets/${ref}/substeps/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    if (data.subSteps) { setSubSteps(data.subSteps); onUpdate?.(); }
  }

  async function remove(id) {
    const res = await fetch(`/api/tickets/${ref}/substeps/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.subSteps) { setSubSteps(data.subSteps); onUpdate?.(); }
  }

  async function add() {
    if (!newLabel.trim()) return;
    const res = await fetch(`/api/tickets/${ref}/substeps`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: newLabel }) });
    const data = await res.json();
    if (data.subSteps) { setSubSteps(data.subSteps); setNewLabel(""); setAdding(false); onUpdate?.(); }
  }

  async function rename(id) {
    if (!editLabel.trim()) return;
    const res = await fetch(`/api/tickets/${ref}/substeps/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: editLabel }) });
    const data = await res.json();
    if (data.subSteps) { setSubSteps(data.subSteps); setEditingId(null); onUpdate?.(); }
  }

  const doneCount = subSteps.filter((s) => s.done).length;

  return (
    <div style={{ marginTop: 16, background: "#f0f8f9", border: "1px solid #cde4e6", borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5a7a7d" }}>
          Under-trin — {doneCount}/{subSteps.length} færdig
        </div>
        <button
          onClick={() => setAdding(!adding)}
          style={{ fontSize: "0.72rem", color: "#003135", background: "none", border: "1px solid #cde4e6", borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}
        >
          + Tilføj
        </button>
      </div>

      {/* Tilføj nyt trin */}
      {adding && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Navn på trin..."
            style={{ flex: 1, padding: "6px 10px", border: "1px solid #cde4e6", borderRadius: 6, fontSize: "0.85rem", fontFamily: "inherit", outline: "none" }}
          />
          <button onClick={add} style={{ padding: "6px 12px", background: "#003135", color: "#fff", border: "none", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit" }}>Gem</button>
          <button onClick={() => setAdding(false)} style={{ padding: "6px 10px", background: "none", border: "1px solid #cde4e6", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer", color: "#5a7a7d", fontFamily: "inherit" }}>✕</button>
        </div>
      )}

      {/* Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {subSteps.length === 0 && (
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#8aa5a8" }}>Ingen under-trin endnu.</p>
        )}
        {subSteps.map((step) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Checkbox */}
            <button
              onClick={() => toggle(step.id)}
              style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                border: step.done ? "none" : "2px solid #cde4e6",
                background: step.done ? "#003135" : "#fff",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 11, fontWeight: 900,
              }}
            >{step.done ? "✓" : ""}</button>

            {/* Label / edit */}
            {editingId === step.id ? (
              <input
                autoFocus
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") rename(step.id); if (e.key === "Escape") setEditingId(null); }}
                onBlur={() => rename(step.id)}
                style={{ flex: 1, padding: "3px 8px", border: "1px solid #cde4e6", borderRadius: 4, fontSize: "0.85rem", fontFamily: "inherit" }}
              />
            ) : (
              <span
                onDoubleClick={() => { setEditingId(step.id); setEditLabel(step.label); }}
                style={{ flex: 1, fontSize: "0.85rem", color: step.done ? "#8aa5a8" : "#003135", textDecoration: step.done ? "line-through" : "none", cursor: "default" }}
                title="Dobbeltklik for at redigere"
              >
                {step.label}
              </span>
            )}

            {/* Slet */}
            <button
              onClick={() => remove(step.id)}
              style={{ background: "none", border: "none", color: "#c0cece", cursor: "pointer", fontSize: 13, padding: "0 4px", lineHeight: 1 }}
              title="Fjern trin"
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
