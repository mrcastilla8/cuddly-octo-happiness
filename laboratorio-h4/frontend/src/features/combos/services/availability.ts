import type {
  AvailabilityState,
  ComboAvailability,
  ComboStatus,
  StockReading,
} from "../types/combos";

export type AvailabilityMessage = { label: string; semantic: "neutral" | "info" | "warning" | "success" };

export interface AvailabilityComponent {
  sku: string;
  quantity: number;
  // true  → identity resolved and confirmed sellable.
  // false → identity resolved and confirmed NOT sellable (inactive product/variant, parent SKU or nested combo).
  // null  → identity could not be resolved against the shared Catalog; never assume sellable.
  active: boolean | null;
}

// Informative availability: min(floor(stockDisponibleSKU / cantidadRequeridaSKU)).
// It never reserves, never builds a combo balance and never coerces an unknown
// balance into a confident zero. The evaluation order is deliberate: an
// unresolved identity, an incomplete reading and an invalid quantity are decided
// BEFORE publishing any positive, zero or stale result, so a partial snapshot can
// never be presented as a verified availability.
export function calculateInformativeAvailability(
  status: ComboStatus,
  components: AvailabilityComponent[],
  readings: ReadonlyMap<string, StockReading>,
  calculatedAt: string | null = new Date().toISOString(),
): ComboAvailability {
  // 1. Administrative inactive combo.
  if (status === "INACTIVO") {
    return {
      state: "COMBO_INACTIVO",
      verifiable: false,
      quantity: null,
      freshness: "INCOMPLETA",
      calculatedAt: null,
      reason: "El combo está administrativamente inactivo y no se ofrece para nuevas ventas.",
    };
  }
  // 2. No components to evaluate.
  if (components.length === 0) {
    return {
      state: "INCOMPLETA",
      verifiable: false,
      quantity: null,
      freshness: "INCOMPLETA",
      calculatedAt: null,
      reason: "No hay componentes para calcular la disponibilidad.",
    };
  }
  // 3. Unresolved SKU identity: the Catalog did not confirm the component.
  if (components.some((component) => component.active === null)) {
    return {
      state: "NO_VERIFICABLE",
      verifiable: false,
      quantity: null,
      freshness: "NO_VERIFICABLE",
      calculatedAt: null,
      reason: "No se pudo resolver la identidad de venta de al menos un componente en el catálogo.",
    };
  }
  // 4. Confirmed inactive component.
  if (components.some((component) => component.active === false)) {
    return {
      state: "COMPONENTE_INACTIVO",
      verifiable: false,
      quantity: null,
      freshness: "INCOMPLETA",
      calculatedAt: null,
      reason: "Al menos un componente no está activo y no permite nuevas ventas.",
    };
  }
  // 5. Invalid quantity.
  if (components.some((component) => !Number.isSafeInteger(component.quantity) || component.quantity < 1)) {
    return {
      state: "NO_VERIFICABLE",
      verifiable: false,
      quantity: null,
      freshness: "NO_VERIFICABLE",
      calculatedAt: null,
      reason: "La cantidad de un componente no es verificable.",
    };
  }

  let min = Number.POSITIVE_INFINITY;
  let stale = false;

  for (const component of components) {
    const reading = readings.get(component.sku);
    // 6. Any missing, unknown, invalid or incompatible reading => incomplete.
    //    Decided before publishing a stale, zero or positive result.
    if (!reading || !reading.locationsCompatible || reading.stock === null ||
      !Number.isFinite(reading.stock) || reading.stock < 0) {
      return {
        state: "INCOMPLETA",
        verifiable: false,
        quantity: null,
        freshness: "INCOMPLETA",
        calculatedAt: null,
        reason: "El snapshot de inventario no permite verificar todos los componentes.",
      };
    }
    if (reading.stale) stale = true;
    min = Math.min(min, Math.floor(reading.stock / component.quantity));
  }

  if (!Number.isFinite(min)) {
    return {
      state: "NO_VERIFICABLE",
      verifiable: false,
      quantity: null,
      freshness: "NO_VERIFICABLE",
      calculatedAt: null,
      reason: "No hay datos verificables de disponibilidad para los componentes.",
    };
  }
  // 7. All readings complete but stale: keep the estimate, never a verified positive.
  if (stale) {
    return {
      state: "DESACTUALIZADA",
      verifiable: true,
      quantity: min,
      freshness: "DESACTUALIZADA",
      calculatedAt,
      reason: "La información de inventario consultada está desactualizada.",
    };
  }
  // 8. Confirmed zero.
  if (min === 0) {
    return {
      state: "AGOTADO",
      verifiable: true,
      quantity: 0,
      freshness: "ACTUALIZADA",
      calculatedAt,
      reason: "La disponibilidad informativa confirmada es cero.",
    };
  }
  // 9. Confirmed positive estimate.
  return {
    state: "DISPONIBLE",
    verifiable: true,
    quantity: min,
    freshness: "ACTUALIZADA",
    calculatedAt,
    reason: null,
  };
}

export function isVerifiedPositiveAvailability(availability: ComboAvailability): boolean {
  return availability.state === "DISPONIBLE" &&
    availability.verifiable &&
    availability.freshness === "ACTUALIZADA" &&
    availability.quantity !== null &&
    availability.quantity > 0;
}

export function isUnavailableForNewSales(combo: { status: ComboStatus; availability: ComboAvailability }): boolean {
  return combo.status === "INACTIVO" ||
    combo.availability.state === "AGOTADO" ||
    combo.availability.state === "COMPONENTE_INACTIVO" ||
    !isVerifiedPositiveAvailability(combo.availability);
}

const STATE_LABELS: Record<AvailabilityState, { label: string; semantic: AvailabilityMessage["semantic"] }> = {
  DISPONIBLE: { label: "Disponible (estimado)", semantic: "success" },
  AGOTADO: { label: "Agotado (0 confirmado)", semantic: "warning" },
  DESACTUALIZADA: { label: "Disponibilidad desactualizada", semantic: "warning" },
  INCOMPLETA: { label: "Disponibilidad incompleta", semantic: "info" },
  NO_VERIFICABLE: { label: "Disponibilidad no verificable", semantic: "info" },
  COMBO_INACTIVO: { label: "Combo inactivo", semantic: "neutral" },
  COMPONENTE_INACTIVO: { label: "Componente inactivo", semantic: "warning" },
};

export function availabilityMessage(combo: { status: ComboStatus; availability: ComboAvailability }): AvailabilityMessage {
  const state = combo.status === "INACTIVO" ? "COMBO_INACTIVO" : combo.availability.state;
  const entry = STATE_LABELS[state];
  if (state === "DISPONIBLE" && combo.availability.quantity !== null) {
    return { label: `${combo.availability.quantity} combos estimados`, semantic: "success" };
  }
  if (state === "DESACTUALIZADA" && combo.availability.quantity !== null) {
    return { label: `Desactualizada (${combo.availability.quantity} combos estimados)`, semantic: "warning" };
  }
  return entry;
}

export function availabilityMessageText(combo: { status: ComboStatus; availability: ComboAvailability }): string {
  const message = availabilityMessage(combo);
  if (combo.status === "INACTIVO") return "La definición administrativa se conserva y no se ofrece para nuevas ventas.";
  return combo.availability.reason ?? message.label;
}
