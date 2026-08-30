import "./globals.css";
import Link from "next/link";
import { getCurrentEmployee } from "../lib/session";
import { isSuperadmin } from "../lib/employees";
import HeaderSearch from "./HeaderSearch";
import NavAvatar from "./NavAvatar";
import NavLinks from "./NavLinks";
import NavNewTicket from "./NavNewTicket";

export const metadata = {
  title: "BuildOne — Sagsstyring",
  description: "Internt system til at oprette og følge kundesager og hjemmesidebyggerier.",
};

export default function RootLayout({ children }) {
  const employee = getCurrentEmployee();
  const superadmin = isSuperadmin(employee);

  return (
    <html lang="da">
      <body>
        {employee && (
          <header style={{
            position: "sticky", top: 0, zIndex: 40,
            background: "#003135",
            borderBottom: "1px solid #024950",
          }}>
            <nav style={{
              maxWidth: "1200px", margin: "0 auto",
              padding: "0 28px", height: "60px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <Link href="/" style={{
                fontWeight: 700, fontSize: "1.1rem",
                color: "#ffffff", letterSpacing: "-0.01em",
                display: "flex", alignItems: "center", gap: "10px",
                textDecoration: "none", flexShrink: 0,
              }}>
                <img src="/logo.png" alt="BuildOne logo" style={{ width: "28px", height: "28px", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
                BuildOne
              </Link>

              <HeaderSearch />

              <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
                {/* NavLinks er client-side og filtrerer efter localStorage mode */}
                <NavLinks superadmin={superadmin} />

                <NavNewTicket />

                <NavAvatar name={employee.name} email={employee.email || ""} />
              </div>
            </nav>
          </header>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
