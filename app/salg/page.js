import Link from "next/link";
import { getCurrentEmployee } from "../../lib/session";
import { isSuperadmin } from "../../lib/employees";
import { salgStats, leaderboard, listCustomers } from "../../lib/customers";

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

function monthsActive(iso) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44)));
}

function StatBox({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#5a7a7d", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#003135", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: "#5a7a7d", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

export default function SalgPage() {
  const employee = getCurrentEmployee();
  if (!employee) return null;
  const superadmin = isSuperadmin(employee);

  const mine = salgStats(employee.id);
  const lbData = superadmin ? leaderboard() : null;
  const allAktive = superadmin ? listCustomers({ status: "aktiv" }).filter(c => c.abonnementPris) : null;
  const totalMrr = superadmin ? (allAktive?.reduce((s,c) => s + c.abonnementPris, 0) || 0) : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div style={{ marginBottom: "28px" }}>
        <h1 className="font-sans" style={{ fontSize: "1.8rem", color: "#003135", marginBottom: "4px" }}>Salg</h1>
        <p style={{ fontSize: "0.82rem", color: "#5a7a7d" }}>Dine lukkede salg og løbende abonnementer</p>
      </div>

      {/* MINE STATS */}
      <h2 style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5a7a7d", marginBottom: "12px" }}>
        {superadmin ? "Mine tal" : "Dine tal"}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "28px" }}>
        <StatBox label="Lukkede salg" value={mine.totalKunder} sub="aktive abonnenter" />
        <StatBox label="MRR" value={`${mine.mrr.toLocaleString("da-DK")} kr`} sub="din månedlige omsætning" />
        <StatBox label="ARR" value={`${mine.arr.toLocaleString("da-DK")} kr`} sub="annualiseret" />
        <StatBox label="Indbringet i alt" value={`${mine.totalIndbringet.toLocaleString("da-DK")} kr`} sub="siden første salg" />
      </div>

      {/* MINE KUNDER TABEL */}
      {mine.kunder.length === 0 ? (
        <div className="card" style={{ padding: "28px", textAlign: "center", marginBottom: "32px" }}>
          <p style={{ color: "#5a7a7d", fontSize: "0.85rem" }}>Du har ikke lukket nogen salg endnu.<br/>Gå til Leads og konverter en potentiel kunde.</p>
          <Link href="/leads" className="btn btn-primary" style={{ marginTop: "14px", display: "inline-block" }}>Gå til Leads</Link>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: "32px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1.5px solid #e4f1f2" }}>
                {["Kunde", "Abonnement", "Pris/md", "Go-live", "Måneder aktiv", "Total indbringet", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5a7a7d" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mine.kunder.map((k, i) => {
                const mdr = k.monthsActive;
                const total = k.abonnementPris * mdr;
                return (
                  <tr key={k.id} style={{ borderBottom: i < mine.kunder.length - 1 ? "1px solid #f0f8f9" : "none" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#003135" }}>{k.navn}</div>
                      {k.domæne && <div style={{ fontSize: "0.72rem", color: "#5a7a7d" }}>{k.domæne}</div>}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: "#5a7a7d" }}>
                      {k.abonnementType ? k.abonnementType.charAt(0).toUpperCase() + k.abonnementType.slice(1) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: "0.87rem", color: "#003135" }}>
                      {k.abonnementPris?.toLocaleString("da-DK")} kr
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#5a7a7d" }}>{fmt(k.abonnementStartDato)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#003135", fontWeight: 600 }}>
                      {mdr} {mdr === 1 ? "md" : "mdr"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#0fa4af", fontWeight: 600 }}>
                      {total.toLocaleString("da-DK")} kr
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/kunder/${k.id}`} className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "4px 10px" }}>Profil</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SUPERADMIN: Leaderboard — måneds-basis */}
      {superadmin && lbData && (
        <>
          <div style={{ height: "1px", background: "#cde4e6", margin: "8px 0 28px" }} />
          <h2 style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5a7a7d", marginBottom: "8px" }}>
            Virksomhedens samlede aktive abonnementer
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "28px" }}>
            <StatBox label="Total MRR" value={`${totalMrr?.toLocaleString("da-DK")} kr`} sub="alle sælgere" />
            <StatBox label="Total ARR" value={`${((totalMrr||0)*12).toLocaleString("da-DK")} kr`} />
            <StatBox label="Aktive kunder i alt" value={allAktive?.length || 0} />
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5a7a7d" }}>
              Leaderboard
            </h2>
            <span style={{ fontSize: "0.72rem", color: "#0fa4af", fontWeight: 600 }}>
              {lbData.maaned}
            </span>
            <span style={{ fontSize: "0.7rem", color: "#5a7a7d" }}>— nye salg denne måned</span>
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid #e4f1f2" }}>
                  {["#", "Sælger", "Lukkede salg", "MRR", "Rolle"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5a7a7d" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lbData.board.map((emp, i) => (
                  <tr key={emp.id} style={{ borderBottom: i < lbData.board.length - 1 ? "1px solid #f0f8f9" : "none", background: i === 0 && emp.lukkedeSalg > 0 ? "rgba(15,164,175,0.03)" : "transparent" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: i === 0 && emp.lukkedeSalg > 0 ? "#0fa4af" : "#5a7a7d", fontSize: "0.9rem" }}>
                      {i === 0 && emp.lukkedeSalg > 0 ? "🥇" : i + 1}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.87rem", color: "#003135" }}>{emp.name}</div>
                      {emp.email && <div style={{ fontSize: "0.72rem", color: "#5a7a7d" }}>{emp.email}</div>}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: "1rem", color: "#003135" }}>{emp.lukkedeSalg}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: "0.87rem", color: emp.mrr > 0 ? "#0fa4af" : "#5a7a7d" }}>
                      {emp.mrr.toLocaleString("da-DK")} kr
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.78rem", color: "#5a7a7d" }}>
                      {emp.rolle === "superadmin" ? "Superadmin" : "Medarbejder"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
