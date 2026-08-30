"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function KunderSletKnap({ kundeId, kundeNavn, sagCount }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [valg, setValg] = useState("behold");
  const [loading, setLoading] = useState(false);

  async function onSlet() {
    setLoading(true);
    await fetch(`/api/customers/${kundeId}${valg === "alt" ? "?sager=true" : ""}`, { method: "DELETE" });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Slet kunde"
        style={{
          padding: "5px 10px", fontSize: "0.75rem", fontWeight: 600,
          background: "#fff5f5", color: "#8c2f2f",
          border: "1px solid #f0c5c5", borderRadius: "3px", cursor: "pointer", marginLeft: "6px",
        }}
      >
        🗑
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,49,53,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="card" style={{ padding: "24px", maxWidth: "400px", width: "100%" }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#003135", marginBottom: "6px" }}>Slet kundeprofil</div>
            <p style={{ fontSize: "0.82rem", color: "#5a7a7d", marginBottom: "16px" }}>
              <strong>{kundeNavn}</strong> har {sagCount} sag{sagCount !== 1 ? "er" : ""}.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              <label style={{ display: "flex", gap: "10px", padding: "12px", borderRadius: "6px", border: `1.5px solid ${valg === "behold" ? "#0fa4af" : "#cde4e6"}`, cursor: "pointer", background: valg === "behold" ? "#f0fcfd" : "#fff" }}>
                <input type="radio" name="sv" value="behold" checked={valg === "behold"} onChange={() => setValg("behold")} style={{ marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.83rem" }}>Slet kun profil — behold sager</div>
                  <div style={{ fontSize: "0.72rem", color: "#5a7a7d" }}>Sagerne forbliver i workspace.</div>
                </div>
              </label>
              <label style={{ display: "flex", gap: "10px", padding: "12px", borderRadius: "6px", border: `1.5px solid ${valg === "alt" ? "#8c2f2f" : "#cde4e6"}`, cursor: "pointer", background: valg === "alt" ? "#fff5f5" : "#fff" }}>
                <input type="radio" name="sv" value="alt" checked={valg === "alt"} onChange={() => setValg("alt")} style={{ marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.83rem", color: "#8c2f2f" }}>Slet alt — profil + alle sager</div>
                  <div style={{ fontSize: "0.72rem", color: "#5a7a7d" }}>Permanent. Kan ikke fortrydes.</div>
                </div>
              </label>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>Annuller</button>
              <button
                onClick={onSlet}
                disabled={loading}
                style={{ flex: 1, padding: "9px", borderRadius: "3px", fontWeight: 600, fontSize: "0.83rem", cursor: "pointer", border: "none", background: valg === "alt" ? "#8c2f2f" : "#003135", color: "#fff", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Sletter…" : "Bekræft slet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
