"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";

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

  // useLayoutEffect: kører synkront inden browseren maler → ingen flash
  useLayoutEffect(() => {
    setMode(readMode());
    function handler() { setMode(readMode()); }
    window.addEventListener("nordlys_mode_change", handler);
    return () => window.removeEventListener("nordlys_mode_change", handler);
  }, []);

  const allowed = MODE_LINKS[mode] || MODE_LINKS["alt"];
  const visible = ALL_LINKS.filter((l) => allowed.includes(l.id));

  return (
    <>
      {visible.map((l) => (
        <Link key={l.id} href={l.href} className="nav-link">{l.label}</Link>
      ))}
      {/* Indbakke vises altid — uanset mode */}
      {ALWAYS_LINKS.map((l) => (
        <Link key={l.id} href={l.href} className="nav-link">{l.label}</Link>
      ))}
      {/* Admin vises KUN til superadmin, uanset mode */}
      {superadmin && (
        <Link href="/admin" className="nav-link" style={{ color: "rgba(255,255,255,0.5)" }}>Admin</Link>
      )}
    </>
  );
}
