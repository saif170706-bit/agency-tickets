"use client";

import { useState, useEffect, useRef } from "react";
import { getTemplate, TYPE_LABELS, ALL_TYPES, SMS_MAX_CHARS } from "../../../lib/smsTemplates";

// Kald tracking-url fra env (samme logik som notify.js)
function buildTrackingUrl(ref) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "https://buildone.dk").replace(/\/$/, "");
  return `${base}/tracking/${ref}`;
}

export default function SmsModal({ ticket, stage, onClose }) {
  const firstName = (ticket.customer.name || "kunde").split(" ")[0];
  const url = buildTrackingUrl(ticket.ref);
  const ticketType = ticket.type || "support";

  // Valgt skabelon-type (default = sagensegen type)
  const [selectedType, setSelectedType] = useState(ticketType === "build" ? "byggeri" : ticketType);
  // "template" | "custom"
  const [mode, setMode] = useState("template");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  // Opdater tekst-preview når type eller mode ændres
  useEffect(() => {
    if (mode === "template") {
      setText(getTemplate(stage, selectedType, firstName, ticket.ref, url));
    }
  }, [selectedType, mode, stage, firstName, ticket.ref, url]);

  // Fokus på textarea når custom vælges
  useEffect(() => {
    if (mode === "custom") textareaRef.current?.focus();
  }, [mode]);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${ticket.ref}/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Afsendelse fejlede");
      setSent(true);
      setTimeout(onClose, 1800);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  const charsLeft = SMS_MAX_CHARS - text.length;
  const overLimit = charsLeft < 0;
  const hasPhone = !!ticket.customer.phone;

  const stageLabel = stage === "lukket" ? "Sag lukket" : "Sag i gang";

  return (
    // Backdrop
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: "10px", width: "100%", maxWidth: "540px",
        boxShadow: "0 8px 40px rgba(0,49,53,0.18)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "#003135", color: "#fff",
          padding: "18px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>📱 Send SMS til kunden</div>
            <div style={{ fontSize: "0.78rem", opacity: 0.7, marginTop: "2px" }}>
              {stageLabel} · {ticket.ref} · {ticket.customer.name}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#fff",
            fontSize: "1.3rem", cursor: "pointer", lineHeight: 1, padding: "4px",
          }}>✕</button>
        </div>

        <div style={{ padding: "22px" }}>
          {!hasPhone && (
            <div style={{
              background: "#fff3cd", border: "1px solid #ffc107",
              borderRadius: "6px", padding: "10px 14px",
              fontSize: "0.82rem", color: "#856404", marginBottom: "16px",
            }}>
              ⚠ Kunden har intet telefonnummer — SMS kan ikke sendes.
            </div>
          )}

          {/* Vælg skabelon-type */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5a7a7d", marginBottom: "8px" }}>
              Besked-skabelon
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => { setSelectedType(t); setMode("template"); }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    border: "1.5px solid",
                    borderColor: mode === "template" && selectedType === t ? "#003135" : "#cde4e6",
                    background: mode === "template" && selectedType === t ? "#003135" : "#fff",
                    color: mode === "template" && selectedType === t ? "#fff" : "#003135",
                    fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.12s",
                  }}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
              <button
                onClick={() => {
                  setMode("custom");
                  setText(""); // Ryd så medarbejder kan skrive selv
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  border: "1.5px solid",
                  borderColor: mode === "custom" ? "#003135" : "#cde4e6",
                  background: mode === "custom" ? "#003135" : "#fff",
                  color: mode === "custom" ? "#fff" : "#003135",
                  fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ✏ Tilpasset
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div style={{ marginBottom: "8px", position: "relative" }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); if (mode !== "custom") setMode("custom"); }}
              rows={5}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "12px 14px",
                border: overLimit ? "1.5px solid #ef4444" : "1.5px solid #cde4e6",
                borderRadius: "6px",
                fontSize: "0.9rem", lineHeight: 1.5,
                fontFamily: "inherit", color: "#003135",
                resize: "vertical", outline: "none",
                background: "#f5fafa",
              }}
            />
            <div style={{
              textAlign: "right",
              fontSize: "0.72rem",
              color: overLimit ? "#ef4444" : charsLeft < 30 ? "#f59e0b" : "#5a7a7d",
              fontWeight: overLimit ? 700 : 400,
              marginTop: "2px",
            }}>
              {overLimit ? `${Math.abs(charsLeft)} tegn for mange` : `${charsLeft} tegn tilbage`}
            </div>
          </div>

          {error && (
            <div style={{
              background: "#fee2e2", border: "1px solid #fca5a5",
              borderRadius: "6px", padding: "8px 12px",
              fontSize: "0.82rem", color: "#991b1b", marginBottom: "12px",
            }}>
              {error}
            </div>
          )}

          {sent && (
            <div style={{
              background: "#dcfce7", border: "1px solid #86efac",
              borderRadius: "6px", padding: "8px 12px",
              fontSize: "0.82rem", color: "#166534",
              marginBottom: "12px", fontWeight: 600,
            }}>
              ✓ SMS sendt til {ticket.customer.phone}
            </div>
          )}

          {/* Knapper */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 20px", background: "none",
                border: "1.5px solid #cde4e6", color: "#5a7a7d",
                borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Spring over
            </button>
            <button
              onClick={handleSend}
              disabled={sending || overLimit || !hasPhone || sent || !text.trim()}
              style={{
                padding: "9px 22px",
                background: "#003135", color: "#fff",
                border: "none", borderRadius: "6px",
                fontSize: "0.85rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                opacity: (sending || overLimit || !hasPhone || sent || !text.trim()) ? 0.5 : 1,
              }}
            >
              {sending ? "Sender…" : "Send SMS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
