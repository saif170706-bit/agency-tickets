import { getCurrentEmployee } from "../../../lib/session";
import NyKundeForm from "./NyKundeForm";

export default function NyKundePage({ searchParams }) {
  const employee = getCurrentEmployee();
  if (!employee) return null;

  // Prefill fra lead-query-params hvis konverteret fra lead
  const prefill = {
    navn: searchParams?.navn || "",
    cvrNummer: searchParams?.cvr || "",
    telefon: searchParams?.telefon || "",
    email: searchParams?.email || "",
    adresse: searchParams?.adresse || "",
    leadId: searchParams?.leadId || "",
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-sans text-3xl text-dark mb-1">Ny kunde</h1>
      <p className="text-muted text-sm mb-8">Udfyld oplysninger fra salgssamtalen. Abonnement aktiveres først når kunden betaler og går live.</p>
      <NyKundeForm prefill={prefill} />
    </div>
  );
}
