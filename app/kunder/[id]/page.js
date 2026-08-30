import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentEmployee } from "../../../lib/session";
import { getCustomer, getCustomerTickets } from "../../../lib/customers";
import KundeProfilClient from "./KundeProfilClient";

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
}

function monthsActive(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44)));
}

export default function KundeProfilPage({ params }) {
  const employee = getCurrentEmployee();
  if (!employee) return null;

  const kunde = getCustomer(params.id);
  if (!kunde) notFound();

  const tickets = getCustomerTickets(params.id);
  const mdr = monthsActive(kunde.abonnementStartDato);

  const statusColor = kunde.status === "aktiv" ? "#0fa4af" : kunde.status === "inaktiv" ? "#8c2f2f" : "#5a7a7d";
  const statusBg = kunde.status === "aktiv" ? "#e0f7f8" : kunde.status === "inaktiv" ? "#fdecea" : "#f0f8f9";
  const statusTekst = kunde.status === "aktiv" ? "Aktiv" : kunde.status === "inaktiv" ? "Inaktiv" : "Potentiel";

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Tilbage */}
      <Link href="/kunder" style={{ fontSize: "0.8rem", color: "#5a7a7d", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "20px" }}>
        ← Alle kunder
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "28px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h1 className="font-sans" style={{ fontSize: "1.8rem", color: "#003135", lineHeight: 1 }}>{kunde.navn}</h1>
            <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: statusBg, color: statusColor }}>{statusTekst}</span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#5a7a7d", marginTop: "6px" }}>
            {kunde.cvrNummer && <>CVR {kunde.cvrNummer} &nbsp;·&nbsp; </>}
            Konverteret af <strong>{kunde.sælgerNavn || "—"}</strong> &nbsp;·&nbsp; {fmt(kunde.konverteretDato)}
          </p>
        </div>
        {kunde.status !== "aktiv" && (
          <KundeProfilClient mode="aktiver-btn" kundeId={kunde.id} />
        )}
        {kunde.status === "aktiv" && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#003135" }}>{kunde.abonnementPris?.toLocaleString("da-DK")} kr/md</div>
            <div style={{ fontSize: "0.72rem", color: "#5a7a7d" }}>
              {kunde.abonnementType} &nbsp;·&nbsp; siden {fmt(kunde.abonnementStartDato)} &nbsp;·&nbsp; {mdr} {mdr === 1 ? "måned" : "måneder"}
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "28px" }}>
        {[
          { label: "Sager i alt", val: tickets.length },
          { label: "Åbne sager", val: tickets.filter(t => !t.isClosed).length },
          { label: "Domæne", val: kunde.domæne || "—" },
          { label: "Abonnement", val: kunde.abonnementPris ? `${kunde.abonnementPris} kr/md` : "Ikke aktivt" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#003135" }}>{s.val}</div>
            <div style={{ fontSize: "0.68rem", color: "#5a7a7d", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <KundeProfilClient
        mode="tabs"
        kunde={kunde}
        tickets={tickets}
        employee={employee}
      />
    </div>
  );
}
