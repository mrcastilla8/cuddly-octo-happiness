// Mapeo centralizado de IDs a labels para catálogos de inventario.
// Centraliza las discrepancias entre los IDs del sistema (usados en filtros,
// queries y contratos) y los labels mostrados en la UI.
// Este archivo es la fuente única de verdad para normalizar IDs ↔ nombres.

// Categorías: ID del catálogo ↔ Label en UI
export const categoryMap: Record<string, string> = {
  CALZADO: "Calzado",
  ROPA_DEPORTIVA: "Ropa Deportiva",
  ACCESORIOS: "Accesorios",
};

// Alias inverso: label ↔ ID (para búsquedas y normalización)
export const categoryLabelToId: Record<string, string> = {
  Calzado: "CALZADO",
  "Ropa Deportiva": "ROPA_DEPORTIVA",
  Accesorios: "ACCESORIOS",
};

// Marcas: ID del catálogo ↔ Label en UI
export const brandMap: Record<string, string> = {
  INKA_ATHLETICS: "Inka Athletics",
};

// Alias inverso
export const brandLabelToId: Record<string, string> = {
  "Inka Athletics": "INKA_ATHLETICS",
};

/**
 * Normaliza una cadena de categoría a su ID canónico.
 * - Si la entrada ya es un ID (p.ej. "CALZADO"), lo devuelve.
 * - Si la entrada es un label (p.ej. "Calzado"), devuelve su ID.
 * - Si no hay coincidencia, devuelve la cadena tal cual (NO la transforma).
 */
export function normalizeCategoryId(value: string): string {
  const clean = value.trim();

  // Si ya es un ID conocido, devolverlo
  if (categoryMap[clean]) return clean;
  // Si coincide con un label, devolver su ID
  if (categoryLabelToId[clean]) return categoryLabelToId[clean];
  // Fallback: devolver la cadena tal cual (NO la transforma)
  return clean;
}

/**
 * Normaliza una etiqueta de categoría a su ID.
 * Lanza error si la etiqueta no está registrada.
 */
export function categoryLabelToIdFn(label: string): string {
  const clean = label.trim();
  const id = categoryLabelToId[clean];
  if (id) return id;
  throw new Error(`[catalog] Etiqueta de categoría no reconocida: "${label}"`);
}

/**
 * Normaliza una cadena de marca a su ID canónico.
 * - Si la entrada ya es un ID (p.ej. "INKA_ATHLETICS"), lo devuelve.
 * - Si la entrada es un label (p.ej. "Inka Athletics"), devuelve su ID.
 * - Si no hay coincidencia, devuelve la cadena tal cual (NO la transforma).
 */
export function normalizeBrandId(value: string): string {
  const clean = value.trim();

  // Si ya es un ID conocido, devolverlo
  if (brandMap[clean]) return clean;
  // Si coincide con un label, devolver su ID
  if (brandLabelToId[clean]) return brandLabelToId[clean];
  // Fallback: devolver la cadena tal cual (NO la transforma)
  return clean;
}

/**
 * Normaliza una etiqueta de marca a su ID.
 * Lanza error si la etiqueta no está registrada.
 */
export function brandLabelToIdFn(label: string): string {
  const clean = label.trim();
  const id = brandLabelToId[clean];
  if (id) return id;
  throw new Error(`[catalog] Etiqueta de marca no reconocida: "${label}"`);
}
