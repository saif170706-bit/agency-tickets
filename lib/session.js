const { cookies } = require("next/headers");
const { COOKIE_NAME, employeeIdFromCookie, getEmployeeById } = require("./auth");

function getCurrentEmployee() {
  const jar = cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  const id = employeeIdFromCookie(raw);
  if (!id) return null;
  return getEmployeeById(id);
}

module.exports = { getCurrentEmployee };
