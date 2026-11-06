import { createContext, useContext } from "react";
import type { AuditRuntime } from "./auditRepository";

export const AuditRuntimeContext = createContext<AuditRuntime | null>(null);
export function useAuditRuntime() {
  const runtime = useContext(AuditRuntimeContext);
  if (!runtime) throw new Error("Auditoría requiere su provider.");
  return runtime;
}
