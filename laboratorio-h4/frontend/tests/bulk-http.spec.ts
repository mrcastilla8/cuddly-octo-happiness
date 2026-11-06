import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import { createBulkFetchTransport, createHttpBulkRepository } from "../src/features/bulk/adapters/httpBulkRepository";

const root = "/api/v1/carga-masiva/productos";
const batchId = "11111111-1111-4111-8111-111111111111";
const exportId = "22222222-2222-4222-8222-222222222222";
const rowId = "33333333-3333-4333-8333-333333333333";
const categoryId = "44444444-4444-4444-8444-444444444444";
const brandId = "55555555-5555-4555-8555-555555555555";
const typeId = "66666666-6666-4666-8666-666666666666";
const validBulkV2Csv = [
  "operacion,producto_id,catalog_version,sku_base,sku_variante,nombre,descripcion,categoria_id,marca_id,tipo_producto_id,tiene_variantes,precio_regular,atributos_producto,atributos_variante,imagen_url,stock_inicial",
  `ALTA,,,SKU-HTTP-9,,"HTTP producto","Producto de prueba contractual",${categoryId},${brandId},${typeId},false,49.90,[],,,0`,
].join("\n") + "\n";
const iso = "2026-11-02T12:00:00.000Z";
function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "http://127.0.0.1:5173" });
  response.end(JSON.stringify(body));
}
async function body(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
function batch(status = "COMPLETED") {
  return { batch_id: batchId, status, total_rows: 1, completed_rows: 0, failed_rows: 1,
    needs_reconciliation: true, rows: [{ row_id: rowId, sku: "SKU-HTTP-9", nombre: "HTTP producto", status: "FAILED",
      applied_domains: ["CATALOGO"], failed_domain: "PRICING", needs_reconciliation: true,
      code: "PRECIO_INVALIDO", detail: "Precio rechazado", steps: [{ dominio: "CATALOGO", status: "COMPLETED" },
        { dominio: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO", detail: "Precio rechazado" }] }] };
}
async function withServer(work: (origin: string, requests: Array<{ method?: string; url?: string; contentType?: string; auth?: string; correlation?: string }>) => Promise<void>, scenario: "actual-backend" | "future-contract" = "actual-backend") {
  const requests: Array<{ method?: string; url?: string; contentType?: string; auth?: string; correlation?: string }> = [];
  const server = createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, { "access-control-allow-origin": "http://127.0.0.1:5173", "access-control-allow-methods": "GET, POST", "access-control-allow-headers": "authorization, content-type, x-correlation-id" });
      response.end(); return;
    }
    requests.push({ method: request.method, url: request.url, contentType: request.headers["content-type"], auth: request.headers.authorization, correlation: request.headers["x-correlation-id"] as string });
    const path = request.url ?? "";
    if (request.headers.authorization !== "Bearer test.header.signature") return json(response, 401, { status: 401, code: "TOKEN_INVALIDO" });
    if (request.method === "GET" && path.startsWith(`${root}/plantilla`)) {
      response.writeHead(200, { "content-type": "text/csv", "content-disposition": 'attachment; filename="plantilla-h4.csv"', "access-control-allow-origin": "http://127.0.0.1:5173", "access-control-expose-headers": "content-disposition" }); response.end(validBulkV2Csv.split("\n")[0] + "\n"); return;
    }
    if (request.method === "POST" && path === `${root}/importaciones`) {
      const multipart = await body(request);
      if (!request.headers["content-type"]?.startsWith("multipart/form-data; boundary=") || !multipart.toString().includes('name="archivo"') || !multipart.toString().includes('filename="upload.csv"') || !multipart.toString().includes(validBulkV2Csv) || !multipart.toString().includes('name="template_version"')) return json(response, 400, { status: 400, code: "ARCHIVO_INVALIDO" });
      return json(response, 202, { batch_id: batchId, status: "QUEUED", template_version: 2, correlation_id: request.headers["x-correlation-id"] });
    }
    if (request.method === "GET" && path === `${root}/importaciones/${batchId}`) return json(response, 200, batch());
    if (request.method === "GET" && path === `${root}/importaciones/missing`) return json(response, 404, { status: 404, code: "LOTE_NO_ENCONTRADO" });
    if (request.method === "GET" && path === `${root}/importaciones/unauthorized`) return json(response, 401, { status: 401, code: "TOKEN_INVALIDO" });
    if (request.method === "GET" && path === `${root}/importaciones/forbidden`) return json(response, 403, { status: 403, code: "SCOPE_INSUFICIENTE" });
    if (request.method === "GET" && path === `${root}/importaciones/unavailable`) return json(response, 503, { status: 503, code: "SERVICIO_NO_DISPONIBLE" });
    if (request.method === "GET" && path === `${root}/importaciones/network`) { request.socket.destroy(); return; }
    if (request.method === "GET" && path === `${root}/importaciones/conflict-batch`) return json(response, 200, { ...batch(), batch_id: "conflict-batch" });
    if (request.method === "GET" && path === `${root}/importaciones/${batchId}/reporte`) { response.writeHead(200, { "content-type": "text/csv", "content-disposition": 'attachment; filename="errores.csv"', "access-control-allow-origin": "http://127.0.0.1:5173", "access-control-expose-headers": "content-disposition" }); response.end(`row_id,code\n${rowId},PRECIO_INVALIDO\n`); return; }
    if (request.method === "POST" && path === `${root}/importaciones/conflict-batch/reanudar`) return json(response, 409, { status: 409, code: "VERSION_CONFLICT" });
    if (request.method === "POST" && path === `${root}/importaciones/${batchId}/reanudar`) return json(response, 202, { batch_id: batchId, status: "QUEUED", template_version: 2, correlation_id: request.headers["x-correlation-id"] });
    if (request.method === "POST" && path === `${root}/exportaciones`) return json(response, 202, { export_id: exportId, status: "QUEUED", formato: "CSV", created_at: iso });
    if (request.method === "GET" && path === `${root}/exportaciones/${exportId}`) return json(response, 200, { export_id: exportId, status: scenario === "actual-backend" ? "FAILED_GENERAL" : "COMPLETED", formato: "CSV", created_at: iso, completed_at: iso, download_url: null });
    if (request.method === "GET" && path === `${root}/exportaciones/${exportId}/archivo`) {
      if (scenario === "actual-backend") return json(response, 503, { status: 503, code: "SERVICIO_NO_DISPONIBLE" });
      response.writeHead(200, { "content-type": "text/csv", "content-disposition": 'attachment; filename="export.csv"', "access-control-allow-origin": "http://127.0.0.1:5173", "access-control-expose-headers": "content-disposition" }); response.end("sku\nSKU-HTTP-9\n"); return;
    }
    return json(response, 404, { status: 404, code: "LOTE_NO_ENCONTRADO" });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try { await work(`http://127.0.0.1:${port}`, requests); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("Bulk API contra servidor HTTP aislado simula rutas, upload válido, errores y estado actual de exportación", async ({ page }) => {
  expect(validBulkV2Csv.trim().split("\n")[0]?.split(",")).toHaveLength(16);
  expect(validBulkV2Csv.trim().split("\n")[1]?.split(",")).toHaveLength(16);
  await withServer(async (gateway, requests) => {
    await page.goto(`/tests/harness/bulk-http.html?gateway=${encodeURIComponent(gateway)}#/carga-masiva`);
    await page.locator('input[type="file"]').setInputFiles({ name: "upload.csv", mimeType: "text/csv", buffer: Buffer.from(validBulkV2Csv) });
    await page.getByRole("button", { name: "Continuar a revisión" }).click();
    await page.getByRole("button", { name: "Confirmar importación" }).first().click();
    await expect(page).toHaveURL(new RegExp(`${batchId}$`));
    await expect(page.getByText("SKU-HTTP-9")).toBeVisible();
    await expect(page.getByText("Precio rechazado").first()).toBeVisible();
    await page.goto(`/tests/harness/bulk-http.html?gateway=${encodeURIComponent(gateway)}#/carga-masiva/importaciones/${batchId}/resultado`);
    await expect(page.getByText("SKU-HTTP-9")).toBeVisible();
    const reportDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar reporte de errores" }).click();
    expect((await reportDownload).suggestedFilename()).toBe("errores.csv");
    await page.getByRole("button", { name: "Reanudar operaciones pendientes" }).click();
    await page.getByRole("button", { name: "Confirmar reanudación" }).click();
    await expect(page).toHaveURL(new RegExp(`${batchId}$`));

    await page.goto(`/tests/harness/bulk-http.html?gateway=${encodeURIComponent(gateway)}#/carga-masiva/descargas`);
    const template = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar CSV de ejemplo" }).click();
    expect((await template).suggestedFilename()).toBe("plantilla-h4.csv");
    await page.getByRole("button", { name: "Solicitar exportación" }).click();
    await expect(page.getByText(`Trabajo de exportación: ${exportId}`)).toBeVisible();
    await page.getByRole("button", { name: "Actualizar estado" }).click();
    await expect(page.getByText("Fallo de exportación")).toBeVisible();
    expect(requests.some((request) => request.url === `${root}/exportaciones/${exportId}/archivo`)).toBe(false);

    await page.goto(`/tests/harness/bulk-http.html?gateway=${encodeURIComponent(gateway)}#/carga-masiva/importaciones/unauthorized`);
    await expect(page.getByText(/sesión expiró o no es válida/i)).toBeVisible();
    await page.goto(`/tests/harness/bulk-http.html?gateway=${encodeURIComponent(gateway)}#/carga-masiva/importaciones/forbidden`);
    await expect(page.getByText(/no tiene permiso/i)).toBeVisible();
    await page.goto(`/tests/harness/bulk-http.html?gateway=${encodeURIComponent(gateway)}#/carga-masiva/importaciones/missing`);
    await expect(page.getByText("Lote no encontrado")).toBeVisible();
    await page.goto(`/tests/harness/bulk-http.html?gateway=${encodeURIComponent(gateway)}#/carga-masiva/importaciones/unavailable`);
    await expect(page.getByText(/no está disponible temporalmente/i)).toBeVisible();
    await page.goto(`/tests/harness/bulk-http.html?gateway=${encodeURIComponent(gateway)}#/carga-masiva/importaciones/network`);
    await expect(page.getByText(/no se pudo conectar con Gateway/i)).toBeVisible();
    await page.goto(`/tests/harness/bulk-http.html?gateway=${encodeURIComponent(gateway)}#/carga-masiva/importaciones/conflict-batch/resultado`);
    await page.getByRole("button", { name: "Reanudar operaciones pendientes" }).click();
    await page.getByRole("button", { name: "Confirmar reanudación" }).click();
    await expect(page.getByText(/HTTP 409.*conflicto/i)).toBeVisible();
    expect(requests.every((request) => request.auth === "Bearer test.header.signature")).toBe(true);
    expect(requests.some((request) => request.method === "POST" && request.url === `${root}/importaciones` && request.contentType?.startsWith("multipart/form-data; boundary="))).toBe(true);
    expect(requests.some((request) => request.url === `${root}/exportaciones`)).toBe(true);
    expect(new Set(requests.filter((request) => request.method === "POST" && request.url === `${root}/importaciones`).map((request) => request.correlation)).size).toBe(1);
    expect(requests.every((request) => request.correlation && /^[0-9a-f-]{36}$/i.test(request.correlation))).toBe(true);
    const repository = createHttpBulkRepository(createBulkFetchTransport(gateway), {
      getAccessToken: async () => "test.header.signature",
      refreshAccessToken: async () => null,
      invalidateAccessToken: () => undefined,
    });
    await expect(repository.getExportFile(exportId)).rejects.toMatchObject({ status: 503 });
  }, "actual-backend");
});

test("Bulk HTTP aislado conserva descarga COMPLETED como escenario de contrato futuro simulado", async ({ page }) => {
  await withServer(async (gateway, requests) => {
    await page.goto(`/tests/harness/bulk-http.html?gateway=${encodeURIComponent(gateway)}#/carga-masiva/descargas`);
    await page.getByRole("button", { name: "Solicitar exportación" }).click();
    await page.getByRole("button", { name: "Actualizar estado" }).click();
    await expect(page.getByRole("button", { name: "Descargar archivo CSV consolidado" })).toBeEnabled();
    const exported = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar archivo CSV consolidado" }).click();
    expect((await exported).suggestedFilename()).toBe("export.csv");
    expect(requests.some((request) => request.url === `${root}/exportaciones/${exportId}/archivo`)).toBe(true);
  }, "future-contract");
});
