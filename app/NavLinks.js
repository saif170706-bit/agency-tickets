"use client";

import Link from "next/link";
import { useLayoutEffect, useState, useEffect } from "react";

const MODE_LINKS = {
  alt: ["dashboard", "kunder", "workspace", "leads", "salg"],
  saelger: ["dashboard", "kunder", "leads", "salg"],
  support: ["dashboard", "workspace"],
};

const ALL_LINKS = [
  { id: "dashboard", href: "/", label: "Dashboard" },
  { id: "kunder", href: "/kunder", label: "Kunder" },
  { id: "workspace", href: "/workspace", label: "Sager" },
  { id: "leads", href: "/leads", label: "Leads" },
  { id: "salg", href: "/salg", label: "Salg" },
];

// Indbakke vises altid — uanset mode
const ALWAYS_LINKS = [
  { id: "indbakke", href: "/indbakke", label: "Indbakke" },
];

function readMode() {
  try { return localStorage.getItem("nordlys_mode") || "alt"; } catch { return "alt"; }
}

export default function NavLinks({ superadmin }) {
  const [mode, setMode] = useState("alt");
  const [nyCount, setNyCount] = useState(0);

  // useLayoutEffect: kører synkront inden browseren maler → ingen flash
  useLayoutEffect(() => {
    setMode(readMode());
    function handler() { setMode(readMode()); }
    window.addEventListener("nordlys_mode_change", handler);
    return () => window.removeEventListener("nordlys_mode_change", handler);
  }, []);

  // Poll antal nye henvendelser hvert 30 sek + opdater straks ved læsning
  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/inquiries");
        if (!res.ok) return;
        const data = await res.json();
        setNyCount(data.filter((i) => i.status === "ny").length);
      } catch {}
    }
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    window.addEventListener("indbakke_update", fetchCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener("indbakke_update", fetchCount);
    };
  }, []);

  const allowed = MODE_LINKS[mode] || MODE_LINKS["alt"];
  const visible = ALL_LINKS.filter((l) => allowed.includes(l.id));

  return (
    <>
      {visible.map((l) => (
        <Link key={l.id} href={l.href} className="nav-link">{l.label}</Link>
      ))}
      {/* Indbakke med badge — vises altid */}
      <Link href="/indbakke" className="nav-link" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        Indbakke
        {nyCount > 0 && (
          <span style={{
            background: "#ef4444",
            color: "#fff",
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "1px 6px",
            borderRadius: "20px",
            lineHeight: "1.5",
            minWidth: "18px",
            textAlign: "center",
          }}>
            {nyCount}
          </span>
        )}
      </Link>
      {/* Admin vises KUN til superadmin, uanset mode */}
      {superadmin && (
        <Link href="/admin" className="nav-link" style={{ color: "rgba(255,255,255,0.5)" }}>Admin</Link>
      )}
    </>
  );
}
