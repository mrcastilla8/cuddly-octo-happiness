import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockBulkRepository } from "../src/features/bulk/adapters/mockBulkRepository";
import { createHttpBulkRepository, type BulkHttpTransport } from "../src/features/bulk/adapters/httpBulkRepository";
import { BulkRepositoryError, createBulkRepository } from "../src/features/bulk/services/bulkService";
import { canRequestImportReport } from "../src/features/bulk/services/bulkRepository";
import { canMockProvideImportReport } from "../src/features/bulk/services/reportAvailability";
import { isBulkProviderConfigured } from "../src/features/bulk/services/bulkProviderStatus";
import { getQueuedBatchDescription, getUnknownRowCountDescription } from "../src/features/bulk/components/batchStatusMessages";
import {
  canDownloadExport,
  canResumeBatch,
  hasReconcilableOperations,
  isExportSnapshotStale,
  resumeBatchWhenAllowed,
  selectBatchQueryView,
} from "../src/features/bulk/hooks/bulkQueryState";
import { getDownloadFailureMessage, getUnavailableDownloadMessage } from "../src/features/bulk/services/downloadMessages";
import { AdmissionCoordinator, LatestTaskCoordinator, runSingleFlight } from "../src/features/bulk/utils/asyncGuards";
import { checkLocalFile, parseCsvSafely } from "../src/features/bulk/utils/localFileCheck";
import { getGenuineMinimalXlsxArrayBuffer } from "./fixtures/genuineXlsxFixture";
import { MOCK_CSV_SAMPLE_DATA, mockBatches, mockExports } from "../src/features/bulk/mocks/bulkFixtures";
import { parseCsvRecords } from "../src/features/bulk/adapters/mockBulkRepository";
import {
  generateAuditPdf,
  parsePdfStructure,
} from "../src/features/price-audit/adapters/mockAuditRepository";
import type { AuditEntry, AuditFilters } from "../src/features/price-audit/services/auditRepository";

const testSession = {
  getAccessToken: async () => "header.payload.signature",
  refreshAccessToken: async () => null,
  invalidateAccessToken: () => undefined,
};

describe("adaptador HTTP de Bulk", () => {
  it("usa rutas del contrato, bearer y multipart sin fabricar Content-Type", async () => {
    const calls: Array<{ path: string; init: Parameters<BulkHttpTransport["request"]>[1] }> = [];
    const transport: BulkHttpTransport = { request: async (path, init) => {
      calls.push({ path, init });
      return new Response(JSON.stringify({ batch_id: "b-1", status: "QUEUED", template_version: 2, correlation_id: "00000000-0000-4000-8000-000000000000" }), { status: 202, headers: { "content-type": "application/json" } });
    } };
    const repository = createHttpBulkRepository(transport, testSession);
    const result = await repository.createImport(new File(["sku,nombre\nA-1,Uno"], "lote.csv", { type: "text/csv" }), { correlationId: "11111111-1111-4111-8111-111111111111" });
    expect(result).toMatchObject({ batch_id: "b-1", status: "QUEUED" });
    expect(calls[0]?.path).toBe("/api/v1/carga-masiva/productos/importaciones");
    expect(calls[0]?.init.headers.Authorization).toBe("Bearer header.payload.signature");
    expect(calls[0]?.init.headers["X-Correlation-Id"]).toBe("11111111-1111-4111-8111-111111111111");
    expect(calls[0]?.init.headers["Content-Type"]).toBeUndefined();
    expect(calls[0]?.init.body).toBeInstanceOf(FormData);
    const form = calls[0]?.init.body as FormData;
    expect((form.get("archivo") as File).name).toBe("lote.csv");
    expect(form.get("template_version")).toBe("2");
  });

  it("conserva correlación al reintentar la misma intención y usa otra para una operación nueva", async () => {
    const coordinator = new AdmissionCoordinator<File>();
    const firstFile = new File(["a"], "primera.csv");
    coordinator.select(firstFile);
    const first = coordinator.begin(firstFile)!;
    coordinator.finish(first, "uncertain");
    const retry = coordinator.begin(firstFile, true)!;
    expect(retry.correlationId).toBe(first.correlationId);
    coordinator.finish(retry, "accepted");
    const secondFile = new File(["b"], "segunda.csv");
    coordinator.select(secondFile);
    const nextOperation = coordinator.begin(secondFile);
    expect(nextOperation?.correlationId).not.toBe(first.correlationId);
    expect(nextOperation?.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("valida que MIME y nombre alternativo correspondan al formato XLSX del trabajo", async () => {
    const repository = createHttpBulkRepository({ request: async (path) => {
      if (path.endsWith("/archivo")) return new Response("xlsx", { status: 200, headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
      return new Response(JSON.stringify({ export_id: "33333333-3333-4333-8333-333333333333", status: "COMPLETED", formato: "XLSX", created_at: "2026-11-02T12:00:00.000Z" }), { status: 200, headers: { "content-type": "application/json" } });
    } }, testSession);
    const download = await repository.getExportFile("33333333-3333-4333-8333-333333333333");
    expect(download?.fileName).toBe("exportacion-33333333-3333-4333-8333-333333333333.xlsx");
    const invalidMime = createHttpBulkRepository({ request: async (path) => path.endsWith("/archivo")
      ? new Response("csv", { status: 200, headers: { "content-type": "text/csv" } })
      : new Response(JSON.stringify({ export_id: "33333333-3333-4333-8333-333333333333", status: "COMPLETED", formato: "XLSX", created_at: "2026-11-02T12:00:00.000Z" }), { status: 200, headers: { "content-type": "application/json" } }) }, testSession);
    await expect(invalidMime.getExportFile("33333333-3333-4333-8333-333333333333")).rejects.toThrow("MIME");
  });

  it("descarga una plantilla con nombre seguro y mapea filas y dominios contractuales", async () => {
    const transport: BulkHttpTransport = { request: async (path) => path.includes("plantilla")
      ? new Response("sku,nombre", { status: 200, headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="catalogo.csv"' } })
      : new Response(JSON.stringify({ batch_id: "b-2", status: "COMPLETED", total_rows: 1, completed_rows: 0, failed_rows: 1, needs_reconciliation: true, rows: [{ row_id: "4", status: "FAILED", applied_domains: ["CATALOGO"], failed_domain: "PRICING", needs_reconciliation: true, steps: [{ dominio: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO", detail: "Revisar" }] }] }), { status: 200, headers: { "content-type": "application/json" } }) };
    const repository = createHttpBulkRepository(transport, testSession);
    const template = await repository.getTemplate("CSV");
    expect(template?.fileName).toBe("catalogo.csv");
    expect(await template?.blob.text()).toBe("sku,nombre");
    const batch = await repository.getImport("b-2");
    expect(batch?.rows?.[0]?.steps[0]).toMatchObject({ domain: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO" });
  });

  it.each([401, 403, 404, 409, 503])("expone el error HTTP %i sin fallback", async (status) => {
    const transport: BulkHttpTransport = { request: async () => new Response(JSON.stringify({ status, code: "ERROR_HTTP" }), { status, headers: { "content-type": "application/problem+json" } }) };
    const repository = createHttpBulkRepository(transport, testSession);
    await expect(repository.createExport("CSV")).rejects.toThrow(`HTTP ${status}`);
  });

  it("selecciona mock solo para mock y exige provider API en modo api", () => {
    expect(createBulkRepository("mock")).toBe(mockBulkRepository);
    const api = createHttpBulkRepository({ request: async () => new Response("", { status: 503 }) }, testSession);
    expect(createBulkRepository("api", { api })).toBe(api);
    expect(isBulkProviderConfigured("api", api)).toBe(true);
    expect(isBulkProviderConfigured("api", null)).toBe(false);
  });
});

function fileWithBytes(name: string, bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy.buffer], name);
}

function fileWithChunks(name: string, bytes: Uint8Array, chunkSize = 64 * 1024) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const file = new File([copy.buffer], name);
  Object.defineProperty(file, "stream", {
    value: () => {
      let offset = 0;
      return new ReadableStream<Uint8Array>({
        pull(controller) {
          if (offset >= bytes.length) {
            controller.close();
            return;
          }
          const end = Math.min(offset + chunkSize, bytes.length);
          controller.enqueue(bytes.slice(offset, end));
          offset = end;
        },
      });
    },
  });
  return file;
}

function buildZip(entries: string[], options?: { declaredEntries?: number }) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry);
    const data = Buffer.from("test");
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    local.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt32LE(offset, 42);
    central.push(centralHeader, name);
    offset += 30 + name.length + data.length;
  }

  const localData = Buffer.concat(local);
  const centralData = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(options?.declaredEntries ?? entries.length, 8);
  eocd.writeUInt16LE(options?.declaredEntries ?? entries.length, 10);
  eocd.writeUInt32LE(centralData.length, 12);
  eocd.writeUInt32LE(localData.length, 16);
  return Buffer.concat([localData, centralData, eocd]);
}

describe("Bulk mock repository and global data mode", () => {
  beforeEach(() => mockBulkRepository.resetMockState?.());
  afterEach(() => mockBulkRepository.resetMockState?.());

  it("selects deterministic mocks only in mock mode and fails explicitly in api mode", async () => {
    expect(createBulkRepository("mock")).toBe(mockBulkRepository);
    const apiRepository = createBulkRepository("api");
    await expect(apiRepository.getImport("batch-queued")).rejects.toMatchObject({
      name: "BulkRepositoryError",
      category: "configuration",
    });
    expect(createBulkRepository("api", { api: mockBulkRepository })).toBe(
      mockBulkRepository,
    );
  });

  it("creates an import in QUEUED and does not read CSV again after local review", async () => {
    const file = new File(["sku,nombre\nA,Producto A\nB,Producto B\n"], "catalogo.csv");
    const batch = await mockBulkRepository.createImport(file, { detectedRows: 2 });
    expect(batch.status).toBe("QUEUED");
    expect(batch.total_rows).toBe(2);
    expect(batch.file_name).toBe("catalogo.csv");
  });

  it("rejects XLSX imports as unconfigured without creating a batch or scheduling timers", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    try {
      await expect(
        mockBulkRepository.createImport(new File(["fake workbook"], "catalogo.xlsx")),
      ).rejects.toMatchObject({
        name: "BulkRepositoryError",
        message: "La importación Excel no está disponible en este entorno.",
        category: "configuration",
      });
      expect(setTimeoutSpy).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
    }

    const next = await mockBulkRepository.createImport(
      new File([MOCK_CSV_SAMPLE_DATA], "valid.csv", { type: "text/csv" }),
    );
    expect(next.batch_id).toMatch(/^lote-imp-1001-/);
  });

  it("keeps batch refresh reads free of import writes", async () => {
    const getCreateCalls = () => mockBulkRepository.getCreateImportCallCount?.() ?? 0;
    const createCallsBefore = getCreateCalls();
    await mockBulkRepository.getImport("batch-completed");
    expect(getCreateCalls()).toBe(createCallsBefore);
  });

  it("preserves confirmed rows and batch identity when resuming an eligible batch", async () => {
    const batch = await mockBulkRepository.getImport("batch-partial");
    const resumed = await mockBulkRepository.resumeImport("batch-partial");
    expect(resumed.batch_id).toBe("batch-partial");
    expect(resumed.status).toBe("QUEUED");
    expect(resumed.completed_rows).toBe(batch?.completed_rows);
    expect(resumed.rows?.filter((row) => row.status === "COMPLETED")).toHaveLength(
      batch?.rows?.filter((row) => row.status === "COMPLETED").length ?? 0,
    );
    await expect(mockBulkRepository.resumeImport("batch-completed")).rejects.toThrow(
      "no contiene operaciones pendientes",
    );
  });

  it("rejects a duplicate resume while preserving the same batch identity", async () => {
    const results = await Promise.allSettled([
      mockBulkRepository.resumeImport("batch-partial"),
      mockBulkRepository.resumeImport("batch-partial"),
    ]);
    const accepted = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(accepted[0]).toMatchObject({
      status: "fulfilled",
      value: { batch_id: "batch-partial" },
    });
  });

  it("exports a CSV file and never returns a CSV renamed as XLSX", async () => {
    const csvJob = await mockBulkRepository.createExport("CSV");
    await mockBulkRepository.advanceMockExport?.(csvJob.export_id);
    await mockBulkRepository.advanceMockExport?.(csvJob.export_id);
    const csv = await mockBulkRepository.getExportFile(csvJob.export_id);
    expect(csv?.fileName).toContain(".csv");

    const xlsxJob = await mockBulkRepository.createExport("XLSX");
    await mockBulkRepository.advanceMockExport?.(xlsxJob.export_id);
    await mockBulkRepository.advanceMockExport?.(xlsxJob.export_id);
    expect(await mockBulkRepository.getExportFile(xlsxJob.export_id)).toBeNull();
  });

  it("returns error reports from row details and no invented report without them", async () => {
    const partial = await mockBulkRepository.getImportReport("batch-partial");
    expect(partial?.fileName).toContain("batch-partial");
    expect(await partial?.blob.text()).toContain("SKU_DUPLICADO");
    expect(await mockBulkRepository.getImportReport("batch-failed-general")).toBeNull();
    expect(canMockProvideImportReport(mockBatches["batch-failed-general"]!)).toBe(false);
    expect(canRequestImportReport(mockBulkRepository, mockBatches["batch-failed-general"]!)).toBe(false);

    const apiRepository = { ...mockBulkRepository, canDownloadImportReport: undefined };
    expect(canRequestImportReport(apiRepository, mockBatches["batch-failed-general"]!)).toBe(true);
  });

  it("uses neutral commercial wording for batch status messages", () => {
    for (const mode of ["mock", "api"] as const) {
      expect(getQueuedBatchDescription(mode)).toContain("solicitud está en cola");
      expect(getUnknownRowCountDescription(mode)).toContain("total de filas");
      expect(getQueuedBatchDescription(mode)).not.toMatch(/mock|demostración|provider/i);
      expect(getUnknownRowCountDescription(mode)).not.toMatch(/mock|demostración|provider/i);
    }
    expect(isBulkProviderConfigured("api", null)).toBe(false);
    expect(isBulkProviderConfigured("api", mockBulkRepository)).toBe(true);
    expect(isBulkProviderConfigured("mock", null)).toBe(true);
  });

  it("uses concise download messages without implementation details", () => {
    for (const mode of ["mock", "api"] as const) {
      expect(getUnavailableDownloadMessage(mode, "exportación", "XLSX")).toContain("archivo solicitado");
      expect(getUnavailableDownloadMessage(mode, "plantilla", "CSV")).toContain("no está disponible");
      expect(getUnavailableDownloadMessage(mode, "plantilla", "CSV")).not.toMatch(/mock|provider|demostración/i);
    }
    expect(getDownloadFailureMessage(new BulkRepositoryError("Sin conexión", "communication"), "exportación"))
      .toContain("Error de comunicación");
  });

  it("uses the latest completed batch query and discards stale responses", () => {
    const batch = mockBatches["batch-partial"]!;
    const staleResponse = { key: '["batch-partial",0]', state: { status: "success" as const, batch } };
    const notFound = selectBatchQueryView({
      batchId: "batch-partial",
      requestKey: '["batch-partial",1]',
      response: { key: '["batch-partial",1]', state: { status: "not_found" } },
      lastSuccess: { batchId: batch.batch_id, batch },
    });
    expect(notFound).toMatchObject({ batch: null, isNotFound: true, loading: false });

    const communicationError = selectBatchQueryView({
      batchId: "batch-partial",
      requestKey: '["batch-partial",2]',
      response: { key: '["batch-partial",2]', state: { status: "error", message: "offline" } },
      lastSuccess: { batchId: batch.batch_id, batch },
    });
    expect(communicationError).toMatchObject({ batch, error: "offline", isStale: true });

    expect(selectBatchQueryView({
      batchId: "another-batch",
      requestKey: '["another-batch",0]',
      response: staleResponse,
      lastSuccess: { batchId: batch.batch_id, batch },
    })).toMatchObject({ batch: null, loading: true, isNotFound: false });
  });

  it("marks the last export stale only for the same export ID", () => {
    expect(isExportSnapshotStale({
      visibleExportId: "exp-a",
      initialExportId: "exp-a",
      routeExportId: "exp-a",
      createdJobMatches: false,
      currentQueryStatus: "error",
    })).toBe(true);
    expect(isExportSnapshotStale({
      visibleExportId: "exp-b",
      initialExportId: "exp-b",
      routeExportId: "exp-a",
      createdJobMatches: false,
      currentQueryStatus: "error",
      refreshErrorExportId: "exp-a",
    })).toBe(false);
    expect(isExportSnapshotStale({
      visibleExportId: "exp-c",
      createdJobMatches: true,
      refreshErrorExportId: "exp-c",
    })).toBe(true);
  });

  it("guards duplicate confirmations and cancels stale file-selection checks", async () => {
    const guard = { current: false };
    let complete!: (value: string) => void;
    let submissions = 0;
    const first = runSingleFlight(guard, () => {
      submissions++;
      return new Promise<string>((resolve) => { complete = resolve; });
    });
    const duplicate = await runSingleFlight(guard, async () => {
      submissions++;
      return "duplicate";
    });
    expect(duplicate).toBeUndefined();
    expect(submissions).toBe(1);
    complete("accepted");
    await expect(first).resolves.toBe("accepted");

    const coordinator = new LatestTaskCoordinator();
    const fileA = coordinator.start();
    const fileB = coordinator.start();
    expect(fileA.signal.aborted).toBe(true);
    expect(fileA.isCurrent()).toBe(false);
    expect(fileB.isCurrent()).toBe(true);
    coordinator.cancel();
    expect(fileB.signal.aborted).toBe(true);
    expect(fileB.isCurrent()).toBe(false);
  });

  it("allows a new admission after acceptance and ignores a response from an older selection", () => {
    const coordinator = new AdmissionCoordinator<{ name: string }>();
    const firstFile = { name: "primero.csv" };
    coordinator.select(firstFile);
    const firstAdmission = coordinator.begin(firstFile);
    expect(firstAdmission).not.toBeNull();
    expect(coordinator.begin(firstFile)).toBeNull();
    expect(coordinator.finish(firstAdmission!, "accepted")).toBe(true);
    expect(coordinator.status).toBe("accepted");
    expect(coordinator.begin(firstFile)).toBeNull();

    const lateAdmission = coordinator.begin(firstFile);
    expect(lateAdmission).toBeNull();
    const secondFile = { name: "segundo.csv" };
    coordinator.select(secondFile);
    expect(coordinator.finish(firstAdmission!, "uncertain")).toBe(false);
    expect(coordinator.status).toBe("ready");
    const secondAdmission = coordinator.begin(secondFile);
    expect(secondAdmission).not.toBeNull();
    expect(coordinator.begin(secondFile)).toBeNull();
  });
});

describe("Bulk local file checks", () => {
  it("streams CSV structure and detects headers, rows, BOM, quoted commas, and line breaks", async () => {
    const file = new File(
      ["\uFEFFsku,nombre,detalle\r\nSKU-1,Producto 1,\"texto,\ncon salto\"\r\nSKU-2,Producto 2,ok\r\n"],
      "catalogo.csv",
    );
    const result = await checkLocalFile(file);
    expect(result.valid).toBe(true);
    expect(result.detectedColumns).toEqual(["sku", "nombre", "detalle"]);
    expect(result.detectedRows).toBe(2);
    expect(result.unverifiedAspects).toContain(
      "Unicidad de SKU y existencia previa en catálogo no verificable localmente.",
    );
  });

  it("rejects empty, unsupported, header-only, and malformed CSV input", async () => {
    expect((await checkLocalFile(new File([], "vacio.csv"))).errors[0]).toContain("vacío");
    expect((await checkLocalFile(new File(["x"], "catalogo.txt"))).valid).toBe(false);
    expect((await checkLocalFile(new File(["sku,nombre\n"], "solo-header.csv"))).errors[0]).toContain(
      "únicamente el encabezado",
    );
    expect((await checkLocalFile(new File(["sku,nombre\nA\n"], "columnas.csv"))).errors[0]).toContain(
      "campos, mientras que el encabezado define",
    );
    expect((await checkLocalFile(new File(["sku,nombre\n\"A,Producto\n"], "quotes.csv"))).errors[0]).toContain(
      "comillas sin cerrar",
    );
    expect((await checkLocalFile(new File(["sku,sku\nA,B\n"], "duplicadas.csv"))).errors[0]).toContain(
      "nombres de columna duplicados",
    );
  });

  it("recognizes a genuine OOXML container and streams the central directory", async () => {
    const file = fileWithBytes(
      "catalogo.xlsx",
      new Uint8Array(getGenuineMinimalXlsxArrayBuffer()),
    );
    const result = await checkLocalFile(file);
    expect(result.valid).toBe(true);
    expect(result.format).toBe("XLSX");
    expect(result.detectedRows).toBeUndefined();
    expect(result.unverifiedAspects).toContain(
      "Estructura interna de celdas y filas XLSX no verificada en cliente.",
    );
  });

  it("rejects forged ZIP signatures, truncated directories, and ZIP files without OOXML entries", async () => {
    const forged = new Uint8Array(64);
    forged.set([0x50, 0x4b, 0x03, 0x04], 0);
    forged.set([0x50, 0x4b, 0x05, 0x06], 42);
    expect((await checkLocalFile(fileWithBytes("fake.xlsx", forged))).valid).toBe(false);

    const wrongEntries = new Uint8Array(buildZip(["notes.txt"]));
    expect((await checkLocalFile(fileWithBytes("zip-not-xlsx.xlsx", wrongEntries))).valid).toBe(false);

    const truncated = new Uint8Array(buildZip(["[Content_Types].xml"], { declaredEntries: 2 }));
    expect((await checkLocalFile(fileWithBytes("truncated.xlsx", truncated))).valid).toBe(false);
  });

  it("keeps the small in-memory CSV parser deterministic for fixtures", () => {
    expect(parseCsvSafely('sku,nombre\nA,"Producto, uno"\n').rows).toEqual([
      ["sku", "nombre"],
      ["A", "Producto, uno"],
    ]);
    expect(parseCsvSafely('sku,nombre\nA,"sin cerrar').error).toContain("comillas sin cerrar");
  });

  it("handles escaped quotes in ordinary CSV fields and headers", async () => {
    const result = await checkLocalFile(
      new File(['"sku""code",nombre\n"AB""C",Producto\n'], "comillas.csv"),
    );
    expect(result.valid).toBe(true);
    expect(result.detectedColumns).toEqual(['sku"code', "nombre"]);
    expect(result.detectedRows).toBe(1);
  });

  it("keeps escaped quotes intact when the pair straddles two 64 KiB reads", async () => {
    const encoder = new TextEncoder();
    const prefix = encoder.encode('sku,detalle\nA,"');
    const padding = new Uint8Array(64 * 1024 - prefix.length - 1).fill("x".charCodeAt(0));
    const bytes = new Uint8Array([
      ...prefix,
      ...padding,
      ...encoder.encode('""y"\nB,ok\n'),
    ]);
    const result = await checkLocalFile(fileWithChunks("comillas-frontera.csv", bytes));
    expect(result.valid).toBe(true);
    expect(result.detectedRows).toBe(2);
  });

  it("handles escaped quotes split in a header and a CRLF split at the read boundary", async () => {
    const encoder = new TextEncoder();
    const headerPrefix = encoder.encode('"sku');
    const headerPadding = new Uint8Array(64 * 1024 - headerPrefix.length - 1).fill("x".charCodeAt(0));
    const headerBytes = new Uint8Array([
      ...headerPrefix,
      ...headerPadding,
      ...encoder.encode('""code",nombre\nA,B\n'),
    ]);
    const headerResult = await checkLocalFile(fileWithChunks("header-frontera.csv", headerBytes));
    expect(headerResult.valid).toBe(true);
    expect(headerResult.detectedColumns?.[0]).toMatch(/"code$/);

    const rowPrefix = encoder.encode("sku,nombre\nA,");
    const rowPadding = new Uint8Array(64 * 1024 - rowPrefix.length - 1).fill("x".charCodeAt(0));
    const rowBytes = new Uint8Array([
      ...rowPrefix,
      ...rowPadding,
      ...encoder.encode("\r\nB,Producto\n"),
    ]);
    const crlfResult = await checkLocalFile(fileWithChunks("crlf-frontera.csv", rowBytes));
    expect(crlfResult.valid).toBe(true);
    expect(crlfResult.detectedRows).toBe(2);
  });

  it("decodes UTF-8 multibyte characters split across reads", async () => {
    const encoder = new TextEncoder();
    const prefix = encoder.encode("sku,nombre\nA,");
    const padding = new Uint8Array(64 * 1024 - prefix.length - 1).fill("x".charCodeAt(0));
    const bytes = new Uint8Array([
      ...prefix,
      ...padding,
      ...encoder.encode("ñ\nB,Producto\n"),
    ]);
    const result = await checkLocalFile(fileWithChunks("utf8-frontera.csv", bytes));
    expect(result.valid).toBe(true);
    expect(result.detectedRows).toBe(2);
  });

  it("bounds oversized local headers without imposing a commercial file-size limit", async () => {
    const header = new Uint8Array(256 * 1024 + 1).fill("x".charCodeAt(0));
    const bytes = new Uint8Array([...header, 10, 65, 10]);
    const result = await checkLocalFile(fileWithChunks("header-grande.csv", bytes));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("límite de inspección local");
  });

  it("cancels an active streaming read when the selection is cleared", async () => {
    const file = new File(["sku,nombre\nA,B\n"], "cancelar.csv");
    let cancelled = false;
    Object.defineProperty(file, "stream", {
      value: () => new ReadableStream<Uint8Array>({
        pull() {},
        cancel() { cancelled = true; },
      }),
    });
    const controller = new AbortController();
    const pending = checkLocalFile(file, controller.signal);
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(cancelled).toBe(true);
  });
});

describe("Bulk reconciliation gating and export download eligibility", () => {
  beforeEach(() => mockBulkRepository.resetMockState?.());
  afterEach(() => mockBulkRepository.resetMockState?.());

  const partial = mockBatches["batch-partial"]!;
  const baseEligibility = {
    loading: false,
    error: null,
    isStale: false,
    isNotFound: false,
    resuming: false,
  };

  it("detects reconcilable work from rows or aggregate counters without inventing pending operations", () => {
    expect(hasReconcilableOperations(partial)).toBe(true);
    expect(hasReconcilableOperations(mockBatches["batch-completed"]!)).toBe(false);
    expect(hasReconcilableOperations(mockBatches["batch-failed-general"]!)).toBe(false);
    // Row detail absent: fall back to aggregate counters.
    expect(hasReconcilableOperations({ ...partial, rows: [], needs_reconciliation: true, failed_rows: 3 })).toBe(true);
    expect(hasReconcilableOperations({ ...partial, rows: [], needs_reconciliation: false, failed_rows: 3 })).toBe(false);
    // Row detail present but no failed row flagged for reconciliation.
    expect(hasReconcilableOperations({
      ...partial,
      rows: [{
        row_id: 1,
        sku: "A",
        nombre: "A",
        status: "FAILED",
        applied_domains: [],
        failed_domain: "CATALOGO",
        needs_reconciliation: false,
        steps: [],
      }],
    })).toBe(false);
  });

  it("only permits resume for a current, error-free, terminal batch with reconcilable work", () => {
    expect(canResumeBatch({ batch: partial, ...baseEligibility })).toBe(true);
    expect(canResumeBatch({ batch: partial, ...baseEligibility, loading: true })).toBe(false);
    expect(canResumeBatch({ batch: partial, ...baseEligibility, error: "offline" })).toBe(false);
    expect(canResumeBatch({ batch: partial, ...baseEligibility, isStale: true })).toBe(false);
    expect(canResumeBatch({ batch: partial, ...baseEligibility, isNotFound: true })).toBe(false);
    expect(canResumeBatch({ batch: partial, ...baseEligibility, resuming: true })).toBe(false);
    expect(canResumeBatch({ batch: undefined, ...baseEligibility })).toBe(false);
    expect(canResumeBatch({ batch: mockBatches["batch-completed"]!, ...baseEligibility })).toBe(false);
    expect(canResumeBatch({ batch: mockBatches["batch-failed-general"]!, ...baseEligibility })).toBe(false);
    expect(canResumeBatch({ batch: mockBatches["batch-processing"]!, ...baseEligibility })).toBe(false);
    expect(canResumeBatch({ batch: mockBatches["batch-queued"]!, ...baseEligibility })).toBe(false);
    expect(canResumeBatch({
      batch: {
        ...partial,
        rows: [{
          row_id: 1,
          sku: "A",
          nombre: "A",
          status: "FAILED",
          applied_domains: [],
          failed_domain: "CATALOGO",
          needs_reconciliation: false,
          steps: [],
        }],
      },
      ...baseEligibility,
    })).toBe(false);
  });

  it("does not issue a resume write when the batch is not eligible", async () => {
    let writes = 0;
    const resume = async () => { writes++; return "ok"; };

    const skipped = resumeBatchWhenAllowed(false, resume);
    expect(skipped).toBeUndefined();
    expect(writes).toBe(0);

    const executed = resumeBatchWhenAllowed(true, resume);
    await expect(executed).resolves.toBe("ok");
    expect(writes).toBe(1);
  });

  it("refuses a repository-level resume for batches without pending work", async () => {
    await expect(mockBulkRepository.resumeImport("batch-failed-general")).rejects.toThrow(
      "no contiene operaciones pendientes",
    );
    await expect(mockBulkRepository.resumeImport("batch-queued")).rejects.toThrow(
      "ya se encuentra en proceso",
    );
  });

  it("exposes downloads only for a current completed job with a real artifact", () => {
    const completedCsv = mockExports["export-completed"]!;
    expect(canDownloadExport({ job: completedCsv, isStale: false, dataMode: "mock" })).toBe(true);
    expect(canDownloadExport({ job: completedCsv, isStale: true, dataMode: "mock" })).toBe(false);
    // Mock XLSX never has a genuine artifact.
    expect(canDownloadExport({ job: mockExports["export-completed-xlsx"]!, isStale: false, dataMode: "mock" })).toBe(false);
    // Non-terminal jobs never download.
    expect(canDownloadExport({ job: mockExports["export-queued"]!, isStale: false, dataMode: "mock" })).toBe(false);
    expect(canDownloadExport({ job: mockExports["export-processing"]!, isStale: false, dataMode: "mock" })).toBe(false);
    expect(canDownloadExport({ job: mockExports["export-failed"]!, isStale: false, dataMode: "mock" })).toBe(false);
    // In API mode the provider owns the resource.
    expect(canDownloadExport({ job: mockExports["export-completed-xlsx"]!, isStale: false, dataMode: "api" })).toBe(true);
    expect(canDownloadExport({ job: mockExports["export-failed"]!, isStale: false, dataMode: "api" })).toBe(false);
    expect(canDownloadExport({ job: undefined, isStale: false, dataMode: "mock" })).toBe(false);
  });
});

function createDummyAuditEntry(index: number, overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: `aud-${String(index).padStart(4, "0")}`,
    sku: `SKU-DUMMY-${index}`,
    productId: `prod-${index}`,
    priceType: "REGULAR",
    before: "100.00",
    after: "120.00",
    variation: "+20.00%",
    operation: "MODIFICACION",
    origin: "global",
    reason: `Motivo estándar ${index}`,
    batchId: null,
    actorId: "user-admin",
    email: "admin@tienda.com",
    ip: "192.168.1.1",
    at: new Date(1700000000000 + index * 60000).toISOString(),
    ...overrides,
  };
}

const dummyFilters: AuditFilters = {
  sku: "",
  desde: "",
  hasta: "",
  usuarioId: "",
  canal: "",
  batchId: "",
};

describe("P1 CSV parsing and formatting validations", () => {
  beforeEach(() => mockBulkRepository.resetMockState?.());
  afterEach(() => mockBulkRepository.resetMockState?.());

  it("admit exactly the three rows from the downloadable CSV template without structural rejection", async () => {
    const resource = await mockBulkRepository.getTemplate("CSV");
    expect(resource).not.toBeNull();
    const content = await resource!.blob.text();
    const batch = await mockBulkRepository.createImport(
      new File([content], resource!.fileName, { type: "text/csv" }),
    );
    expect(batch.total_rows).toBe(3);
    expect(batch.rows).toHaveLength(3);
    expect(batch.rows?.every((row) => row.status === "PENDING")).toBe(true);
    expect(batch.rows?.every((row) => row.code !== "VALIDACION" && row.code !== "DATOS_INCOMPLETOS")).toBe(true);
  });

  it.each([
    ["empty CSV", "", "empty.csv"],
    ["header-only CSV", "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial", "header.csv"],
    ["malformed header without complete rows", '"sku,nombre,descripcion', "malformed-header.csv"],
  ])("rejects %s without creating a batch", async (_label, content, filename) => {
    await expect(mockBulkRepository.createImport(new File([content], filename, { type: "text/csv" }), { detectedRows: 99 }))
      .rejects.toMatchObject({ name: "BulkRepositoryError", category: "rejected" });
    const next = await mockBulkRepository.createImport(new File([MOCK_CSV_SAMPLE_DATA], "valid.csv", { type: "text/csv" }));
    expect(next.batch_id).toMatch(/^lote-imp-1001-/);
  });

  it("reports a CSV read failure as a communication error", async () => {
    const file = new File(["x"], "read-failure.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: () => Promise.reject(new Error("read failed")) });
    await expect(mockBulkRepository.createImport(file)).rejects.toMatchObject({
      name: "BulkRepositoryError",
      category: "communication",
    });
    const next = await mockBulkRepository.createImport(new File([MOCK_CSV_SAMPLE_DATA], "valid.csv", { type: "text/csv" }));
    expect(next.batch_id).toMatch(/^lote-imp-1001-/);
  });

  it('parses descriptions with commas, such as "Casaca, impermeable"', () => {
    const csv = 'sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial\nCAS-01,Casaca,"Casaca, impermeable",Calzado,Nike,Simple,150.00,PEN,10\n';
    const records = parseCsvRecords(csv);
    expect(records).toHaveLength(2);
    expect(records[1]?.columns[2]).toBe("Casaca, impermeable");
  });

  it("preserves newlines within quoted fields", () => {
    const csv = 'sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial\nCAS-02,Casaca,"Casaca\ncon forro térmico",Calzado,Nike,Simple,150.00,PEN,10\n';
    const records = parseCsvRecords(csv);
    expect(records).toHaveLength(2);
    expect(records[1]?.columns[2]).toBe("Casaca\ncon forro térmico");
  });

  it('correctly decodes escaped quotes "" inside quoted fields', () => {
    const csv = 'sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial\nCAS-03,Casaca,"Casaca ""Edición Especial""",Calzado,Nike,Simple,150.00,PEN,10\n';
    const records = parseCsvRecords(csv);
    expect(records).toHaveLength(2);
    expect(records[1]?.columns[2]).toBe('Casaca "Edición Especial"');
  });

  it("supports CRLF line endings without leaving carriage return characters", () => {
    const csv = "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial\r\nCAS-04,Casaca,Impermeable,Calzado,Nike,Simple,150.00,PEN,10\r\n";
    const records = parseCsvRecords(csv);
    expect(records).toHaveLength(2);
    expect(records[1]?.columns[0]).toBe("CAS-04");
    expect(records[1]?.columns[8]).toBe("10");
  });

  it("marks unclosed quotes as syntax error and rejects row upon import", async () => {
    const csv = 'sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial\nCAS-05,Casaca,"Casaca sin comilla de cierre,Calzado,Nike,Simple,150.00,PEN,10\n';
    const records = parseCsvRecords(csv);
    expect(records[1]?.hasUnclosedQuote).toBe(true);

    const file = new File([csv], "unclosed.csv", { type: "text/csv" });
    const batch = await mockBulkRepository.createImport(file);
    expect(batch.rows).toBeDefined();
    expect(batch.rows![0]?.status).toBe("FAILED");
    expect(batch.rows![0]?.code).toBe("VALIDACION");
  });

  it("rejects rows with missing price without creating products or stock", async () => {
    const csv = "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial\nCAS-06,Casaca,Desc,Calzado,Nike,Simple,,PEN,10\n";
    const file = new File([csv], "no_price.csv", { type: "text/csv" });
    const batch = await mockBulkRepository.createImport(file);
    expect(batch.rows![0]?.status).toBe("FAILED");
    expect(batch.rows![0]?.code).toBe("PRECIO_INVALIDO");
  });

  it("rejects rows with missing or non-PEN currency", async () => {
    const csv = "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial\nCAS-07,Casaca,Desc,Calzado,Nike,Simple,150.00,USD,10\n";
    const file = new File([csv], "bad_currency.csv", { type: "text/csv" });
    const batch = await mockBulkRepository.createImport(file);
    expect(batch.rows![0]?.status).toBe("FAILED");
    expect(batch.rows![0]?.code).toBe("PRECIO_INVALIDO");
  });

  it("rejects rows with incomplete columns count compared to header", async () => {
    const csv = "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial\nCAS-08,Casaca,Desc,Calzado\n";
    const file = new File([csv], "incomplete.csv", { type: "text/csv" });
    const batch = await mockBulkRepository.createImport(file);
    expect(batch.rows![0]?.status).toBe("FAILED");
    expect(batch.rows![0]?.code).toBe("VALIDACION");
  });

  it("rejects file whose header omits mandatory columns such as precio_regular or moneda", async () => {
    const csv = "sku,nombre,descripcion,categoria,marca,tipo_producto,stock_inicial\nCAS-09,Casaca,Desc,Calzado,Nike,Simple,10\n";
    const file = new File([csv], "missing_cols_header.csv", { type: "text/csv" });
    const batch = await mockBulkRepository.createImport(file);
    expect(batch.rows![0]?.status).toBe("FAILED");
    expect(batch.rows![0]?.code).toBe("DATOS_INCOMPLETOS");
  });
});

describe("P1 Price Audit PDF generation and structural verification", () => {
  it("generates a valid 1-seat PDF with compliant xref and object graph", async () => {
    const entry = createDummyAuditEntry(1, { sku: "ZAP-001" });
    const blob = generateAuditPdf([entry], dummyFilters);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const parsed = parsePdfStructure(bytes);

    expect(parsed.headerValid).toBe(true);
    expect(parsed.xrefValid).toBe(true);
    expect(parsed.totalPages).toBe(1);
    expect(parsed.pageObjectsCount).toBe(1);
    expect(parsed.rawText).toContain("ZAP-001");
    expect(Math.max(...parsed.pageLineCounts)).toBeLessThanOrEqual(64);
    expect(Math.max(...parsed.pageSeatCounts)).toBeLessThanOrEqual(30);
  });

  it("generates a valid 2-page PDF for 31 seats", async () => {
    const entries = Array.from({ length: 31 }, (_, i) => createDummyAuditEntry(i + 1));
    const blob = generateAuditPdf(entries, dummyFilters);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const parsed = parsePdfStructure(bytes);

    expect(parsed.headerValid).toBe(true);
    expect(parsed.xrefValid).toBe(true);
    expect(parsed.totalPages).toBe(2);
    expect(parsed.pageObjectsCount).toBe(2);
    expect(Math.max(...parsed.pageLineCounts)).toBeLessThanOrEqual(64);
    expect(Math.max(...parsed.pageSeatCounts)).toBeLessThanOrEqual(30);
    for (let i = 1; i <= 31; i++) expect(parsed.rawText).toContain(`aud-${String(i).padStart(4, "0")}`);
  });

  it("generates a valid PDF for 500 seats with intact object graph and no page over 64 lines", async () => {
    const entries = Array.from({ length: 500 }, (_, i) => createDummyAuditEntry(i + 1));
    const blob = generateAuditPdf(entries, dummyFilters);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const parsed = parsePdfStructure(bytes);

    expect(parsed.headerValid).toBe(true);
    expect(parsed.xrefValid).toBe(true);
    expect(parsed.totalPages).toBeGreaterThanOrEqual(17);
    expect(parsed.pageObjectsCount).toBe(parsed.totalPages);
    expect(parsed.objectCount).toBe(4 + 2 * parsed.totalPages);
    expect(Math.max(...parsed.pageLineCounts)).toBeLessThanOrEqual(64);
    expect(Math.max(...parsed.pageSeatCounts)).toBeLessThanOrEqual(30);
    for (let i = 1; i <= 500; i++) {
      expect(parsed.rawText).toContain(`aud-${String(i).padStart(4, "0")}`);
    }
  });

  it("encodes Spanish accents, «ñ», and commercial characters in WinAnsi without visible escape sequences", async () => {
    const reasonText = "Actualización de campaña «Verano» con descuento especial — S/. 199.90 y € 50";
    const entry = createDummyAuditEntry(1, { reason: reasonText });
    const blob = generateAuditPdf([entry], dummyFilters);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const parsed = parsePdfStructure(bytes);

    expect(parsed.xrefValid).toBe(true);
    expect(parsed.rawText.replace(/\s+/g, " ")).toContain(reasonText.replace(/\s+/g, " "));
    expect(parsed.rawText).toContain("Actualización de campaña «Verano»");
    expect(parsed.rawText).toContain("€ 50");
    expect(parsed.rawText).not.toContain("\\341");
    expect(parsed.rawText).not.toContain("\\361");
    expect(parsed.rawText).not.toContain("\\227");
    expect(parsed.rawText).not.toContain("\\253");
    expect(parsed.rawText).not.toContain("\\273");
    expect(parsed.rawText).not.toContain("\\200");
  });

  it("wraps very long audit entry text cleanly without character truncation", async () => {
    const longReason = "Ajuste comercial extraordinario por variación de costos logísticos y promociones regionales del proveedor nacional durante el trimestre";
    const entry = createDummyAuditEntry(1, { reason: longReason });
    const blob = generateAuditPdf([entry], dummyFilters);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const parsed = parsePdfStructure(bytes);

    expect(parsed.xrefValid).toBe(true);
    expect(parsed.rawText).toContain("Ajuste comercial extraordinario");
    expect(parsed.rawText).toContain("proveedor nacional durante el trimestre");
  });

  it("distributes 30 seats with extended reasons without exceeding 64 rendered lines per page", async () => {
    const entries = Array.from({ length: 30 }, (_, i) => createDummyAuditEntry(i + 1, {
      reason: `Motivo extenso ${i + 1} ${"detalle comercial adicional ".repeat(32)}`,
    }));
    const parsed = parsePdfStructure(new Uint8Array(await generateAuditPdf(entries, dummyFilters).arrayBuffer()));
    expect(parsed.xrefValid).toBe(true);
    expect(Math.max(...parsed.pageLineCounts)).toBeLessThanOrEqual(64);
    expect(Math.max(...parsed.pageSeatCounts)).toBeLessThanOrEqual(30);
    for (let i = 1; i <= 30; i++) expect(parsed.rawText).toContain(`aud-${String(i).padStart(4, "0")}`);
    expect(parsed.rawText).toContain("Motivo extenso 30");
  });

  it("continues one exceptionally long seat across pages without truncating its reason", async () => {
    const reason = `Motivo excepcional ${"detalle completo ".repeat(1800)} fin del motivo excepcional`;
    const parsed = parsePdfStructure(new Uint8Array(await generateAuditPdf([
      createDummyAuditEntry(1, { reason }),
    ], dummyFilters).arrayBuffer()));
    expect(parsed.xrefValid).toBe(true);
    expect(parsed.totalPages).toBeGreaterThan(1);
    expect(Math.max(...parsed.pageLineCounts)).toBeLessThanOrEqual(64);
    expect(Math.max(...parsed.pageSeatCounts)).toBeLessThanOrEqual(30);
    expect(parsed.rawText).toContain("aud-0001");
    expect(parsed.rawText.replace(/\s+/g, " ")).toContain("fin del motivo excepcional");
  });
});
