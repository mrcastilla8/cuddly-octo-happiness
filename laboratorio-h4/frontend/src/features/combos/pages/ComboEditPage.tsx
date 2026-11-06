import { useEffect, useRef, useState } from "react";
import { Button, Skeleton } from "@mantine/core";
import { Link, useParams } from "react-router-dom";
import { EmptyState, FeedbackAlert, PageHeader } from "../../../components/shared";
import { ComboEditor } from "../components/ComboEditor";
import { RequestIdentity } from "../services/requestIdentity";
import { useCombosRuntime } from "../hooks/useCombosRuntime";
import type { Combo } from "../types/combos";

type EditState =
  | { key: string; status: "loading" }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "success"; combo: Combo | null };

export function ComboEditPage() {
  const { comboId = "" } = useParams();
  return <ComboEditForId key={comboId} comboId={comboId} />;
}

function ComboEditForId({ comboId }: { comboId: string }) {
  const { combos } = useCombosRuntime();
  const [state, setState] = useState<EditState>({ key: "", status: "loading" });
  const [retry, setRetry] = useState(0);
  const identity = useRef(new RequestIdentity());
  const requestKey = JSON.stringify([comboId, retry]);

  useEffect(() => {
    const controller = new AbortController();
    const requests = identity.current;
    const requestId = requests.begin();
    void combos.getById(comboId, controller.signal).then((combo) => {
      if (requests.isCurrent(requestId, controller.signal)) setState({ key: requestKey, status: "success", combo });
    }).catch((reason: unknown) => {
      if (requests.isCurrent(requestId, controller.signal)) {
        setState({ key: requestKey, status: "error", message: reason instanceof Error ? reason.message : "No se pudo consultar el combo." });
      }
    });
    return () => {
      controller.abort();
      requests.invalidate();
    };
  }, [combos, comboId, requestKey]);

  const currentState = state.key === requestKey ? state : { key: requestKey, status: "loading" as const };
  return <>
    <PageHeader title="Editar combo" breadcrumbs={[{ label: "Combos", to: "/combos" }, { label: currentState.status === "success" ? currentState.combo?.name ?? "No encontrado" : "Combo" }]} actions={<Button component={Link} to={`/combos/${comboId}`} variant="outline">Volver al detalle</Button>} />
    {currentState.status === "loading" ? <Skeleton height={300} /> : currentState.status === "error" ? <FeedbackAlert semantic="error" title="No se pudo consultar el combo" actions={<Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Reintentar</Button>}>{currentState.message}</FeedbackAlert> : currentState.combo ? <ComboEditor key={currentState.combo.id} existing={currentState.combo} /> : <EmptyState title="Combo no encontrado" description="La referencia no corresponde a un combo disponible." action={<Button component={Link} to="/combos">Volver a combos</Button>} />}
  </>;
}
