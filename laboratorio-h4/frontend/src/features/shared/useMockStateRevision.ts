import { useEffect, useState } from "react";
import type { MockDomain } from "./mockState";

function isMockMode(): boolean {
  try {
    const env = (import.meta as ImportMeta & {
      env?: { VITE_DATA_MODE?: string; DEV?: boolean };
    }).env;
    if (!env) return false;
    if (env.VITE_DATA_MODE === "mock") return true;
    if (env.VITE_DATA_MODE === "api") return false;
    return env.DEV === true;
  } catch {
    return false;
  }
}

/**
 * Revisión reactiva que se incrementa cuando cualquiera de los dominios indicados
 * confirma un cambio, ya sea en esta pestaña (`publishMockChange`) o en otra
 * (`storage`). Incluirla en la clave de petición de un hook de lectura obliga a
 * repetir la consulta sin acoplarse al módulo que originó el cambio y sin polling.
 *
 * En modo API permanece inactiva para aislar completamente el runtime.
 * No consulta el almacenamiento: solo reacciona a notificaciones ya confirmadas.
 */
export function useMockStateRevision(domains: readonly MockDomain[]): number {
  const [revision, setRevision] = useState(0);
  const key = domains.join("|");

  useEffect(() => {
    if (!isMockMode()) return undefined;
    const list = key ? (key.split("|") as MockDomain[]) : [];
    if (list.length === 0) return undefined;

    let unsubscribed = false;
    let cleanup: (() => void) | undefined;

    void import("./mockState").then(({ subscribeMockChanges }) => {
      if (unsubscribed) return;
      cleanup = subscribeMockChanges(list, () => setRevision((value) => value + 1));
    });

    return () => {
      unsubscribed = true;
      cleanup?.();
    };
  }, [key]);

  return revision;
}
