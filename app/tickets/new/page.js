import { getCurrentEmployee } from "../../../lib/session";
import { getCustomer } from "../../../lib/customers";
import NewTicketForm from "./NewTicketForm";

export default function NewTicketPage({ searchParams }) {
  const employee = getCurrentEmployee();
  if (!employee) return null;

  // Hvis siden åbnes fra en kundeprofil medfølger kundeId i URL
  const kundeId = searchParams?.kundeId || null;
  const kunde = kundeId ? getCustomer(kundeId) : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-sans text-3xl text-dark mb-1">Ny sag</h1>
      {kunde ? (
        <p className="text-muted text-sm mb-10">
          Sagen oprettes til <strong>{kunde.navn}</strong> — kontaktoplysninger hentes fra kundeprofilen.
        </p>
      ) : (
        <p className="text-muted text-sm mb-10">
          Kunden modtager automatisk en SMS og e-mail med link til deres statusside.
        </p>
      )}
      <NewTicketForm kunde={kunde} />
    </div>
  );
}
