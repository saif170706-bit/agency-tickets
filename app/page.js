import Link from "next/link";
import { dashboardStats } from "../lib/tickets";
import { getCurrentEmployee } from "../lib/session";

function StatCard({ label, count, href }) {
  return (
    <Link href={href} className="card p-6 hover:border-navy transition-colors block">
      <div className="text-sm font-semibold text-navy mb-8">{label}</div>
      <div className="font-serif text-4xl text-accent">{count}</div>
    </Link>
  );
}

export default function DashboardPage() {
  const employee = getCurrentEmployee();
  if (!employee) return null;

  const stats = dashboardStats();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-navy mb-1">Dashboard</h1>
          <p className="text-muted text-sm">Velkommen, {employee.name}.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/workspace" className="btn btn-outline">Åbn workspace</Link>
          <Link href="/tickets/new" className="btn btn-primary">+ Ny sag</Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-12">
        <StatCard label="Alle åbne sager" count={stats.totalActive} href="/workspace" />
        <StatCard label="Support-sager" count={stats.totalSupport} href="/workspace" />
        <StatCard label="Byggerier" count={stats.totalBuild} href="/workspace" />
        <StatCard label="Lukkede / arkiv" count={stats.totalClosed} href="/workspace" />
      </div>

      <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Status i aktive sager</h2>
      {stats.statusCards.length === 0 ? (
        <p className="text-muted text-sm">Ingen aktive sager endnu.</p>
      ) : (
        <div className="grid grid-cols-4 gap-5">
          {stats.statusCards.map((s) => (
            <StatCard key={s.label} label={s.label} count={s.count} href="/workspace" />
          ))}
        </div>
      )}
    </div>
  );
}
