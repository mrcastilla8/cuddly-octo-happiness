import type {
  ProductStatus,
  VariantStatus,
  PreparationStatus,
  ProductAttributeValue,
} from "./catalogRepository";

export function readCatalogScenario(params: URLSearchParams): string | undefined {
  const mode = params.get("modoRevision");
  if (mode !== "1") return undefined;
  return params.get("escenario") || undefined;
}

export function readPositiveInteger(
  value: string | null,
  fallback: number,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function productStatusLabel(status: ProductStatus): string {
  switch (status) {
    case "ACTIVO":
      return "Activo";
    case "BORRADOR":
      return "Borrador";
    case "INACTIVO":
      return "Inactivo";
  }
}

export function variantStatusLabel(status: VariantStatus): string {
  switch (status) {
    case "ACTIVA":
      return "Activa";
    case "BORRADOR":
      return "Borrador";
    case "INACTIVA":
      return "Inactiva";
  }
}

export function preparationStatusLabel(status: PreparationStatus): string {
  switch (status) {
    case "COMPLETED":
      return "Completado";
    case "PENDING":
      return "En preparación";
    case "REJECTED":
      return "Rechazado";
  }
}

export function calculateVolumeCm3(
  largo?: number | null,
  ancho?: number | null,
  alto?: number | null,
): number | null {
  if (!largo || !ancho || !alto || largo <= 0 || ancho <= 0 || alto <= 0) {
    return null;
  }
  return largo * ancho * alto;
}

export interface ExtractedDimensions {
  pesoKg: number | null;
  largo: number | null;
  ancho: number | null;
  alto: number | null;
  volumenCm3: number | null;
}

export interface RawPhysicalProfileLike {
  pesoKg?: number | null;
  largoCm?: number | null;
  anchoCm?: number | null;
  altoCm?: number | null;
  dimensionesCm?: {
    largo?: number | null;
    ancho?: number | null;
    alto?: number | null;
  } | null;
  volumenCm3?: number | null;
}

/**
 * Extracts dimensions handling both flat fields (largoCm, anchoCm, altoCm)
 * and nested dimensionsCm object ({ largo, ancho, alto }) per SPEC-003/004.
 */
export function getPhysicalDimensions(
  profile?: RawPhysicalProfileLike | null,
): ExtractedDimensions {
  if (!profile) {
    return {
      pesoKg: null,
      largo: null,
      ancho: null,
      alto: null,
      volumenCm3: null,
    };
  }

  const pesoKg =
    typeof profile.pesoKg === "number" && !Number.isNaN(profile.pesoKg)
      ? profile.pesoKg
      : null;

  const largo =
    profile.dimensionesCm?.largo ??
    (typeof profile.largoCm === "number" && !Number.isNaN(profile.largoCm)
      ? profile.largoCm
      : null);

  const ancho =
    profile.dimensionesCm?.ancho ??
    (typeof profile.anchoCm === "number" && !Number.isNaN(profile.anchoCm)
      ? profile.anchoCm
      : null);

  const alto =
    profile.dimensionesCm?.alto ??
    (typeof profile.altoCm === "number" && !Number.isNaN(profile.altoCm)
      ? profile.altoCm
      : null);

  const volumenCm3 = calculateVolumeCm3(largo, ancho, alto);

  return { pesoKg, largo, ancho, alto, volumenCm3 };
}

/**
 * Validates whether all four physical measurements are strictly complete and positive (> 0).
 * Required for variant activation/reactivation (CA-07, CA-13) and simple product publication.
 */
export function isPhysicalProfileComplete(
  profile?: RawPhysicalProfileLike | null,
): boolean {
  if (!profile) return false;
  const { pesoKg, largo, ancho, alto } = getPhysicalDimensions(profile);
  return Boolean(
    pesoKg &&
      pesoKg > 0 &&
      largo &&
      largo > 0 &&
      ancho &&
      ancho > 0 &&
      alto &&
      alto > 0,
  );
}

/**
 * Validates that any provided physical profile field is strictly positive (> 0).
 * Draft profiles may be incomplete, but any entered value must be positive.
 */
export function hasValidPhysicalValues(
  profile?: RawPhysicalProfileLike | null,
): boolean {
  if (!profile) return true;
  const { pesoKg, largo, ancho, alto } = getPhysicalDimensions(profile);
  if (pesoKg !== null && pesoKg <= 0) return false;
  if (largo !== null && largo <= 0) return false;
  if (ancho !== null && ancho <= 0) return false;
  if (alto !== null && alto <= 0) return false;
  return true;
}

/**
 * Normalizes physical profile into canonical PerfilFisicoInput format:
 * { pesoKg, dimensionesCm: { largo, ancho, alto }, largoCm, anchoCm, altoCm }
 */
export function normalizePhysicalProfile(
  profile?: RawPhysicalProfileLike | null,
) {
  if (!profile) return null;
  const { pesoKg, largo, ancho, alto } = getPhysicalDimensions(profile);
  if (pesoKg === null && largo === null && ancho === null && alto === null) {
    return null;
  }
  return {
    pesoKg: pesoKg ?? undefined,
    largoCm: largo ?? undefined,
    anchoCm: ancho ?? undefined,
    altoCm: alto ?? undefined,
    dimensionesCm:
      largo !== null || ancho !== null || alto !== null
        ? {
            largo: largo ?? undefined,
            ancho: ancho ?? undefined,
            alto: alto ?? undefined,
          }
        : null,
  };
}

export function formatIdentifyingAttributes(
  attrs: ProductAttributeValue[],
): string {
  if (!attrs || attrs.length === 0) return "Sin atributos";
  return attrs.map((a) => String(a.valor)).join(" / ");
}
