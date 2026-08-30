"use client";

import { useRef, useState } from "react";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPanel({ ticket, documents, onChanged }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/tickets/${ticket.ref}/documents`, { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Upload fejlede.");
      return;
    }
    onChanged?.();
  }

  async function onDelete(docId, name) {
    if (!confirm(`Slet "${name}"?`)) return;
    await fetch(`/api/tickets/${ticket.ref}/documents/${docId}`, { method: "DELETE" });
    onChanged?.();
  }

  return (
    <div>
      <h2 className="font-sans text-lg text-dark mb-4">Dokumenter</h2>

      {!ticket.isClosed && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) upload(file);
          }}
          className={`border border-dashed rounded-md text-center py-10 px-6 cursor-pointer mb-5 transition-colors ${
            dragOver ? "border-dark bg-bgalt" : "border-border"
          }`}
        >
          <p className="text-sm text-dark">
            <span className="font-semibold underline">Klik for at uploade</span> eller træk og slip
          </p>
          <p className="text-xs text-muted mt-1">
            {uploading ? "Uploader…" : "PDF, billeder, video, Word-dokumenter — maks 80 MB"}
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>
      )}
      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {documents.length === 0 ? (
        <p className="text-muted text-sm">Ingen dokumenter endnu.</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bgalt text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Dokument</th>
                <th className="px-4 py-3 font-semibold">Størrelse</th>
                <th className="px-4 py-3 font-semibold">Uploadet</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <a
                      href={`/api/tickets/${ticket.ref}/documents/${d.id}`}
                      className="text-dark font-medium underline"
                    >
                      {d.originalName}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatSize(d.size)}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(d.uploadedAt).toLocaleDateString("da-DK")} · {d.uploadedBy}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!ticket.isClosed && (
                      <button onClick={() => onDelete(d.id, d.originalName)} className="text-muted hover:text-danger">
                        🗑
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
