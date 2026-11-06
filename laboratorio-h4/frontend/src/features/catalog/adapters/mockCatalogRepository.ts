import type {
  CatalogPageResult,
  CatalogQuery,
  CatalogRepository,
  ProductCreatePayload,
  ProductDetailView,
  ProductPreparationView,
  ProductUpdatePayload,
  RetryPreparationPayload,
  StateMutationPayload,
  VariantCreatePayload,
  VariantDetailView,
  VariantMutationResult,
  VariantPageResult,
  VariantQuery,
  VariantUpdatePayload,
  ProductAttributeValue,
} from "../services/catalogRepository";
import { CatalogError } from "../services/catalogRepository";
import { initialProducts, initialVariants } from "../mocks/catalogFixtures";
import type { TaxonomyRepository } from "../services/taxonomyRepository";
import { MockTaxonomyRepository } from "./mockTaxonomyRepository";
import { sharedMockTaxonomyRepository } from "./sharedMockTaxonomyRepository";
import {
  normalizePhysicalProfile,
  isPhysicalProfileComplete,
  hasValidPhysicalValues,
} from "../services/catalogPresentation";
import {
  clearMockState,
  isMockPersistenceAvailable,
  isRecord,
  publishMockChange,
  readMockState,
  saveMockState,
  subscribeExternalMockChanges,
} from "../../shared/mockState";

export interface CatalogBulkOperation {
  sku: string;
  productId: string;
  priceInitial: number;
}

interface MockCatalogState {
  products: ProductDetailView[];
  variants: VariantDetailView[];
  bulkOperations?: [string, CatalogBulkOperation][];
}

function isCatalogProduct(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.skuBase === "string" &&
    value.skuBase.trim().length > 0 &&
    (value.status === "ACTIVO" || value.status === "INACTIVO" || value.status === "BORRADOR") &&
    typeof value.catalogVersion === "number" &&
    Number.isFinite(value.catalogVersion) &&
    value.catalogVersion >= 0
  );
}

function isCatalogVariant(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.variantId === "string" &&
    value.variantId.trim().length > 0 &&
    typeof value.productId === "string" &&
    value.productId.trim().length > 0 &&
    typeof value.sku === "string" &&
    value.sku.trim().length > 0 &&
    (value.status === "ACTIVA" || value.status === "INACTIVA" || value.status === "BORRADOR") &&
    typeof value.catalogVersion === "number" &&
    Number.isFinite(value.catalogVersion) &&
    value.catalogVersion >= 0
  );
}

function isMockCatalogState(value: unknown): value is MockCatalogState {
  return (
    isRecord(value) &&
    Array.isArray(value.products) &&
    value.products.every(isCatalogProduct) &&
    Array.isArray(value.variants) &&
    value.variants.every(isCatalogVariant) &&
    (value.bulkOperations === undefined || Array.isArray(value.bulkOperations))
  );
}

export class MockCatalogRepository implements CatalogRepository {
  private products: ProductDetailView[] = [];
  private variants: VariantDetailView[] = [];
  private bulkOperations: Map<string, CatalogBulkOperation> = new Map();
  private listeners = new Set<() => void>();
  private revisionValue = 0;
  private readonly persistEnabled: boolean;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  revision = () => this.revisionValue;
  private changed(persist = true) {
    this.revisionValue++;
    let ok = true;
    if (persist && this.persistEnabled) {
      ok = saveMockState("catalog", this.snapshot());
    }
    publishMockChange("catalog");
    this.listeners.forEach(listener => listener());
    if (!ok && persist && this.persistEnabled) {
      throw new CatalogError("unknown", "No se pudo guardar el cambio. Vuelve a intentarlo.");
    }
  }

  constructor(
    private readonly taxonomy: TaxonomyRepository = new MockTaxonomyRepository(),
    options: { persist?: boolean } = {},
  ) {
    // Directly constructed repositories stay isolated; only the demo singleton
    // opts into persistence explicitly.
    this.persistEnabled = options.persist === true && isMockPersistenceAvailable();
    if (this.persistEnabled) {
      const stored = readMockState("catalog", isMockCatalogState);
      if (stored) {
        this.products = stored.products;
        this.variants = stored.variants;
        this.bulkOperations = new Map(stored.bulkOperations ?? []);
      } else {
        this.loadFixtures();
      }
      subscribeExternalMockChanges("catalog", () => this.hydrateFromStorage());
    } else {
      this.loadFixtures();
    }
  }

  private snapshot(): MockCatalogState {
    return {
      products: this.products,
      variants: this.variants,
      bulkOperations: Array.from(this.bulkOperations.entries()),
    };
  }

  private loadFixtures() {
    this.products = JSON.parse(JSON.stringify(initialProducts));
    this.variants = JSON.parse(JSON.stringify(initialVariants));
    this.bulkOperations.clear();
  }

  private hydrateFromStorage() {
    if (!this.persistEnabled) return;
    const stored = readMockState("catalog", isMockCatalogState);
    if (!stored) return;
    this.products = stored.products;
    this.variants = stored.variants;
    this.bulkOperations = new Map(stored.bulkOperations ?? []);
    // Notify consumers without re-persisting the value just read.
    this.changed(false);
  }

  async applyBulkProducts(
    items: Array<{
      sku: string;
      name: string;
      description?: string;
      categoryName?: string;
      categoryId?: string;
      brandName?: string;
      brandId?: string;
      typeName?: string;
      typeId?: string;
      priceInitial?: number;
      rowId?: string | number;
    }>,
    batchId?: string,
  ): Promise<void> {
    const norm = (s?: string) => s?.trim().toLowerCase() ?? "";

    const [categories, brands, productTypes] = await Promise.all([
      sharedMockTaxonomyRepository.getCategories(),
      sharedMockTaxonomyRepository.getBrands(),
      sharedMockTaxonomyRepository.getProductTypes(),
    ]);

    const prevProducts = JSON.parse(JSON.stringify(this.products)) as ProductDetailView[];
    const prevVariants = JSON.parse(JSON.stringify(this.variants));
    const prevBulkOps = new Map(this.bulkOperations);

    try {
      let hasChanges = false;
      for (const item of items) {
        const skuUpper = item.sku.trim().toUpperCase();
        const expectedPrice = item.priceInitial !== undefined ? Number(item.priceInitial) : 0;
        const rowIdStr = item.rowId !== undefined ? String(item.rowId) : undefined;
        const operationKey = batchId && rowIdStr ? `${batchId}:${rowIdStr}:CATALOGO` : undefined;

        // 2. Buscar operationKey.
        if (operationKey) {
          const existingOp = this.bulkOperations.get(operationKey);
          if (existingOp) {
            // 3. Si existe y el SKU, precio y producto coinciden con la operación guardada, devolver éxito sin crear otro producto.
            const productExists = this.products.some(
              (p) => p.id === existingOp.productId && p.skuBase?.toUpperCase() === existingOp.sku.toUpperCase(),
            );
            const pricesMatch = Math.abs(existingOp.priceInitial - expectedPrice) < 0.001;
            const skusMatch = existingOp.sku.toUpperCase() === skuUpper;

            if (productExists && pricesMatch && skusMatch) {
              continue;
            }
            // 4. Si existe pero la intención difiere, lanzar conflicto.
            throw new CatalogError(
              "conflict",
              `Conflicto de idempotencia en Catálogo para la operación ${operationKey}: los datos recibidos difieren del registro previo.`,
            );
          }
        }

        // 5. Si no existe, comprobar duplicación global de SKU.
        const existingInProducts = this.products.some(
          (p) => p.skuBase?.toUpperCase() === skuUpper,
        );
        const existingInVariants = this.variants.some(
          (v) => v.sku.toUpperCase() === skuUpper,
        );
        if (existingInProducts || existingInVariants) {
          throw new CatalogError(
            "duplicate_sku",
            `El SKU "${item.sku.trim()}" ya existe en el catálogo maestro.`,
          );
        }

        // 2. Resolver categoría contra maestros de taxonomía
        let resolvedCategoryId = item.categoryId;
        let resolvedCategoryName = item.categoryName;
        if (!resolvedCategoryId && item.categoryName) {
          let matched = categories.filter(
            (c) => norm(c.nombre) === norm(item.categoryName) && c.activo,
          );
          if (matched.length > 1) {
            const officialOnly = matched.filter((c) => !c.id.startsWith("CAT-"));
            if (officialOnly.length === 1) {
              matched = officialOnly;
            }
          }
          if (matched.length === 0) {
            throw new CatalogError(
              "validation",
              `Categoría "${item.categoryName}" no encontrada o inactiva en la taxonomía.`,
            );
          }
          if (matched.length > 1) {
            throw new CatalogError(
              "validation",
              `Múltiples categorías coinciden con "${item.categoryName}".`,
            );
          }
          const firstCat = matched[0];
          if (!firstCat) {
            throw new CatalogError("validation", `Categoría "${item.categoryName}" no encontrada.`);
          }
          resolvedCategoryId = firstCat.id;
          resolvedCategoryName = firstCat.nombre;
        } else if (!resolvedCategoryId) {
          throw new CatalogError("validation", "La categoría es obligatoria para la importación.");
        }

        // 3. Resolver marca contra maestros de taxonomía
        let resolvedBrandId = item.brandId;
        let resolvedBrandName = item.brandName;
        if (!resolvedBrandId && item.brandName) {
          const matched = brands.filter(
            (b) => norm(b.nombre) === norm(item.brandName) && b.activo,
          );
          if (matched.length === 0) {
            throw new CatalogError(
              "validation",
              `Marca "${item.brandName}" no encontrada o inactiva en la taxonomía.`,
            );
          }
          if (matched.length > 1) {
            throw new CatalogError(
              "validation",
              `Múltiples marcas coinciden con "${item.brandName}".`,
            );
          }
          const firstBrand = matched[0];
          if (!firstBrand) {
            throw new CatalogError("validation", `Marca "${item.brandName}" no encontrada.`);
          }
          resolvedBrandId = firstBrand.id;
          resolvedBrandName = firstBrand.nombre;
        } else if (!resolvedBrandId) {
          throw new CatalogError("validation", "La marca es obligatoria para la importación.");
        }

        // 4. Resolver tipo de producto obligatorio contra maestros de taxonomía
        let resolvedTypeId = item.typeId;
        let resolvedTypeName = item.typeName;
        if (!resolvedTypeId && item.typeName) {
          const matched = productTypes.filter(
            (pt) => norm(pt.nombre) === norm(item.typeName) && pt.activo,
          );
          if (matched.length === 0) {
            throw new CatalogError(
              "validation",
              `Tipo de producto "${item.typeName}" no encontrado o inactivo en la taxonomía.`,
            );
          }
          if (matched.length > 1) {
            throw new CatalogError(
              "validation",
              `Múltiples tipos de producto coinciden con "${item.typeName}".`,
            );
          }
          const firstType = matched[0];
          if (!firstType) {
            throw new CatalogError("validation", `Tipo de producto "${item.typeName}" no encontrado.`);
          }
          resolvedTypeId = firstType.id;
          resolvedTypeName = firstType.nombre;
        } else if (!resolvedTypeId) {
          throw new CatalogError("validation", "El tipo de producto es obligatorio para la importación.");
        }

        const newId = `PROD-${crypto.randomUUID()}`;
        const newProduct: ProductDetailView = {
          id: newId,
          name: item.name.trim(),
          skuBase: skuUpper,
          description:
            item.description?.trim() || "Producto importado mediante carga masiva",
          hasVariants: false,
          categoryId: resolvedCategoryId,
          categoryName: resolvedCategoryName || item.categoryName || "",
          typeId: resolvedTypeId,
          typeName: resolvedTypeName || item.typeName || "",
          brandId: resolvedBrandId,
          brandName: resolvedBrandName || item.brandName || "",
          status: "ACTIVO",
          preparationSummary: "COMPLETED",
          catalogVersion: 1,
          priceInitial: item.priceInitial,
          publishedCommercially: true,
          images: [],
          attributes: [],
          physicalProfile: null,
          variants: [],
          preparation: {
            productId: newId,
            hasVariants: false,
            pricing: { status: "COMPLETED", manualRetryAllowed: false, code: null },
            inventario: { status: "COMPLETED", manualRetryAllowed: false, code: null },
            variantes: [],
          },
        };

        if (operationKey) {
          this.bulkOperations.set(operationKey, {
            sku: skuUpper,
            productId: newId,
            priceInitial: expectedPrice,
          });
        }

        this.products.unshift(newProduct);
        hasChanges = true;
      }

      if (hasChanges) {
        this.changed();
      }
    } catch (error) {
      this.products = prevProducts;
      this.variants = prevVariants;
      this.bulkOperations = prevBulkOps;
      throw error;
    }
  }

  reset() {
    clearMockState("catalog");
    this.loadFixtures();
    this.changed();
  }

  // Test/demo input representing a confirmed asynchronous result; never an HTTP endpoint.
  receiveVariantInventoryResult(productId: string, variantId: string, status: "COMPLETED" | "REJECTED", manualRetryAllowed = false) {
    const variant = this.variants.find(v => v.productId === productId && v.variantId === variantId);
    if (!variant) throw new CatalogError("not_found", "Variante no encontrada.");
    if (variant.inventoryPreparationStatus === "COMPLETED") return;
    variant.inventoryPreparationStatus = status;
    variant.inventoryStatus = status;
    variant.inventoryManualRetryAllowed = status === "REJECTED" && manualRetryAllowed;
    this.changed();
  }

  async list(
    query: CatalogQuery,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<CatalogPageResult> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "list-loading" || scenario === "loading") {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    if (scenario === "list-error" || scenario === "error") {
      throw new CatalogError(
        "unknown",
        "No se pudieron consultar los productos. Los filtros se conservan.",
      );
    }
    if (scenario === "forbidden") {
      throw new CatalogError(
        "forbidden",
        "No cuentas con permisos suficientes para acceder a la gestión de productos.",
      );
    }
    if (scenario === "session") {
      throw new CatalogError(
        "session",
        "Tu sesión ha caducado. Vuelve a iniciar sesión para continuar.",
      );
    }
    if (scenario === "list-empty" || scenario === "empty") {
      return { items: [], total: 0, page: 1, pageSize: query.pageSize || 10 };
    }
    if (scenario === "list-no-results" || scenario === "no-results") {
      return { items: [], total: 0, page: query.page || 1, pageSize: query.pageSize || 10 };
    }

    const [categories, brands, types] = await Promise.all([
      this.taxonomy.getCategories(signal), this.taxonomy.getBrands(signal), this.taxonomy.getProductTypes(signal),
    ]);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    let filtered = this.products.map(product => ({ ...product,
      categoryName: categories.find(row => row.id === product.categoryId)?.nombre ?? product.categoryName,
      brandName: brands.find(row => row.id === product.brandId)?.nombre ?? product.brandName,
      typeName: types.find(row => row.id === product.typeId)?.nombre ?? product.typeName,
    }));

    if (query.q && query.q.trim()) {
      const term = query.q.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.skuBase?.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term),
      );
    }

    if (query.categoryId && query.categoryId !== "all") {
      filtered = filtered.filter((p) => p.categoryId === query.categoryId);
    }

    if (query.typeId && query.typeId !== "all") {
      filtered = filtered.filter((p) => p.typeId === query.typeId);
    }

    if (query.saleModel && query.saleModel !== "all") {
      filtered = filtered.filter((p) =>
        query.saleModel === "variants" ? p.hasVariants : !p.hasVariants,
      );
    }

    if (query.status && query.status !== "all") {
      filtered = filtered.filter((p) => p.status === query.status);
    }

    const total = filtered.length;
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.max(1, query.pageSize || 10);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map((p) => ({
      id: p.id,
      name: p.name,
      skuBase: p.skuBase,
      hasVariants: p.hasVariants,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      typeId: p.typeId,
      typeName: p.typeName,
      brandId: p.brandId,
      brandName: p.brandName,
      status: p.status,
      preparationSummary: p.preparationSummary,
      imageUrl: p.imageUrl,
      catalogVersion: p.catalogVersion,
      priceInitial: p.priceInitial,
    }));

    return { items, total, page, pageSize };
  }

  async getById(
    id: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView | null> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "loading") {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    if (scenario === "error") {
      throw new CatalogError(
        "unknown",
        "Error al consultar el detalle del producto.",
      );
    }
    if (scenario === "product-not-found" || scenario === "missing") {
      return null;
    }

    const found = this.products.find((p) => p.id === id);
    if (!found) return null;

    const cloned: ProductDetailView = JSON.parse(JSON.stringify(found));
    const [categories, brands, types] = await Promise.all([
      this.taxonomy.getCategories(signal), this.taxonomy.getBrands(signal), this.taxonomy.getProductTypes(signal),
    ]);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    cloned.categoryName = categories.find(row => row.id === cloned.categoryId)?.nombre ?? cloned.categoryName;
    cloned.brandName = brands.find(row => row.id === cloned.brandId)?.nombre ?? cloned.brandName;
    cloned.typeName = types.find(row => row.id === cloned.typeId)?.nombre ?? cloned.typeName;

    // Authoritative variant synchronization for parent product
    if (cloned.hasVariants) {
      const vars = this.variants.filter((v) => v.productId === id);
      cloned.variants = vars.map((v) => ({
        variantId: v.variantId,
        sku: v.sku,
        attributesSummary: v.identifyingAttributes
          .map((a) => `${a.nombre}: ${a.valor}`)
          .join(" · "),
        status: v.status,
        preparationStatus: v.inventoryPreparationStatus,
        manualRetryAllowed: v.inventoryManualRetryAllowed,
      }));
      cloned.preparation.variantes = vars.map((v) => ({
        variantId: v.variantId,
        sku: v.sku,
        inventario: {
          status: v.inventoryPreparationStatus,
          manualRetryAllowed: v.inventoryManualRetryAllowed,
          code: v.inventoryPreparationCode,
        },
      }));
    }

    if (scenario === "prep-partial") {
      cloned.preparationSummary = "PARTIAL";
      cloned.preparation.pricing.status = "COMPLETED";
      if (cloned.preparation.inventario) {
        cloned.preparation.inventario.status = "PENDING";
        cloned.preparation.inventario.manualRetryAllowed = false;
      }
    } else if (scenario === "prep-pending") {
      cloned.preparationSummary = "PENDING";
      cloned.preparation.pricing.status = "PENDING";
      cloned.preparation.pricing.manualRetryAllowed = false;
      if (cloned.preparation.inventario) {
        cloned.preparation.inventario.status = "PENDING";
        cloned.preparation.inventario.manualRetryAllowed = false;
      }
    } else if (scenario === "prep-rejected") {
      cloned.preparationSummary = "REJECTED";
      cloned.preparation.pricing.status = "COMPLETED";
      if (cloned.preparation.inventario) {
        cloned.preparation.inventario.status = "REJECTED";
        cloned.preparation.inventario.code = "INV_SKU_INITIALIZATION_FAILED";
        cloned.preparation.inventario.manualRetryAllowed = true;
      }
    } else if (scenario === "parent-no-active-variants" && cloned.hasVariants) {
      cloned.variants.forEach((v) => {
        v.status = "INACTIVA";
      });
    }

    return cloned;
  }

  async create(
    payload: ProductCreatePayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "create-duplicate-sku") {
      throw new CatalogError(
        "duplicate_sku",
        `El SKU base "${payload.skuBase}" ya está registrado en el catálogo.`,
        { skuBase: "SKU ya existe" },
      );
    }
    if (scenario === "create-invalid-master") {
      throw new CatalogError(
        "invalid_master",
        "La categoría o marca seleccionada no es válida en Taxonomía.",
      );
    }
    if (scenario === "create-invalid-physical") {
      throw new CatalogError(
        "invalid_physical",
        "Las medidas y peso físico deben ser mayores que cero.",
      );
    }
    if (scenario === "write-unknown") {
      throw new CatalogError(
        "unknown",
        "No se recibió confirmación del servidor. Consulta el listado antes de reenviar.",
      );
    }

    // Required business validations
    if (!payload.nombre || !payload.nombre.trim()) {
      throw new CatalogError("validation", "El nombre del producto es obligatorio.");
    }
    if (!payload.descripcion || !payload.descripcion.trim()) {
      throw new CatalogError("validation", "La descripción es obligatoria.");
    }
    if (!payload.skuBase || !payload.skuBase.trim()) {
      throw new CatalogError("validation", "El SKU base es obligatorio.");
    }
    if (!payload.precioBaseInicial || payload.precioBaseInicial <= 0) {
      throw new CatalogError("validation", "El precio base inicial debe ser mayor que cero.");
    }

    // Physical profile validation for simple products: if values supplied, must be > 0
    if (!payload.tieneVariantes && payload.perfilFisico) {
      if (!hasValidPhysicalValues(payload.perfilFisico)) {
        throw new CatalogError(
          "invalid_physical",
          "Todos los valores del perfil físico suministrados deben ser mayores que cero.",
        );
      }
    }

    const [categories, brands, types] = await Promise.all([
      this.taxonomy.getCategories(signal), this.taxonomy.getBrands(signal), this.taxonomy.getProductTypes(signal),
    ]);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const category = categories.find(c => c.id === payload.categoriaId);
    const brand = brands.find(b => b.id === payload.marcaId);
    const pType = types.find(t => t.id === payload.tipoProductoId);
    if (!category?.activo || !brand?.activo || !pType?.activo) {
      throw new CatalogError("invalid_master", "Selecciona categoría, marca y tipo activos en Taxonomía.");
    }
    // Check after all awaits: concurrent creates share one global SKU namespace.
    if (this.products.some(p => p.skuBase?.toUpperCase() === payload.skuBase.trim().toUpperCase()) ||
      this.variants.some(v => v.sku.toUpperCase() === payload.skuBase.trim().toUpperCase())) {
      throw new CatalogError("duplicate_sku", `El SKU base "${payload.skuBase}" ya está en uso.`, { skuBase: "SKU base duplicado" });
    }

    const newId = `PROD-${crypto.randomUUID()}`;
    const newProduct: ProductDetailView = {
      id: newId,
      name: payload.nombre.trim(),
      skuBase: payload.skuBase.trim().toUpperCase(),
      description: payload.descripcion.trim(),
      hasVariants: payload.tieneVariantes,
      categoryId: payload.categoriaId,
      categoryName: category?.nombre || "Categoría",
      typeId: payload.tipoProductoId,
      typeName: pType?.nombre || "Tipo",
      brandId: payload.marcaId,
      brandName: brand?.nombre || "Marca",
      status: "BORRADOR",
      preparationSummary: "PENDING",
      imageUrl: payload.imagenes?.[0]?.url,
      catalogVersion: 1,
      priceInitial: payload.precioBaseInicial,
      publishedCommercially: false,
      images: payload.imagenes || [],
      attributes: payload.atributos || [],
      physicalProfile: payload.tieneVariantes
        ? null
        : normalizePhysicalProfile(payload.perfilFisico),
      preparation: {
        productId: newId,
        hasVariants: payload.tieneVariantes,
        pricing: {
          status: "PENDING",
          manualRetryAllowed: false,
          code: null,
        },
        inventario: payload.tieneVariantes
          ? null
          : {
              status: "PENDING",
              manualRetryAllowed: false,
              code: null,
            },
        variantes: [],
      },
      variants: [],
    };

    this.products.unshift(newProduct);
    this.changed();
    return JSON.parse(JSON.stringify(newProduct));
  }

  async update(
    id: string,
    payload: ProductUpdatePayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "edit-version-conflict" || scenario === "conflict") {
      throw new CatalogError(
        "version_conflict",
        "Conflicto de concurrencia: el producto fue modificado por otro gestor. Recarga para sincronizar.",
      );
    }
    if (scenario === "edit-active-rejected") {
      throw new CatalogError(
        "active_rejected",
        "El producto activo no puede perder los requisitos obligatorios de publicación.",
      );
    }
    if (scenario === "write-unknown") {
      throw new CatalogError(
        "unknown",
        "No se recibió respuesta concluyente del servidor al guardar cambios.",
      );
    }

    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new CatalogError("not_found", "Producto no encontrado.");

    const persisted = this.products[idx];
    if (!persisted) throw new CatalogError("not_found", "Producto no encontrado.");
    // Failed validations must never mutate the persisted product.
    const current: ProductDetailView = structuredClone(persisted);

    // Version conflict validation
    if (payload.catalogVersion !== undefined && payload.catalogVersion !== current.catalogVersion) {
      throw new CatalogError(
        "version_conflict",
        `Conflicto de versión (esperada: ${current.catalogVersion}, recibida: ${payload.catalogVersion}).`,
      );
    }

    // If product is ACTIVO, validate that it does not lose activation requirements
    if (current.status === "ACTIVO") {
      if (!payload.nombre?.trim() || !payload.descripcion?.trim()) {
        throw new CatalogError(
          "active_rejected",
          "Un producto activo requiere nombre y descripción completos.",
        );
      }
      if (!current.hasVariants && isPhysicalProfileComplete(current.physicalProfile)) {
        if (!isPhysicalProfileComplete(payload.perfilFisico)) {
          throw new CatalogError(
            "active_rejected",
            "Un producto simple activo requiere las 4 medidas físicas completas (peso, largo, ancho, alto).",
          );
        }
      }
    }

    const [categories, brands, types] = await Promise.all([
      this.taxonomy.getCategories(signal), this.taxonomy.getBrands(signal), this.taxonomy.getProductTypes(signal),
    ]);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (this.products[idx]?.catalogVersion !== current.catalogVersion) {
      throw new CatalogError("version_conflict", "El producto cambió durante la validación. Recarga antes de guardar.");
    }
    const category = categories.find(c => c.id === payload.categoriaId);
    const brand = brands.find(b => b.id === payload.marcaId);
    if (!category?.activo || !brand?.activo) {
      throw new CatalogError("invalid_master", "Selecciona categoría y marca activas en Taxonomía.");
    }

    current.name = payload.nombre.trim();
    current.description = payload.descripcion.trim();
    current.categoryId = payload.categoriaId;
    current.categoryName = category?.nombre || current.categoryName;
    current.brandId = payload.marcaId;
    current.brandName = brand?.nombre || current.brandName;

    // Type correction (Q-06): only allowed in eligible conditions
    if (
      payload.tipoProductoId &&
      payload.tipoProductoId !== current.typeId &&
      current.status === "BORRADOR" &&
      !current.hasVariants &&
      !current.publishedCommercially
    ) {
      const newType = types.find(t => t.id === payload.tipoProductoId);
      current.typeId = payload.tipoProductoId;
      current.typeName = newType?.nombre || current.typeName;
    }

    if (payload.atributos) current.attributes = structuredClone(payload.atributos);
    if (payload.imagenes) {
      current.images = structuredClone(payload.imagenes);
      current.imageUrl = payload.imagenes[0]?.url || undefined;
    }
    if (!current.hasVariants && payload.perfilFisico !== undefined) {
      if (!hasValidPhysicalValues(payload.perfilFisico)) {
        throw new CatalogError(
          "invalid_physical",
          "Todos los valores del perfil físico suministrados deben ser mayores que cero.",
        );
      }
      current.physicalProfile = normalizePhysicalProfile(payload.perfilFisico);
    }

    current.catalogVersion += 1;
    this.products[idx] = current;
    this.changed();

    return JSON.parse(JSON.stringify(current));
  }

  async activate(
    id: string,
    _payload?: StateMutationPayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "activate-missing-requirements") {
      throw new CatalogError(
        "validation",
        "No se puede activar el producto: faltan requisitos obligatorios de publicación.",
      );
    }
    if (scenario === "write-unknown") {
      throw new CatalogError(
        "unknown",
        "Resultado indeterminado de activación. No se repetirá automáticamente.",
      );
    }

    const product = this.products.find((p) => p.id === id);
    if (!product) throw new CatalogError("not_found", "Producto no encontrado.");

    // Validation rules according to SPEC-003 / HU-003:
    // 1. Pricing must be COMPLETED
    if (product.preparation.pricing.status !== "COMPLETED") {
      throw new CatalogError(
        "validation",
        "La inicialización de Pricing debe estar completada antes de activar.",
      );
    }

    // 2. Simple product needs completed Inventory and all 4 physical values
    if (!product.hasVariants) {
      if (product.preparation.inventario?.status !== "COMPLETED") {
        throw new CatalogError(
          "validation",
          "La inicialización de Inventario del SKU simple debe estar completada.",
        );
      }
      if (!isPhysicalProfileComplete(product.physicalProfile)) {
        throw new CatalogError(
          "validation",
          "El producto simple requiere peso, largo, ancho y alto positivos antes de activar.",
        );
      }
    } else {
      // 3. Variant parent needs at least one active variant and all active variants prepared
      const vars = this.variants.filter((v) => v.productId === id);
      const activeVariants = vars.filter((v) => v.status === "ACTIVA");
      if (activeVariants.length === 0) {
        throw new CatalogError(
          "validation",
          "El producto con variantes requiere al menos una variante activa para publicarse.",
        );
      }
      const allActivePrepared = activeVariants.every(
        (v) => v.inventoryPreparationStatus === "COMPLETED",
      );
      if (!allActivePrepared) {
        throw new CatalogError(
          "validation",
          "Todas las variantes activas deben tener su preparación de inventario completada.",
        );
      }
    }

    // 4. Must have valid image
    if (!product.images || product.images.length === 0) {
      throw new CatalogError("validation", "Se requiere al menos una imagen de publicación.");
    }

    // 5. Must satisfy required attributes of product type
    const expectedVersion = product.catalogVersion;
    const expectedRevision = this.revisionValue;
    const schemas = await this.taxonomy.getAttributeSchema(product.typeId, signal);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (this.revisionValue !== expectedRevision || this.products.find(row => row.id === id) !== product || product.catalogVersion !== expectedVersion) {
      throw new CatalogError("version_conflict", "El producto cambió durante la validación. Consulta su estado antes de activar.");
    }
    const requiredSchemas = schemas.filter((s) => s.obligatorio);
    for (const req of requiredSchemas) {
      const attr = product.attributes.find((a) => a.caracteristicaId === req.caracteristicaId);
      if (!attr || attr.valor === undefined || attr.valor === "") {
        throw new CatalogError(
          "validation",
          `La característica obligatoria "${req.nombre}" debe estar completada.`,
        );
      }
    }

    product.status = "ACTIVO";
    product.catalogVersion += 1;
    this.changed();
    return JSON.parse(JSON.stringify(product));
  }

  async deactivate(
    id: string,
    _payload?: StateMutationPayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "write-unknown") {
      throw new CatalogError(
        "unknown",
        "Resultado indeterminado de desactivación. Consulta el estado antes de reintentar.",
      );
    }

    const product = this.products.find((p) => p.id === id);
    if (!product) throw new CatalogError("not_found", "Producto no encontrado.");

    product.status = "INACTIVO";
    product.catalogVersion += 1;
    this.changed();
    // Note: variants keep their individual statuses!
    return JSON.parse(JSON.stringify(product));
  }

  async reactivate(
    id: string,
    payload?: StateMutationPayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView> {
    // Reactivate requires same conditions as activate
    return this.activate(id, payload, scenario, signal);
  }

  async getPreparation(
    id: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductPreparationView> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const product = await this.getById(id, scenario, signal);
    if (!product) throw new CatalogError("not_found", "Producto no encontrado.");
    return product.preparation;
  }

  async retryPreparation(
    id: string,
    payload: RetryPreparationPayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<{ accepted: boolean; message: string }> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "prep-not-retryable") {
      throw new CatalogError(
        "prep_not_retryable",
        "HTTP 409 PREPARACION_NO_REINTENTABLE: la dependencia ya está en curso o no es reintentable.",
      );
    }

    const product = this.products.find((p) => p.id === id);
    if (!product) throw new CatalogError("not_found", "Producto no encontrado.");

    if (payload.dependencia === "PRICING") {
      if (product.preparation.pricing.status === "COMPLETED" || !product.preparation.pricing.manualRetryAllowed) {
        throw new CatalogError(
          "prep_not_retryable",
          "HTTP 409: La inicialización de Pricing ya se encuentra completada.",
        );
      }
      product.preparation.pricing.status = "PENDING";
      product.preparation.pricing.manualRetryAllowed = false;
    } else if (payload.dependencia === "INVENTARIO") {
      if (product.hasVariants) {
        throw new CatalogError(
          "prep_not_retryable",
          "HTTP 409: El producto con variantes no admite reintento de inventario en el padre.",
        );
      }
      if (!product.preparation.inventario || product.preparation.inventario.status === "COMPLETED" || !product.preparation.inventario.manualRetryAllowed) {
        throw new CatalogError(
          "prep_not_retryable",
          "HTTP 409: El inventario simple ya está completado.",
        );
      }
      if (product.preparation.inventario) {
        product.preparation.inventario.status = "PENDING";
        product.preparation.inventario.manualRetryAllowed = false;
      }
    }

    this.changed();
    return {
      accepted: true,
      message: "HTTP 202: Reintento admitido. Nuevo ciclo de preparación en curso.",
    };
  }

  // ==========================================
  // MK-004: Variant Operations
  // ==========================================

  async listVariants(
    productId: string,
    query?: VariantQuery,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantPageResult> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "list-loading" || scenario === "loading") {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    if (scenario === "list-error" || scenario === "error") {
      throw new CatalogError(
        "unknown",
        "Error al consultar las variantes del producto. Los filtros se conservan.",
      );
    }

    const parent = this.products.find((p) => p.id === productId);
    if (!parent) {
      throw new CatalogError("not_found", "Producto padre no encontrado.");
    }
    if (!parent.hasVariants || scenario === "parent-simple") {
      throw new CatalogError(
        "product_not_variants",
        "El producto simple no admite variantes.",
      );
    }

    if (scenario === "list-empty" || scenario === "empty") {
      return { items: [], total: 0, page: 1, pageSize: query?.pageSize || 10 };
    }
    if (scenario === "list-no-results") {
      return { items: [], total: 0, page: query?.page || 1, pageSize: query?.pageSize || 10 };
    }

    let items = this.variants.filter((v) => v.productId === productId);

    if (query?.status && query.status !== "all") {
      items = items.filter((v) => v.status === query.status);
    }

    const total = items.length;
    const page = Math.max(1, query?.page || 1);
    const pageSize = Math.max(1, query?.pageSize || 10);
    const start = (page - 1) * pageSize;
    const paginated = items.slice(start, start + pageSize);

    return {
      items: JSON.parse(JSON.stringify(paginated)),
      total,
      page,
      pageSize,
    };
  }

  async getVariantById(
    productId: string,
    variantId: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantDetailView | null> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "loading") {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    if (scenario === "error") {
      throw new CatalogError("unknown", "Error al consultar la variante.");
    }
    if (scenario === "variant-not-found" || scenario === "missing") {
      return null;
    }

    const found = this.variants.find(
      (v) => v.variantId === variantId && v.productId === productId,
    );
    if (!found) return null;

    const cloned: VariantDetailView = JSON.parse(JSON.stringify(found));

    // Review scenario overrides
    if (scenario === "prep-pending") {
      cloned.inventoryPreparationStatus = "PENDING";
      cloned.inventoryManualRetryAllowed = false;
    } else if (scenario === "prep-rejected") {
      cloned.inventoryPreparationStatus = "REJECTED";
      cloned.inventoryPreparationCode = "INV_SKU_INITIALIZATION_FAILED";
      cloned.inventoryManualRetryAllowed = true;
    } else if (scenario === "prep-completed") {
      cloned.inventoryPreparationStatus = "COMPLETED";
      cloned.inventoryManualRetryAllowed = false;
    } else if (scenario === "activate-missing-physical") {
      cloned.status = "BORRADOR";
      cloned.physicalProfile = { pesoKg: 0.25, dimensionesCm: null };
    } else if (scenario === "activate-success") {
      cloned.status = "BORRADOR";
      cloned.inventoryPreparationStatus = "COMPLETED";
      cloned.physicalProfile = {
        pesoKg: 0.85,
        dimensionesCm: { largo: 32, ancho: 22, alto: 12 },
      };
    } else if (scenario === "reactivate-valid") {
      cloned.status = "INACTIVA";
      cloned.inventoryPreparationStatus = "COMPLETED";
      cloned.physicalProfile = {
        pesoKg: 0.82,
        dimensionesCm: { largo: 31, ancho: 21, alto: 12 },
      };
    } else if (scenario === "reactivate-invalid") {
      cloned.status = "INACTIVA";
      cloned.physicalProfile = null;
    }

    return cloned;
  }

  async createVariant(
    productId: string,
    payload: VariantCreatePayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantDetailView> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const parent = this.products.find((p) => p.id === productId);
    if (!parent) {
      throw new CatalogError("not_found", "Producto padre no encontrado.");
    }
    if (!parent.hasVariants || scenario === "parent-simple") {
      throw new CatalogError(
        "product_not_variants",
        "Solo productos con variantes permiten crearlas (CA-01).",
      );
    }

    // Scenarios
    if (scenario === "create-duplicate-sku") {
      throw new CatalogError(
        "duplicate_sku",
        `El SKU "${payload.sku}" ya está registrado en el catálogo.`,
        { sku: "SKU duplicado" },
      );
    }
    if (scenario === "create-duplicate-combination") {
      throw new CatalogError(
        "duplicate_combination",
        "La combinación de atributos identificadores ya existe dentro de este producto (CA-03).",
      );
    }
    if (scenario === "create-invalid-attribute") {
      throw new CatalogError(
        "invalid_attribute",
        "Se requiere al menos un atributo identificador válido.",
      );
    }
    if (scenario === "create-invalid-image") {
      throw new CatalogError(
        "invalid_image",
        "La URL de imagen es obligatoria y debe tener formato válido.",
      );
    }
    if (scenario === "create-invalid-physical") {
      throw new CatalogError(
        "invalid_physical",
        "Las medidas y peso físico deben ser mayores que cero.",
      );
    }
    if (scenario === "write-unknown") {
      throw new CatalogError(
        "unknown",
        "No se recibió confirmación del servidor al guardar la variante.",
      );
    }

    // Validations
    const idAttrs = payload.atributosIdentificadores || payload.identifyingAttributes || [];
    if (idAttrs.length === 0) {
      throw new CatalogError(
        "invalid_attribute",
        "Debes seleccionar al menos un atributo identificador (CA-03).",
      );
    }

    const imgUrl = (payload.imagenUrl || payload.imageUrl || "").trim();
    if (imgUrl) {
      try {
        const u = new URL(imgUrl);
        if (!["http:", "https:"].includes(u.protocol)) {
          throw new Error();
        }
      } catch {
        throw new CatalogError("invalid_image", "La URL de la imagen no es válida.");
      }
    }

    // Physical profile validation: in draft, if supplied, values must be > 0
    const pf = payload.perfilFisico || payload.physicalProfile;
    if (pf && !hasValidPhysicalValues(pf)) {
      throw new CatalogError(
        "invalid_physical",
        "Todos los valores del perfil físico suministrados deben ser mayores que cero.",
      );
    }

    const schema = await this.taxonomy.getAttributeSchema(parent.typeId, signal);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    // SPEC-004: explicit opaque SKU, never generated from the parent/attributes.
    const assignedSku = payload.sku?.trim();
    if (!assignedSku) {
      throw new CatalogError("validation", "El SKU es obligatorio (SKU_INVALIDO).", { sku: "Ingrese un SKU explícito." });
    }

    // SKU global uniqueness check (CA-02)
    const existsSku = this.variants.some((v) => v.sku.toUpperCase() === assignedSku.toUpperCase()) ||
      this.products.some(p => p.skuBase?.toUpperCase() === assignedSku.toUpperCase());
    if (existsSku) {
      throw new CatalogError(
        "duplicate_sku",
        `El SKU "${assignedSku}" ya existe en el catálogo (CA-02).`,
      );
    }

    // Identifying combination uniqueness check within product (CA-03)
    const getCombinationKey = (attrs: ProductAttributeValue[]) =>
      attrs
        .map((a) => {
          const attributeSchema = schema.find(s => s.caracteristicaId === a.caracteristicaId);
          const valueId = a.valorId ?? attributeSchema?.opciones?.find(o => o.valor === String(a.valor))?.id;
          return `${a.caracteristicaId}:${valueId ?? String(a.valor).trim().toUpperCase()}`;
        })
        .sort()
        .join("|");

    const newCombKey = getCombinationKey(idAttrs);
    const existingVariantsForProduct = this.variants.filter(
      (v) => v.productId === productId,
    );
    const hasDuplicateComb = existingVariantsForProduct.some(
      (v) => getCombinationKey(v.identifyingAttributes) === newCombKey,
    );
    if (hasDuplicateComb) {
      throw new CatalogError(
        "duplicate_combination",
        "Ya existe una variante con la misma combinación identificadora en este producto (CA-03).",
      );
    }

    const newVariantId = `VAR-${crypto.randomUUID()}`;
    const nonIdAttrs = payload.atributosNoIdentificadores || payload.nonIdentifyingAttributes || [];
    const physProf = normalizePhysicalProfile(payload.perfilFisico || payload.physicalProfile);

    const newVariant: VariantDetailView = {
      variantId: newVariantId,
      sku: assignedSku,
      productId,
      status: "BORRADOR",
      identifyingAttributes: idAttrs,
      nonIdentifyingAttributes: nonIdAttrs,
      images: imgUrl ? [imgUrl] : [],
      imageUrl: imgUrl,
      physicalProfile: physProf,
      catalogVersion: 1,
      inventoryPreparationStatus: "PENDING",
      inventoryPreparationCode: null,
      inventoryManualRetryAllowed: false,
      inventoryStatus: "PENDING",
    };

    this.variants.push(newVariant);

    // Synchronize parent product's variants and preparation summary
    parent.variants.push({
      variantId: newVariantId,
      sku: assignedSku,
      attributesSummary: idAttrs
        .map((a) => `${a.nombre}: ${a.valor}`)
        .join(" · "),
      status: "BORRADOR",
      preparationStatus: "PENDING",
      manualRetryAllowed: false,
    });

    parent.preparation.variantes.push({
      variantId: newVariantId,
      sku: assignedSku,
      inventario: {
        status: "PENDING",
        manualRetryAllowed: false,
        code: null,
      },
    });

    this.changed();
    return JSON.parse(JSON.stringify(newVariant));
  }

  async updateVariant(
    productId: string,
    variantId: string,
    payload: VariantUpdatePayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantDetailView> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "edit-version-conflict") {
      throw new CatalogError(
        "version_conflict",
        "Conflicto de versión (409): Otro gestor modificó esta variante.",
      );
    }
    if (scenario === "edit-active-rejected") {
      throw new CatalogError(
        "active_rejected",
        "La edición fue rechazada: una variante activa no puede perder sus requisitos de publicación.",
      );
    }
    if (scenario === "write-unknown") {
      throw new CatalogError(
        "unknown",
        "No se recibió confirmación concluyente del servidor al guardar la edición.",
      );
    }

    const idx = this.variants.findIndex(
      (v) => v.variantId === variantId && v.productId === productId,
    );
    if (idx === -1) {
      throw new CatalogError("not_found", "Variante no encontrada.");
    }

    const current = this.variants[idx];
    if (!current) throw new CatalogError("not_found", "Variante no encontrada.");

    // Version conflict validation
    if (
      payload.catalogVersion !== undefined &&
      payload.catalogVersion !== current.catalogVersion
    ) {
      throw new CatalogError(
        "version_conflict",
        `Conflicto de versión (409): versión actual ${current.catalogVersion}, recibida ${payload.catalogVersion}.`,
      );
    }

    // If variant is ACTIVA, validate that edition doesn't break activation prerequisites (CA-11)
    if (current.status === "ACTIVA") {
      const activeImg = payload.imagenUrl || payload.imageUrl || current.imageUrl;
      if (!activeImg?.trim()) {
        throw new CatalogError(
          "active_rejected",
          "Una variante activa no puede quedar sin imagen de publicación (CA-11).",
        );
      }
      const pf = normalizePhysicalProfile(payload.perfilFisico ?? payload.physicalProfile ?? current.physicalProfile);
      if (!isPhysicalProfileComplete(pf)) {
        throw new CatalogError(
          "active_rejected",
          "Una variante activa exige las 4 medidas físicas completas (peso, largo, ancho y alto) mayores a cero (CA-11).",
        );
      }
    }

    // Validate the proposal before mutating any field.
    const proposedProfile = payload.perfilFisico ?? payload.physicalProfile;
    if (proposedProfile !== undefined && !hasValidPhysicalValues(proposedProfile)) {
      throw new CatalogError("invalid_physical", "Todos los valores del perfil físico suministrados deben ser mayores que cero.");
    }
    // Retain immutable identity: variantId, sku, identifyingAttributes are immutable
    current.nonIdentifyingAttributes =
      payload.atributosNoIdentificadores || payload.nonIdentifyingAttributes || [];
    const newImg = (payload.imagenUrl || payload.imageUrl || current.imageUrl).trim();
    current.imageUrl = newImg;
    current.images = newImg ? [newImg] : [];
    if (payload.perfilFisico !== undefined || payload.physicalProfile !== undefined) {
      const rawPf = payload.perfilFisico ?? payload.physicalProfile;
      if (!hasValidPhysicalValues(rawPf)) {
        throw new CatalogError(
          "invalid_physical",
          "Todos los valores del perfil físico suministrados deben ser mayores que cero.",
        );
      }
      current.physicalProfile = normalizePhysicalProfile(rawPf);
    }
    current.catalogVersion += (payload.catalogVersion ? 1 : 1);
    this.changed();

    return JSON.parse(JSON.stringify(current));
  }

  async activateVariant(
    productId: string,
    variantId: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantMutationResult> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "activate-missing-physical") {
      throw new CatalogError(
        "activation_rejected",
        "La activación exige medidas físicas completas en kg/cm con valores mayores que cero (CA-07, CA-09).",
      );
    }

    const variant = this.variants.find(
      (v) => v.variantId === variantId && v.productId === productId,
    );
    if (!variant) throw new CatalogError("not_found", "Variante no encontrada.");

    const parent = this.products.find((p) => p.id === productId);
    if (!parent) throw new CatalogError("not_found", "Producto padre no encontrado.");

    // Validate activation conditions (CA-07)
    if (!variant.imageUrl?.trim()) {
      throw new CatalogError("activation_rejected", "Se requiere una imagen válida.");
    }
    if (!isPhysicalProfileComplete(variant.physicalProfile)) {
      throw new CatalogError(
        "activation_rejected",
        "Activar exige las cuatro medidas físicas completas mayores a cero (CA-07).",
      );
    }

    if (variant.inventoryPreparationStatus !== "COMPLETED") {
      throw new CatalogError(
        "activation_rejected",
        "Activar exige Inventario confirmado (COMPLETED). La inicialización aún no ha finalizado (CA-07).",
      );
    }

    variant.status = "ACTIVA";
    this.changed();

    // Synchronize parent variant summary
    const parentVar = parent.variants.find((v) => v.variantId === variantId);
    if (parentVar) parentVar.status = "ACTIVA";

    return {
      variant: JSON.parse(JSON.stringify(variant)),
      parentStatusChanged: false,
    };
  }

  async deactivateVariant(
    productId: string,
    variantId: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantMutationResult> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const variant = this.variants.find(
      (v) => v.variantId === variantId && v.productId === productId,
    );
    if (!variant) throw new CatalogError("not_found", "Variante no encontrada.");

    const parent = this.products.find((p) => p.id === productId);
    if (!parent) throw new CatalogError("not_found", "Producto padre no encontrado.");

    variant.status = "INACTIVA";

    // Synchronize parent variant summary
    const parentVar = parent.variants.find((v) => v.variantId === variantId);
    if (parentVar) parentVar.status = "INACTIVA";

    // CA-12 / FLOW-004 §4.4:
    // "Si era la última variante activa y el padre estaba activo, se inactiva al padre;
    // si estaba en borrador o inactivo, conserva su estado."
    let parentStatusChanged = false;
    let parentNewStatus: typeof parent.status | undefined;

    const remainingActiveVariants = this.variants.filter(
      (v) => v.productId === productId && v.variantId !== variantId && v.status === "ACTIVA",
    );

    if (remainingActiveVariants.length === 0 || scenario === "deactivate-last-active-parent") {
      if (parent.status === "ACTIVO" || scenario === "deactivate-last-active-parent") {
        parent.status = "INACTIVO";
        parentStatusChanged = true;
        parentNewStatus = "INACTIVO";
      }
    }

    this.changed();
    return {
      variant: JSON.parse(JSON.stringify(variant)),
      parentStatusChanged,
      parentNewStatus,
    };
  }

  async reactivateVariant(
    productId: string,
    variantId: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantMutationResult> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (scenario === "reactivate-invalid") {
      throw new CatalogError(
        "activation_rejected",
        "Faltan requisitos: la reactivación exige medidas físicas completas e inventario COMPLETED (CA-13).",
      );
    }

    const variant = this.variants.find(
      (v) => v.variantId === variantId && v.productId === productId,
    );
    if (!variant) throw new CatalogError("not_found", "Variante no encontrada.");

    const parent = this.products.find((p) => p.id === productId);
    if (!parent) throw new CatalogError("not_found", "Producto padre no encontrado.");

    // Revalidate conditions (CA-13)
    if (!variant.imageUrl?.trim()) {
      throw new CatalogError("activation_rejected", "Se requiere una imagen válida (CA-13).");
    }
    if (!isPhysicalProfileComplete(variant.physicalProfile)) {
      throw new CatalogError(
        "activation_rejected",
        "Reactivar exige las cuatro medidas físicas completas (peso, largo, ancho, alto) mayores que cero (CA-13).",
      );
    }

    if (variant.inventoryPreparationStatus !== "COMPLETED") {
      throw new CatalogError(
        "activation_rejected",
        "Reactivar exige Inventario confirmado como COMPLETED (CA-13).",
      );
    }

    variant.status = "ACTIVA";
    this.changed();

    // Synchronize parent variant summary
    const parentVar = parent.variants.find((v) => v.variantId === variantId);
    if (parentVar) parentVar.status = "ACTIVA";

    // CA-14: Reactivar la variante NO reactiva automáticamente al padre.
    return {
      variant: JSON.parse(JSON.stringify(variant)),
      parentStatusChanged: false,
    };
  }

  async retryVariantPreparation(
    productId: string,
    variantId: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<{ accepted: boolean; message: string; operationId?: string }> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const variant = this.variants.find(
      (v) => v.variantId === variantId && v.productId === productId,
    );
    if (!variant) throw new CatalogError("not_found", "Variante no encontrada.");

    if (variant.inventoryPreparationStatus === "COMPLETED") {
      throw new CatalogError(
        "prep_not_retryable",
        "HTTP 409: La inicialización de inventario ya se encuentra COMPLETED y es terminal (CA-21).",
      );
    }

    if (scenario === "prep-not-retryable" || !variant.inventoryManualRetryAllowed) {
      throw new CatalogError(
        "prep_not_retryable",
        "HTTP 409 PREPARACION_NO_REINTENTABLE: la acción no es admisible en el estado actual.",
      );
    }

    // HTTP 202 Accepted indicates admission, remains PENDING without manual retry allowed
    variant.inventoryPreparationStatus = "PENDING";
    variant.inventoryStatus = "PENDING";
    variant.inventoryManualRetryAllowed = false;

    this.changed();
    return {
      accepted: true,
      message: "HTTP 202 Accepted: Reintento de inventario admitido en Catálogo (CA-19).",
      operationId: `OP-INV-${variant.variantId}`,
    };
  }
}

export const mockCatalogRepository = new MockCatalogRepository(sharedMockTaxonomyRepository, { persist: true });
