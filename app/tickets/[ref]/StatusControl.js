"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SmsModal from "./SmsModal";

const SUPPORT_STATUSES = [
  "Henvendelse modtaget",
  "Arbejde på henvendelse er i gang",
  "Lukket",
];

// Statuser der indikerer at arbejdet er "i gang" → igang-SMS
const IGANG_KEYWORDS = ["i gang", "igangsat", "påbegynd", "starter", "design", "udvikling"];

function isIgangStatus(label) {
  const l = label.toLowerCase();
  return IGANG_KEYWORDS.some((k) => l.includes(k));
}

export default function StatusControl({ ticket, onChanged }) {
  const router = useRouter();
  const refresh = onChanged || (() => router.refresh());
  const [loading, setLoading] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [smsModal, setSmsModal] = useState(null); // null | "igang" | "lukket"

  async function setSupportStatus(statusLabel) {
    setLoading(true);
    await fetch(`/api/tickets/${ticket.ref}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusLabel }),
    });
    setLoading(false);
    refresh();

    // Vis SMS-modal hvis det er en relevant status
    if (statusLabel === "Lukket") {
      setSmsModal("lukket");
    } else if (isIgangStatus(statusLabel)) {
      setSmsModal("igang");
    }
  }

  async function setCurrentStep(stepId) {
    setLoading(true);
    const res = await fetch(`/api/tickets/${ticket.ref}/roadmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setCurrent", stepId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    refresh();

    // Find den nye status-label fra roadmap
    const step = ticket.roadmap.find((s) => s.id === stepId);
    const isFirst = ticket.roadmap[0]?.id === stepId;
    if (step && !isFirst) {
      // Tjek om det er et "igang"-trin (ikke første trin, ikke live/lukket)
      const label = (step.label || "").toLowerCase();
      const isLive = label.includes("live") || label.includes("færdig") || label.includes("afslut");
      setSmsModal(isLive ? "lukket" : "igang");
    }
  }

  async function addStep(e) {
    e.preventDefault();
    if (!newStep.trim()) return;
    setLoading(true);
    await fetch(`/api/tickets/${ticket.ref}/roadmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addStep", label: newStep.trim() }),
    });
    setNewStep("");
    setLoading(false);
    refresh();
  }

  function closeModal() {
    setSmsModal(null);
  }

  if (ticket.type === "support" || ticket.type === "vedligeholdelse") {
    return (
      <>
        <div>
          <h2 className="font-sans text-lg text-dark mb-3">Status</h2>
          <div className="panel space-y-2">
            {SUPPORT_STATUSES.map((s) => (
              <button
                key={s}
                disabled={loading || ticket.isClosed}
                onClick={() => setSupportStatus(s)}
                className={`w-full text-left px-4 py-3 rounded-md text-sm transition-colors ${
                  ticket.statusLabel === s
                    ? "bg-dark text-white"
                    : "bg-white text-dark border border-border hover:border-dark"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {smsModal && (
          <SmsModal ticket={ticket} stage={smsModal} onClose={closeModal} />
        )}
      </>
    );
  }

  // build / byggeri / opdatering — roadmap
  return (
    <>
      <div>
        <h2 className="font-sans text-lg text-dark mb-3">Status-roadmap</h2>
        <div className="panel space-y-2">
          {ticket.roadmap.map((step, i) => {
            const isCurrent = step.id === ticket.currentStepId;
            return (
              <button
                key={step.id}
                disabled={loading || ticket.isClosed}
                onClick={() => setCurrentStep(step.id)}
                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-md text-sm transition-colors ${
                  isCurrent
                    ? "bg-dark text-white"
                    : step.done
                    ? "bg-white text-dark border border-border"
                    : "bg-white text-muted border border-border"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="font-mono text-xs opacity-70">{i + 1}.</span>
                {step.label}
                {step.done && !isCurrent && <span className="ml-auto text-xs">✓</span>}
              </button>
            );
          })}
          {!ticket.isClosed && (
            <form onSubmit={addStep} className="flex gap-2 pt-1">
              <input
                className="input !bg-white"
                placeholder="Nyt trin…"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
              />
              <button className="btn btn-outline !text-xs !px-3" type="submit" disabled={loading}>
                Tilføj
              </button>
            </form>
          )}
        </div>
      </div>

      {smsModal && (
        <SmsModal ticket={ticket} stage={smsModal} onClose={closeModal} />
      )}
    </>
  );
}
