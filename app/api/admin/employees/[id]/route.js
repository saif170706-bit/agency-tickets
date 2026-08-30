import { NextResponse } from "next/server";
import { getCurrentEmployee } from "../../../../../lib/session";
import { isSuperadmin, deleteEmployee, updateEmployee, resetEmployeePassword } from "../../../../../lib/employees";

export async function PATCH(request, { params }) {
  const employee = getCurrentEmployee();
  if (!employee || !isSuperadmin(employee)) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));

  // Nulstil adgangskode (tvinger bruger til første-login ved næste login)
  if (body.action === "reset-password") {
    try {
      resetEmployeePassword(params.id);
      return NextResponse.json({ ok: true, message: "Adgangskode nulstillet — brugeren skal sætte ny ved næste login." });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
  }

  const fields = {};
  if (body.rolle) fields.rolle = body.rolle;
  if (body.name) fields.name = body.name.trim();
  if (body.email !== undefined) fields.email = body.email;
  try {
    const emp = updateEmployee(params.id, fields);
    return NextResponse.json({ ok: true, emp });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

export async function DELETE(_, { params }) {
  const employee = getCurrentEmployee();
  if (!employee || !isSuperadmin(employee)) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }
  if (params.id === employee.id) {
    return NextResponse.json({ error: "Du kan ikke slette dig selv" }, { status: 400 });
  }
  try {
    deleteEmployee(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
