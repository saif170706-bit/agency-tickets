"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const employeeId = params.get("id");
  const isReset = params.get("reset") === "1";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("Adgangskoderne matcher ikke."); return; }
    if (password.length < 8) { setError("Mindst 8 tegn krævet."); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, password, confirm }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Der skete en fejl."); return; }
    router.push("/");
    router.refresh();
  }

  if (!employeeId) {
    return (
      <div className="card" style={{ padding: "40px", maxWidth: "400px", textAlign: "center" }}>
        <p style={{ color: "#8c2f2f" }}>Ugyldigt link — kontakt din administrator.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: "40px", width: "100%", maxWidth: "400px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "#003135", marginBottom: "6px" }}>
          {isReset ? "Nulstil adgangskode" : "Sæt din adgangskode"}
        </div>
        <p style={{ fontSize: "0.83rem", color: "#5a7a7d" }}>
          {isReset
            ? "Din adgangskode er blevet nulstillet. Vælg en ny."
            : "Velkommen! Vælg en adgangskode til din konto — mindst 8 tegn."}
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5a7a7d", display: "block", marginBottom: "5px" }}>
          Ny adgangskode
        </label>
        <input
          type="password"
          className="input"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mindst 8 tegn"
          required
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5a7a7d", display: "block", marginBottom: "5px" }}>
          Bekræft adgangskode
        </label>
        <input
          type="password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Gentag adgangskode"
          required
        />
      </div>

      {/* Strength indicator */}
      {password && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ height: "4px", borderRadius: "2px", background: "#e4f1f2", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "2px", transition: "width 0.3s",
              width: password.length >= 12 ? "100%" : password.length >= 10 ? "70%" : password.length >= 8 ? "40%" : "15%",
              background: password.length >= 12 ? "#0fa4af" : password.length >= 10 ? "#4caf82" : password.length >= 8 ? "#f0a500" : "#c95c5c",
            }} />
          </div>
          <div style={{ fontSize: "0.68rem", color: "#5a7a7d", marginTop: "4px" }}>
            {password.length >= 12 ? "Stærk" : password.length >= 10 ? "God" : password.length >= 8 ? "Acceptabel" : "For kort"}
          </div>
        </div>
      )}

      {error && <p style={{ color: "#8c2f2f", fontSize: "0.82rem", marginBottom: "14px" }}>{error}</p>}

      <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
        {loading ? "Gemmer…" : "Sæt adgangskode og log ind"}
      </button>
    </form>
  );
}
