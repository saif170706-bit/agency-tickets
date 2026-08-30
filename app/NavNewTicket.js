"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";

function readMode() {
  try { return localStorage.getItem("nordlys_mode") || "alt"; } catch { return "alt"; }
}

// "+" knap til ny sag — skjult i sælger-mode
export default function NavNewTicket() {
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    function sync() { setVisible(readMode() !== "saelger"); }
    sync();
    window.addEventListener("nordlys_mode_change", sync);
    return () => window.removeEventListener("nordlys_mode_change", sync);
  }, []);

  if (!visible) return null;

  return (
    <Link href="/tickets/new" title="Ny sag" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: "32px", height: "32px", borderRadius: "50%",
      background: "rgba(15,164,175,0.15)", border: "1.5px solid rgba(15,164,175,0.5)",
      color: "#0fa4af", fontSize: "1.3rem", fontWeight: 700, lineHeight: 1,
      transition: "background 0.15s, border-color 0.15s",
    }}>+</Link>
  );
}
