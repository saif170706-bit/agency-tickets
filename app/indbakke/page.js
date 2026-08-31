import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, employeeIdFromCookie, getEmployeeById } from "../../lib/auth";
import { listInquiries } from "../../lib/inquiries";
import IndbakkeClient from "./IndbakkeClient";

export const metadata = { title: "Indbakke — BuildOne" };

export default function IndbakkePage() {
  const cookieStore = cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  const employeeId = cookie ? employeeIdFromCookie(cookie.value) : null;
  if (!employeeId || !getEmployeeById(employeeId)) redirect("/login");

  const inquiries = listInquiries();

  return <IndbakkeClient initialInquiries={inquiries} />;
}
