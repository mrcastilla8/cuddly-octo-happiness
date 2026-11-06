import { expect, test } from "@playwright/test";
import { createCatalogFetchTransport, type CatalogHttpTransport } from "../src/features/catalog/adapters/catalogHttp";
import { createHttpCatalogRepository } from "../src/features/catalog/adapters/httpCatalogRepository";
import { createHttpTaxonomyRepository } from "../src/features/catalog/adapters/httpTaxonomyRepository";
import { mapPreparation, mapProduct, mapVariant } from "../src/features/catalog/adapters/httpCatalogMapper";
import { createOptionalCatalogHttpServices } from "../src/features/catalog/services/catalogHttpRuntime";
import { MockCatalogRepository } from "../src/features/catalog/adapters/mockCatalogRepository";
import type { ProductCreatePayload } from "../src/features/catalog/services/catalogRepository";

const pid = "11111111-1111-4111-8111-111111111111";
const vid = "22222222-2222-4222-8222-222222222222";
const payload: ProductCreatePayload = { nombre: "Producto", descripcion: "Descripción", categoriaId: "category", marcaId: "brand", tipoProductoId: "type", skuBase: "000-base", tieneVariantes: false, precioBaseInicial: 20,
  atributos: [{ caracteristicaId: "color", nombre: "Color", tipo: "LISTA", valorId: "red", valor: "Rojo" }], perfilFisico: { pesoKg: 1, largoCm: 2, anchoCm: 3, altoCm: 4 } };
const prep = { product_id: pid, tiene_variantes: false, pricing: { status: "PENDING", manual_retry_allowed: false, code: null }, inventario: { status: "REJECTED", manual_retry_allowed: false, code: "UBICACION_NO_ENCONTRADA" }, variantes: [] };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
const productDto = { product_id: pid, slug: "producto", name: "Servidor", sku_base: null, status: "BORRADOR", tiene_variantes: false, categoria_id: "category", marca_id: "brand", tipo_producto_id: "type", catalog_version: 12, description: null, attributes: [], images: [], variants: [], perfil_fisico: null };
const variantDto = { variant_id: vid, sku: "000-case", status: "BORRADOR", catalog_version: 3, identifying_attributes: [], non_identifying_attributes: [], images: [], physical_profile: null };
const variantPrep = { ...prep, tiene_variantes: true, inventario: null, variantes: [{ variant_id: vid, sku: "000-case", inventario: { status: "PENDING", manual_retry_allowed: false } }] };

test("Mapper producto: null y SKU opcional ausente conservan ausencia; no genera códigos", () => {
  for (const hasVariants of [false, true]) {
    const preparation = mapPreparation(hasVariants ? variantPrep : prep);
    for (const sku of [null, undefined, "000-case"]) {
      const dto = { ...productDto, tiene_variantes: hasVariants, sku_base: sku };
      expect(mapProduct(dto, preparation, []).skuBase).toBe(sku ?? null);
    }
    expect(() => mapProduct({ ...productDto, tiene_variantes: hasVariants, sku_base: 123 }, preparation, [])).toThrow();
  }
});

test("HTTP simulado: éxitos de todas las mutaciones de producto y variante; 202 conserva admisión", async () => {
  const root = `/api/v1/productos/${pid}`;
  const h = harness((path, init) => {
    if (path.endsWith("/preparacion/reintentar")) return json({ status: "ACCEPTED", operation_id: vid, correlation_id: pid }, 202);
    if (path.endsWith("/preparacion")) return json(path.includes(root) && variantMode ? variantPrep : prep);
    const status = path.endsWith("/desactivar") ? (variantMode ? "INACTIVA" : "INACTIVO")
      : /\/(activar|reactivar)$/.test(path) ? (variantMode ? "ACTIVA" : "ACTIVO") : "BORRADOR";
    return json(variantMode ? { ...variantDto, status } : { ...productDto, status }, init.method === "POST" && ["/api/v1/productos", `${root}/variantes`].includes(path) ? 201 : 200);
  });
  let variantMode = false;
  expect(await h.catalog.create({ ...payload, atributos: [] })).toMatchObject({ skuBase: null, catalogVersion: 12 });
  expect(await h.catalog.update(pid, { nombre: "Nuevo", descripcion: "", categoriaId: "category", marcaId: "brand", catalogVersion: 11 })).toMatchObject({ id: pid, skuBase: null });
  for (const action of ["activate", "deactivate", "reactivate"] as const) {
    const result = await h.catalog[action](pid, { catalogVersion: 12 });
    expect(result.status).toBe(action === "deactivate" ? "INACTIVO" : "ACTIVO");
    expect(result.skuBase).toBeNull();
  }
  expect(await h.catalog.retryPreparation(pid, { dependencia: "PRICING" })).toMatchObject({ accepted: true, operationId: vid });
  variantMode = true;
  expect(await h.catalog.createVariant(pid, { sku: "000-case", identifyingAttributes: [] })).toMatchObject({ variantId: vid, sku: "000-case" });
  expect(await h.catalog.updateVariant(pid, vid, { catalogVersion: 2 })).toMatchObject({ catalogVersion: 3 });
  for (const action of ["activateVariant", "deactivateVariant", "reactivateVariant"] as const) {
    const result = await h.catalog[action](pid, vid);
    expect(result.variant).toMatchObject({ variantId: vid, sku: "000-case", catalogVersion: 3, status: action === "deactivateVariant" ? "INACTIVA" : "ACTIVA" });
    expect(result).not.toHaveProperty("parentNewStatus");
  }
  expect(await h.catalog.retryVariantPreparation(pid, vid)).toMatchObject({ accepted: true, operationId: vid });
  expect(h.calls.filter(call => call.init.method !== "GET")).toHaveLength(12);
});
function harness(respond: (path: string, init: Parameters<CatalogHttpTransport["request"]>[1]) => Response | Promise<Response>) {
  const calls: { path: string; init: Parameters<CatalogHttpTransport["request"]>[1] }[] = [];
  const transport: CatalogHttpTransport = { request: async (path, init) => { calls.push({ path, init }); return respond(path, init); } };
  const taxonomy = createHttpTaxonomyRepository(transport);
  return { catalog: createHttpCatalogRepository(transport), taxonomy, calls, transport };
}

test("HTTP: alta mapea atributos y perfil anidado; no envía datos de presentación", async () => {
  const h = harness(() => json({ code: "SKU_DUPLICADO" }, 409));
  await expect(h.catalog.create(payload)).rejects.toMatchObject({ kind: "duplicate_sku", details: { code: "SKU_DUPLICADO", status: "409" } });
  expect(h.calls).toHaveLength(1);
  expect(h.calls[0]!.path).toBe("/api/v1/productos");
  expect(JSON.parse(h.calls[0]!.init.body!)).toEqual({ ...payload,
    atributos: [{ caracteristica_id: "color", nombre: "Color", valor_id: "red", valor: "Rojo" }],
    perfilFisico: { pesoKg: 1, dimensionesCm: { largo: 2, ancho: 3, alto: 4 } } });
  expect(h.calls[0]!.init.headers["X-Correlation-Id"]).toMatch(/^[a-f0-9-]{36}$/);
  expect(h.calls[0]!.init.headers).not.toHaveProperty("Authorization");
});

test("HTTP: las 17 operaciones del puerto usan métodos/rutas publicados y propagan 401 sin fallback", async () => {
  const h = harness(() => json({ code: "TOKEN_INVALIDO" }, 401));
  const root = `/api/v1/productos/${pid}`; const v = `${root}/variantes/${vid}`;
  const operations: [() => Promise<unknown>, string, string][] = [
    [() => h.catalog.list({ page: 2, pageSize: 10, categoryId: "category", status: "BORRADOR", q: "text" }), "GET", "/api/v1/productos?pagina=2&tamanio=10&q=text&categoriaId=category&estado=BORRADOR"],
    [() => h.catalog.getById(pid), "GET", root],
    [() => h.catalog.create(payload), "POST", "/api/v1/productos"],
    [() => h.catalog.update(pid, { nombre: "Cambio", descripcion: "Desc", categoriaId: "category", marcaId: "brand", catalogVersion: 8 }), "PATCH", root],
    [() => h.catalog.activate(pid, { catalogVersion: 8 }), "POST", `${root}/activar`],
    [() => h.catalog.deactivate(pid), "POST", `${root}/desactivar`],
    [() => h.catalog.reactivate(pid), "POST", `${root}/reactivar`],
    [() => h.catalog.getPreparation(pid), "GET", `${root}/preparacion`],
    [() => h.catalog.retryPreparation(pid, { dependencia: "PRICING" }), "POST", `${root}/preparacion/reintentar`],
    [() => h.catalog.listVariants(pid, { page: 2, pageSize: 10, status: "INACTIVA" }), "GET", `${root}/variantes?pagina=2&tamanio=10&estado=INACTIVA`],
    [() => h.catalog.getVariantById(pid, vid), "GET", v],
    [() => h.catalog.createVariant(pid, { sku: "000-case", identifyingAttributes: [], imageUrl: "https://example.com/a.jpg" }), "POST", `${root}/variantes`],
    [() => h.catalog.updateVariant(pid, vid, { catalogVersion: 9 }), "PATCH", v],
    [() => h.catalog.activateVariant(pid, vid), "POST", `${v}/activar`],
    [() => h.catalog.deactivateVariant(pid, vid), "POST", `${v}/desactivar`],
    [() => h.catalog.reactivateVariant(pid, vid), "POST", `${v}/reactivar`],
    [() => h.catalog.retryVariantPreparation(pid, vid), "POST", `${v}/preparacion/reintentar`],
  ];
  for (const [operation, method, path] of operations) {
    await expect(operation()).rejects.toMatchObject({ kind: "session" });
    const call = h.calls.at(-1)!; expect([call.init.method, call.path]).toEqual([method, path]);
  }
  expect(h.calls).toHaveLength(17);
});

for (const [status, code, kind] of [[400, "VALIDACION", "validation"], [403, "SCOPE_INSUFICIENTE", "forbidden"], [404, "PRODUCTO_NO_ENCONTRADO", "not_found"], [409, "VERSION_CONFLICT", "version_conflict"], [409, "COMBINACION_DUPLICADA", "duplicate_combination"], [422, "ATRIBUTO_IDENTIFICADOR_INVALIDO", "invalid_attribute"], [503, "SERVICIO_NO_DISPONIBLE", "server"]] as const) {
  test(`HTTP: ${status}/${code} conserva código y no repite escritura`, async () => {
    const h = harness(() => json({ code, detail: "Texto no autoritativo" }, status));
    await expect(h.catalog.updateVariant(pid, vid, { catalogVersion: 7 })).rejects.toMatchObject({ kind, details: { code } });
    expect(h.calls).toHaveLength(1);
  });
}

test("HTTP: red/timeout de escritura es resultado desconocido; cancelación y red de lectura no generan datos", async () => {
  const h = harness(() => { throw new TypeError("network"); });
  await expect(h.catalog.create(payload)).rejects.toMatchObject({ kind: "write_unknown" });
  await expect(h.catalog.list({ page: 1, pageSize: 20 })).rejects.toMatchObject({ kind: "server" });
  expect(h.calls).toHaveLength(2);
  const controller = new AbortController(); controller.abort();
  await expect(h.catalog.getPreparation(pid, undefined, controller.signal)).rejects.toThrow("network");
  expect(h.calls.at(-1)?.init.signal.aborted).toBe(true);
});

test("HTTP: lecturas comerciales y filtros ausentes no inventan estado, versión ni paginación administrativa", async () => {
  const h = harness(path => json(path.includes("?") ? { items: [{ product_id: pid, name: "Comercial" }], pagina: 1, tamanio: 20, total: 1 } : { product_id: pid, name: "Comercial" }));
  await expect(h.catalog.list({ page: 1, pageSize: 20 })).rejects.toMatchObject({ kind: "blocked_contract" });
  await expect(h.catalog.getById(pid)).rejects.toMatchObject({ kind: "blocked_contract" });
  const count = h.calls.length;
  await expect(h.catalog.list({ page: 1, pageSize: 20, typeId: "type" })).rejects.toMatchObject({ kind: "blocked_contract" });
  expect(h.calls).toHaveLength(count);
  const empty = harness(() => json({ items: [], pagina: 1, tamanio: 20, total: 0 }));
  expect(await empty.catalog.list({ page: 1, pageSize: 20 })).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
});

test("HTTP: preparación conserva manual_retry_allowed y 202 solo admite; 409 no se repite", async () => {
  let accepted = false;
  const h = harness((_path, init) => {
    if (init.method === "GET") return json(prep);
    if (accepted) return json({ code: "PREPARACION_NO_REINTENTABLE" }, 409);
    accepted = true; return json({ status: "ACCEPTED", operation_id: vid, correlation_id: pid }, 202);
  });
  expect(await h.catalog.getPreparation(pid)).toMatchObject({ pricing: { status: "PENDING", manualRetryAllowed: false }, inventario: { status: "REJECTED", manualRetryAllowed: false } });
  expect(await h.catalog.retryPreparation(pid, { dependencia: "INVENTARIO" })).toMatchObject({ accepted: true, operationId: vid });
  expect((await h.catalog.getPreparation(pid)).inventario?.status).toBe("REJECTED");
  await expect(h.catalog.retryVariantPreparation(pid, vid)).rejects.toMatchObject({ kind: "prep_not_retryable" });
  expect(h.calls.filter(c => c.init.method === "POST")).toHaveLength(2);
  expect(() => mapPreparation({ ...prep, pricing: { status: false, manual_retry_allowed: false } })).toThrow();
  expect(() => mapPreparation({ ...prep, product_id: "other", inventario: null })).toThrow();
});

test("HTTP: alta confirmada usa respuesta y preparación; fallo posterior no se presenta como rechazo ni reenvía", async () => {
  const product = { product_id: pid, name: "Servidor", sku_base: "000-base", status: "BORRADOR", tiene_variantes: false, categoria_id: "category", marca_id: "brand", tipo_producto_id: "type", catalog_version: 12, description: "Desc", attributes: [], images: [], variants: [], perfil_fisico: null };
  const h = harness((_path, init) => init.method === "POST" ? json(product, 201) : json(prep));
  const result = await h.catalog.create({ ...payload, atributos: [] });
  expect(result).toMatchObject({ id: pid, name: "Servidor", catalogVersion: 12, status: "BORRADOR", preparation: { inventario: { status: "REJECTED" } } });
  expect(result).not.toHaveProperty("priceInitial"); expect(result.publishedCommercially).toBeUndefined();
  const failed = harness((_path, init) => init.method === "POST" ? json(product, 201) : json({ code: "SERVICIO_NO_DISPONIBLE" }, 503));
  await expect(failed.catalog.create(payload)).rejects.toMatchObject({ kind: "write_unknown" });
  expect(failed.calls.filter(c => c.init.method === "POST")).toHaveLength(1);
});

test("SKU: obligatorio en HTTP y mock, conserva ceros y mayúsculas/minúsculas", async () => {
  const h = harness(() => json({ code: "SKU_DUPLICADO" }, 409));
  for (const sku of [undefined, null, "", "   "]) {
    // @ts-expect-error Invalid external input must also be rejected at runtime.
    await expect(h.catalog.createVariant(pid, { sku })).rejects.toMatchObject({ kind: "validation" });
  }
  expect(h.calls).toHaveLength(0);
  await expect(h.catalog.createVariant(pid, { sku: "000-case-SKU", identifyingAttributes: payload.atributos, physicalProfile: payload.perfilFisico })).rejects.toMatchObject({ kind: "duplicate_sku" });
  const body = JSON.parse(h.calls[0]!.init.body!);
  expect(body.sku).toBe("000-case-SKU"); expect(body).not.toHaveProperty("identifyingAttributes");
  expect(body.perfilFisico).not.toHaveProperty("largoCm");
  await expect(h.catalog.updateVariant(pid, vid, { physicalProfile: { pesoKg: 1, dimensionesCm: { largo: 2 } }, catalogVersion: 2 })).rejects.toMatchObject({ kind: "duplicate_sku" });
  expect(JSON.parse(h.calls.at(-1)!.init.body!).perfilFisico).toEqual({ pesoKg: 1, dimensionesCm: { largo: 2 } });
  const mock = new MockCatalogRepository();
  // @ts-expect-error Missing SKU is deliberately tested as invalid external input.
  await expect(mock.createVariant("PROD-RUN-001", { identifyingAttributes: [{ caracteristicaId: "CAR-COLOR", nombre: "Color", tipo: "LISTA", valorId: "COL-ROJ", valor: "Rojo Carmesí" }] })).rejects.toMatchObject({ kind: "validation" });
});

test("Mapper variante: IDs, schema LISTA, kg/cm y preparación provienen de sus fuentes", () => {
  const preparation = mapPreparation({ ...prep, tiene_variantes: true, inventario: null, variantes: [{ variant_id: vid, sku: "000-case-SKU", inventario: { status: "COMPLETED", manual_retry_allowed: false } }] });
  const variant = mapVariant({ variant_id: vid, sku: "000-case-SKU", status: "BORRADOR", catalog_version: 9,
    identifying_attributes: [{ caracteristica_id: "color", nombre: "Color", valor_id: "red", valor: "Rojo" }], non_identifying_attributes: [], images: ["https://example.com/a.jpg"],
    physical_profile: { pesoKg: 1, dimensionesCm: { largo: 2, ancho: 3, alto: 4 } } }, pid, preparation, [{ caracteristicaId: "color", tipo: "LISTA" }]);
  expect(variant).toMatchObject({ variantId: vid, productId: pid, sku: "000-case-SKU", catalogVersion: 9, physicalProfile: { largoCm: 2 }, identifyingAttributes: [{ valorId: "red" }], inventoryStatus: "COMPLETED" });
});

test("HTTP variantes: detalle y lista componen características/preparación reales sin inventar estado del padre", async () => {
  const variant = { variant_id: vid, sku: "000-case", status: "BORRADOR", catalog_version: 3,
    identifying_attributes: [{ caracteristica_id: "color", nombre: "Color", valor_id: "red", valor: "Rojo" }],
    non_identifying_attributes: [], images: [], physical_profile: null };
  const h = harness(path => {
    if (path.endsWith("/caracteristicas/color")) return json({ caracteristicaId: "color", tipo: "LISTA" });
    if (path.endsWith("/preparacion")) return json({ ...prep, tiene_variantes: true, inventario: null, variantes: [{ variant_id: vid, sku: "000-case", inventario: { status: "PENDING", manual_retry_allowed: false } }] });
    if (path.includes("?")) return json({ items: [variant], meta: { pagina: 2, tamanio: 1, total: 2, totalPaginas: 2 } });
    return json(variant);
  });
  expect(await h.catalog.getVariantById(pid, vid)).toMatchObject({ variantId: vid, sku: "000-case", identifyingAttributes: [{ valorId: "red", tipo: "LISTA" }], inventoryPreparationStatus: "PENDING" });
  const result = await h.catalog.listVariants(pid, { page: 2, pageSize: 1 });
  expect(result).toMatchObject({ total: 2, page: 2, pageSize: 1 });
  expect(result.items).toHaveLength(1);
  const mutation = await h.catalog.deactivateVariant(pid, vid);
  expect(mutation).not.toHaveProperty("parentNewStatus");
  expect(mutation).not.toHaveProperty("parentStatusChanged");
});

test("Taxonomía HTTP: IDs oficiales, paginación completa, vacío válido y roles ausentes sin inferencia", async () => {
  const h = harness(path => {
    if (path.includes("/categorias")) return json({ categories: [{ categoria_id: "official", name: "Categoría", status: "ACTIVA" }] });
    if (path.includes("/marcas")) return json({ brands: [{ marca_id: "brand", name: "Marca", status: "ACTIVA" }] });
    if (path.includes("/caracteristicas")) return json({ tipoProducto: { tipoProductoId: "type" }, schemaVersion: 4, caracteristicas: [{ caracteristicaId: "number", estado: "ACTIVO", obligatoria: true,
      caracteristica: { caracteristicaId: "number", nombre: "Temperatura", tipo: "NUMERO", unidadMedida: "°C", estado: "ACTIVO" } }] });
    return json({ items: [{ tipoProductoId: "type", nombre: "Tipo", estado: "ACTIVO" }], meta: { pagina: 1, tamanio: 100, total: 1, totalPaginas: 1 } });
  });
  expect(await h.taxonomy.getCategories()).toEqual([{ id: "official", nombre: "Categoría", activo: true }]);
  expect(await h.taxonomy.getBrands()).toEqual([{ id: "brand", nombre: "Marca", activo: true }]);
  expect(await h.taxonomy.getProductTypes()).toEqual([{ id: "type", nombre: "Tipo", activo: true }]);
  const schema = await h.taxonomy.getAttributeSchema("type");
  expect(schema[0]).toMatchObject({ obligatorio: true, tipo: "NUMERO", unidad: "°C" });
  expect(schema[0]!.esIdentificadora).toBeUndefined();
  const empty = harness(() => json({ tipoProducto: { tipoProductoId: "type" }, schemaVersion: 0, caracteristicas: [] }));
  expect(await empty.taxonomy.getAttributeSchema("type")).toEqual([]);
});

test("Transporte: origen validado, sin credenciales/redirect/JWT; configuración ausente o inválida falla cerrado", async () => {
  for (const origin of ["http://example.com", "https://user:password@example.com", "https://example.com/api", "https://example.com/?token=x"]) expect(() => createCatalogFetchTransport(origin)).toThrow();
  let input: RequestInit | undefined; let url: unknown;
  const transport = createCatalogFetchTransport("https://gateway.example.com", (async (target, init) => { input = init; url = target; return json({}); }) as typeof fetch);
  await transport.request("/api/v1/productos", { method: "GET", signal: new AbortController().signal, headers: {} });
  expect(url).toBe("https://gateway.example.com/api/v1/productos"); expect(input).toMatchObject({ credentials: "omit", redirect: "error" });
  expect(createOptionalCatalogHttpServices()).toBeNull();
  const invalid = createOptionalCatalogHttpServices("https://example.com/path")!;
  await expect(invalid.catalog.getById(pid)).rejects.toThrow("configuración");
});
