import { Suspense } from "react";
import { useAuditRuntime } from "../services/AuditRuntimeContext";

export function AuditDataNotice() {
  const runtime = useAuditRuntime();
  const Tools = runtime.ReviewTools;
  if (!Tools) return null;
  return (
    <Suspense fallback={null}>
      <Tools />
    </Suspense>
  );
}
