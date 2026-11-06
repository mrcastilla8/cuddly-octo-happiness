import { useSyncExternalStore } from "react";
import { Button, Select, Stack, Text } from "@mantine/core";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { SectionCard } from "../../../components/shared";
import type { PricingRepository } from "../services/pricingRepository";
import { DemoControl, type DemoScenario } from "./demoControl";
import { partialBatch } from "./workflows";
import { demoNow } from "./prices";
import { displayInstant } from "../services/pricingValidation";

const readOptions: { value: DemoScenario; label: string }[] = [
  { value: "default", label: "Disponible" },
  { value: "loading", label: "Cargando" },
  { value: "empty", label: "Sin dato" },
  { value: "error", label: "Error de lectura" },
];
const writeOptions: { value: DemoScenario; label: string }[] = [
  { value: "default", label: "Confirmación local" },
  { value: "conflict", label: "Conflicto de versión" },
  { value: "overlap", label: "Vigencia superpuesta" },
  { value: "error", label: "Rechazo de servicio" },
  { value: "unauthorized", label: "Sesión no válida" },
  { value: "forbidden", label: "Sin autorización" },
  { value: "unknown", label: "Resultado desconocido" },
];
export function PricingDemoPanel({ control }: { control: DemoControl }) {
  useSyncExternalStore(control.subscribe, control.snapshot, control.snapshot);
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  if (!import.meta.env.DEV || params.get("modoRevision") !== "1") return null;
  const select = (
    operation: keyof PricingRepository,
    label: string,
    options: { value: DemoScenario; label: string }[],
  ) => (
    <Select
      key={operation}
      maw={400}
      label={label}
      value={control.scenario(operation)}
      data={options}
      onChange={(value) => {
        const option = options.find((row) => row.value === value);
        if (option) control.set(operation, option.value);
      }}
    />
  );
  return (
    <SectionCard
      title="Herramientas de revisión — mock"
      description="Controles de desarrollo fuera de los servicios productivos. No hay escrituras ni validación de archivos reales."
    >
      <Text size="sm">
        Reloj de exposición: {displayInstant(demoNow)} · America/Bogota (UTC−5).
        El reloj del modo API es independiente.
      </Text>
      <Stack gap="md">
        {pathname === "/precios" &&
          select("read", "Escenario de revisión del piloto", [
            { value: "default", label: "Precio disponible" },
            { value: "loading", label: "Cargando" },
            { value: "empty", label: "Sin precio" },
            { value: "error", label: "Error de consulta" },
          ])}
        {pathname === "/precios/editar" && (
          <>
            {select("readEditable", "Escenario de lectura", readOptions)}
            {select("update", "Escenario de guardado", writeOptions)}
          </>
        )}
        {pathname === "/precios/programaciones" && (
          <>
            {select("listSchedules", "Escenario del listado", readOptions)}
            {select(
              "schedule",
              "Escenario de programación",
              writeOptions.filter((row) => row.value !== "conflict"),
            )}
          </>
        )}
        {pathname === "/precios/historico" &&
          select("readHistorical", "Escenario histórico", readOptions)}
        {pathname === "/precios/importar" && (
          <>
            {select("prevalidate", "Respuesta ficticia de prevalidación", [
              { value: "blocked", label: "Contrato pendiente" },
              { value: "valid", label: "Sin errores reportados" },
              { value: "rows", label: "Error por fila" },
              { value: "unreadable", label: "Archivo no analizable" },
              { value: "error", label: "Error de consulta" },
            ])}
            <Text size="sm">
              Elegir una respuesta ficticia no valida los bytes del archivo. La
              selección y la política sí se conservan y cualquier cambio exige
              nueva revisión.
            </Text>
            <Button
              component={Link}
              to={`/precios/importaciones/${encodeURIComponent(partialBatch.id)}?${params.toString()}`}
              variant="outline"
              style={{ alignSelf: "flex-start" }}
            >
              Consultar lote de ejemplo
            </Button>
          </>
        )}
        {pathname.startsWith("/precios/importaciones/") && (
          <>
            {select("readBatch", "Escenario del lote", [
              {
                value: "default",
                label: "Parcial: 2 confirmadas y 1 rechazada",
              },
              { value: "queued", label: "En cola" },
              { value: "processing", label: "En proceso" },
              { value: "completed", label: "Completado" },
              { value: "failed", label: "Fallido" },
              { value: "no-rows", label: "Detalle de filas ausente" },
              { value: "error", label: "Error de refresco" },
              { value: "loading", label: "Cargando" },
              { value: "forbidden", label: "Sin autorización" },
            ])}
            {select("report", "Escenario de descarga", [
              { value: "default", label: "Reporte disponible" },
              { value: "error", label: "Fallo de descarga" },
            ])}
          </>
        )}
        <Button
          variant="outline"
          onClick={() => control.reset()}
          style={{ alignSelf: "flex-start" }}
        >
          Restablecer respuestas de revisión
        </Button>
      </Stack>
    </SectionCard>
  );
}
