import { Select } from "@mantine/core";
import { useSearchParams } from "react-router-dom";

const cases = [
  ["normal", "Datos disponibles"],
  ["cargando", "Cargando listado"],
  ["vacio", "Sin resultados"],
  ["error-listado", "Error de listado"],
  ["error-detalle", "Error de detalle"],
  ["detalle-inexistente", "Asiento de la fila no disponible"],
  ["sin-sesion", "Sesión no disponible"],
  ["sin-permiso", "Consulta sin permiso"],
  ["exportacion-sin-permiso", "Exportación sin permiso"],
  ["csv100000", "CSV: 100 000"],
  ["csv100001", "CSV: 100 001"],
  ["pdf500", "PDF: 500"],
  ["pdf501", "PDF: 501"],
  ["cambio-conteo", "PDF: conteo cambia de 500 a 501"],
  ["procesando", "Generación en proceso"],
  ["fallo-generacion", "Generación fallida"],
  ["fallo-descarga", "Descarga fallida"],
  ["resultado-desconocido", "Solicitud sin resultado confirmado"],
  ["fallo-seguimiento", "Seguimiento fallido"],
  ["sin-archivo", "Generado sin archivo disponible"],
];
export function AuditReviewTools() {
  const [params, setParams] = useSearchParams();
  if (params.get("modoRevision") !== "1") return null;
  return (
    <Select
      label="Caso de demostración de auditoría"
      description="Solo desarrollo. Los totales extremos son metadatos de prueba; no crean archivos de ese tamaño."
      value={params.get("caso") ?? "normal"}
      data={cases.map(([value, label]) => ({ value: value!, label: label! }))}
      onChange={(value) =>
        setParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            next.set("caso", value ?? "normal");
            return next;
          },
          { replace: true },
        )
      }
    />
  );
}
