"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const REVEAL_MS = 30000;

function SecretNoteCard({ ticket, note, onChanged }) {
  const router = useRouter();
  const refresh = onChanged || (() => router.refresh());
  const [revealed, setRevealed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function toggle() {
    if (revealed) {
      setRevealed(false);
      clearTimeout(timerRef.current);
      return;
    }
    setRevealed(true);
    timerRef.current = setTimeout(() => setRevealed(false), REVEAL_MS);
  }

  async function onDelete() {
    if (!confirm(`Slet "${note.title}"?`)) return;
    setDeleting(true);
    await fetch(`/api/tickets/${ticket.ref}/secret-notes/${note.id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="panel">
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-semibold text-dark text-[0.98rem]">{note.title}</h3>
        <button onClick={onDelete} disabled={deleting} className="text-muted hover:text-danger text-sm">
          🗑
        </button>
      </div>
      <label className="flex items-center gap-2 mb-3 cursor-pointer w-fit">
        <span className="toggle">
          <input type="checkbox" checked={revealed} onChange={toggle} />
          <span className="slider" />
        </span>
        <span className="text-xs text-muted">
          {revealed ? "Vist i 30 sekunder…" : "Vis"}
        </span>
      </label>

      {revealed ? (
        <p className="text-sm font-mono text-dark bg-white border border-border rounded-md px-3 py-2 whitespace-pre-wrap break-all">
          {note.body}
        </p>
      ) : (
        <p className="text-sm font-mono text-muted bg-white border border-border rounded-md px-3 py-2">
          {"•".repeat(Math.min(28, Math.max(10, note.body.length)))}
        </p>
      )}

      <p className="text-xs text-muted mt-3">
        {note.employeeName} · {new Date(note.createdAt).toLocaleString("da-DK")}
      </p>
    </div>
  );
}

export default function SecretNotesPanel({ ticket, secretNotes, onChanged }) {
  const router = useRouter();
  const refresh = onChanged || (() => router.refresh());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    await fetch(`/api/tickets/${ticket.ref}/secret-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setTitle("");
    setBody("");
    setLoading(false);
    setOpen(false);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-sans text-lg text-dark">Følsomme oplysninger</h2>
          <p className="text-xs text-muted">
            Skjult som standard. Klik på afsløringsknappen for at se i 30 sekunder. Slettes automatisk, når sagen lukkes.
          </p>
        </div>
        {!ticket.isClosed && (
          <button onClick={() => setOpen((v) => !v)} className="btn btn-outline !text-xs !py-2">
            {open ? "Annullér" : "+ Tilføj"}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={onSubmit} className="panel mb-5">
          <div className="mb-3">
            <label className="label">Titel</label>
            <input
              className="input"
              placeholder="Fx: Microsoft-login"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="label">Indhold</label>
            <textarea
              className="input font-mono"
              rows={3}
              placeholder="Fx: bruger@mail.dk / Adgangskode123"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <button className="btn btn-primary !text-xs" type="submit" disabled={loading}>
            {loading ? "Gemmer…" : "Gem"}
          </button>
        </form>
      )}

      {secretNotes.length === 0 ? (
        <p className="text-muted text-sm">
          {ticket.isClosed ? "Ingen følsomme oplysninger (slettet ved lukning)." : "Ingen følsomme oplysninger endnu."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {secretNotes.map((n) => (
            <SecretNoteCard key={n.id} ticket={ticket} note={n} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}
