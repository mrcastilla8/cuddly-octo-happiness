import { useEffect, useState } from "react";
import { InventoryError } from "../services/inventoryErrors";
import { getInventoryRepository } from "../services/inventoryProvider";
import { useInventoryChangeSignal } from "./useInventoryChangeSignal";
import type {
  DashboardFiltersQuery,
  InventoryAlert,
  InventoryKpiSummary,
  LocationDistribution,
  StockItem,
} from "../services/inventoryTypes";

// Estado de una sección del dashboard. `blockedReason` distingue una limitación
// del contrato (la operación no existe o no admite el filtro) de un fallo real
// de transporte/servidor, para no presentar ambas situaciones igual.
export interface DashboardSectionState {
  error: string | null;
  blockedReason: string | null;
}

export interface InventoryDashboardSections {
  kpis: DashboardSectionState;
  alerts: DashboardSectionState;
  distribution: DashboardSectionState;
  stockItems: DashboardSectionState;
}

const EMPTY_SECTION: DashboardSectionState = {
  error: null,
  blockedReason: null,
};

function describeSection(
  reason: unknown,
  fallback: string,
): DashboardSectionState {
  if (
    reason instanceof InventoryError &&
    reason.code === "CONTRATO_BLOQUEADO"
  ) {
    return { error: null, blockedReason: reason.message };
  }
  return {
    error:
      reason instanceof Error && reason.message ? reason.message : fallback,
    blockedReason: null,
  };
}

function sectionOf<T>(
  result: PromiseSettledResult<T>,
  fallback: string,
): DashboardSectionState {
  return result.status === "rejected"
    ? describeSection(result.reason, fallback)
    : EMPTY_SECTION;
}

function fulfilled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export function useInventoryDashboard(filters: DashboardFiltersQuery) {
  const revision = useInventoryChangeSignal();
  const { search, category, brand, locationId, status } = filters;

  // Token de recarga explícito para reintentos reales sin alterar los filtros.
  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = JSON.stringify([
    search,
    category,
    brand,
    locationId,
    status,
    revision,
    reloadToken,
  ]);

  const [response, setResponse] = useState<{
    requestKey: string;
    kpis: InventoryKpiSummary | null;
    generatedAt: string | null;
    alerts: InventoryAlert[];
    distribution: LocationDistribution[];
    stockItems: StockItem[];
    sections: InventoryDashboardSections;
  }>();

  useEffect(() => {
    let cancelled = false;

    // Filtros contractuales admitidos por obtenerDashboardInventario (agregado)
    const aggregateFilters: DashboardFiltersQuery = { category, brand, locationId };
    // Filtros de tabla y búsqueda detallada por SKU
    const tableFilters: DashboardFiltersQuery = {
      search,
      category,
      brand,
      locationId,
      status,
    };

    const repository = getInventoryRepository();
    // Separación de filtros: una búsqueda de SKU o filtro de estado en la tabla
    // no debe bloquear ni invalidar los KPIs ni la distribución por ubicación,
    // que consultan el agregado con los filtros admitidos por el contrato.
    void Promise.allSettled([
      repository.getDashboardKpis(aggregateFilters),
      repository.getDashboardAlerts(tableFilters),
      repository.getLocationDistribution(aggregateFilters),
      repository.getStockItems(tableFilters),
    ]).then(([kpiResult, alertsResult, distResult, stockResult]) => {
      if (cancelled) return;
      const kpis = fulfilled(kpiResult, null);
      setResponse({
        requestKey,
        kpis,
        generatedAt: kpis?.generatedAt ?? null,
        alerts: fulfilled(alertsResult, []),
        distribution: fulfilled(distResult, []),
        stockItems: fulfilled(stockResult, []),
        sections: {
          kpis: sectionOf(
            kpiResult,
            "Error al cargar los indicadores del dashboard.",
          ),
          alerts: sectionOf(
            alertsResult,
            "Error al cargar las alertas del dashboard.",
          ),
          distribution: sectionOf(
            distResult,
            "Error al cargar la distribución por ubicación.",
          ),
          stockItems: sectionOf(
            stockResult,
            "Error al cargar las existencias por SKU.",
          ),
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [search, category, brand, locationId, status, requestKey]);

  const isCurrent = response?.requestKey === requestKey;
  const loading = !isCurrent;

  return {
    kpis: isCurrent ? response.kpis : null,
    generatedAt: isCurrent ? (response.generatedAt ?? null) : null,
    alerts: isCurrent ? response.alerts : [],
    distribution: isCurrent ? response.distribution : [],
    stockItems: isCurrent ? response.stockItems : [],
    sections: isCurrent
      ? response.sections
      : {
          kpis: EMPTY_SECTION,
          alerts: EMPTY_SECTION,
          distribution: EMPTY_SECTION,
          stockItems: EMPTY_SECTION,
        },
    loading,
    refetch: () => setReloadToken((token) => token + 1),
  };
}
