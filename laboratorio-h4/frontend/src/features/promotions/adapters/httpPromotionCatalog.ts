import type {
  CatalogCategoryChoice,
  CatalogProductChoice,
  PromotionCatalogRepository,
} from "../services/catalogRepository";

// OpenAPI 0.6.0-rc.1, Docs e6a8ec2: listarProductos (commercial DTO),
// listarVariantesProducto and listarCategoriasAdmin (administrative DTOs).
// This is a backoffice USER session adapter, never an inter-service identity.
export function createHttpPromotionCatalog(
  request: (path: string, signal: AbortSignal) => Promise<unknown>,
): PromotionCatalogRepository {
  async function pages(path: string, nested: boolean, signal: AbortSignal) {
    const rows: unknown[] = [];
    let expectedTotal: number | undefined;
    let expectedSize: number | undefined;
    for (let current = 1; current <= 1000; current++) {
      signal.throwIfAborted();
      const response = object(
        await request(`${path}&pagina=${current}&tamanio=100`, signal),
      );
      signal.throwIfAborted();
      const meta = nested ? object(response.meta) : response;
      const page = integer(meta.pagina, 1);
      const size = integer(meta.tamanio, 1);
      const total = integer(meta.total, 0);
      const items = list(response.items);
      if (nested) integer(meta.totalPaginas, 0);
      if (
        page !== current ||
        size > 100 ||
        items.length > size ||
        (expectedSize !== undefined && size !== expectedSize) ||
        (expectedTotal !== undefined && total !== expectedTotal) ||
        (page - 1) * size !== rows.length ||
        rows.length + items.length > total
      )
        throw new Error("INCOMPLETE_CATALOG_PAGE");
      expectedTotal = total;
      expectedSize = size;
      rows.push(...items);
      if (rows.length === total) return rows;
      if (!items.length) throw new Error("INCOMPLETE_CATALOG_PAGE");
    }
    throw new Error("CATALOG_PAGE_LIMIT");
  }

  return {
    async products(signal, retain) {
      const bounded = AbortSignal.any([signal, AbortSignal.timeout(7500)]);
      const retainedIds = new Set(retain?.productIds ?? []);
      const retainedSkus = new Set(retain?.skus ?? []);
      // The commercial DTO omits status. The published backoffice estado
      // filter identifies each set; no guessed SKU→product conversion or cache.
      const groups = [{ state: "ACTIVO", rows: await pages("/productos?estado=ACTIVO", false, bounded) }];
      if (retainedIds.size || retainedSkus.size)
        groups.push({ state: "INACTIVO", rows: await pages("/productos?estado=INACTIVO", false, bounded) });
      const products: CatalogProductChoice[] = [];
      const ids = new Set<string>();
      const skus = new Set<string>();
      for (const group of groups) for (const value of group.rows) {
        bounded.throwIfAborted();
        const row = object(value);
        const id = text(row.product_id);
        const active = group.state === "ACTIVO";
        if (!active && !retainedIds.has(id)) {
          if (!retainedSkus.size) continue;
          // A simple product can only resolve its own published base SKU.
          // Ignore unrelated inactive rows before mapping optional SKU data.
          if (row.tiene_variantes === false &&
              (typeof row.sku_base !== "string" || !retainedSkus.has(row.sku_base))) continue;
        }
        unique(ids, id);
        const name = text(row.name);
        const categoryId = text(row.categoria_id);
        text(row.slug);
        text(row.tipo_producto_id);
        text(row.marca_id);
        if (typeof row.tiene_variantes !== "boolean")
          throw new Error("INVALID_CATALOG_RESPONSE");
        // status is absent from ProductoResumenComercial. Activity follows the
        // documented estado filter, not a guessed field/default.
        if (row.status !== undefined) {
          state(row.status, ["BORRADOR", "ACTIVO", "INACTIVO"]);
          if (row.status !== group.state) continue;
        }
        const choices: CatalogProductChoice["skus"] = [];
        if (row.tiene_variantes) {
          const variants = await pages(
            `/productos/${encodeURIComponent(id)}/variantes?estado=ACTIVA`,
            true,
            bounded,
          );
          if (retainedSkus.size)
            variants.push(...await pages(
              `/productos/${encodeURIComponent(id)}/variantes?estado=INACTIVA`,
              true,
              bounded,
            ));
          const variantIds = new Set<string>();
          for (const value of variants) {
            const variant = object(value);
            unique(variantIds, text(variant.variant_id));
            const sku = text(variant.sku);
            state(variant.status, ["BORRADOR", "ACTIVA", "INACTIVA"]);
            if (variant.status !== "ACTIVA" && !retainedSkus.has(sku)) continue;
            unique(skus, sku);
            // SKU is a published label; optional identifying attributes are
            // not required and no barcode/product_id is substituted for it.
            choices.push({ sku, label: sku, active: active && variant.status === "ACTIVA" });
          }
        } else if (active || row.sku_base != null) {
          // Active selections still require a confirmed sellable SKU. An
          // inactive product retained by ID can preserve identity without one.
          const sku = text(row.sku_base);
          unique(skus, sku);
          choices.push({ sku, label: name, active });
        }
        if (active || retainedIds.has(id) || choices.some(choice => retainedSkus.has(choice.sku)))
          products.push({ id, name, categoryId, active, skus: choices });
      }
      bounded.throwIfAborted();
      if ([...retainedIds].some(id => !products.some(product => product.id === id)) ||
          [...retainedSkus].some(sku => !products.some(product => product.skus.some(choice => choice.sku === sku))))
        throw new Error("RETAINED_CATALOG_REFERENCE_UNAVAILABLE");
      return products;
    },
    async categories(signal) {
      const bounded = AbortSignal.any([signal, AbortSignal.timeout(7500)]);
      const rows = await pages(
        "/categorias/administracion?estado=ACTIVO",
        true,
        bounded,
      );
      const categories: CatalogCategoryChoice[] = [];
      const ids = new Set<string>();
      for (const value of rows) {
        const row = object(value);
        const id = text(row.categoriaId);
        unique(ids, id);
        const name = text(row.nombre);
        state(row.estado, ["ACTIVO", "INACTIVO"]);
        integer(row.version, 0);
        if (row.estado === "ACTIVO")
          categories.push({ id, name, active: true });
      }
      bounded.throwIfAborted();
      return categories;
    },
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID_CATALOG_RESPONSE");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error("INVALID_CATALOG_RESPONSE");
  return value;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("INVALID_CATALOG_RESPONSE");
  return value;
}
function integer(value: unknown, minimum: number): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  )
    throw new Error("INVALID_CATALOG_RESPONSE");
  return value;
}
function state(value: unknown, allowed: readonly string[]) {
  if (typeof value !== "string" || !allowed.includes(value))
    throw new Error("INVALID_CATALOG_RESPONSE");
}
function unique(seen: Set<string>, id: string) {
  if (seen.has(id)) throw new Error("AMBIGUOUS_CATALOG_IDENTITY");
  seen.add(id);
}
