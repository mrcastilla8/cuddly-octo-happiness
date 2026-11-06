import { CatalogError, type CatalogRepository, type ProductCreatePayload, type ProductUpdatePayload } from "../services/catalogRepository";
import { array, blockedCatalog, choice, createCatalogHttp, encoded, integer, object, string, type CatalogHttpTransport } from "./catalogHttp";
import { mapPreparation, mapProduct, mapVariant, requestAttributes, requestPhysical, type CatalogAttributeMetadata } from "./httpCatalogMapper";

/** Revalidado con OpenAPI 0.6.0-rc.2, Docs 5124eea. Commercial GETs cannot become admin DTOs. */
export function createHttpCatalogRepository(transport: CatalogHttpTransport): CatalogRepository {
  const request = createCatalogHttp(transport);
  const productPath = (id: string) => `/productos/${encoded(id)}`;
  const variantPath = (pid: string, vid?: string) => `${productPath(pid)}/variantes${vid === undefined ? "" : "/" + encoded(vid)}`;
  const preparation = async (id: string, signal?: AbortSignal) => {
    const result = mapPreparation(await request(`${productPath(id)}/preparacion`, "GET", undefined, signal));
    if (result.productId !== id) return blockedCatalog("La preparación pertenece a otro producto.");
    return result;
  };
  // Type/unit come from the published characteristic GET. The response already
  // separates identifying/non-identifying values; no roles are inferred here.
  const readSchemas = async (values: unknown[], signal?: AbortSignal): Promise<CatalogAttributeMetadata[]> => {
    const ids = [...new Set(values.map(value => string(object(value).caracteristica_id)))];
    return Promise.all(ids.map(async id => {
      const dto = object(await request(`/caracteristicas/${encoded(id)}`, "GET", undefined, signal));
      if (dto.caracteristicaId !== id) return blockedCatalog("La característica recibida no coincide con la solicitada.");
      return { caracteristicaId: id, tipo: choice(dto.tipo, ["TEXTO", "NUMERO", "LISTA"] as const),
        unidad: dto.unidadMedida == null ? undefined : string(dto.unidadMedida) };
    }));
  };
  const variantAttributes = (dto: Record<string, unknown>) => [...array(dto.identifying_attributes), ...array(dto.non_identifying_attributes)];
  const productSchemas = (dto: Record<string, unknown>, signal?: AbortSignal) => {
    return readSchemas([...array(dto.attributes), ...array(dto.variants).flatMap(v => variantAttributes(object(v)))], signal);
  };
  const productResult = async (value: unknown, signal?: AbortSignal, expectedId?: string) => {
    const dto = object(value); const id = string(dto.product_id);
    if (expectedId !== undefined && id !== expectedId) return blockedCatalog("La respuesta pertenece a otro producto.");
    const [prep, schema] = await Promise.all([preparation(id, signal), productSchemas(dto, signal)]);
    return mapProduct(dto, prep, schema);
  };
  const variantResult = async (value: unknown, pid: string, signal?: AbortSignal, expectedId?: string) => {
    const dto = object(value);
    if (expectedId !== undefined && dto.variant_id !== expectedId) return blockedCatalog("La respuesta pertenece a otra variante.");
    const [prep, schema] = await Promise.all([preparation(pid, signal), readSchemas(variantAttributes(dto), signal)]);
    return mapVariant(dto, pid, prep, schema);
  };
  const write = async <T>(path: string, method: "POST" | "PATCH", body: unknown, signal: AbortSignal | undefined,
    map: (value: unknown) => Promise<T>, status = 200): Promise<T> => {
    const result = await request(path, method, body, signal, status);
    try { return await map(result); }
    catch { throw new CatalogError("write_unknown", "El servicio confirmó la escritura, pero no se pudo recuperar toda la vista administrativa. No repita el envío; consulte el registro y su preparación."); }
  };
  const productBody = (p: ProductCreatePayload | ProductUpdatePayload) => ({ ...p,
    atributos: requestAttributes(p.atributos), perfilFisico: requestPhysical(p.perfilFisico) });
  const retry = async (path: string, body: unknown, signal?: AbortSignal) => {
    const dto = object(await request(path, "POST", body, signal, 202));
    if (dto.status !== "ACCEPTED") return blockedCatalog("No se confirmó la admisión del reintento.");
    string(dto.correlation_id);
    return { accepted: true, operationId: string(dto.operation_id), message: "Solicitud admitida. Consulte la preparación para conocer el resultado final." };
  };
  const variantState = async (pid: string, vid: string, action: string, signal?: AbortSignal) => ({
    variant: await write(`${variantPath(pid, vid)}/${action}`, "POST", undefined, signal, value => variantResult(value, pid, signal, vid)),
    // Variante does not publish the updated parent status. Do not derive it from a page.
  });
  return {
    async list(q, _scenario, signal) {
      if (q.typeId || (q.saleModel && q.saleModel !== "all")) return blockedCatalog("Los filtros por tipo y modelo de venta no están publicados para esta consulta.");
      const params = new URLSearchParams({ pagina: String(q.page), tamanio: String(q.pageSize) });
      if (q.q) params.set("q", q.q);
      if (q.categoryId) params.set("categoriaId", q.categoryId);
      if (q.status && q.status !== "all") params.set("estado", q.status);
      const dto = object(await request(`/productos?${params}`, "GET", undefined, signal));
      const items = array(dto.items); const total = integer(dto.total);
      const page = integer(dto.pagina, 1); const pageSize = integer(dto.tamanio, 1);
      if (items.length || total !== 0) return blockedCatalog("La consulta comercial no incluye estado ni versión administrativos. La gestión del catálogo requiere una lectura administrativa aprobada.");
      return { items: [], total, page, pageSize };
    },
    async getById(id, _scenario, signal) {
      // Preserve HTTP 401/403/404/503. A commercial 404 does not prove a draft absent.
      try { await request(productPath(id), "GET", undefined, signal); }
      catch (error) {
        if (error instanceof CatalogError && error.kind === "not_found")
          throw new CatalogError("blocked_contract", `${error.message} La lectura comercial no confirma la existencia de borradores; falta la consulta administrativa.`, error.details);
        throw error;
      }
      return blockedCatalog("El detalle comercial no permite editar borradores: faltan estado, versión y perfil administrativos.");
    },
    create: (p, _sc, sig) => write("/productos", "POST", productBody(p), sig, value => productResult(value, sig), 201),
    update: (id, p, _sc, sig) => write(productPath(id), "PATCH", productBody(p), sig, value => productResult(value, sig, id)),
    activate: (id, p, _sc, sig) => write(`${productPath(id)}/activar`, "POST", p ?? {}, sig, value => productResult(value, sig, id)),
    deactivate: (id, p, _sc, sig) => write(`${productPath(id)}/desactivar`, "POST", p ?? {}, sig, value => productResult(value, sig, id)),
    reactivate: (id, p, _sc, sig) => write(`${productPath(id)}/reactivar`, "POST", p ?? {}, sig, value => productResult(value, sig, id)),
    getPreparation: (id, _sc, sig) => preparation(id, sig),
    retryPreparation: (id, p, _sc, sig) => retry(`${productPath(id)}/preparacion/reintentar`, p, sig),
    async listVariants(pid, q, _sc, sig) {
      const params = new URLSearchParams({ pagina: String(q?.page ?? 1), tamanio: String(q?.pageSize ?? q?.limit ?? 20) });
      if (q?.status && q.status !== "all") params.set("estado", q.status);
      const dto = object(await request(`${variantPath(pid)}?${params}`, "GET", undefined, sig));
      const meta = object(dto.meta);
      const items = array(dto.items);
      // One preparation snapshot and one metadata read per characteristic/page.
      const mapped = items.length ? await Promise.all([
        preparation(pid, sig), readSchemas(items.flatMap(v => variantAttributes(object(v))), sig),
      ]).then(([prep, schema]) => items.map(v => mapVariant(v, pid, prep, schema))) : [];
      return { items: mapped,
        total: integer(meta.total), page: integer(meta.pagina, 1), pageSize: integer(meta.tamanio, 1) };
    },
    getVariantById: async (pid, vid, _sc, sig) => variantResult(await request(variantPath(pid, vid), "GET", undefined, sig), pid, sig, vid),
    createVariant: async (pid, p, _sc, sig) => {
      if (typeof p.sku !== "string" || !p.sku.trim()) throw new CatalogError("validation", "El SKU es obligatorio (SKU_INVALIDO).", { sku: "Ingrese un SKU explícito." });
      return write(variantPath(pid), "POST", { sku: p.sku,
        atributosIdentificadores: requestAttributes(p.identifyingAttributes ?? p.atributosIdentificadores),
        atributosNoIdentificadores: requestAttributes(p.nonIdentifyingAttributes ?? p.atributosNoIdentificadores),
        imagenUrl: p.imageUrl ?? p.imagenUrl, perfilFisico: requestPhysical(p.physicalProfile !== undefined ? p.physicalProfile : p.perfilFisico) },
        sig, value => variantResult(value, pid, sig), 201);
    },
    updateVariant: (pid, vid, p, _sc, sig) => write(variantPath(pid, vid), "PATCH", {
      atributosNoIdentificadores: requestAttributes(p.nonIdentifyingAttributes ?? p.atributosNoIdentificadores),
      imagenUrl: p.imageUrl ?? p.imagenUrl, perfilFisico: requestPhysical(p.physicalProfile !== undefined ? p.physicalProfile : p.perfilFisico), catalogVersion: p.catalogVersion },
      sig, value => variantResult(value, pid, sig, vid)),
    activateVariant: (pid, vid, _sc, sig) => variantState(pid, vid, "activar", sig),
    deactivateVariant: (pid, vid, _sc, sig) => variantState(pid, vid, "desactivar", sig),
    reactivateVariant: (pid, vid, _sc, sig) => variantState(pid, vid, "reactivar", sig),
    retryVariantPreparation: (pid, vid, _sc, sig) => retry(`${variantPath(pid, vid)}/preparacion/reintentar`, {}, sig),
  };
}
