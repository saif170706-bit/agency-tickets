import Link from "next/link";
import { getCurrentEmployee } from "../../lib/session";
import { isSuperadmin } from "../../lib/employees";
import { listCustomers, getCustomerTickets } from "../../lib/customers";
import KunderSletKnap from "./KunderSletKnap";

function statusLabel(status) {
  if (status === "aktiv") return { label: "Aktiv", color: "#0fa4af", bg: "#e0f7f8" };
  if (status === "inaktiv") return { label: "Inaktiv", color: "#8c2f2f", bg: "#fdecea" };
  return { label: "Potentiel", color: "#5a7a7d", bg: "#f0f8f9" };
}

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

export default function KunderPage({ searchParams }) {
  const employee = getCurrentEmployee();
  if (!employee) return null;
  const superadmin = isSuperadmin(employee);

  const filterStatus = searchParams?.status || "alle";
  const all = listCustomers();
  const kunder = filterStatus === "alle" ? all : all.filter((c) => c.status === filterStatus);

  const tabs = [
    { key: "alle", label: "Alle", count: all.length },
    { key: "aktiv", label: "Aktive", count: all.filter((c) => c.status === "aktiv").length },
    { key: "potentiel", label: "Potentielle", count: all.filter((c) => c.status === "potentiel").length },
    { key: "inaktiv", label: "Inaktive", count: all.filter((c) => c.status === "inaktiv").length },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-sans text-3xl text-dark mb-1">Kunder</h1>
          <p className="text-muted text-sm">{all.length} kunder i alt &nbsp;·&nbsp; {all.filter(c=>c.status==="aktiv").length} aktive</p>
        </div>
        <Link href="/kunder/ny" className="btn btn-primary">+ Ny kunde</Link>
      </div>

      {/* Faner */}
      <div className="flex gap-1 mb-8 border-b border-border pb-0">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/kunder${t.key === "alle" ? "" : `?status=${t.key}`}`}
            style={{
              padding: "8px 16px",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: filterStatus === t.key ? "#003135" : "#5a7a7d",
              borderBottom: filterStatus === t.key ? "2px solid #0fa4af" : "2px solid transparent",
              marginBottom: "-1px",
              display: "flex", gap: "6px", alignItems: "center",
            }}
          >
            {t.label}
            <span style={{
              background: filterStatus === t.key ? "#0fa4af" : "#e4f1f2",
              color: filterStatus === t.key ? "#fff" : "#5a7a7d",
              borderRadius: "10px", fontSize: "0.65rem", fontWeight: 700,
              padding: "1px 7px",
            }}>{t.count}</span>
          </Link>
        ))}
      </div>

      {/* Tabel */}
      {kunder.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted text-sm mb-4">Ingen kunder her endnu.</p>
          <Link href="/kunder/ny" className="btn btn-primary">Opret første kunde</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1.5px solid #e4f1f2" }}>
                {["Virksomhed", "Kontakt", "Abonnement", "Sælger", "Oprettet", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5a7a7d" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kunder.map((k, i) => {
                const s = statusLabel(k.status);
                const mdr = k.abonnementPris ? `${k.abonnementPris} kr/md` : "—";
                const type = k.abonnementType ? `${k.abonnementType.charAt(0).toUpperCase()}${k.abonnementType.slice(1)}` : "";
                const sagCount = getCustomerTickets(k.id).length;
                return (
                  <tr key={k.id} style={{ borderBottom: i < kunder.length - 1 ? "1px solid #f0f8f9" : "none", transition: "background 0.1s" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.87rem", color: "#003135" }}>{k.navn}</div>
                      {k.cvrNummer && <div style={{ fontSize: "0.72rem", color: "#5a7a7d" }}>CVR {k.cvrNummer}</div>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#5a7a7d" }}>
                      <div>{k.kontaktperson || "—"}</div>
                      {k.email && <div style={{ fontSize: "0.72rem" }}>{k.email}</div>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 700, background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                      {k.abonnementPris && (
                        <div style={{ fontSize: "0.72rem", color: "#5a7a7d", marginTop: "4px" }}>{type} · {mdr}</div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#5a7a7d" }}>{k.sælgerNavn || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.72rem", color: "#5a7a7d" }}>{fmt(k.konverteretDato)}</td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <Link href={`/kunder/${k.id}`} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "5px 12px" }}>Åbn</Link>
                      {superadmin && (
                        <KunderSletKnap kundeId={k.id} kundeNavn={k.navn} sagCount={sagCount} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
