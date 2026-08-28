import "./globals.css";
import Link from "next/link";
import { getCurrentEmployee } from "../lib/session";
import HeaderSearch from "./HeaderSearch";

export const metadata = {
  title: "Sagsstyring — BuildOne",
  description: "Internt system til at oprette og følge kundesager og hjemmesidebyggerier.",
};

export default function RootLayout({ children }) {
  const employee = getCurrentEmployee();

  return (
    <html lang="da">
      <body>
        {employee && (
          <header className="sticky top-0 z-40 bg-bg border-b border-border">
            <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <Link href="/" className="font-serif text-lg text-navy flex items-center gap-2 shrink-0">
                Sagsstyring
              </Link>
              <HeaderSearch />
              <div className="flex items-center gap-6 text-sm shrink-0">
                <Link href="/" className="text-muted hover:text-navy">Dashboard</Link>
                <Link href="/workspace" className="text-muted hover:text-navy">Workspace</Link>
                <Link href="/leads" className="text-muted hover:text-navy">Leads</Link>
                <Link href="/domains" className="text-muted hover:text-navy">Domæner</Link>
                <Link href="/tickets/new" className="text-muted hover:text-navy">Ny sag</Link>
                <span className="text-muted">|</span>
                <span className="text-muted">{employee.name}</span>
                <form action="/api/logout" method="post">
                  <button className="btn btn-outline !py-2 !px-4 !text-xs" type="submit">Log ud</button>
                </form>
              </div>
            </nav>
          </header>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
