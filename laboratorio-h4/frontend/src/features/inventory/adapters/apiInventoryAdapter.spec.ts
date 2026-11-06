import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InventoryError,
  isInventoryPresentationFailure,
} from "../services/inventoryErrors";
import {
  createTransferReceptionFormSession,
  getConfirmedTransferReceptionAwaitingRefresh,
  getUncertainTransferReception,
  isTransferReceptionStorageBlocked,
  markTransferReceptionConfirmedAwaitingRefreshWithDto,
  rehydrateTransferReceptionsForTesting,
  resetConfirmedTransferReceptionsAwaitingRefresh,
  resetUncertainTransferReceptions,
  setInFlightTransferReception,
  setUncertainTransferReception,
} from "../services/transferReceptionAttempt";
import type {
  ReceiveTransferPayload,
  TransferFiltersQuery,
} from "../services/inventoryTypes";
import {
  createHttpInventoryRepository,
  type InventoryHttpRequest,
  type InventoryHttpTransport,
} from "./apiInventoryAdapter";
import {
  toTransferItem,
  type TransferPresentationResolver,
  type TrasladoInventarioDto,
} from "../services/inventoryMappers";

beforeEach(() => {
  resetUncertainTransferReceptions();
  resetConfirmedTransferReceptionsAwaitingRefresh();
});

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function problemResponse(status: number, code: string): Response {
  return new Response(JSON.stringify({ title: code, status, code }), {
    status,
    headers: { "content-type": "application/problem+json" },
  });
}

function abortError(): Error {
  const error = new Error("La solicitud fue cancelada por el transporte.");
  error.name = "AbortError";
  return error;
}

const UMBRALES = { umbralGlobal: 5, overrides: [{ sku: "SKU-A", umbral: 3 }] };

function traslado(overrides: Record<string, unknown> = {}): TrasladoInventarioDto {
  return {
    traslado_id: "t-1",
    source_incident_id: null,
    sku: "SKU-A",
    quantity_shipped: 10,
    quantity_received: 4,
    missing_quantity: 6,
    source_location_id: "loc-1",
    target_location_id: "loc-2",
    estado: "EN_TRANSITO" as const,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-02T00:00:00.000Z",
    ...overrides,
  } as TrasladoInventarioDto;
}

const PRESENTATION = {
  transferCode: "TR-001",
  productName: "Producto A",
  sourceLocationName: "Almacén Central",
  targetLocationName: "Tienda Norte",
};

// TAC-P1-10: estado previo y estado confirmado deben ser distinguibles. Si
// ambos usaran 4/6, un GET desactualizado sería indistinguible de uno fresco.
const TRASLADO_PREVIO = traslado({
  quantity_received: 0,
  missing_quantity: 10,
  estado: "EN_TRANSITO",
});

const TRASLADO_CONFIRMADO = traslado({
  quantity_received: 4,
  missing_quantity: 6,
  estado: "RECIBIDO_PARCIAL",
});

const RECEPCION_OK = {
  receipt_id: "r-1",
  operation_id: "11111111-1111-4111-8111-111111111111",
  traslado: TRASLADO_CONFIRMADO,
  disposition: "REINGRESAR_DISPONIBLE",
  received_quantity: 4,
  destination_balance: null,
  completed_at: "2026-10-03T00:00:00.000Z",
};

const RECEPCION_PAYLOAD: ReceiveTransferPayload = {
  transferId: "t-1",
  quantityReceived: 4,
  disposition: "REINGRESAR_DISPONIBLE",
  finalReceipt: false,
  operationId: "11111111-1111-4111-8111-111111111111",
  receivedAt: "2026-10-03T00:00:00.000Z",
};

interface SetupOptions {
  withoutResolver?: boolean;
  resolver?: TransferPresentationResolver;
}

function setup(
  respond: (path: string, request: InventoryHttpRequest) => Promise<Response>,
  options: SetupOptions = {},
) {
  const calls: { path: string; request: InventoryHttpRequest }[] = [];
  const request = vi.fn(async (path: string, init: InventoryHttpRequest) => {
    calls.push({ path, request: init });
    return respond(path, init);
  });
  const transport: InventoryHttpTransport = { request };
  const resolver = options.withoutResolver
    ? undefined
    : (options.resolver ?? (async () => PRESENTATION));
  const repository = createHttpInventoryRepository({
    transport,
    ...(resolver ? { resolveTransferPresentation: resolver } : {}),
  });
  return { repository, request, calls };
}

async function rejection(promise: Promise<unknown>): Promise<InventoryError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof InventoryError) return error;
    throw error;
  }
  throw new Error("Se esperaba un rechazo de InventoryError");
}

describe("apiInventoryAdapter — umbrales (mapeo total)", () => {
  it("getThresholds consulta el contract y mapea UmbralInventario", async () => {
    const { repository, calls } = setup(async () => jsonResponse(UMBRALES));
    await expect(repository.getThresholds()).resolves.toEqual({
      globalThreshold: 5,
      skuOverrides: { "SKU-A": 3 },
    });
    expect(calls[0]?.path).toBe("/api/v1/inventario/umbrales");
    expect(calls[0]?.request.method).toBe("GET");
  });

  it("updateGlobalThreshold envía {umbral} y devuelve la configuración", async () => {
    const { repository, calls } = setup(async () =>
      jsonResponse({ umbralGlobal: 7, overrides: [] }),
    );
    await expect(repository.updateGlobalThreshold(7)).resolves.toEqual({
      globalThreshold: 7,
      skuOverrides: {},
    });
    expect(calls[0]?.path).toBe("/api/v1/inventario/umbrales/global");
    expect(calls[0]?.request.method).toBe("PUT");
    expect(JSON.parse(calls[0]?.request.body ?? "{}")).toEqual({ umbral: 7 });
  });

  it("updateSkuThreshold codifica el SKU y envía {umbral}", async () => {
    const { repository, calls } = setup(async () =>
      jsonResponse({ umbralGlobal: 5, overrides: [{ sku: "SKU/A", umbral: 2 }] }),
    );
    await repository.updateSkuThreshold("SKU/A", 2);
    expect(calls[0]?.path).toBe("/api/v1/inventario/umbrales/skus/SKU%2FA");
    expect(JSON.parse(calls[0]?.request.body ?? "{}")).toEqual({ umbral: 2 });
  });

  it("rechaza una respuesta de umbrales incompatible", async () => {
    const { repository } = setup(async () =>
      jsonResponse({ umbralGlobal: -1, overrides: [] }),
    );
    await expect(rejection(repository.getThresholds())).resolves.toMatchObject({
      code: "RESPUESTA_INCOMPATIBLE",
    });
  });

  it("clasifica como RESULTADO_INCIERTO cuando PUT /umbrales/global recibe HTTP 200 pero el DTO no supera toThresholdConfig", async () => {
    const { repository, calls } = setup(async () =>
      jsonResponse({ malformed: true, sinUmbralGlobal: true }, 200),
    );
    await expect(
      rejection(repository.updateGlobalThreshold(8)),
    ).resolves.toMatchObject({
      code: "RESULTADO_INCIERTO",
    });
    expect(calls[0]?.path).toBe("/api/v1/inventario/umbrales/global");
  });

  it("clasifica como RESULTADO_INCIERTO cuando PUT /umbrales/skus recibe HTTP 200 pero el DTO no supera toThresholdConfig", async () => {
    const { repository, calls } = setup(async () =>
      jsonResponse({ malformed: true }, 200),
    );
    await expect(
      rejection(repository.updateSkuThreshold("SKU-1", 8)),
    ).resolves.toMatchObject({
      code: "RESULTADO_INCIERTO",
    });
    expect(calls[0]?.path).toBe("/api/v1/inventario/umbrales/skus/SKU-1");
  });

  it("trata HTTP 408 como RESULTADO_INCIERTO para PUT de umbrales", async () => {
    const { repository, calls } = setup(async () =>
      new Response(JSON.stringify({ code: "TIMEOUT" }), { status: 408 }),
    );
    await expect(
      rejection(repository.updateGlobalThreshold(8)),
    ).resolves.toMatchObject({
      code: "RESULTADO_INCIERTO",
    });
    expect(calls[0]?.path).toBe("/api/v1/inventario/umbrales/global");
  });

  it("trata HTTP 408 como RESULTADO_INCIERTO para POST de recepciones", async () => {
    const { repository, calls } = setup(async () =>
      new Response(JSON.stringify({ code: "TIMEOUT" }), { status: 408 }),
    );
    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({
      code: "RESULTADO_INCIERTO",
    });
    expect(calls[0]?.path).toContain("/recepciones");
    expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");
  });
});

describe("apiInventoryAdapter — traslados (requiere resolvedor autoritativo)", () => {
  it("getTransfers pagina hasta completar el total y mapea la presentación", async () => {
    const { repository, calls } = setup(async (path) => {
      const pagina = new URL(path, "http://local").searchParams.get("pagina");
      return pagina === "1"
        ? jsonResponse({
            items: [traslado({ traslado_id: "t-1" })],
            pagina: 1,
            tamanio: 100,
            total: 2,
          })
        : jsonResponse({
            items: [traslado({ traslado_id: "t-2" })],
            pagina: 2,
            tamanio: 100,
            total: 2,
          });
    });
    const items = await repository.getTransfers();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: "t-1",
      transferCode: "TR-001",
      productName: "Producto A",
      sourceLocationName: "Almacén Central",
      quantityPending: 6,
      status: "EN_TRANSITO",
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.path).toContain("tamanio=100");
    expect(calls[0]?.path).toContain("pagina=1");
    expect(calls[1]?.path).toContain("pagina=2");
  });

  it("getTransfers envía los filtros contractuales estado y target_location_id", async () => {
    const filters: TransferFiltersQuery = {
      status: "EN_TRANSITO",
      targetLocationId: "loc-2",
    };
    const { repository, calls } = setup(async () =>
      jsonResponse({ items: [], pagina: 1, tamanio: 100, total: 0 }),
    );
    await expect(repository.getTransfers(filters)).resolves.toEqual([]);
    expect(calls[0]?.path).toContain("estado=EN_TRANSITO");
    expect(calls[0]?.path).toContain("target_location_id=loc-2");
  });

  it('omite el literal "all" de la UI en lugar de enviarlo al contrato', async () => {
    const { repository, calls } = setup(async () =>
      jsonResponse({ items: [], pagina: 1, tamanio: 100, total: 0 }),
    );
    await expect(
      repository.getTransfers({ status: "all", targetLocationId: "all" }),
    ).resolves.toEqual([]);
    expect(calls[0]?.path).toBe(
      "/api/v1/inventario/traslados?pagina=1&tamanio=100",
    );
  });

  it("getTransfers falla con CONTRATO_BLOQUEADO si falta el resolvedor", async () => {
    const { repository } = setup(
      async () =>
        jsonResponse({
          items: [traslado()],
          pagina: 1,
          tamanio: 100,
          total: 1,
        }),
      { withoutResolver: true },
    );
    await expect(rejection(repository.getTransfers())).resolves.toMatchObject({
      code: "CONTRATO_BLOQUEADO",
    });
  });

  it("getTransfers no necesita resolvedor cuando no hay traslados", async () => {
    const { repository } = setup(
      async () => jsonResponse({ items: [], pagina: 1, tamanio: 100, total: 0 }),
      { withoutResolver: true },
    );
    await expect(repository.getTransfers()).resolves.toEqual([]);
  });

  it("detecta una paginación incoherente sin truncar silenciosamente", async () => {
    const { repository, calls } = setup(async (path) => {
      const pagina = new URL(path, "http://local").searchParams.get("pagina");
      return pagina === "1"
        ? jsonResponse({
            items: [traslado()],
            pagina: 1,
            tamanio: 100,
            total: 5,
          })
        : jsonResponse({ items: [], pagina: 2, tamanio: 100, total: 5 });
    });
    const error = await rejection(repository.getTransfers());
    expect(error.code).toBe("RESPUESTA_INCOMPATIBLE");
    expect(calls).toHaveLength(2);
  });
});

describe("apiInventoryAdapter — recepción de traslado (escritura idempotente)", () => {
  it("envía Idempotency-Key y mapea la respuesta del contract", async () => {
    const { repository, calls } = setup(async () => jsonResponse(RECEPCION_OK));
    await expect(repository.receiveTransfer(RECEPCION_PAYLOAD)).resolves.toMatchObject(
      {
        id: "t-1",
        status: "RECIBIDO_PARCIAL",
        quantityReceived: 4,
      },
    );
    const call = calls[0];
    expect(call?.path).toBe("/api/v1/inventario/traslados/t-1/recepciones");
    expect(call?.request.method).toBe("POST");
    expect(call?.request.headers?.["Idempotency-Key"]).toBe(
      RECEPCION_PAYLOAD.operationId,
    );
    expect(JSON.parse(call?.request.body ?? "{}")).toEqual({
      operation_id: RECEPCION_PAYLOAD.operationId,
      received_quantity: 4,
      disposition: "REINGRESAR_DISPONIBLE",
      final_receipt: false,
      received_at: RECEPCION_PAYLOAD.receivedAt,
    });
  });

  it("bloquea un doble envío concurrente del mismo traslado", async () => {
    let release: (response: Response) => void = () => {};
    const gate = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const { repository } = setup(async () => gate);
    const first = repository.receiveTransfer(RECEPCION_PAYLOAD);
    const second = repository.receiveTransfer(RECEPCION_PAYLOAD);
    await expect(rejection(second)).resolves.toMatchObject({
      code: "OPERACION_EN_CURSO",
    });
    release(jsonResponse(RECEPCION_OK));
    await expect(first).resolves.toMatchObject({ id: "t-1" });
  });

  it("marca resultado incierto ante 5xx y permite reintentar con la misma solicitud inmutable", async () => {
    let attempt = 0;
    const { repository, request } = setup(async () => {
      attempt += 1;
      return attempt === 1
        ? problemResponse(503, "SERVICIO_NO_DISPONIBLE")
        : jsonResponse(RECEPCION_OK);
    });
    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
    expect(request).toHaveBeenCalledTimes(1);
    expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");
    // Misma Idempotency-Key e idéntico payload: el reintento recupera la confirmación.
    await expect(
      repository.receiveTransfer(RECEPCION_PAYLOAD),
    ).resolves.toMatchObject({ id: "t-1", quantityReceived: 4 });
    expect(request).toHaveBeenCalledTimes(2);
    expect(repository.getTransferWriteRecord("t-1")?.state).toBe("RECONCILED");
  });

  it("TAC-P0-02: GET /traslados no libera una operación incierta ni habilita otro operationId sin conciliación concluyente", async () => {
    let receiving = true;
    const { repository, request } = setup(async (path) => {
      if (path.includes("/recepciones")) {
        return receiving
          ? problemResponse(503, "SERVICIO_NO_DISPONIBLE")
          : jsonResponse(RECEPCION_OK);
      }
      return jsonResponse({
        items: [traslado()],
        pagina: 1,
        tamanio: 100,
        total: 1,
      });
    });
    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
    expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");

    const otherIdentity: ReceiveTransferPayload = {
      ...RECEPCION_PAYLOAD,
      operationId: "22222222-2222-4222-8222-222222222222",
    };
    await expect(
      rejection(repository.receiveTransfer(otherIdentity)),
    ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
    expect(request).toHaveBeenCalledTimes(1);

    // La lectura del listado general NO incluye operation_id: el estado sigue UNCERTAIN
    // y se marca como UNVERIFIABLE_BY_LIST_CONTRACT.
    await expect(repository.getTransfers()).resolves.toHaveLength(1);
    expect(repository.getTransferWriteRecord("t-1")).toMatchObject({
      state: "UNCERTAIN",
      reconciliation: "UNVERIFIABLE_BY_LIST_CONTRACT",
    });

    // Un intento con otro operationId sigue bloqueado tras el GET.
    receiving = false;
    await expect(
      rejection(repository.receiveTransfer(otherIdentity)),
    ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
    expect(request).toHaveBeenCalledTimes(2);

    // Solo el reintento idéntico con el mismo operationId y el mismo payload
    // recupera el resultado durable del servidor y reconcilia el estado.
    await expect(
      repository.receiveTransfer(RECEPCION_PAYLOAD),
    ).resolves.toMatchObject({ id: "t-1", quantityReceived: 4 });
    expect(request).toHaveBeenCalledTimes(3);
    expect(repository.getTransferWriteRecord("t-1")).toMatchObject({
      state: "RECONCILED",
      reconciliation: "CONFIRMED_BY_IDEMPOTENT_RETRY",
    });
  });

  it("TAC-P0-01 / TAC-P0-02: rechaza alterar timestamp, nota, cantidad, disposición o cierre final mientras la operación es incierta", async () => {
    const { repository, request } = setup(async () =>
      problemResponse(503, "SERVICIO_NO_DISPONIBLE"),
    );
    const initial: ReceiveTransferPayload = {
      ...RECEPCION_PAYLOAD,
      note: "Caja sellada",
    };
    await expect(
      rejection(repository.receiveTransfer(initial)),
    ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
    expect(request).toHaveBeenCalledTimes(1);

    for (const mutated of [
      { ...initial, receivedAt: "2026-10-03T00:00:05.000Z" },
      { ...initial, note: "Nota modificada" },
      { ...initial, quantityReceived: 3 },
      { ...initial, disposition: "CONFIRMAR_MERMA" as const },
      { ...initial, finalReceipt: true },
    ]) {
      await expect(
        rejection(repository.receiveTransfer(mutated)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
    }
    // Ninguna mutación salió a la red.
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("TAC-P0-01 / TAC-P0-02 (flujo formulario + adaptador + fingerprint backend): commit exitoso con pérdida de respuesta, cierre/reapertura de modal y recuperación idempotente sin segunda recepción", async () => {
    // Simula el cálculo real de fingerprint del backend (`traslados.service.ts`)
    // sobre traslado_id, received_quantity, disposition, final_receipt,
    // received_at, note e intention, más la tabla durable `inventory_operations`.
    const durableOperations = new Map<
      string,
      { fingerprint: string; response: Record<string, unknown> }
    >();
    let persistedReceptionsCount = 0;
    let loseHttpResponseOnce = true;

    const { repository, calls } = setup(async (path, req) => {
      if (path.endsWith("/inventario/traslados?pagina=1&tamanio=100")) {
        return jsonResponse({
          items: [
            traslado({
              quantity_received: persistedReceptionsCount > 0 ? 4 : 0,
              estado:
                persistedReceptionsCount > 0 ? "RECIBIDO_PARCIAL" : "EN_TRANSITO",
            }),
          ],
          pagina: 1,
          tamanio: 100,
          total: 1,
        });
      }

      const idempotencyKey = req.headers?.["Idempotency-Key"] ?? "";
      const dto = JSON.parse(req.body ?? "{}") as {
        operation_id: string;
        received_quantity: number;
        disposition: string;
        final_receipt: boolean;
        received_at: string;
        note?: string;
      };
      const fingerprint = JSON.stringify({
        traslado_id: "t-1",
        received_quantity: dto.received_quantity,
        disposition: dto.disposition,
        final_receipt: dto.final_receipt,
        received_at: dto.received_at,
        note: dto.note ?? null,
        intention: "recepcion_traslado",
      });

      const existing = durableOperations.get(idempotencyKey);
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          return problemResponse(409, "IDEMPOTENCY_CONFLICT");
        }
        return jsonResponse(existing.response);
      }

      // 1.er envío: PostgreSQL confirma la operación y persiste el resultado,
      // pero la respuesta HTTP se pierde antes de llegar al navegador.
      persistedReceptionsCount += 1;
      const storedResponse = {
        ...RECEPCION_OK,
        operation_id: dto.operation_id,
        received_quantity: dto.received_quantity,
      };
      durableOperations.set(idempotencyKey, {
        fingerprint,
        response: storedResponse,
      });

      if (loseHttpResponseOnce) {
        loseHttpResponseOnce = false;
        throw new TypeError("network connection lost after commit");
      }
      return jsonResponse(storedResponse);
    });

    let clockTick = 0;
    const timestamps = [
      "2026-10-20T18:00:00.000Z",
      "2026-10-20T18:01:00.000Z",
      "2026-10-20T18:02:00.000Z",
    ];
    let idTick = 0;
    const ids = [
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    ];

    // Sesión 1 del modal (apertura inicial)
    const modalSession1 = createTransferReceptionFormSession("t-1", {
      createId: () => ids[idTick++]!,
      now: () => timestamps[clockTick++]!,
    });

    const firstAttemptPayload = modalSession1.prepareSubmission({
      quantityReceived: 4,
      disposition: "REINGRESAR_DISPONIBLE",
      finalReceipt: false,
      note: "  Entrega parcial verificada  ",
    });

    const firstError = await rejection(
      repository.receiveTransfer(firstAttemptPayload),
    );
    expect(firstError.code).toBe("RESULTADO_INCIERTO");
    modalSession1.recordFailure(firstAttemptPayload, firstError);

    // La recepción sí se persistió en el backend, pero el cliente quedó en UNCERTAIN.
    expect(persistedReceptionsCount).toBe(1);
    expect(getUncertainTransferReception("t-1")).toEqual(firstAttemptPayload);

    // Caso 4: intento de cambiar cantidad o nota durante la operación incierta.
    expect(() =>
      modalSession1.prepareSubmission({
        quantityReceived: 5,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: false,
        note: "Entrega parcial verificada",
      }),
    ).toThrowError(InventoryError);
    expect(() =>
      modalSession1.prepareSubmission({
        quantityReceived: 4,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: false,
        note: "Otra nota distinta",
      }),
    ).toThrowError(InventoryError);

    // Caso 6: el usuario cierra el modal y recarga la bandeja (`GET /traslados`);
    // la lectura general NO libera la operación incierta.
    await expect(repository.getTransfers()).resolves.toHaveLength(1);
    expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");

    // Caso 5: el usuario vuelve a abrir el modal para `t-1` (nueva instancia de
    // sesión con reloj en T2 y generador listo para otro UUID).
    const modalSession2 = createTransferReceptionFormSession("t-1", {
      createId: () => ids[idTick++]!,
      now: () => timestamps[clockTick++]!,
    });
    expect(modalSession2.getUncertainPayload()).toEqual(firstAttemptPayload);

    // Caso 3: reintento desde el modal reabierto. Reutiliza EXACTAMENTE el
    // mismo operationId, receivedAt y note (idéntico JSON e Idempotency-Key).
    const retryPayload = modalSession2.prepareSubmission({
      quantityReceived: 4,
      disposition: "REINGRESAR_DISPONIBLE",
      finalReceipt: false,
      note: "Entrega parcial verificada",
    });
    expect(retryPayload).toEqual(firstAttemptPayload);

    const recovered = await repository.receiveTransfer(retryPayload);
    modalSession2.recordSuccess(retryPayload);

    expect(recovered).toMatchObject({
      id: "t-1",
      status: "RECIBIDO_PARCIAL",
      quantityReceived: 4,
    });
    // No se registró una segunda recepción en el backend.
    expect(persistedReceptionsCount).toBe(1);
    expect(getUncertainTransferReception("t-1")).toBeNull();
    expect(repository.getTransferWriteRecord("t-1")?.state).toBe("RECONCILED");

    const postCalls = calls.filter((c) => c.request.method === "POST");
    expect(postCalls).toHaveLength(2);
    expect(postCalls[0]?.request.headers?.["Idempotency-Key"]).toBe(
      postCalls[1]?.request.headers?.["Idempotency-Key"],
    );
    expect(postCalls[0]?.request.body).toBe(postCalls[1]?.request.body);
  });

  it("TAC-P0-01: tras un rechazo definitivo (4xx), cambiar cantidad, disposición, cierre final o nota genera una operación nueva con distinto operationId y timestamp", async () => {
    const { repository } = setup(async () =>
      problemResponse(422, "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO"),
    );

    let idIndex = 0;
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ];
    let timeIndex = 0;
    const times = [
      "2026-10-20T19:00:00.000Z",
      "2026-10-20T19:00:10.000Z",
      "2026-10-20T19:00:20.000Z",
    ];

    const session = createTransferReceptionFormSession("t-1", {
      createId: () => ids[idIndex++]!,
      now: () => times[timeIndex++]!,
    });

    const first = session.prepareSubmission({
      quantityReceived: 10,
      disposition: "REINGRESAR_DISPONIBLE",
      finalReceipt: true,
      note: "Nota A",
    });
    const err = await rejection(repository.receiveTransfer(first));
    expect(err.code).toBe("CANTIDAD_RECIBIDA_EXCEDE_TRASLADO");
    session.recordFailure(first, err);

    // Como fue 422 definitivo, el traslado NO quedó bloqueado en UNCERTAIN.
    expect(repository.getTransferWriteRecord("t-1")).toBeNull();

    // Si reintenta sin tocar ningún campo (misma nota, cantidad, etc.), conserva snapshot.
    const sameRetry = session.prepareSubmission({
      quantityReceived: 10,
      disposition: "REINGRESAR_DISPONIBLE",
      finalReceipt: true,
      note: "Nota A",
    });
    expect(sameRetry.operationId).toBe(first.operationId);
    expect(sameRetry.receivedAt).toBe(first.receivedAt);

    // Si cambia SOLO la nota, NO se presenta como reintento de la misma operación.
    const changedNote = session.prepareSubmission({
      quantityReceived: 10,
      disposition: "REINGRESAR_DISPONIBLE",
      finalReceipt: true,
      note: "Nota B corregida",
    });
    expect(changedNote.operationId).toBe(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(changedNote.receivedAt).toBe("2026-10-20T19:00:10.000Z");
  });

  it("Caso 8: rechazos 401, 403, 409 y 422 en receiveTransfer no dejan bloqueo incierto ni mutaciones adicionales", async () => {
    for (const [status, code, expected] of [
      [401, "TOKEN_INVALIDO", "NO_AUTENTICADO"],
      [403, "SCOPE_INSUFICIENTE", "SIN_PERMISO"],
      [409, "TRASLADO_NO_RECIBIBLE", "TRASLADO_NO_RECIBIBLE"],
      [409, "IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_CONFLICT"],
      [422, "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO", "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO"],
    ] as const) {
      const { repository, calls } = setup(async () =>
        problemResponse(status, code),
      );
      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: expected });
      expect(calls).toHaveLength(1);
      expect(repository.getTransferWriteRecord("t-1")).toBeNull();
      expect(getUncertainTransferReception("t-1")).toBeNull();
    }
  });

  it("traduce 409 TRASLADO_NO_RECIBIBLE e IDEMPOTENCY_CONFLICT", async () => {
    const noRecibible = setup(async () =>
      problemResponse(409, "TRASLADO_NO_RECIBIBLE"),
    );
    await expect(
      rejection(noRecibible.repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "TRASLADO_NO_RECIBIBLE" });

    const idempotencia = setup(async () =>
      problemResponse(409, "IDEMPOTENCY_CONFLICT"),
    );
    await expect(
      rejection(idempotencia.repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("traduce 422 CANTIDAD_RECIBIDA_EXCEDE_TRASLADO", async () => {
    const { repository } = setup(async () =>
      problemResponse(422, "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO"),
    );
    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO" });
  });

  it("traduce 401 y 403 del provider", async () => {
    const unauthorized = setup(async () =>
      problemResponse(401, "TOKEN_INVALIDO"),
    );
    await expect(
      rejection(unauthorized.repository.getThresholds()),
    ).resolves.toMatchObject({ code: "NO_AUTENTICADO" });

    const forbidden = setup(async () =>
      problemResponse(403, "SCOPE_INSUFICIENTE"),
    );
    await expect(
      rejection(forbidden.repository.getThresholds()),
    ).resolves.toMatchObject({ code: "SIN_PERMISO" });
  });

  it("marca RESULTADO_INCIERTO si la recepción se confirmó con respuesta ilegible", async () => {
    const { repository } = setup(
      async () =>
        new Response("no-json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
  });

  it("TAC-P0-05: registra la confirmación antes del enriquecimiento; un resolvedor caído no reabre la operación ni repite el POST", async () => {
    const { repository, calls } = setup(async () => jsonResponse(RECEPCION_OK), {
      resolver: async () => {
        throw new InventoryError("CONTRATO_BLOQUEADO", "resolvedor de presentación caído");
      },
    });
    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });

    // La mutación ya está confirmada y reconciliada, pese al fallo del resolvedor.
    expect(repository.getTransferWriteRecord("t-1")?.state).toBe("RECONCILED");
    expect(getUncertainTransferReception("t-1")).toBeNull();

    // El reintento con la misma identidad NO repite el POST (devuelve el cache).
    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });
    expect(calls).toHaveLength(1);
  });

  it("TAC-P0-05: HTTP 200 con DTO de confirmación incompatible preserva UNCERTAIN (no libera la operación)", async () => {
    // Falta `operation_id` y `traslado`: el DTO no permite determinar el resultado.
    const { repository, calls } = setup(async () =>
      jsonResponse({ receipt_id: "r-1", disposition: "REINGRESAR_DISPONIBLE", received_quantity: 4, completed_at: "2026-10-03T00:00:00.000Z" }),
    );
    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "RESPUESTA_INCOMPATIBLE" });
    expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");
    expect(getUncertainTransferReception("t-1")).not.toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("TAC-P0-08: POST 200 confirmado + fallo de presentación no permite una segunda recepción ni repite el POST", async () => {
    let postCount = 0;
    let resolverDown = true;
    const { repository, calls } = setup(
      async (path, req) => {
        if (path.includes("/recepciones")) {
          postCount += 1;
          const body = JSON.parse(req.body ?? "{}") as {
            operation_id: string;
          };
          return jsonResponse({
            ...RECEPCION_OK,
            operation_id: body.operation_id,
          });
        }
        return jsonResponse({
          items: [TRASLADO_CONFIRMADO],
          pagina: 1,
          tamanio: 100,
          total: 1,
        });
      },
      {
        resolver: async () => {
          if (resolverDown) {
            throw new InventoryError(
              "CONTRATO_BLOQUEADO",
              "Catálogo/ubicaciones no disponible",
            );
          }
          return PRESENTATION;
        },
      },
    );

    let idTick = 0;
    const ids = [
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    ];
    const session = createTransferReceptionFormSession("t-1", {
      createId: () => ids[idTick++]!,
      now: () => "2026-10-20T18:00:00.000Z",
    });
    const payload = session.prepareSubmission({
      quantityReceived: 4,
      disposition: "REINGRESAR_DISPONIBLE",
      finalReceipt: false,
      note: "Entrega parcial verificada",
    });

    // POST 200 válido -> operación confirmada -> resolveTransferPresentation falla.
    const error = await rejection(repository.receiveTransfer(payload));
    expect(isInventoryPresentationFailure(error)).toBe(true);
    expect(error.code).toBe("CONTRATO_BLOQUEADO");
    expect(error.message).toContain("fue registrada");

    // La mutación quedó confirmada pese al fallo de presentación.
    expect(postCount).toBe(1);
    expect(repository.getTransferWriteRecord("t-1")?.state).toBe("RECONCILED");
    expect(repository.getTransferWriteRecord("t-1")?.presentationRefresh).toBe(
      "AWAITING",
    );
    expect(getUncertainTransferReception("t-1")).toBeNull();

    // El formulario conoce la confirmación y no puede generar otra intención
    // desde el estado desactualizado.
    session.recordConfirmed(payload);
    expect(() =>
      session.prepareSubmission({
        quantityReceived: 5,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: false,
        note: "Entrega parcial verificada",
      }),
    ).toThrowError(InventoryError);
    expect(() =>
      session.prepareSubmission({
        quantityReceived: 4,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: false,
        note: "Otra nota distinta",
      }),
    ).toThrowError(InventoryError);

    // Un reintento idéntico devuelve el cache: no hay una segunda recepción ni
    // stock acreditado de nuevo.
    await expect(
      rejection(repository.receiveTransfer(payload)),
    ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });
    expect(postCount).toBe(1);
    expect(calls.filter((c) => c.request.method === "POST")).toHaveLength(1);

    // Tras un listado coherente (vista actualizada), se habilita una nueva
    // intención legítima con otro operationId.
    resolverDown = false;
    await expect(repository.getTransfers()).resolves.toHaveLength(1);
    expect(getConfirmedTransferReceptionAwaitingRefresh("t-1")).toBeNull();
    expect(repository.getTransferWriteRecord("t-1")?.presentationRefresh).toBe(
      "REFRESHED",
    );
    const next = session.prepareSubmission({
      quantityReceived: 3,
      disposition: "REINGRESAR_DISPONIBLE",
      finalReceipt: true,
      note: "",
    });
    expect(next.operationId).toBe(ids[1]);
    expect(next.operationId).not.toBe(payload.operationId);
  });

  it("TAC-P1-10: un GET presentable con el saldo anterior no libera el bloqueo", async () => {
    let postCount = 0;
    let resolverDown = true;
    const { repository, calls } = setup(
      async (path, req) => {
        if (path.includes("/recepciones")) {
          postCount += 1;
          const body = JSON.parse(req.body ?? "{}") as {
            operation_id: string;
          };
          return jsonResponse({
            ...RECEPCION_OK,
            operation_id: body.operation_id,
          });
        }
        return jsonResponse({
          items: [TRASLADO_PREVIO],
          pagina: 1,
          tamanio: 100,
          total: 1,
        });
      },
      {
        resolver: async () => {
          if (resolverDown) {
            throw new InventoryError(
              "CONTRATO_BLOQUEADO",
              "Catálogo/ubicaciones no disponible",
            );
          }
          return PRESENTATION;
        },
      },
    );

    const session = createTransferReceptionFormSession("t-1", {
      createId: () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      now: () => "2026-10-20T18:00:00.000Z",
    });

    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });
    session.recordConfirmed(RECEPCION_PAYLOAD);

    // El GET es válido y presentable, pero devuelve el saldo previo (0/10).
    resolverDown = false;
    await expect(repository.getTransfers()).resolves.toHaveLength(1);

    expect(getConfirmedTransferReceptionAwaitingRefresh("t-1")).not.toBeNull();
    expect(repository.getTransferWriteRecord("t-1")?.presentationRefresh).toBe(
      "UNVERIFIABLE_BY_AGGREGATE",
    );
    expect(() =>
      session.prepareSubmission({
        quantityReceived: 3,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        note: "",
      }),
    ).toThrowError(InventoryError);

    // Un reintento idéntico devuelve el caché; no hay segundo POST.
    await expect(
      repository.receiveTransfer(RECEPCION_PAYLOAD),
    ).resolves.toMatchObject({ id: "t-1", quantityReceived: 4 });
    expect(postCount).toBe(1);
    expect(calls.filter((c) => c.request.method === "POST")).toHaveLength(1);
  });

  it("TAC-P1-10: un GET con el agregado confirmado libera el bloqueo y permite una nueva intención", async () => {
    let postCount = 0;
    let resolverDown = true;
    const { repository, calls } = setup(
      async (path, req) => {
        if (path.includes("/recepciones")) {
          postCount += 1;
          const body = JSON.parse(req.body ?? "{}") as {
            operation_id: string;
          };
          return jsonResponse({
            ...RECEPCION_OK,
            operation_id: body.operation_id,
          });
        }
        return jsonResponse({
          items: [TRASLADO_CONFIRMADO],
          pagina: 1,
          tamanio: 100,
          total: 1,
        });
      },
      {
        resolver: async () => {
          if (resolverDown) {
            throw new InventoryError(
              "CONTRATO_BLOQUEADO",
              "Catálogo/ubicaciones no disponible",
            );
          }
          return PRESENTATION;
        },
      },
    );

    const session = createTransferReceptionFormSession("t-1", {
      createId: () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      now: () => "2026-10-20T18:00:00.000Z",
    });

    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });
    session.recordConfirmed(RECEPCION_PAYLOAD);

    resolverDown = false;
    await expect(repository.getTransfers()).resolves.toHaveLength(1);

    expect(getConfirmedTransferReceptionAwaitingRefresh("t-1")).toBeNull();
    expect(repository.getTransferWriteRecord("t-1")?.presentationRefresh).toBe(
      "REFRESHED",
    );
    const next = session.prepareSubmission({
      quantityReceived: 3,
      disposition: "REINGRESAR_DISPONIBLE",
      finalReceipt: true,
      note: "",
    });
    expect(next.operationId).not.toBe(RECEPCION_PAYLOAD.operationId);
    expect(postCount).toBe(1);
    expect(calls.filter((c) => c.request.method === "POST")).toHaveLength(1);
  });

  it("TAC-P1-10: si el GET falla, el bloqueo permanece aunque el resolvedor esté disponible", async () => {
    let postCount = 0;
    let resolverDown = true;
    const { repository } = setup(
      async (path, req) => {
        if (path.includes("/recepciones")) {
          postCount += 1;
          const body = JSON.parse(req.body ?? "{}") as {
            operation_id: string;
          };
          return jsonResponse({
            ...RECEPCION_OK,
            operation_id: body.operation_id,
          });
        }
        return problemResponse(503, "SERVICIO_NO_DISPONIBLE");
      },
      {
        resolver: async () => {
          if (resolverDown) {
            throw new InventoryError(
              "CONTRATO_BLOQUEADO",
              "Catálogo/ubicaciones no disponible",
            );
          }
          return PRESENTATION;
        },
      },
    );

    const session = createTransferReceptionFormSession("t-1", {
      createId: () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      now: () => "2026-10-20T18:00:00.000Z",
    });

    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });
    session.recordConfirmed(RECEPCION_PAYLOAD);

    resolverDown = false;
    await expect(rejection(repository.getTransfers())).resolves.toMatchObject({
      code: "SERVICIO_NO_DISPONIBLE",
    });

    expect(getConfirmedTransferReceptionAwaitingRefresh("t-1")).not.toBeNull();
    expect(repository.getTransferWriteRecord("t-1")?.presentationRefresh).toBe(
      "AWAITING",
    );
    expect(() =>
      session.prepareSubmission({
        quantityReceived: 3,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        note: "",
      }),
    ).toThrowError(InventoryError);
    expect(postCount).toBe(1);
  });

  it("TAC-P1-10: si el resolvedor falla, el bloqueo permanece aunque el GET sea válido", async () => {
    let postCount = 0;
    const { repository } = setup(
      async (path, req) => {
        if (path.includes("/recepciones")) {
          postCount += 1;
          const body = JSON.parse(req.body ?? "{}") as {
            operation_id: string;
          };
          return jsonResponse({
            ...RECEPCION_OK,
            operation_id: body.operation_id,
          });
        }
        return jsonResponse({
          items: [TRASLADO_CONFIRMADO],
          pagina: 1,
          tamanio: 100,
          total: 1,
        });
      },
      {
        resolver: async () => {
          throw new InventoryError(
            "CONTRATO_BLOQUEADO",
            "Catálogo/ubicaciones no disponible",
          );
        },
      },
    );

    const session = createTransferReceptionFormSession("t-1", {
      createId: () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      now: () => "2026-10-20T18:00:00.000Z",
    });

    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });
    session.recordConfirmed(RECEPCION_PAYLOAD);

    await expect(rejection(repository.getTransfers())).resolves.toMatchObject({
      code: "CONTRATO_BLOQUEADO",
    });

    expect(getConfirmedTransferReceptionAwaitingRefresh("t-1")).not.toBeNull();
    expect(repository.getTransferWriteRecord("t-1")?.presentationRefresh).toBe(
      "AWAITING",
    );
    expect(() =>
      session.prepareSubmission({
        quantityReceived: 3,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        note: "",
      }),
    ).toThrowError(InventoryError);
    expect(postCount).toBe(1);
  });

  it("TAC-P1-10: recordSuccess no libera el bloqueo; solo un listado coherente lo hace", () => {
    const session = createTransferReceptionFormSession("t-1", {
      createId: () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      now: () => "2026-10-20T18:00:00.000Z",
    });

    session.recordConfirmed(RECEPCION_PAYLOAD);
    expect(getConfirmedTransferReceptionAwaitingRefresh("t-1")).not.toBeNull();

    // Simula el éxito de un reintento cacheado: no es un listado.
    session.recordSuccess(RECEPCION_PAYLOAD);
    expect(getConfirmedTransferReceptionAwaitingRefresh("t-1")).not.toBeNull();
    expect(() =>
      session.prepareSubmission({
        quantityReceived: 3,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        note: "",
      }),
    ).toThrowError(InventoryError);
  });

  describe("TAC-P0-09: identidad del caché de confirmaciones", () => {
    it("1/6: mismo operationId y payload idéntico devuelve la confirmación cacheada sin repetir el POST", async () => {
      const { repository, calls } = setup(async () =>
        jsonResponse(RECEPCION_OK),
      );

      await expect(
        repository.receiveTransfer(RECEPCION_PAYLOAD),
      ).resolves.toMatchObject({ id: "t-1", quantityReceived: 4 });
      await expect(
        repository.receiveTransfer(RECEPCION_PAYLOAD),
      ).resolves.toMatchObject({ id: "t-1", quantityReceived: 4 });

      // El resultado viene del caché: una sola petición al contrato.
      expect(calls).toHaveLength(1);
    });

    it("2/6: la misma identidad con distinta cantidad se rechaza como conflicto sin salir a la red", async () => {
      const { repository, calls } = setup(async () =>
        jsonResponse(RECEPCION_OK),
      );
      await expect(
        repository.receiveTransfer(RECEPCION_PAYLOAD),
      ).resolves.toMatchObject({ id: "t-1" });

      await expect(
        rejection(
          repository.receiveTransfer({
            ...RECEPCION_PAYLOAD,
            quantityReceived: 3,
          }),
        ),
      ).resolves.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });

      // No se devuelve el resultado anterior ni se emite un segundo POST.
      expect(calls).toHaveLength(1);
    });

    it("3/6: la misma identidad con distinta nota se rechaza como conflicto sin salir a la red", async () => {
      const { repository, calls } = setup(async () =>
        jsonResponse(RECEPCION_OK),
      );
      await expect(
        repository.receiveTransfer(RECEPCION_PAYLOAD),
      ).resolves.toMatchObject({ id: "t-1" });

      await expect(
        rejection(
          repository.receiveTransfer({
            ...RECEPCION_PAYLOAD,
            note: "Nota distinta",
          }),
        ),
      ).resolves.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });

      expect(calls).toHaveLength(1);
    });

    it("4/6: la misma identidad con distinta disposición, cierre final, fecha o traslado se rechaza como conflicto", async () => {
      const { repository, calls } = setup(async () =>
        jsonResponse(RECEPCION_OK),
      );
      await expect(
        repository.receiveTransfer(RECEPCION_PAYLOAD),
      ).resolves.toMatchObject({ id: "t-1" });

      const mutated: ReceiveTransferPayload[] = [
        { ...RECEPCION_PAYLOAD, disposition: "CONFIRMAR_MERMA" },
        { ...RECEPCION_PAYLOAD, finalReceipt: true },
        { ...RECEPCION_PAYLOAD, receivedAt: "2026-10-03T00:00:05.000Z" },
        { ...RECEPCION_PAYLOAD, transferId: "t-2" },
      ];
      for (const payload of mutated) {
        await expect(
          rejection(repository.receiveTransfer(payload)),
        ).resolves.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
      }

      // Ninguna intención distinta salió a la red.
      expect(calls).toHaveLength(1);
    });

    it("5/6: un 200 con operation_id ajeno no declara la confirmación y preserva UNCERTAIN", async () => {
      const { repository, calls } = setup(async () =>
        jsonResponse({
          ...RECEPCION_OK,
          operation_id: "99999999-9999-4999-8999-999999999999",
        }),
      );

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESPUESTA_INCOMPATIBLE" });

      expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");
      expect(getUncertainTransferReception("t-1")).not.toBeNull();
      expect(calls).toHaveLength(1);
    });

    it("6/6: un 200 con traslado_id ajeno no declara la confirmación y preserva UNCERTAIN", async () => {
      const { repository, calls } = setup(async () =>
        jsonResponse({
          ...RECEPCION_OK,
          traslado: traslado({ traslado_id: "t-9" }),
        }),
      );

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESPUESTA_INCOMPATIBLE" });

      expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");
      expect(getUncertainTransferReception("t-1")).not.toBeNull();
      expect(calls).toHaveLength(1);
    });
  });

  it("TAC-P1-07: en UNCERTAIN, ningún error del reintento (400/401/403/404/409/422/5xx/red/DTO inválido) libera el bloqueo", async () => {
    const retryOutcomes: (() => Promise<Response> | Response)[] = [
      () => problemResponse(400, "VALIDACION"),
      () => problemResponse(401, "TOKEN_INVALIDO"),
      () => problemResponse(403, "SCOPE_INSUFICIENTE"),
      () => problemResponse(404, "TRASLADO_NO_ENCONTRADO"),
      () => problemResponse(409, "IDEMPOTENCY_CONFLICT"),
      () => problemResponse(422, "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO"),
      () => problemResponse(503, "SERVICIO_NO_DISPONIBLE"),
      () => {
        throw new TypeError("network lost");
      },
      () =>
        new Response("no-json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      () =>
        jsonResponse({
          receipt_id: "r-1",
          disposition: "REINGRESAR_DISPONIBLE",
          received_quantity: 4,
          completed_at: "2026-10-03T00:00:00.000Z",
        }),
    ];

    for (const outcome of retryOutcomes) {
      let attempt = 0;
      const { repository } = setup(async () => {
        attempt += 1;
        if (attempt === 1) return problemResponse(503, "SERVICIO_NO_DISPONIBLE");
        return outcome();
      });

      // Primer intento queda UNCERTAIN.
      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
      expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");

      // Reintento con la MISMA solicitud inmutable: cualquier desenlace conserva UNCERTAIN.
      const retryError = await rejection(
        repository.receiveTransfer(RECEPCION_PAYLOAD),
      );
      expect(retryError).toBeInstanceOf(InventoryError);
      expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");
      expect(getUncertainTransferReception("t-1")).not.toBeNull();
    }
  });

  it("TAC-P1-07: estando en UNCERTAIN, solo un 200 con DTO válido transiciona a RECONCILED", async () => {
    let attempt = 0;
    const { repository, calls } = setup(async () => {
      attempt += 1;
      if (attempt === 1) return problemResponse(503, "SERVICIO_NO_DISPONIBLE");
      return jsonResponse(RECEPCION_OK);
    });
    await expect(
      rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
    ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
    expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");

    await expect(
      repository.receiveTransfer(RECEPCION_PAYLOAD),
    ).resolves.toMatchObject({ id: "t-1", quantityReceived: 4 });
    expect(repository.getTransferWriteRecord("t-1")).toMatchObject({
      state: "RECONCILED",
      reconciliation: "CONFIRMED_BY_IDEMPOTENT_RETRY",
    });
    expect(calls).toHaveLength(2);
  });

  describe("TAC-P0-06: rehidratación tras recarga del navegador conservando sessionStorage", () => {
    function createMockStorage(): Storage {
      const values = new Map<string, string>();
      return {
        get length() {
          return values.size;
        },
        clear() {
          values.clear();
        },
        getItem(key: string) {
          return values.has(key) ? values.get(key)! : null;
        },
        key(index: number) {
          return [...values.keys()][index] ?? null;
        },
        removeItem(key: string) {
          values.delete(key);
        },
        setItem(key: string, value: string) {
          values.set(key, value);
        },
      };
    }

    it("TAC-P0-06-R1: una operación IN_FLIGHT se rehidrata conservadoramente como UNCERTAIN tras recarga", async () => {
      const storage = createMockStorage();
      globalThis.sessionStorage = storage;
      resetUncertainTransferReceptions();

      // Se persiste un intento IN_FLIGHT antes del envío
      setInFlightTransferReception(RECEPCION_PAYLOAD);

      // Simula recarga del navegador: se conserva sessionStorage y se rehidrata el módulo/repositorio
      rehydrateTransferReceptionsForTesting();

      const { repository: repo2, calls } = setup(async () => jsonResponse(RECEPCION_OK));
      const record = repo2.getTransferWriteRecord("t-1");
      expect(record?.state).toBe("UNCERTAIN");
      expect(record?.payload.operationId).toBe(RECEPCION_PAYLOAD.operationId);
      expect(record?.payload.receivedAt).toBe(RECEPCION_PAYLOAD.receivedAt);
      expect(record?.payload.quantityReceived).toBe(RECEPCION_PAYLOAD.quantityReceived);
      expect(record?.payload.disposition).toBe(RECEPCION_PAYLOAD.disposition);
      expect(record?.payload.finalReceipt).toBe(RECEPCION_PAYLOAD.finalReceipt);

      // Formulario recupera la operación incierta sin generar nuevo operationId
      const formSession = createTransferReceptionFormSession("t-1");
      const restored = formSession.getUncertainPayload();
      expect(restored?.operationId).toBe(RECEPCION_PAYLOAD.operationId);

      // Reintento idéntico reutiliza exactamente el mismo operationId
      await repo2.receiveTransfer(RECEPCION_PAYLOAD);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.request.headers?.["Idempotency-Key"]).toBe(RECEPCION_PAYLOAD.operationId);

      delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    });

    it("TAC-P0-06-R2: una operación UNCERTAIN persiste tras recarga con snapshot inmutable exacto", async () => {
      const storage = createMockStorage();
      globalThis.sessionStorage = storage;
      resetUncertainTransferReceptions();

      let postAttempts = 0;
      const { repository } = setup(async () => {
        postAttempts += 1;
        return problemResponse(503, "SERVICIO_NO_DISPONIBLE");
      });

      const payloadWithNote: ReceiveTransferPayload = {
        ...RECEPCION_PAYLOAD,
        note: "Nota original verificable",
      };

      await expect(
        rejection(repository.receiveTransfer(payloadWithNote)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
      expect(postAttempts).toBe(1);

      // Simula recarga del navegador
      rehydrateTransferReceptionsForTesting();

      const { repository: repo2, calls: calls2 } = setup(async () => jsonResponse(RECEPCION_OK));
      const record = repo2.getTransferWriteRecord("t-1");
      expect(record?.state).toBe("UNCERTAIN");
      expect(record?.payload.operationId).toBe(payloadWithNote.operationId);
      expect(record?.payload.receivedAt).toBe(payloadWithNote.receivedAt);
      expect(record?.payload.note).toBe("Nota original verificable");
      expect(record?.payload.quantityReceived).toBe(4);

      // Modificar cantidad o nota se rechaza con RESULTADO_INCIERTO sin emitir POST
      const alteredSession = createTransferReceptionFormSession("t-1");
      expect(() =>
        alteredSession.prepareSubmission({
          quantityReceived: 8,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: false,
          note: "Nota original verificable",
        }),
      ).toThrow(InventoryError);
      expect(calls2).toHaveLength(0);

      // Reintento idéntico confirma la operación sin duplicar POST
      await repo2.receiveTransfer(payloadWithNote);
      expect(calls2).toHaveLength(1);
      expect(calls2[0]?.request.headers?.["Idempotency-Key"]).toBe(payloadWithNote.operationId);

      delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    });

    it("TAC-P0-06-R3: una confirmación RECONCILED con refresco pendiente persiste y no duplica POST", async () => {
      const storage = createMockStorage();
      globalThis.sessionStorage = storage;
      resetUncertainTransferReceptions();

      markTransferReceptionConfirmedAwaitingRefreshWithDto(RECEPCION_PAYLOAD, TRASLADO_CONFIRMADO);

      // Simula recarga del navegador
      rehydrateTransferReceptionsForTesting();

      const { repository: repo2, calls: calls2 } = setup(async () => {
        throw new Error("No debe llamar a transporte");
      });

      const record = repo2.getTransferWriteRecord("t-1");
      expect(record?.state).toBe("RECONCILED");
      expect(record?.presentationRefresh).toBe("AWAITING");
      expect(record?.payload.operationId).toBe(RECEPCION_PAYLOAD.operationId);

      // La solicitud con la misma identidad devuelve el DTO confirmado sin salir a la red
      const result = await repo2.receiveTransfer(RECEPCION_PAYLOAD);
      expect(result.id).toBe("t-1");
      expect(calls2).toHaveLength(0);

      // Alterar la intención se rechaza como conflicto de idempotencia sin salir a la red
      await expect(
        rejection(repo2.receiveTransfer({ ...RECEPCION_PAYLOAD, quantityReceived: 7 })),
      ).resolves.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
      expect(calls2).toHaveLength(0);

      delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    });

    it("P0: fallo de sessionStorage.setItem únicamente durante la confirmación tras 200 conserva el bloqueo y evita segundo POST", async () => {
      const storage = createMockStorage();
      globalThis.sessionStorage = storage;
      resetUncertainTransferReceptions();

      // Permitir la primera escritura (IN_FLIGHT antes del POST),
      // pero hacer que falle la segunda escritura (confirmación tras 200).
      let writeCount = 0;
      const originalSetItem = storage.setItem;
      storage.setItem = (key: string, value: string) => {
        writeCount += 1;
        if (writeCount === 1) {
          originalSetItem(key, value);
        } else {
          throw new Error("QuotaExceededError durante confirmación");
        }
      };

      const { repository, calls } = setup(async () => jsonResponse(RECEPCION_OK));

      // 1. La llamada HTTP recibe 200 y completa sin rechazar la operación autoritativa
      const result = await repository.receiveTransfer(RECEPCION_PAYLOAD);
      expect(result.id).toBe("t-1");
      expect(calls).toHaveLength(1);

      // 2. En storage no quedó un estado vacío: conserva el snapshot IN_FLIGHT previo
      const rawInStorage = storage.getItem("inventory.transferReceptionAttempts.v1");
      expect(rawInStorage).not.toBeNull();
      expect(rawInStorage).toContain(RECEPCION_PAYLOAD.operationId);

      // Restaurar setItem para la fase de recarga
      storage.setItem = originalSetItem;

      // 3. Simula recarga de pestaña (reload)
      rehydrateTransferReceptionsForTesting();

      const { repository: repo2, calls: calls2 } = setup(async () => jsonResponse(RECEPCION_OK));
      const record = repo2.getTransferWriteRecord("t-1");

      // La recarga conserva el bloqueo en UNCERTAIN con el operationId y payload originales
      expect(record?.state).toBe("UNCERTAIN");
      expect(record?.payload.operationId).toBe(RECEPCION_PAYLOAD.operationId);
      expect(record?.payload.quantityReceived).toBe(RECEPCION_PAYLOAD.quantityReceived);

      // 4. Intentar una nueva intención con otro operationId se bloquea de inmediato
      const alteredSession = createTransferReceptionFormSession("t-1");
      expect(() =>
        alteredSession.prepareSubmission({
          quantityReceived: 8,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: false,
        }),
      ).toThrow(InventoryError);

      await expect(
        rejection(
          repo2.receiveTransfer({
            ...RECEPCION_PAYLOAD,
            operationId: "op-divergent-new",
          }),
        ),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
      // Nunca aparece un segundo POST con otro operationId
      expect(calls2).toHaveLength(0);

      delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    });
  });

  describe("TAC-P0-11: aborto del transporte durante la recepción", () => {
    it("TAC-T11-01: un AbortError posterior al despacho conserva UNCERTAIN y el payload inmutable", async () => {
      let postsProcessedByServer = 0;
      const { repository, calls } = setup(async () => {
        postsProcessedByServer += 1;
        throw abortError();
      });

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });

      expect(postsProcessedByServer).toBe(1);
      expect(calls).toHaveLength(1);
      expect(repository.getTransferWriteRecord("t-1")).toMatchObject({
        state: "UNCERTAIN",
        payload: RECEPCION_PAYLOAD,
      });
      expect(getUncertainTransferReception("t-1")).toEqual(RECEPCION_PAYLOAD);
    });

    it("TAC-T11-02: tras el AbortError, otra cantidad, nota u operationId se rechaza sin segundo POST", async () => {
      const { repository, calls } = setup(async () => {
        throw abortError();
      });

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });

      const session = createTransferReceptionFormSession("t-1");
      expect(() =>
        session.prepareSubmission({
          quantityReceived: 3,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: false,
          note: "",
        }),
      ).toThrowError(InventoryError);

      await expect(
        rejection(
          repository.receiveTransfer({
            ...RECEPCION_PAYLOAD,
            operationId: "22222222-2222-4222-8222-222222222222",
          }),
        ),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
      await expect(
        rejection(
          repository.receiveTransfer({
            ...RECEPCION_PAYLOAD,
            note: "Nota distinta",
          }),
        ),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });

      expect(calls).toHaveLength(1);
    });

    it("TAC-T11-03: reintentar el payload original recupera la confirmación sin duplicar el efecto", async () => {
      const durableOperations = new Map<string, number>();
      let attempt = 0;
      const { repository, calls } = setup(async (_path, request) => {
        attempt += 1;
        const key = request.headers?.["Idempotency-Key"] ?? "";
        if (!durableOperations.has(key)) durableOperations.set(key, 1);
        if (attempt === 1) throw abortError();
        return jsonResponse(RECEPCION_OK);
      });

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
      expect(durableOperations.get(RECEPCION_PAYLOAD.operationId)).toBe(1);

      await expect(
        repository.receiveTransfer(RECEPCION_PAYLOAD),
      ).resolves.toMatchObject({ id: "t-1", quantityReceived: 4 });

      expect(attempt).toBe(2);
      expect(durableOperations.get(RECEPCION_PAYLOAD.operationId)).toBe(1);
      expect(calls).toHaveLength(2);
      expect(calls[0]?.request.headers?.["Idempotency-Key"]).toBe(
        RECEPCION_PAYLOAD.operationId,
      );
      expect(calls[1]?.request.headers?.["Idempotency-Key"]).toBe(
        RECEPCION_PAYLOAD.operationId,
      );
      expect(calls[0]?.request.body).toBe(calls[1]?.request.body);
      expect(repository.getTransferWriteRecord("t-1")).toMatchObject({
        state: "RECONCILED",
      });
      expect(getUncertainTransferReception("t-1")).toBeNull();
    });

    it("TAC-T11-04: una cancelación anterior al despacho no crea UNCERTAIN", async () => {
      const controller = new AbortController();
      controller.abort();
      const { repository, request } = setup(async () =>
        jsonResponse(RECEPCION_OK),
      );

      const cancellation = await repository
        .receiveTransfer(RECEPCION_PAYLOAD, controller.signal)
        .then(
          () => null,
          (error: unknown) => error,
        );

      expect(cancellation).toBeInstanceOf(Error);
      expect((cancellation as Error).name).toBe("AbortError");
      expect(request).not.toHaveBeenCalled();
      expect(repository.getTransferWriteRecord("t-1")).toBeNull();
      expect(getUncertainTransferReception("t-1")).toBeNull();
    });

    it("TAC-T11-05: cerrar y reabrir el formulario conserva el intento y bloquea cambios", async () => {
      const { repository, calls } = setup(async () => {
        throw abortError();
      });

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });

      const reopenedSession = createTransferReceptionFormSession("t-1");
      expect(reopenedSession.getUncertainPayload()).toEqual(
        RECEPCION_PAYLOAD,
      );
      expect(() =>
        reopenedSession.prepareSubmission({
          quantityReceived: 3,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: false,
          note: "",
        }),
      ).toThrowError(InventoryError);
      expect(
        reopenedSession.prepareSubmission({
          quantityReceived: 4,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: false,
          note: "",
        }),
      ).toEqual(RECEPCION_PAYLOAD);
      expect(calls).toHaveLength(1);
    });
  });

  describe("TAC-P0-12: excepciones tipadas del transporte durante la recepción", () => {
    it("TAC-T12-01: una InventoryError del transporte posterior al despacho conserva UNCERTAIN", async () => {
      let postsProcessedByServer = 0;
      const { repository, calls } = setup(async () => {
        postsProcessedByServer += 1;
        throw new InventoryError(
          "SERVICIO_NO_DISPONIBLE",
          "Inventario no respondió a la consulta.",
        );
      });

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });

      expect(postsProcessedByServer).toBe(1);
      expect(calls).toHaveLength(1);
      expect(repository.getTransferWriteRecord("t-1")).toMatchObject({
        state: "UNCERTAIN",
        payload: RECEPCION_PAYLOAD,
      });
      expect(getUncertainTransferReception("t-1")).toEqual(RECEPCION_PAYLOAD);
    });

    it("TAC-T12-02: tras el error tipado, otra cantidad, nota u operationId se rechaza sin segundo POST", async () => {
      const { repository, calls } = setup(async () => {
        throw new InventoryError(
          "SERVICIO_NO_DISPONIBLE",
          "Inventario no respondió a la consulta.",
        );
      });

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });

      const session = createTransferReceptionFormSession("t-1");
      expect(() =>
        session.prepareSubmission({
          quantityReceived: 3,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: false,
          note: "",
        }),
      ).toThrowError(InventoryError);

      await expect(
        rejection(
          repository.receiveTransfer({
            ...RECEPCION_PAYLOAD,
            operationId: "22222222-2222-4222-8222-222222222222",
          }),
        ),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
      await expect(
        rejection(
          repository.receiveTransfer({
            ...RECEPCION_PAYLOAD,
            note: "Nota distinta",
          }),
        ),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });

      expect(calls).toHaveLength(1);
    });

    it("TAC-T12-03: reintentar la identidad original recupera la confirmación sin duplicar el efecto", async () => {
      const durableOperations = new Map<string, number>();
      let attempt = 0;
      const { repository, calls } = setup(async (_path, request) => {
        attempt += 1;
        const key = request.headers?.["Idempotency-Key"] ?? "";
        if (!durableOperations.has(key)) durableOperations.set(key, 1);
        if (attempt === 1)
          throw new InventoryError(
            "SERVICIO_NO_DISPONIBLE",
            "Inventario no respondió a la consulta.",
          );
        return jsonResponse(RECEPCION_OK);
      });

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
      expect(durableOperations.get(RECEPCION_PAYLOAD.operationId)).toBe(1);

      await expect(
        repository.receiveTransfer(RECEPCION_PAYLOAD),
      ).resolves.toMatchObject({ id: "t-1", quantityReceived: 4 });

      expect(attempt).toBe(2);
      expect(durableOperations.get(RECEPCION_PAYLOAD.operationId)).toBe(1);
      expect(calls).toHaveLength(2);
      expect(calls[0]?.request.headers?.["Idempotency-Key"]).toBe(
        RECEPCION_PAYLOAD.operationId,
      );
      expect(calls[1]?.request.headers?.["Idempotency-Key"]).toBe(
        RECEPCION_PAYLOAD.operationId,
      );
      expect(calls[0]?.request.body).toBe(calls[1]?.request.body);
      expect(repository.getTransferWriteRecord("t-1")).toMatchObject({
        state: "RECONCILED",
      });
      expect(getUncertainTransferReception("t-1")).toBeNull();
    });

    it("TAC-T12-04: un 400 o 409 HTTP recibido en el primer intento sigue siendo rechazo definitivo", async () => {
      const first = setup(async () => problemResponse(400, "VALIDACION"));
      await expect(
        rejection(first.repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "VALIDACION" });
      expect(first.repository.getTransferWriteRecord("t-1")).toBeNull();
      expect(getUncertainTransferReception("t-1")).toBeNull();
      expect(first.calls).toHaveLength(1);

      const second = setup(async () =>
        problemResponse(409, "TRASLADO_NO_RECIBIBLE"),
      );
      await expect(
        rejection(second.repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "TRASLADO_NO_RECIBIBLE" });
      expect(second.repository.getTransferWriteRecord("t-1")).toBeNull();
      expect(getUncertainTransferReception("t-1")).toBeNull();
      expect(second.calls).toHaveLength(1);
    });

    it("TAC-T12-05: un error tipado durante un reintento UNCERTAIN no libera el bloqueo", async () => {
      let attempt = 0;
      const { repository } = setup(async () => {
        attempt += 1;
        if (attempt === 1) return problemResponse(503, "SERVICIO_NO_DISPONIBLE");
        throw new InventoryError(
          "SERVICIO_NO_DISPONIBLE",
          "Inventario no respondió a la consulta.",
        );
      });

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
      expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");
      expect(getUncertainTransferReception("t-1")).not.toBeNull();

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESULTADO_INCIERTO" });
      expect(repository.getTransferWriteRecord("t-1")?.state).toBe("UNCERTAIN");
      expect(getUncertainTransferReception("t-1")).not.toBeNull();
    });
  });

  describe("TAC-P0-06 / TAC-P0-03 / TAC-P1-05 / TAC-P1-06: regresiones adicionales", () => {
    it("TAC-P0-06-A: setUncertainTransferReception persiste el snapshot en sessionStorage", () => {
      const values = new Map<string, string>();
      const storage: Storage = {
        get length() {
          return values.size;
        },
        clear() {
          values.clear();
        },
        getItem(key: string) {
          return values.has(key) ? values.get(key)! : null;
        },
        key(index: number) {
          return [...values.keys()][index] ?? null;
        },
        removeItem(key: string) {
          values.delete(key);
        },
        setItem(key: string, value: string) {
          values.set(key, value);
        },
      };
      globalThis.sessionStorage = storage;
      resetUncertainTransferReceptions();
      setUncertainTransferReception(RECEPCION_PAYLOAD);
      const raw = storage.getItem("inventory.transferReceptionAttempts.v1");
      expect(raw).toContain(RECEPCION_PAYLOAD.operationId);
      resetUncertainTransferReceptions();
      expect(storage.getItem("inventory.transferReceptionAttempts.v1")).toBeNull();
      delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    });

    it("cuota agotada con estado previo existente: restaura lastGoodPersistedState, falla-cerrado y conserva UNCERTAIN", async () => {
      const values = new Map<string, string>();
      const storage: Storage = {
        get length() { return values.size; },
        clear() { values.clear(); },
        getItem(key: string) { return values.has(key) ? values.get(key)! : null; },
        key(index: number) { return [...values.keys()][index] ?? null; },
        removeItem(key: string) { values.delete(key); },
        setItem(key: string, value: string) { values.set(key, value); },
      };
      globalThis.sessionStorage = storage;
      resetUncertainTransferReceptions();

      // Guardar un estado inicial válido (lastGoodPersistedState)
      setUncertainTransferReception(RECEPCION_PAYLOAD);
      const initialPersisted = storage.getItem("inventory.transferReceptionAttempts.v1");
      expect(initialPersisted).not.toBeNull();

      const { repository, calls } = setup(async () => jsonResponse(RECEPCION_OK));

      // Simular que setItem lanza por cuota agotada al intentar persistir el nuevo intento
      const originalSetItem = storage.setItem.bind(storage);
      storage.setItem = () => {
        throw new Error("QuotaExceededError");
      };

      // Debe rechazar con CONTRATO_BLOQUEADO y NO despachar el POST
      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });
      expect(calls).toHaveLength(0);

      // El bloqueo previo de UNCERTAIN se conserva en memoria tras el rollback fail-closed
      expect(getUncertainTransferReception("t-1")).toMatchObject({
        operationId: RECEPCION_PAYLOAD.operationId,
      });

      storage.setItem = originalSetItem;
      resetUncertainTransferReceptions();
      delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    });

    it("restauración fallida: error al escribir y error al restaurar estado previo lanza CONTRATO_BLOQUEADO", () => {
      const values = new Map<string, string>();
      const storage: Storage = {
        get length() { return values.size; },
        clear() { values.clear(); },
        getItem(key: string) { return values.has(key) ? values.get(key)! : null; },
        key(index: number) { return [...values.keys()][index] ?? null; },
        removeItem(key: string) { values.delete(key); },
        setItem(key: string, value: string) { values.set(key, value); },
      };
      globalThis.sessionStorage = storage;
      resetUncertainTransferReceptions();

      // Primer estado exitoso
      setUncertainTransferReception(RECEPCION_PAYLOAD);

      // Ahora setItem falla siempre (tanto en el intento nuevo como en la restauración)
      storage.setItem = () => {
        throw new Error("Hardware/Storage catastrophic failure");
      };

      expect(() =>
        setInFlightTransferReception({
          ...RECEPCION_PAYLOAD,
          transferId: "t-2",
        }),
      ).toThrow(InventoryError);

      delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    });

    it("registros corruptos: restoreFromStorage conserva registros corruptos en storage para no perder bloqueo al recargar", () => {
      const values = new Map<string, string>();
      const storage: Storage = {
        get length() { return values.size; },
        clear() { values.clear(); },
        getItem(key: string) { return values.has(key) ? values.get(key)! : null; },
        key(index: number) { return [...values.keys()][index] ?? null; },
        removeItem(key: string) { values.delete(key); },
        setItem(key: string, value: string) { values.set(key, value); },
      };
      globalThis.sessionStorage = storage;

      // Inyectar un payload corrupto para t-corrupt
      const corruptState = {
        version: 2,
        uncertain: [{ transferId: "t-corrupt", invalid: "bad payload structure" }],
        inFlight: [],
        confirmedAwaiting: [],
      };
      storage.setItem("inventory.transferReceptionAttempts.v1", JSON.stringify(corruptState));

      // Primera recarga: detecta corrupción y bloquea el traslado
      rehydrateTransferReceptionsForTesting();
      expect(isTransferReceptionStorageBlocked("t-corrupt")).toBe(true);

      // Verifica que NO se eliminó silenciosamente el registro corrupto de storage
      const rawAfterFirst = storage.getItem("inventory.transferReceptionAttempts.v1");
      expect(rawAfterFirst).toContain("t-corrupt");

      // Segunda recarga: el bloqueo se mantiene gracias a que no se limpió silenciosamente
      rehydrateTransferReceptionsForTesting();
      expect(isTransferReceptionStorageBlocked("t-corrupt")).toBe(true);

      // prepareSubmission rechaza y no genera operationId
      const formSession = createTransferReceptionFormSession("t-corrupt");
      expect(() =>
        formSession.prepareSubmission({
          quantityReceived: 5,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: true,
        }),
      ).toThrow(InventoryError);

      delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    });

    it("ausencia de POST cuando el intento de recepción no quedó persistido", async () => {
      const values = new Map<string, string>();
      const storage: Storage = {
        get length() { return values.size; },
        clear() { values.clear(); },
        getItem(key: string) { return values.has(key) ? values.get(key)! : null; },
        key(index: number) { return [...values.keys()][index] ?? null; },
        removeItem(key: string) { values.delete(key); },
        setItem(key: string, value: string) { values.set(key, value); },
      };
      globalThis.sessionStorage = storage;
      resetUncertainTransferReceptions();

      const { repository, calls } = setup(async () => jsonResponse(RECEPCION_OK));

      // storage.setItem falla
      storage.setItem = () => {
        throw new Error("QuotaExceededError");
      };

      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });

      // Verificación estricta: NO se despachó la llamada HTTP
      expect(calls).toHaveLength(0);

      delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    });

    it("TAC-P0-03-A: una confirmación con cantidad distinta conserva UNCERTAIN", async () => {
      const { repository } = setup(async () =>
        jsonResponse({ ...RECEPCION_OK, received_quantity: 5 }),
      );
      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESPUESTA_INCOMPATIBLE" });
      expect(getUncertainTransferReception("t-1")).not.toBeNull();
    });

    it("TAC-P0-03-B: una confirmación con disposición distinta conserva UNCERTAIN", async () => {
      const { repository } = setup(async () =>
        jsonResponse({ ...RECEPCION_OK, disposition: "CONFIRMAR_MERMA" }),
      );
      await expect(
        rejection(repository.receiveTransfer(RECEPCION_PAYLOAD)),
      ).resolves.toMatchObject({ code: "RESPUESTA_INCOMPATIBLE" });
      expect(getUncertainTransferReception("t-1")).not.toBeNull();
    });

    it("TAC-P1-05-A: una página recibida distinta a la solicitada se rechaza", async () => {
      const { repository } = setup(async () =>
        jsonResponse({
          items: [TRASLADO_CONFIRMADO],
          pagina: 2,
          tamanio: 100,
          total: 1,
        }),
      );
      await expect(rejection(repository.getTransfers())).resolves.toMatchObject({
        code: "RESPUESTA_INCOMPATIBLE",
      });
    });

    it("TAC-P1-05-B: un traslado duplicado entre páginas se rechaza", async () => {
      const { repository } = setup(async (path) => {
        if (path.includes("pagina=2")) {
          return jsonResponse({
            items: [TRASLADO_CONFIRMADO],
            pagina: 2,
            tamanio: 100,
            total: 2,
          });
        }
        return jsonResponse({
          items: [TRASLADO_CONFIRMADO],
          pagina: 1,
          tamanio: 100,
          total: 2,
        });
      });
      await expect(rejection(repository.getTransfers())).resolves.toMatchObject({
        code: "RESPUESTA_INCOMPATIBLE",
      });
    });

    it("TAC-P1-05-C: un total inconsistente durante la paginación se rechaza", async () => {
      const { repository } = setup(async (path) => {
        if (path.includes("pagina=2")) {
          return jsonResponse({
            items: [traslado({ traslado_id: "t-2" })],
            pagina: 2,
            tamanio: 100,
            total: 1,
          });
        }
        return jsonResponse({
          items: [TRASLADO_CONFIRMADO],
          pagina: 1,
          tamanio: 100,
          total: 2,
        });
      });
      await expect(rejection(repository.getTransfers())).resolves.toMatchObject({
        code: "RESPUESTA_INCOMPATIBLE",
      });
    });

    it("TAC-P1-06-A: un PUT de umbral incierto usa mensaje de umbral", async () => {
      const { repository } = setup(async () =>
        problemResponse(503, "SERVICIO_NO_DISPONIBLE"),
      );
      const error = await rejection(repository.updateGlobalThreshold(7));
      expect(error.code).toBe("RESULTADO_INCIERTO");
      expect(error.message).toContain("umbral");
    });
  });

});

describe("apiInventoryAdapter — dashboard KPIs (obtenerDashboardInventario)", () => {
  const DASHBOARD_DTO = {
    generatedAt: "2026-10-20T00:00:00.000Z",
    totalSkus: 12,
    totalOnHand: 150,
    totalReserved: 20,
    totalAvailable: 125,
    skusDisponibles: 9,
    skusStockBajo: 2,
    skusAgotados: 1,
    porUbicacion: [
      {
        location_id: "loc-1",
        on_hand: 150,
        reserved: 20,
        available: 125,
        skusDisponibles: 9,
        skusStockBajo: 2,
        skusAgotados: 1,
      },
    ],
  };

  it("mapea KPIs autoritativos de DashboardInventario e informa null en métricas no publicadas", async () => {
    const { repository, calls } = setup(async () => jsonResponse(DASHBOARD_DTO));
    await expect(
      repository.getDashboardKpis({ locationId: "loc-1" }),
    ).resolves.toEqual({
      availableUnits: 125,
      blockedUnits: null,
      totalPhysicalUnits: 150,
      totalVendibleSkus: null,
      skusAvailable: 9,
      skusLowStock: 2,
      skusOutOfStock: 1,
      reservedUnits: 20,
      totalPendingTransfers: null,
      transfersInTransit: null,
      transfersPartiallyReceived: null,
      transfersWithDiscrepancy: null,
      generatedAt: "2026-10-20T00:00:00.000Z",
    });
    expect(calls[0]?.path).toBe("/api/v1/inventario/dashboard?locationId=loc-1");
  });

  it("rechaza con CONTRATO_BLOQUEADO filtros de texto libre o estado no admitidos por obtenerDashboardInventario", async () => {
    const { repository, request } = setup(async () => jsonResponse(DASHBOARD_DTO));
    await expect(
      rejection(repository.getDashboardKpis({ search: "SKU-A" })),
    ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });
    await expect(
      rejection(repository.getDashboardKpis({ status: "AGOTADO" })),
    ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });
    expect(request).not.toHaveBeenCalled();
  });

  it('omite el literal "all" y consulta el agregado sin parámetros', async () => {
    const { repository, calls } = setup(async () => jsonResponse(DASHBOARD_DTO));
    await expect(
      repository.getDashboardKpis({
        search: "",
        category: "all",
        brand: "all",
        locationId: "all",
        status: "all",
      }),
    ).resolves.toMatchObject({ availableUnits: 125 });
    expect(calls[0]?.path).toBe("/api/v1/inventario/dashboard");
  });

  it("mapea porUbicacion y expone null en nombre y bloqueo no publicados", async () => {
    const { repository, calls } = setup(async () => jsonResponse(DASHBOARD_DTO));
    await expect(
      repository.getLocationDistribution({ locationId: "loc-1" }),
    ).resolves.toEqual([
      {
        locationId: "loc-1",
        locationName: null,
        onHandTotal: 150,
        reservedTotal: 20,
        blockedTotal: null,
        availableTotal: 125,
        skusAvailableCount: 9,
        skusLowStockCount: 2,
        skusOutOfStockCount: 1,
      },
    ]);
    expect(calls[0]?.path).toBe(
      "/api/v1/inventario/dashboard?locationId=loc-1",
    );
  });

  it("rechaza la distribución si el filtro no es verificable por contrato", async () => {
    const { repository, request } = setup(async () => jsonResponse(DASHBOARD_DTO));
    await expect(
      rejection(repository.getLocationDistribution({ search: "SKU-A" })),
    ).resolves.toMatchObject({ code: "CONTRATO_BLOQUEADO" });
    expect(request).not.toHaveBeenCalled();
  });

  it("conserva y expone generatedAt de DashboardInventario", async () => {
    const { repository } = setup(async () => jsonResponse(DASHBOARD_DTO));
    const kpis = await repository.getDashboardKpis();
    expect(kpis.generatedAt).toBe("2026-10-20T00:00:00.000Z");
  });

  it("informa null en métricas no publicadas sin sustituirlas por cero", async () => {
    const { repository } = setup(async () => jsonResponse(DASHBOARD_DTO));
    const kpis = await repository.getDashboardKpis();
    expect(kpis.blockedUnits).toBeNull();
    expect(kpis.totalVendibleSkus).toBeNull();
    expect(kpis.totalPendingTransfers).toBeNull();
    expect(kpis.transfersInTransit).toBeNull();
    expect(kpis.transfersPartiallyReceived).toBeNull();
    expect(kpis.transfersWithDiscrepancy).toBeNull();
  });

  it("admite filtros contractuales del agregado (category, brand, locationId)", async () => {
    const { repository, calls } = setup(async () => jsonResponse(DASHBOARD_DTO));
    await repository.getDashboardKpis({ category: "cat-1", brand: "brand-1", locationId: "loc-1" });
    expect(calls[0]?.path).toContain("categoriaId=cat-1");
    expect(calls[0]?.path).toContain("marcaId=brand-1");
    expect(calls[0]?.path).toContain("locationId=loc-1");
  });

  it("separación de filtros del dashboard: una búsqueda por SKU en tabla no bloquea consulta agregada", async () => {
    const { repository } = setup(async () => jsonResponse(DASHBOARD_DTO));
    const filters = { search: "SKU-99", category: "cat-1", status: "AGOTADO", locationId: "loc-1" };
    const aggregateFilters = {
      category: filters.category,
      locationId: filters.locationId,
    };
    const kpis = await repository.getDashboardKpis(aggregateFilters);
    expect(kpis.availableUnits).toBe(125);
    const dist = await repository.getLocationDistribution(aggregateFilters);
    expect(dist).toHaveLength(1);
  });

  it("fallos parciales: secciones no soportadas (alertas/stock) no invalidan KPIs ni distribución", async () => {
    const { repository } = setup(async () => jsonResponse(DASHBOARD_DTO));
    const [kpiRes, alertsRes, distRes, stockRes] = await Promise.allSettled([
      repository.getDashboardKpis(),
      repository.getDashboardAlerts(),
      repository.getLocationDistribution(),
      repository.getStockItems(),
    ]);
    expect(kpiRes.status).toBe("fulfilled");
    expect(distRes.status).toBe("fulfilled");
    expect(alertsRes.status).toBe("rejected");
    expect(stockRes.status).toBe("rejected");
  });
});

describe("apiInventoryAdapter — operaciones sin fuente contractual", () => {
  it("rechaza con CONTRATO_BLOQUEADO las lecturas cuyo modelo no cubre el contrato", async () => {
    const { repository, request } = setup(async () => jsonResponse({}));
    for (const promise of [
      repository.getStockItems(),
      repository.getStockDetail("SKU-A", "loc-1"),
      repository.getDashboardAlerts(),
      repository.getCategories(),
      repository.getBrands(),
      repository.getLocations(),
    ]) {
      const error = await rejection(promise);
      expect(error.code).toBe("CONTRATO_BLOQUEADO");
    }
    expect(request).not.toHaveBeenCalled();
  });
});

describe("toTransferItem — distinción de cantidad pendiente frente a faltante", () => {
  const presentation = {
    transferCode: "TR-2026-TEST",
    productName: "Producto de Prueba",
    sourceLocationName: "Almacén Origen",
    targetLocationName: "Almacén Destino",
  };

  it("asigna quantityPending en 0 y missingQuantity positivo para COMPLETADO_CON_DISCREPANCIA", () => {
    const dto: TrasladoInventarioDto = {
      traslado_id: "tr-disc-1",
      sku: "SKU-DISC",
      quantity_shipped: 10,
      quantity_received: 4,
      missing_quantity: 6,
      source_location_id: "loc-src",
      target_location_id: "loc-dst",
      estado: "COMPLETADO_CON_DISCREPANCIA",
      created_at: "2026-10-20T00:00:00Z",
      updated_at: "2026-10-20T01:00:00Z",
    };

    const item = toTransferItem(dto, presentation);
    expect(item.quantityShipped).toBe(10);
    expect(item.quantityReceived).toBe(4);
    // Un traslado cerrado no tiene unidades pendientes de recepción
    expect(item.quantityPending).toBe(0);
    // El faltante registrado es 6
    expect(item.missingQuantity).toBe(6);
    expect(item.status).toBe("COMPLETADO_CON_DISCREPANCIA");
  });

  it("asigna quantityPending positivo y missingQuantity en 0 para traslados activos RECIBIDO_PARCIAL", () => {
    const dto: TrasladoInventarioDto = {
      traslado_id: "tr-parc-1",
      sku: "SKU-PARC",
      quantity_shipped: 10,
      quantity_received: 4,
      missing_quantity: 0,
      source_location_id: "loc-src",
      target_location_id: "loc-dst",
      estado: "RECIBIDO_PARCIAL",
      created_at: "2026-10-20T00:00:00Z",
      updated_at: "2026-10-20T01:00:00Z",
    };

    const item = toTransferItem(dto, presentation);
    expect(item.quantityPending).toBe(6);
    expect(item.missingQuantity).toBe(0);
    expect(item.status).toBe("RECIBIDO_PARCIAL");
  });

  it("asigna quantityPending total y missingQuantity en 0 para traslados activos EN_TRANSITO", () => {
    const dto: TrasladoInventarioDto = {
      traslado_id: "tr-trans-1",
      sku: "SKU-TRANS",
      quantity_shipped: 15,
      quantity_received: 0,
      missing_quantity: 0,
      source_location_id: "loc-src",
      target_location_id: "loc-dst",
      estado: "EN_TRANSITO",
      created_at: "2026-10-20T00:00:00Z",
      updated_at: "2026-10-20T01:00:00Z",
    };

    const item = toTransferItem(dto, presentation);
    expect(item.quantityPending).toBe(15);
    expect(item.missingQuantity).toBe(0);
    expect(item.status).toBe("EN_TRANSITO");
  });

  it("asigna quantityPending en 0 y missingQuantity en 0 para traslados COMPLETADO limpio", () => {
    const dto: TrasladoInventarioDto = {
      traslado_id: "tr-comp-1",
      sku: "SKU-COMP",
      quantity_shipped: 8,
      quantity_received: 8,
      missing_quantity: 0,
      source_location_id: "loc-src",
      target_location_id: "loc-dst",
      estado: "COMPLETADO",
      created_at: "2026-10-20T00:00:00Z",
      updated_at: "2026-10-20T01:00:00Z",
    };

    const item = toTransferItem(dto, presentation);
    expect(item.quantityPending).toBe(0);
    expect(item.missingQuantity).toBe(0);
    expect(item.status).toBe("COMPLETADO");
  });
});
