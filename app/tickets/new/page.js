import NewTicketForm from "./NewTicketForm";

export default function NewTicketPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl text-navy mb-1">Ny sag</h1>
      <p className="text-muted text-sm mb-10">
        Kunden modtager automatisk en SMS og e-mail med link til deres statusside.
      </p>
      <NewTicketForm />
    </div>
  );
}
