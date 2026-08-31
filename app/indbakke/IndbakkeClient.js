"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const STATUS_LABEL = { ny: "Ny", set: "Set", arkiveret: "Arkiveret" };
const STATUS_COLOR = {
  ny: { bg: "#fee2e2", color: "#991b1b" },
  set: { bg: "#e4f1f2", color: "#0fa4af" },
  arkiveret: { bg: "#f3f4f6", color: "#6b7280" },
};

function formatDato(iso) {
  return new Date(iso).toLocaleString("da-DK", { dateStyle: "short", timeStyle: "short" });
}

function InquiryCard({ inquiry, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sc = STATUS_COLOR[inquiry.status] || STATUS_COLOR.set;

  async function changeStatus(status) {
    setLoading(true);
    try {
      await fetch(`/api/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onStatusChange(inquiry.id, status);
      // Opdater nav-badge med det samme
      window.dispatchEvent(new Event("indbakke_update"));
    } catch (e) {
      alert("Kunne ikke opdatere status");
    } finally {
      setLoading(false);
    }
  }

  // Byg query-params til at oprette en ny sag præ-udfyldt med henvendelsesdata
  const sagParams = new URLSearchParams({
    navn: inquiry.navn || "",
    email: inquiry.email || "",
    telefon: inquiry.telefon || "",
  }).toString();

  return (
    <div
      style={{
        border: "1px solid #cde4e6",
        borderLeft: `4px solid ${inquiry.status === "ny" ? "#ef4444" : inquiry.status === "arkiveret" ? "#d1d5db" : "#0fa4af"}`,
        borderRadius: "6px",
        background: "#fff",
        marginBottom: "10px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        onClick={() => {
          setOpen((o) => !o);
          if (inquiry.status === "ny") changeStatus("set");
        }}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 16px", cursor: "pointer",
          background: open ? "#f5fafa" : "#fff",
          transition: "background 0.1s",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#003135" }}>
              {inquiry.navn || "(intet navn)"}
            </span>
            <span
              style={{
                fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px",
                borderRadius: "20px", ...sc,
              }}
            >
              {STATUS_LABEL[inquiry.status] || inquiry.status}
            </span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#5a7a7d", marginTop: "2px" }}>
            {inquiry.email && <span>{inquiry.email}</span>}
            {inquiry.telefon && <span> · {inquiry.telefon}</span>}
            {" · "}<span>{formatDato(inquiry.createdAt)}</span>
          </div>
          {!open && inquiry.besked && (
            <div style={{
              fontSize: "0.82rem", color: "#7a9ea0", marginTop: "4px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {inquiry.besked}
            </div>
          )}
        </div>
        <span style={{ color: "#0fa4af", fontSize: "1.1rem", flexShrink: 0 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {/* Detaljer */}
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #e4f1f2" }}>
          {inquiry.besked && (
            <div style={{
              margin: "14px 0 12px",
              background: "#f5fafa", borderLeft: "3px solid #0fa4af",
              padding: "10px 14px", borderRadius: "0 4px 4px 0",
              fontSize: "0.9rem", whiteSpace: "pre-wrap", color: "#003135",
            }}>
              {inquiry.besked}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            {/* Opret sag */}
            <Link
              href={`/workspace/new?${sagParams}`}
              style={{
                padding: "8px 14px", background: "#003135", color: "#fff",
                borderRadius: "4px", textDecoration: "none", fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              + Opret sag
            </Link>

            {/* Konverter til lead */}
            <Link
              href={`/leads/new?${sagParams}`}
              style={{
                padding: "8px 14px", background: "#0fa4af", color: "#fff",
                borderRadius: "4px", textDecoration: "none", fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              → Konverter til lead
            </Link>

            {/* Arkiver */}
            {inquiry.status !== "arkiveret" && (
              <button
                onClick={() => changeStatus("arkiveret")}
                disabled={loading}
                style={{
                  padding: "8px 14px", background: "none",
                  border: "1px solid #d1d5db", color: "#6b7280",
                  borderRadius: "4px", fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Arkiver
              </button>
            )}

            {/* Genaktiver */}
            {inquiry.status === "arkiveret" && (
              <button
                onClick={() => changeStatus("set")}
                disabled={loading}
                style={{
                  padding: "8px 14px", background: "none",
                  border: "1px solid #0fa4af", color: "#0fa4af",
                  borderRadius: "4px", fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Genaktiver
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IndbakkeClient({ initialInquiries }) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [filter, setFilter] = useState("aktive"); // "aktive" | "alle"
  const [lastPoll, setLastPoll] = useState(null);
  const knownIds = useRef(new Set(initialInquiries.map((i) => i.id)));

  // Poll hvert 30 sekunder for nye henvendelser
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/inquiries");
        if (!res.ok) return;
        const fresh = await res.json();
        setInquiries((prev) => {
          // Tilføj nye — bevar lokale statusændringer på eksisterende
          const prevMap = new Map(prev.map((i) => [i.id, i]));
          const merged = fresh.map((i) => prevMap.get(i.id) || i);
          // Tjek om der er nye (til at opdatere lastPoll-indikator)
          const hasNew = fresh.some((i) => !knownIds.current.has(i.id));
          fresh.forEach((i) => knownIds.current.add(i.id));
          if (hasNew) setLastPoll(new Date());
          return merged;
        });
      } catch {}
    }
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, []);

  function handleStatusChange(id, status) {
    setInquiries((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    );
  }

  const visible = filter === "aktive"
    ? inquiries.filter((i) => i.status !== "arkiveret")
    : inquiries;

  const nyCount = inquiries.filter((i) => i.status === "ny").length;

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#003135", fontWeight: 800 }}>
            Indbakke
            {nyCount > 0 && (
              <span style={{
                marginLeft: "10px", background: "#ef4444", color: "#fff",
                fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px",
                borderRadius: "20px", verticalAlign: "middle",
              }}>
                {nyCount} nye
              </span>
            )}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#5a7a7d" }}>
            Henvendelser fra kontaktformularen på buildone.dk
          </p>
        </div>

        {/* Filter-tabs */}
        <div style={{ display: "flex", gap: "4px", background: "#e4f1f2", borderRadius: "6px", padding: "3px" }}>
          {[["aktive", "Aktive"], ["alle", "Alle"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                padding: "6px 14px", border: "none", borderRadius: "4px",
                fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
                background: filter === val ? "#fff" : "transparent",
                color: filter === val ? "#003135" : "#5a7a7d",
                boxShadow: filter === val ? "0 1px 3px rgba(0,49,53,0.1)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {visible.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          color: "#5a7a7d", border: "2px dashed #cde4e6",
          borderRadius: "8px",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📭</div>
          <div style={{ fontWeight: 600 }}>Ingen henvendelser at vise</div>
          <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>
            {filter === "aktive" ? "Alle er arkiverede — skift til 'Alle' for at se dem." : "Der er ikke modtaget nogen henvendelser endnu."}
          </div>
        </div>
      ) : (
        visible.map((inq) => (
          <InquiryCard key={inq.id} inquiry={inq} onStatusChange={handleStatusChange} />
        ))
      )}
    </div>
  );
}
