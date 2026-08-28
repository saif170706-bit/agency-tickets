"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/workspace?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex-1 min-w-0 max-w-sm mx-4">
      <div className="relative">
        <input
          className="input !bg-bgalt !py-2 !pr-9"
          placeholder="Søg sagsnummer, navn, tlf…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="submit"
          aria-label="Søg"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-navy"
        >
          🔍
        </button>
      </div>
    </form>
  );
}
