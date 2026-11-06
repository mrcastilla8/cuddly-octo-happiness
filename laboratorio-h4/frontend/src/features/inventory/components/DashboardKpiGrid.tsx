import { Button, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import { FeedbackAlert, MetricCard } from "../../../components/shared";
import type { InventoryKpiSummary } from "../services/inventoryTypes";

interface DashboardKpiGridProps {
  kpis: InventoryKpiSummary | null;
  loading: boolean;
  error?: string | null;
  blockedReason?: string | null;
  onRetry?: () => void;
}

// Un KPI ausente (null) se muestra como "Sin datos"; un cero real se muestra
// como "0" (hallazgo TAC-08). No se sustituye un dato ausente por cero.
function KpiValue({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <Text component="span" size="sm" c="dimmed" fw={600}>
        Sin datos
      </Text>
    );
  }
  return <>{value}</>;
}

export function DashboardKpiGrid({
  kpis,
  loading,
  error,
  blockedReason,
  onRetry,
}: DashboardKpiGridProps) {
  if (blockedReason) {
    return (
      <FeedbackAlert
        semantic="warning"
        title="Indicadores no verificables para el filtro actual"
        actions={
          onRetry && (
            <Button size="xs" variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          )
        }
      >
        {blockedReason}
      </FeedbackAlert>
    );
  }

  if (error) {
    return (
      <FeedbackAlert
        semantic="error"
        title="No se pudieron cargar los indicadores"
        actions={
          onRetry && (
            <Button size="xs" variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          )
        }
      >
        {error}
      </FeedbackAlert>
    );
  }

  if (loading || !kpis) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} height={130} radius="sm" />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" aria-label="Indicadores de inventario">
        {/* Fila 1: Saldos principales */}
        <MetricCard
          label="Unidades disponibles"
          value={<KpiValue value={kpis.availableUnits} />}
          description="Aptas para venta comercial en todos los canales"
        />
        <MetricCard
          label="Unidades bloqueadas"
          value={<KpiValue value={kpis.blockedUnits} />}
          description="En cuarentena física por incidencia o reclamo"
        />
        <MetricCard
          label="Unidades físicas totales"
          value={<KpiValue value={kpis.totalPhysicalUnits} />}
          description="Suma física contabilizada en todas las ubicaciones"
        />

        {/* Fila 2: Conteo de SKUs por estado */}
        <MetricCard
          label="Total SKUs vendibles"
          value={<KpiValue value={kpis.totalVendibleSkus} />}
          description="Artículos activos con catálogo y SKU asignado"
        />
        <MetricCard
          label="SKUs Disponibles"
          value={<KpiValue value={kpis.skusAvailable} />}
          description="Con saldo mayor a su umbral de stock bajo"
        />
        <MetricCard
          label="SKUs con Stock bajo"
          value={<KpiValue value={kpis.skusLowStock} />}
          description="Saldo disponible menor o igual a umbral resuelto"
        />

        {/* Fila 3: Riesgos y reservas */}
        <MetricCard
          label="SKUs Agotados"
          value={<KpiValue value={kpis.skusOutOfStock} />}
          description="Sin unidades disponibles para venta"
        />
        <MetricCard
          label="Unidades reservadas"
          value={<KpiValue value={kpis.reservedUnits} />}
          description="Comprometidas activamente por pedidos pendientes"
        />
        <MetricCard
          label="Traslados pendientes totales"
          value={<KpiValue value={kpis.totalPendingTransfers} />}
          description="Movimientos entre almacenes sin recepción final"
        />

        {/* Fila 4: Estados operativos de traslados */}
        <MetricCard
          label="Traslados en tránsito"
          value={<KpiValue value={kpis.transfersInTransit} />}
          description="En despacho interprovincial o ruta logística"
        />
        <MetricCard
          label="Traslados recibidos parcialmente"
          value={<KpiValue value={kpis.transfersPartiallyReceived} />}
          description="Con entregas pendientes de completar en destino"
        />
        <MetricCard
          label="Traslados con discrepancia"
          value={<KpiValue value={kpis.transfersWithDiscrepancy} />}
          description="Cerrados con unidades faltantes o mermas"
        />
      </SimpleGrid>

      {/* Los estados por SKU no son mutuamente excluyentes: un mismo SKU puede
          figurar a la vez como disponible, con stock bajo o agotado si tiene
          ubicaciones en estados distintos. Por eso la suma de estos conteos
          puede superar el total de SKU únicos. */}
      <Text size="xs" c="dimmed">
        Los estados por SKU no son excluyentes: un mismo SKU puede contarse como
        disponible, con stock bajo o agotado en ubicaciones distintas a la vez,
        por lo que la suma de estas tarjetas puede superar el total de SKU únicos.
        &quot;Sin datos&quot; indica que la operación del contrato no publica esa
        métrica o que no existe dato verificable para la selección; nunca se
        sustituye por cero.
      </Text>
    </Stack>
  );
}
