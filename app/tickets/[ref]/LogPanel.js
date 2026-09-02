function StatusPillMini({ label }) {
  const closed = label === "Afsluttet";
  return (
    <span className={`status-pill !py-1 !px-3 !text-xs ${closed ? "is-closed" : "is-open"}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

export default function LogPanel({ logs }) {
  return (
    <div>
      <h2 className="font-sans text-lg text-dark mb-4">Aktivitetslog</h2>
      {logs.length === 0 ? (
        <p className="text-muted text-sm">Ingen aktivitet endnu.</p>
      ) : (
        <div className="space-y-0">
          {logs.map((l, i) => (
            <div key={l.id} className={`flex gap-4 py-3 ${i !== logs.length - 1 ? "border-b border-border" : ""}`}>
              <div className="text-xs text-muted w-36 shrink-0">
                {new Date(l.createdAt).toLocaleDateString("da-DK")}
                <br />
                {new Date(l.createdAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div>
                {l.meta?.type === "status" ? (
                  <p className="text-sm text-dark flex items-center gap-2 flex-wrap">
                    Ændrede status fra <StatusPillMini label={l.meta.from} /> til <StatusPillMini label={l.meta.to} />
                  </p>
                ) : (
                  <p className="text-sm text-dark">{l.text}</p>
                )}
                <p className="text-xs text-accent mt-1">{l.employeeName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
