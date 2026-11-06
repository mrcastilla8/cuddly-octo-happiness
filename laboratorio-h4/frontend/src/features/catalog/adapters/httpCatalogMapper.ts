import type { PhysicalProfile, ProductAttributeValue, ProductDetailView, ProductPreparationView, VariantDetailView } from "../services/catalogRepository";
import type { AttributeSchema } from "../services/taxonomyRepository";
import { getPhysicalDimensions, type RawPhysicalProfileLike } from "../services/catalogPresentation";
import { array, blockedCatalog, boolean, choice, integer, object, string } from "./catalogHttp";

export function mapPreparation(value: unknown): ProductPreparationView {
  const dto = object(value);
  const dependency = (value: unknown) => {
    const state = object(value);
    return { status: choice(state.status, ["PENDING", "COMPLETED", "REJECTED"] as const),
      manualRetryAllowed: boolean(state.manual_retry_allowed),
      code: state.code == null ? null : string(state.code) };
  };
  const hasVariants = boolean(dto.tiene_variantes);
  if ((hasVariants && dto.inventario !== null) || (!hasVariants && dto.inventario === null))
    return blockedCatalog("La preparación no corresponde al modelo de venta del producto.");
  return { productId: string(dto.product_id), hasVariants, pricing: dependency(dto.pricing),
    inventario: dto.inventario === null ? null : dependency(dto.inventario),
    variantes: array(dto.variantes).map(value => { const row = object(value); return {
      variantId: string(row.variant_id), sku: string(row.sku), inventario: dependency(row.inventario) };
    }) };
}

export function requestAttributes(attributes?: ProductAttributeValue[]) {
  return attributes?.map(a => ({ caracteristica_id: a.caracteristicaId, nombre: a.nombre,
    valor: a.valor, ...(a.valorId === undefined ? {} : { valor_id: a.valorId }) }));
}
export function requestPhysical(profile?: RawPhysicalProfileLike | null) {
  if (profile === undefined || profile === null) return profile;
  const { pesoKg, largo, ancho, alto } = getPhysicalDimensions(profile);
  return { pesoKg: pesoKg ?? undefined, dimensionesCm: { largo: largo ?? undefined, ancho: ancho ?? undefined, alto: alto ?? undefined } };
}
function physical(value: unknown): Partial<PhysicalProfile> | null {
  if (value === null) return null;
  const dto = object(value);
  const dims = object(dto.dimensionesCm);
  const measure = (value: unknown) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return blockedCatalog("El perfil físico recibido no tiene las medidas contractuales completas.");
    return value;
  };
  return { pesoKg: measure(dto.pesoKg), largoCm: measure(dims.largo), anchoCm: measure(dims.ancho), altoCm: measure(dims.alto) };
}
export type CatalogAttributeMetadata = Pick<AttributeSchema, "caracteristicaId" | "tipo" | "unidad">;
function attributes(value: unknown, schemas: CatalogAttributeMetadata[]): ProductAttributeValue[] {
  return array(value).map(value => {
    const dto = object(value); const id = string(dto.caracteristica_id);
    const schema = schemas.find(s => s.caracteristicaId === id);
    if (!schema) return blockedCatalog("No se puede interpretar la característica sin su esquema autoritativo de Taxonomía.");
    if (typeof dto.valor !== "string" && (typeof dto.valor !== "number" || !Number.isFinite(dto.valor)))
      return blockedCatalog("El valor recibido para la característica no es válido.");
    return { caracteristicaId: id, nombre: string(dto.nombre), tipo: schema.tipo, valor: dto.valor,
      valorId: dto.valor_id == null ? undefined : string(dto.valor_id), unidad: schema.unidad };
  });
}
export function mapVariant(value: unknown, productId: string, preparation: ProductPreparationView, schemas: CatalogAttributeMetadata[]): VariantDetailView {
  const dto = object(value); const id = string(dto.variant_id); const sku = string(dto.sku);
  const prep = preparation.variantes.find(p => p.variantId === id && p.sku === sku);
  if (preparation.productId !== productId || !prep) return blockedCatalog("No se recibió preparación autoritativa para esta variante.");
  const images = array(dto.images).map(string);
  return { variantId: id, productId, sku, status: choice(dto.status, ["BORRADOR", "ACTIVA", "INACTIVA"] as const),
    catalogVersion: integer(dto.catalog_version), identifyingAttributes: attributes(dto.identifying_attributes, schemas),
    nonIdentifyingAttributes: attributes(dto.non_identifying_attributes, schemas), images, imageUrl: images[0] ?? "",
    physicalProfile: physical(dto.physical_profile), inventoryPreparationStatus: prep.inventario.status,
    inventoryStatus: prep.inventario.status, inventoryManualRetryAllowed: prep.inventario.manualRetryAllowed,
    inventoryPreparationCode: prep.inventario.code };
}
export function mapProduct(value: unknown, preparation: ProductPreparationView, schemas: CatalogAttributeMetadata[]): ProductDetailView {
  const dto = object(value); const id = string(dto.product_id); const hasVariants = boolean(dto.tiene_variantes);
  if (id !== preparation.productId || hasVariants !== preparation.hasVariants) return blockedCatalog("La preparación recibida pertenece a otro producto.");
  const variants = array(dto.variants).map(v => mapVariant(v, id, preparation, schemas));
  const images = array(dto.images).map(string);
  const statuses = [preparation.pricing.status, ...(preparation.inventario ? [preparation.inventario.status] : []),
    ...variants.filter(v => v.status === "ACTIVA").map(v => v.inventoryPreparationStatus)];
  const summary = statuses.every(s => s === "COMPLETED") ? "COMPLETED" : statuses.every(s => s === "PENDING") ? "PENDING"
    : statuses.includes("REJECTED") ? "REJECTED" : "PARTIAL";
  return { id, name: string(dto.name), skuBase: dto.sku_base == null ? null : string(dto.sku_base), hasVariants,
    categoryId: string(dto.categoria_id), categoryName: string(dto.categoria_id),
    typeId: string(dto.tipo_producto_id), typeName: string(dto.tipo_producto_id),
    brandId: string(dto.marca_id), brandName: string(dto.marca_id),
    status: choice(dto.status, ["BORRADOR", "ACTIVO", "INACTIVO"] as const), catalogVersion: integer(dto.catalog_version),
    preparationSummary: summary, description: dto.description == null ? "" : string(dto.description),
    imageUrl: images[0], images: images.map(url => ({ url })), attributes: attributes(dto.attributes, schemas),
    physicalProfile: physical(dto.perfil_fisico), preparation,
    variants: variants.map(v => ({ variantId: v.variantId, sku: v.sku,
      attributesSummary: v.identifyingAttributes.map(a => String(a.valor)).join(" / "), status: v.status,
      preparationStatus: v.inventoryPreparationStatus, manualRetryAllowed: v.inventoryManualRetryAllowed })) };
}
