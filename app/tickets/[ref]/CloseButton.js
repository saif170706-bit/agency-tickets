"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CloseButton({ ticket, onChanged }) {
  const router = useRouter();
  const refresh = onChanged || (() => router.refresh());
  const [loading, setLoading] = useState(false);

  async function act(reopen) {
    if (!reopen && !confirm("Luk sagen? Alle hemmelige noter slettes automatisk.")) return;
    setLoading(true);
    await fetch(`/api/tickets/${ticket.ref}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reopen }),
    });
    setLoading(false);
    refresh();
  }

  if (ticket.isClosed) {
    return (
      <button className="btn btn-outline" disabled={loading} onClick={() => act(true)}>
        Genåbn sag
      </button>
    );
  }
  return (
    <button className="btn btn-danger" disabled={loading} onClick={() => act(false)}>
      Luk sag
    </button>
  );
}
