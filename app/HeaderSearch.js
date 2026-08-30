"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

function StatusDot({ status, isClosed }) {
  if (isClosed !== undefined) {
    // Sag
    return (
      <span style={{
        display: "inline-block", width: "7px", height: "7px", borderRadius: "50%",
        background: isClosed ? "#cde4e6" : "#0fa4af", flexShrink: 0,
      }} />
    );
  }
  // Kunde
  const color = status === "aktiv" ? "#0fa4af" : status === "inaktiv" ? "#8c2f2f" : "#5a7a7d";
  return (
    <span style={{
      display: "inline-block", width: "7px", height: "7px", borderRadius: "50%",
      background: color, flexShrink: 0,
    }} />
  );
}

export default function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState(null); // null = not searched yet
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const allResults = results
    ? [
        ...( results.customers || []).map((c) => ({ ...c, _nav: `/kunder/${c.id}` })),
        ...(results.tickets || []).map((t) => ({ ...t, _nav: `/tickets/${t.ref}` })),
      ]
    : [];

  const search = useCallback(async (val) => {
    if (!val.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults(null);
    }
    setLoading(false);
    setActiveIdx(-1);
  }, []);

  function onChange(e) {
    const val = e.target.value;
    setQ(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults(null); return; }
    debounceRef.current = setTimeout(() => search(val), 200);
  }

  function navigate(item) {
    router.push(item._nav);
    setQ("");
    setResults(null);
    inputRef.current?.blur();
  }

  function onKeyDown(e) {
    if (!allResults.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, allResults.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && allResults[activeIdx]) navigate(allResults[activeIdx]);
    }
    if (e.key === "Escape") { setResults(null); setQ(""); inputRef.current?.blur(); }
  }

  // Luk dropdown ved klik udenfor
  useEffect(() => {
    function handle(e) {
      if (!dropdownRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setResults(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const showDrop = focused && q.trim() && (loading || results !== null);
  const hasResults = results && (results.customers?.length || results.tickets?.length);

  return (
    <div style={{ flex: 1, minWidth: 0, maxWidth: "380px", margin: "0 24px", position: "relative" }}>
      {/* Input */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"
          style={{ position: "absolute", left: "12px", width: "16px", height: "16px",
            color: focused ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)",
            pointerEvents: "none", transition: "color 0.15s", flexShrink: 0 }}>
          <circle cx="9" cy="9" r="6" />
          <line x1="13.5" y1="13.5" x2="17" y2="17" />
        </svg>
        <input
          ref={inputRef}
          value={q}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Søg kunde, sag, CVR, navn…"
          autoComplete="off"
          style={{
            width: "100%",
            background: focused ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${focused ? "rgba(15,164,175,0.6)" : "rgba(255,255,255,0.12)"}`,
            borderRadius: showDrop ? "3px 3px 0 0" : "3px",
            padding: "8px 12px 8px 36px",
            fontSize: "0.87rem",
            color: "#fff",
            fontFamily: "inherit",
            outline: "none",
            transition: "background 0.15s, border-color 0.15s",
          }}
        />
      </div>

      {/* Dropdown */}
      {showDrop && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
            background: "#fff",
            border: "1px solid #cde4e6",
            borderTop: "none",
            borderRadius: "0 0 4px 4px",
            boxShadow: "0 8px 24px rgba(0,49,53,0.15)",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          {loading && (
            <div style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#5a7a7d" }}>Søger…</div>
          )}

          {!loading && !hasResults && (
            <div style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#5a7a7d" }}>
              Ingen resultater for &ldquo;{q}&rdquo;
            </div>
          )}

          {!loading && hasResults && (() => {
            let idx = -1;
            return (
              <>
                {results.customers?.length > 0 && (
                  <>
                    <div style={{ padding: "8px 16px 4px", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a7a7d", borderBottom: "1px solid #f0f8f9" }}>
                      Kunder
                    </div>
                    {results.customers.map((c) => {
                      idx++;
                      const localIdx = idx;
                      const isActive = activeIdx === localIdx;
                      const statusTekst = c.status === "aktiv" ? "Aktiv" : c.status === "inaktiv" ? "Inaktiv" : "Potentiel";
                      return (
                        <div
                          key={c.id}
                          onMouseDown={() => navigate({ ...c, _nav: `/kunder/${c.id}` })}
                          onMouseEnter={() => setActiveIdx(localIdx)}
                          style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            background: isActive ? "#f0f8f9" : "transparent",
                            display: "flex", alignItems: "center", gap: "10px",
                            borderBottom: "1px solid #f8fcfc",
                          }}
                        >
                          <StatusDot status={c.status} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#003135", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {c.navn}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#5a7a7d" }}>
                              {c.kontaktperson ? `${c.kontaktperson} · ` : ""}{c.cvrNummer ? `CVR ${c.cvrNummer}` : statusTekst}
                            </div>
                          </div>
                          <span style={{ fontSize: "0.68rem", color: "#5a7a7d", flexShrink: 0 }}>→ profil</span>
                        </div>
                      );
                    })}
                  </>
                )}

                {results.tickets?.length > 0 && (
                  <>
                    <div style={{ padding: "8px 16px 4px", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a7a7d", borderBottom: "1px solid #f0f8f9", marginTop: results.customers?.length ? "4px" : 0 }}>
                      Sager
                    </div>
                    {results.tickets.map((t) => {
                      idx++;
                      const localIdx = idx;
                      const isActive = activeIdx === localIdx;
                      return (
                        <div
                          key={t.id}
                          onMouseDown={() => navigate({ ...t, _nav: `/tickets/${t.ref}` })}
                          onMouseEnter={() => setActiveIdx(localIdx)}
                          style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            background: isActive ? "#f0f8f9" : "transparent",
                            display: "flex", alignItems: "center", gap: "10px",
                            borderBottom: "1px solid #f8fcfc",
                          }}
                        >
                          <StatusDot isClosed={t.isClosed} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#003135", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {t.title}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#5a7a7d" }}>
                              {t.ref}{t.customerName ? ` · ${t.customerName}` : ""} · {t.statusLabel}
                            </div>
                          </div>
                          <span style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#5a7a7d", flexShrink: 0 }}>{t.ref}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
