import { useOutletContext } from "react-router-dom";

export interface AuditHistoryContext {
  denyAccess: (message: string | undefined) => void;
}
export function useAuditHistoryContext() {
  return useOutletContext<AuditHistoryContext>();
}
