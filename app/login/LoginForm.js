"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [username, setUsername] = useState("");
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
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Forkert brugernavn eller adgangskode.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card p-10 w-full max-w-sm">
      <h1 className="font-serif text-2xl text-navy mb-1">Log ind</h1>
      <p className="text-muted text-sm mb-8">Sagsstyring — BuildOne</p>

      <div className="mb-5">
        <label className="label" htmlFor="username">Brugernavn</label>
        <input
          id="username"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="mb-6">
        <label className="label" htmlFor="password">Adgangskode</label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-danger text-sm mb-5">{error}</p>}
      <button className="btn btn-primary w-full" type="submit" disabled={loading}>
        {loading ? "Logger ind…" : "Log ind"}
      </button>
    </form>
  );
}
