"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    // Første-login: ingen adgangskode sat endnu
    if (res.ok && data.firstLogin) {
      router.push(`/set-password?id=${data.employeeId}`);
      return;
    }

    if (!res.ok) {
      setError(data.error || "Forkert e-mail eller adgangskode.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card p-10 w-full max-w-sm">
      <h1 className="font-sans text-2xl text-dark mb-1">Log ind</h1>
      <p className="text-muted text-sm mb-8">Sagsstyring — BuildOne</p>

      <div className="mb-5">
        <label className="label" htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          autoComplete="email"
          placeholder="navn@buildone.dk"
        />
      </div>
      <div className="mb-2">
        <label className="label" htmlFor="password">Adgangskode</label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <p style={{ fontSize: "0.72rem", color: "#5a7a7d", marginBottom: "20px" }}>
        Ny bruger? Lad adgangskode-feltet stå tomt — du sættes videre til at oprette en.
      </p>
      {error && <p className="text-danger text-sm mb-5">{error}</p>}
      <button className="btn btn-primary w-full" type="submit" disabled={loading}>
        {loading ? "Logger ind…" : "Log ind"}
      </button>
    </form>
  );
}
