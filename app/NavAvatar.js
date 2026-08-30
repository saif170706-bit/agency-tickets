"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";

const MODES = [
  {
    id: "alt",
    label: "Vis alt",
    icon: "⊞",
    desc: "Alle sektioner — kunder, sager, leads, salg",
  },
  {
    id: "saelger",
    label: "Sælger",
    icon: "📈",
    desc: "Kunder, leads og salgsstatistik",
  },
  {
    id: "support",
    label: "Teknisk support",
    icon: "🛠",
    desc: "Sager og hjemmesidebyggeri",
  },
];

export default function NavAvatar({ name, email }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("alt");
  const ref = useRef(null);

  // Læs gemt mode fra localStorage — useLayoutEffect forhindrer flash
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem("nordlys_mode");
      if (saved && MODES.find((m) => m.id === saved)) setMode(saved);
    } catch {}
  }, []);

  // Skift mode og gem
  function changeMode(id) {
    setMode(id);
    try { localStorage.setItem("nordlys_mode", id); } catch {}
    // Reload nav ved mode-skift — NavLinks henter fra localStorage ved mount
    window.dispatchEvent(new Event("nordlys_mode_change"));
  }

  // Luk dropdown ved klik udenfor
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const activeMode = MODES.find((m) => m.id === mode) || MODES[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={name}
        style={{
          width: "36px", height: "36px", borderRadius: "50%",
          background: open ? "#0fa4af" : "rgba(15,164,175,0.25)",
          border: "2px solid rgba(15,164,175,0.6)",
          color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "inherit", letterSpacing: "0.02em",
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        {initials}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          background: "#fff", border: "1px solid #cde4e6",
          borderRadius: "6px", boxShadow: "0 8px 24px rgba(0,49,53,0.14)",
          minWidth: "240px", zIndex: 100, overflow: "hidden",
        }}>
          {/* Brugerinfo */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e4f1f2" }}>
            <div style={{ fontSize: "0.68rem", color: "#5a7a7d", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Logget ind som</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#003135" }}>{name}</div>
            {email && <div style={{ fontSize: "0.75rem", color: "#5a7a7d", marginTop: "1px" }}>{email}</div>}
          </div>

          {/* Layout-mode */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e4f1f2" }}>
            <div style={{ fontSize: "0.68rem", color: "#5a7a7d", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Visningsmode</div>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => changeMode(m.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  width: "100%", padding: "8px 10px", marginBottom: "4px",
                  borderRadius: "4px", border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: mode === m.id ? "#e0f7f8" : "transparent",
                  textAlign: "left", transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (mode !== m.id) e.currentTarget.style.background = "#f0f8f9"; }}
                onMouseLeave={(e) => { if (mode !== m.id) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: mode === m.id ? "#003135" : "#5a7a7d" }}>{m.label}</div>
                  <div style={{ fontSize: "0.68rem", color: "#7a9ea0" }}>{m.desc}</div>
                </div>
                {mode === m.id && (
                  <span style={{ marginLeft: "auto", color: "#0fa4af", fontSize: "0.9rem" }}>✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Log ud */}
          <form action="/api/logout" method="post">
            <button
              type="submit"
              style={{
                width: "100%", padding: "12px 16px", background: "none",
                border: "none", textAlign: "left", fontSize: "0.88rem",
                fontWeight: 600, color: "#8c2f2f", cursor: "pointer",
                fontFamily: "inherit", transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              Log ud
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
