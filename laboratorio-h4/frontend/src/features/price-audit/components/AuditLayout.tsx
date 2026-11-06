import { useContext, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Text } from "@mantine/core";
import { FeedbackAlert } from "../../../components/shared";
import { DataModeContext } from "../../../app/config/DataModeContext";
import { AuditRuntimeContext } from "../services/AuditRuntimeContext";
import { createAuditRuntime } from "../services/auditService";
import type { AuditRuntime } from "../services/auditRepository";

export function AuditLayout() {
  const mode = useContext(DataModeContext);
  const injected = useContext(AuditRuntimeContext);
  const [loaded, setLoaded] = useState<{
    mode: string;
    runtime: AuditRuntime;
  }>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (injected || !mode) return;
    let active = true;
    void createAuditRuntime(mode).then(
      (runtime) => {
        if (active) setLoaded({ mode, runtime });
      },
      () => {
        if (active) setError("No se pudo iniciar el servicio de auditoría.");
      },
    );
    return () => {
      active = false;
    };
  }, [mode, injected]);
  const runtime =
    injected ?? (loaded?.mode === mode ? loaded.runtime : undefined);
  if (!mode)
    throw new Error("La aplicación requiere configurar su modo de datos.");
  if (!runtime)
    return error ? (
      <FeedbackAlert semantic="error" title="Auditoría no disponible">
        {error}
      </FeedbackAlert>
    ) : (
      <Text role="status">Cargando auditoría…</Text>
    );
  return (
    <AuditRuntimeContext.Provider value={runtime}>
      <Outlet />
    </AuditRuntimeContext.Provider>
  );
}
