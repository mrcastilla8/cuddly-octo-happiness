import { useCallback, useMemo, useState } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { FeedbackAlert, PageHeader } from "../../../components/shared";
import { useAuditRuntime } from "../services/AuditRuntimeContext";
import {
  appliedFilters,
  emptyFilters,
  readAuditQuery,
  validateAuditFilters,
  writeAuditQuery,
} from "../services/auditPresentation";
import { useAuditRead } from "../hooks/useAuditRead";
import { AuditFilters } from "../components/AuditFilters";
import { AuditScope } from "../components/AuditScope";
import { AuditTable } from "../components/AuditTable";
import { AuditDataNotice } from "../components/AuditDataNotice";
import type { AuditHistoryContext } from "../hooks/useAuditHistoryContext";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

export function AuditHistoryPage() {
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const query = useMemo(() => readAuditQuery(params), [params]);
  const key = JSON.stringify(query);
  const { repository } = useAuditRuntime();
  const [localRevision, setLocalRevision] = useState(0);
  const externalRevision = useMockStateRevision(["price-audit", "pricing"]);
  const revision = localRevision + externalRevision;
  const [denied, setDenied] = useState<string>();
  const inputError = validateAuditFilters(query);
  const read = useCallback(
    (signal: AbortSignal) =>
      inputError
        ? Promise.reject(new Error(inputError))
        : repository.list(query, signal).then((result) => {
            if (
              !signal.aborted &&
              pathname.replace(/\/$/, "") === "/precios/auditoria"
            )
              setDenied(undefined);
            return result;
          }),
    [repository, query, inputError, pathname],
  );
  // A return from detail requires a fresh authorized read before restoring data.
  const state = useAuditRead(`${pathname}:${key}:${params}`, read, revision);
  const clear = () =>
    setParams(
      writeAuditQuery({ ...emptyFilters, page: 1, size: query.size }, params),
    );
  const accessError =
    denied ??
    (state.status === "error" &&
    ["forbidden", "session"].includes(state.error.kind)
      ? state.error.message
      : undefined);
  return (
    <>
      <PageHeader
        title="Historial de precios"
        description="Bitácora de cambios confirmados."
        breadcrumbs={[
          { label: "Precios", to: "/precios" },
          { label: "Historial de precios" },
        ]}
        actions={
          !accessError && state.status === "success" ? (
            <>
              <Button
                component={Link}
                variant="outline"
                to={`/precios/auditoria/exportar/csv?${params}`}
              >
                Exportar CSV
              </Button>
              <Button
                component={Link}
                variant="outline"
                to={`/precios/auditoria/exportar/pdf?${params}`}
              >
                Exportar PDF
              </Button>
            </>
          ) : undefined
        }
      />
      <Stack gap="lg">
        <AuditDataNotice />
        <AuditFilters
          key={key}
          query={query}
          onApply={(filters) => {
            setLocalRevision((value) => value + 1);
            setParams(
              writeAuditQuery(
                { ...filters, page: 1, size: query.size },
                params,
              ),
            );
          }}
          onClear={clear}
        />
        {inputError ? (
          <FeedbackAlert semantic="error" title="Revisa las fechas">
            {inputError}
          </FeedbackAlert>
        ) : accessError ? (
          <FeedbackAlert semantic="error" title="Acceso no disponible">
            {accessError}
            <Button
              variant="outline"
              onClick={() => setLocalRevision((value) => value + 1)}
            >
              Volver a consultar
            </Button>
          </FeedbackAlert>
        ) : state.status === "loading" ? (
          <>
            <Text role="status">Cargando historial de auditoría…</Text>
            {state.previous && (
              <>
                <FeedbackAlert
                  semantic="info"
                  title="Última consulta disponible"
                >
                  Actualizando el historial. Los datos pueden haber cambiado.
                </FeedbackAlert>
                <AuditTable
                  result={state.previous}
                  suffix={`?${params}`}
                  filtered={Object.values(appliedFilters(query)).some(Boolean)}
                  onClear={clear}
                  onPage={(page) =>
                    setParams(writeAuditQuery({ ...query, page }, params))
                  }
                />
              </>
            )}
          </>
        ) : state.status === "error" ? (
          <>
            <FeedbackAlert
              semantic="error"
              title="No se pudo consultar el historial"
              actions={
                <Button
                  variant="outline"
                  onClick={() => setLocalRevision((value) => value + 1)}
                >
                  Volver a consultar
                </Button>
              }
            >
              {state.error.message}
            </FeedbackAlert>
            {state.previous && (
              <>
                <Text size="sm">
                  Última consulta disponible. No se ha confirmado una
                  actualización.
                </Text>
                <AuditTable
                  result={state.previous}
                  suffix={`?${params}`}
                  filtered={Object.values(appliedFilters(query)).some(Boolean)}
                  onClear={clear}
                  onPage={(page) =>
                    setParams(writeAuditQuery({ ...query, page }, params))
                  }
                />
              </>
            )}
          </>
        ) : (
          <>
            <AuditScope
              filters={appliedFilters(query)}
              total={state.result.total}
            />
            <AuditTable
              result={state.result}
              suffix={`?${params}`}
              filtered={Object.values(appliedFilters(query)).some(Boolean)}
              onClear={clear}
              onPage={(page) =>
                setParams(writeAuditQuery({ ...query, page }, params))
              }
            />
          </>
        )}
      </Stack>
      <Outlet
        context={{ denyAccess: setDenied } satisfies AuditHistoryContext}
      />
    </>
  );
}
