import { useCallback, useEffect, useState } from "react";
import { getInventoryRepository } from "../services/inventoryProvider";
import type {
  InventoryBrandOption,
  InventoryCategoryOption,
  InventoryLocationOption,
} from "../services/inventoryCatalogRepository";
import {
  normalizeCategoryId,
  normalizeBrandId,
} from "../mappings/catalogMappings";

// Errores por fuente de catálogo: permiten distinguir un fallo parcial
// (categorías o marcas no disponibles) de un fallo total, sin ocultar las
// opciones que sí cargaron y permitiendo reintentar (hallazgos TAC-09 y TAC-12).
export interface InventoryFilterOptionErrors {
  categories?: string;
  brands?: string;
  locations?: string;
}

function describeError(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

export function useInventoryFilterOptions() {
  const [categories, setCategories] = useState<InventoryCategoryOption[]>([]);
  const [brands, setBrands] = useState<InventoryBrandOption[]>([]);
  const [locations, setLocations] = useState<InventoryLocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<InventoryFilterOptionErrors>({});
  const [reloadKey, setReloadKey] = useState(0);

  // Permite reintentar la carga de catálogos sin recargar la página,
  // conservando las opciones que ya se habían cargado correctamente.
  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoading(true);
      try {
        // Usar el repositorio real para obtener catálogos, respetando VITE_DATA_MODE global
        const repo = getInventoryRepository();

        // Usar allSettled para aislar fallos: si ubicaciones está en BLOCKED_CONTRACT
        // no debe arrastrar ni bloquear la carga de categorías y marcas.
        const [catResult, brandResult, locResult] = await Promise.allSettled([
          repo.getCategories?.() ?? Promise.resolve([]),
          repo.getBrands?.() ?? Promise.resolve([]),
          repo.getLocations?.() ?? Promise.resolve([]),
        ]);

        if (cancelled) return;

        const nextErrors: InventoryFilterOptionErrors = {};

        if (catResult.status === "fulfilled") {
          const normalizedCategories = catResult.value.map(
            (cat) => ({ ...cat, id: normalizeCategoryId(cat.id) }),
          );
          setCategories(normalizedCategories);
        } else {
          // Fallo parcial: se registra para avisar en la UI sin romper el resto.
          nextErrors.categories = describeError(
            catResult.reason,
            "No se pudieron cargar las categorías.",
          );
        }

        if (brandResult.status === "fulfilled") {
          const normalizedBrands = brandResult.value.map(
            (brand) => ({ ...brand, id: normalizeBrandId(brand.id) }),
          );
          setBrands(normalizedBrands);
        } else {
          nextErrors.brands = describeError(
            brandResult.reason,
            "No se pudieron cargar las marcas.",
          );
        }

        if (locResult.status === "fulfilled") {
          setLocations(locResult.value);
        } else {
          // Registra como BLOCKED_CONTRACT informativo si falla
          // pero no aborta el render de la página ni de otros catálogos.
          nextErrors.locations = describeError(
            locResult.reason,
            "No se pudieron cargar las ubicaciones.",
          );
          console.warn(
            "[inventory] Catálogo de ubicaciones en BLOCKED_CONTRACT:",
            locResult.reason,
          );
        }

        setErrors(nextErrors);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar opciones de filtro de catálogo.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { categories, brands, locations, loading, error, errors, reload };
}
