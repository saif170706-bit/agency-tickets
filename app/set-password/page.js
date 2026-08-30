import { Suspense } from "react";
import SetPasswordForm from "./SetPasswordForm";

export default function SetPasswordPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f8f9" }}>
      <Suspense fallback={null}>
        <SetPasswordForm />
      </Suspense>
    </div>
  );
}
