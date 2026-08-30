import { redirect } from "next/navigation";
import { getCurrentEmployee } from "../../lib/session";
import { isSuperadmin, listEmployees } from "../../lib/employees";
import { listCustomers, salgStats } from "../../lib/customers";
import AdminClient from "./AdminClient";

export default function AdminPage() {
  const employee = getCurrentEmployee();
  if (!employee || !isSuperadmin(employee)) redirect("/");

  const employees = listEmployees();
  const allCustomers = listCustomers();

  // Berig medarbejdere med salgstal
  const employeesWithStats = employees.map((emp) => {
    const stats = salgStats(emp.id);
    return { ...emp, lukkedeSalg: stats.totalKunder, mrr: stats.mrr };
  });

  const stats = {
    totalEmployees: employees.length,
    totalCustomers: allCustomers.length,
    aktiveKunder: allCustomers.filter(c => c.status === "aktiv").length,
    potentielleKunder: allCustomers.filter(c => c.status === "potentiel").length,
    totalMrr: allCustomers.filter(c=>c.status==="aktiv").reduce((s,c) => s+(c.abonnementPris||0), 0),
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div style={{ marginBottom: "28px" }}>
        <h1 className="font-sans" style={{ fontSize: "1.8rem", color: "#003135", marginBottom: "4px" }}>Admin</h1>
        <p style={{ fontSize: "0.82rem", color: "#5a7a7d" }}>Superadmin-panel · Kun synlig for dig</p>
      </div>

      <AdminClient
        employees={employeesWithStats}
        stats={stats}
        currentEmployeeId={employee.id}
      />
    </div>
  );
}
