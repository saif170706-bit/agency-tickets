import { Suspense } from "react";
import WorkspaceClient from "./WorkspaceClient";

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="p-10 text-muted text-sm">Indlæser…</div>}>
      <WorkspaceClient />
    </Suspense>
  );
}
