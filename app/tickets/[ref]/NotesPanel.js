"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NotesPanel({ ticket, notes, onChanged }) {
  const router = useRouter();
  const refresh = onChanged || (() => router.refresh());
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  async function onSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    await fetch(`/api/tickets/${ticket.ref}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBody("");
    setLoading(false);
    refresh();
  }

  const visible = expanded ? notes : notes.slice(0, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-sans text-lg text-dark">
          Interne noter <span className="text-accent text-sm font-sans">{notes.length}</span>
        </h2>
        {notes.length > 1 && (
          <button onClick={() => setExpanded((v) => !v)} className="text-xs text-dark underline">
            {expanded ? "Vis færre" : "Vis alle"}
          </button>
        )}
      </div>

      {!ticket.isClosed && (
        <form onSubmit={onSubmit} className="panel mb-4">
          <textarea
            className="input mb-2"
            rows={2}
            placeholder="Fx: Har opdateret forsiden med nyt billede…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button className="btn btn-primary !text-xs" type="submit" disabled={loading}>
            {loading ? "Gemmer…" : "Gem note"}
          </button>
        </form>
      )}

      {notes.length === 0 ? (
        <p className="text-muted text-sm">Ingen noter endnu.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((n) => (
            <div key={n.id} className="panel !bg-[#f5f1e2]">
              <p className="text-sm text-dark whitespace-pre-wrap">{n.body}</p>
              <p className="text-xs text-muted mt-2">
                {new Date(n.createdAt).toLocaleDateString("da-DK")} kl.{" "}
                {new Date(n.createdAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })} af{" "}
                {n.employeeName}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
