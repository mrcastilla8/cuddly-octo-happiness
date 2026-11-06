import type {
  CharacteristicCatalogConfig,
  CharacteristicListItem,
  CharacteristicType,
} from "../types";

export const etiquetaTipoCaracteristica: Record<CharacteristicType, string> = {
  TEXTO: "Texto",
  NUMERO: "Número",
  LISTA: "Lista",
};

// SPEC-009: LISTA shows active values against the configurable limit; NUMERO shows its
// required unit; TEXTO shows the configurable maximum length.
export function describirReglaCaracteristica(
  item: CharacteristicListItem,
  config: CharacteristicCatalogConfig,
): string {
  if (item.tipo === "LISTA") {
    return `${item.valoresActivos} de ${config.maxValoresLista} valores activos`;
  }
  if (item.tipo === "NUMERO") {
    return `Unidad: ${item.unidad ?? "sin definir"}`;
  }
  return `Hasta ${config.maxTexto} caracteres`;
}

// Rule explanation used while the type is being chosen (create/edit form).
export function describirReglaTipo(
  tipo: CharacteristicType,
  config: CharacteristicCatalogConfig,
): string {
  if (tipo === "LISTA") {
    return `Las listas admiten hasta ${config.maxValoresLista} valores activos.`;
  }
  if (tipo === "NUMERO") {
    return "La unidad es obligatoria para características numéricas.";
  }
  return `Los valores de texto admiten hasta ${config.maxTexto} caracteres.`;
}
