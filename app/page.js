import { dashboardStats } from "../lib/tickets";
import { getCurrentEmployee } from "../lib/session";
import { listCustomers } from "../lib/customers";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  const employee = getCurrentEmployee();
  if (!employee) return null;

  const allCustomers = listCustomers();

  // Kun EGNE kunder (filtreret på sælgerId)
  const mineAktive = allCustomers.filter((c) => c.status === "aktiv" && c.sælgerId === employee.id);
  const minePotentielle = allCustomers.filter((c) => c.status === "potentiel" && c.sælgerId === employee.id);
  const mineMrr = mineAktive.filter(c => c.abonnementPris).reduce((s, c) => s + (c.abonnementPris || 0), 0);

  const mineStats = {
    aktive: mineAktive.length,
    potentielle: minePotentielle.length,
    mrr: mineMrr,
  };

  const ticketStats = dashboardStats();

  return (
    <DashboardClient
      employee={{ id: employee.id, name: employee.name }}
      mineStats={mineStats}
      ticketStats={ticketStats}
    />
  );
}
