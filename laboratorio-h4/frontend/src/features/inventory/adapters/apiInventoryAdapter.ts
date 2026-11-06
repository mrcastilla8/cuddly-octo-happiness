import {
  InventoryError,
  InventoryPresentationFailedError,
} from "../services/inventoryErrors";
import type { InventoryRepository } from "../services/inventoryRepository";
import type {
  DashboardFiltersQuery,
  InventoryKpiSummary,
  LocationDistribution,
  ReceiveTransferPayload,
  StockItem,
  ThresholdConfig,
  TransferFiltersQuery,
  TransferItem,
} from "../services/inventoryTypes";
import {
  toDashboardKpiSummary,
  toLocationDistributionList,
  toRecepcionTrasladoRequestDto,
  toThresholdConfig,
  toTransferItem,
  validateRecepcionResponse,
  validateTransferPresentation,
  validateTrasladoListDto,
  type TransferPresentationResolver,
  type TrasladoInventarioDto,
} from "../services/inventoryMappers";
import {
  areSameReceiveTransferPayloads,
  clearConfirmedTransferReceptionAwaitingRefresh,
  clearInFlightTransferReception,
  clearUncertainTransferReception,
  freezeReceiveTransferPayload,
  getAllConfirmedTransferReceptionsAwaitingRefresh,
  getAllConfirmedTransferReceptionsAwaitingRefreshWithDto,
  getAllUncertainTransferReceptions,
  getConfirmedTransferReceptionAwaitingRefresh,
  isTransferReceptionStorageBlocked,
  transitionToConfirmedAwaitingRefreshWithDto,
  setInFlightTransferReception,
  setUncertainTransferReception,
  type TransferReceptionPresentationRefresh,
  type TransferReceptionWriteRecord,
} from "../services/transferReceptionAttempt";

// Adaptador HTTP del feature de inventario (OpenAPI 0.6.0-rc.1, `api-productos`).
//
// Implementa las operaciones cuyo modelo de presentación se puede completar
// SOLO con el contrato más dependencias autoritativas inyectadas:
//   - umbrales   (umbralGlobal/overrides -> ThresholdConfig) mapeo total.
//   - dashboard  (obtenerDashboardInventario -> KPIs y distribución por
//     ubicación). Los campos que el contrato no publica se exponen como `null`.
//   - traslados  (listar/obtener/recepción) con un resolvedor de presentación
//     inyectado para los campos que el contrato no transporta (código legible,
//     nombre de producto y nombres de ubicación).
//
// Las operaciones cuyo modelo exige campos que NINGUNA operación de Inventario
// devuelve (productName/categoryName/brandName, locationName, stockVersion,
// updatedAt, blockedUnits, KPIs de traslados, alertas…) se rechazan con
// `CONTRATO_BLOQUEADO`: no se completan con datos simulados.
//
// El transporte es un punto de inyección estrecho; lo aporta el cliente HTTP
// compartido del composition root (#45/#109). Este módulo NO crea un segundo
// transporte productivo ni conecta el singleton de selección por sí mismo.

export interface InventoryHttpRequest {
  method: "GET" | "PUT" | "POST";
  signal?: AbortSignal;
  headers?: Readonly<Record<string, string>>;
  body?: string;
}

// El cliente compartido adapta su API a esta frontera estrecha.
export interface InventoryHttpTransport {
  request(path: string, request: InventoryHttpRequest): Promise<Response>;
}

export interface HttpInventoryRepositoryDependencies {
  transport: InventoryHttpTransport;
  // Aporta código legible, nombre de producto y nombres de ubicación desde su
  // owner autoritativo (Catálogo/ubicaciones). Si falta, los métodos de
  // traslados fallan con CONTRATO_BLOQUEADO en lugar de simular datos.
  resolveTransferPresentation?: TransferPresentationResolver;
}

export interface HttpInventoryRepository extends InventoryRepository {
  // TAC-P0-11: señal opcional para distinguir una cancelación anterior al
  // despacho HTTP de un AbortError lanzado después de invocar al transporte.
  // No forma parte del contrato OpenAPI ni del repositorio de negocio.
  receiveTransfer(
    payload: ReceiveTransferPayload,
    signal?: AbortSignal,
  ): Promise<TransferItem>;
  getTransferWriteRecord(
    transferId: string,
  ): TransferReceptionWriteRecord | null;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 1000;

const BLOCKED_DETAILS = {
  getStockItems:
    "productName/categoryName/brandName (Catálogo/Taxonomía), locationName (sin endpoint) y stockVersion/updatedAt no los devuelve consultarDisponibilidad",
  getStockDetail:
    "mismos campos sin fuente que getStockItems (consultarDisponibilidad)",
  getDashboardKpisFilter:
    "obtenerDashboardInventario no admite filtrar por texto libre ni por estado de stock; quita ese filtro para consultar el agregado",
  getDashboardAlerts:
    "no existe operación de alertas en el contrato de Inventario",
  getLocationDistribution:
    "obtenerDashboardInventario no admite filtrar por texto libre ni por estado de stock",
  getCategories:
    "operación de Catálogo (no de Inventario); destino de la integración de filtros pendiente de definición (paginación)",
  getBrands:
    "operación de Catálogo (no de Inventario); destino de la integración de filtros pendiente de definición (paginación)",
  getLocations:
    "sin endpoint HTTP publicado (fuente física inventory.locations)",
} as const;

function blocked(operation: string, detail: string): InventoryError {
  return new InventoryError(
    "CONTRATO_BLOQUEADO",
    `Inventario no puede completar ${operation}: ${detail}.`,
  );
}

// TAC-P1-10: evidencia de frescura disponible en el contrato actual. Se compara
// el agregado autoritativo devuelto por el POST de confirmación con el DTO del
// listado. No se usan `updated_at` ni `stockVersion`: el contrato no publica una
// versión de stock en `TrasladoInventario` y un timestamp no demuestra que la
// recepción esté incluida. Un agregado distinto (incluido uno mayor por una
// recepción externa) no se considera prueba suficiente.
function sameTransferAggregate(
  confirmed: TrasladoInventarioDto,
  candidate: TrasladoInventarioDto,
): boolean {
  return (
    confirmed.traslado_id === candidate.traslado_id &&
    confirmed.sku === candidate.sku &&
    confirmed.quantity_shipped === candidate.quantity_shipped &&
    confirmed.quantity_received === candidate.quantity_received &&
    confirmed.missing_quantity === candidate.missing_quantity &&
    confirmed.source_location_id === candidate.source_location_id &&
    confirmed.target_location_id === candidate.target_location_id &&
    confirmed.estado === candidate.estado
  );
}

// La UI usa el literal "all" para representar "sin filtro". No es un valor del
// contrato: enviarlo produciría 400 (estado/target_location_id) o seleccionaría
// una categoría/marca/ubicación inexistente. Se normaliza a "ausente".
export function contractFilterValue(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.toLowerCase() === "all") return undefined;
  return normalized;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function problemCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.clone().json();
    if (
      body !== null &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      typeof (body as Record<string, unknown>).code === "string"
    )
      return (body as Record<string, string>).code;
  } catch {
    // El status HTTP clasifica el fallo cuando el cuerpo no es un Problem.
  }
  return undefined;
}

// Cada confirmación se guarda con el snapshot inmutable que la originó
// (TAC-P0-09). La identidad sola (`operationId`) NO es suficiente para
// reutilizarla: primero se compara el fingerprint completo.
interface ConfirmedReceptionRecord {
  readonly payload: Readonly<ReceiveTransferPayload>;
  readonly dto: TrasladoInventarioDto;
}

export function createHttpInventoryRepository(
  dependencies: HttpInventoryRepositoryDependencies,
): HttpInventoryRepository {
  const { transport, resolveTransferPresentation } = dependencies;
  // TAC-P0-02: separación explícita de tres estados de escritura por traslado:
  //   - IN_FLIGHT: escritura en curso sin respuesta recibida aún.
  //   - UNCERTAIN: respuesta perdida o fallo >=500; conserva el snapshot
  //     inmutable completo (`operationId`, `receivedAt`, `note`, cantidades).
  //   - RECONCILED: recepción confirmada con respuesta autoritativa del
  //     servidor (incluyendo la recuperación idempotente del resultado durable).
  const transferWrites = new Map<string, TransferReceptionWriteRecord>();

  // TAC-P0-05 / TAC-P0-09: DTO de confirmación persistido, indexado por
  // `operationId` y acompañado del snapshot inmutable original. Una vez que
  // Inventory confirma la recepción (200 + DTO válido), la confirmación es
  // autoritativa e independiente del enriquecimiento de presentación. Este
  // cache evita repetir el POST si `present()` (resolvedor de Catálogo/
  // ubicaciones) falla después de que la mutación ya fue persistida, pero SOLO
  // para la misma intención exacta.
  const confirmedReceptions = new Map<string, ConfirmedReceptionRecord>();

  // Hidratación desde almacenamiento persistido tras refresh/recreación del repositorio.
  for (const payload of getAllUncertainTransferReceptions()) {
    transferWrites.set(payload.transferId, {
      state: "UNCERTAIN",
      payload: freezeReceiveTransferPayload(payload),
      reconciliation: "UNVERIFIABLE_BY_LIST_CONTRACT",
      updatedAt: payload.receivedAt,
    });
  }
  for (const record of getAllConfirmedTransferReceptionsAwaitingRefreshWithDto()) {
    if (!confirmedReceptions.has(record.payload.operationId)) {
      confirmedReceptions.set(record.payload.operationId, {
        payload: freezeReceiveTransferPayload(record.payload),
        dto: record.dto,
      });
    }
    transferWrites.set(record.payload.transferId, {
      state: "RECONCILED",
      payload: freezeReceiveTransferPayload(record.payload),
      reconciliation: "CONFIRMED_BY_IDEMPOTENT_RETRY",
      updatedAt: record.dto.updated_at,
      presentationRefresh: "AWAITING",
    });
  }
  for (const payload of getAllConfirmedTransferReceptionsAwaitingRefresh()) {
    if (getAllConfirmedTransferReceptionsAwaitingRefreshWithDto().some((r) => r.payload.transferId === payload.transferId)) {
      continue;
    }
    transferWrites.set(payload.transferId, {
      state: "RECONCILED",
      payload: freezeReceiveTransferPayload(payload),
      reconciliation: "CONFIRMED_BY_IDEMPOTENT_RETRY",
      updatedAt: payload.receivedAt,
      presentationRefresh: "AWAITING",
    });
  }

  function setPresentationRefresh(
    transferId: string,
    status: TransferReceptionPresentationRefresh,
  ): void {
    const record = transferWrites.get(transferId);
    if (!record || record.presentationRefresh === status) return;
    transferWrites.set(transferId, { ...record, presentationRefresh: status });
  }

  function uncertainWriteMessage(writeKind: "reception" | "threshold"): string {
    return writeKind === "threshold"
      ? "El umbral podría haberse actualizado, pero no se confirmó el resultado. Consulta el valor actual antes de continuar."
      : "No se confirmó el resultado de la recepción. Consulta el traslado antes de reintentar.";
  }

  async function send(
    path: string,
    request: InventoryHttpRequest,
    write: boolean,
    writeKind: "reception" | "threshold" = "reception",
  ): Promise<Response> {
    // TAC-P0-11: esta comprobación ocurre ANTES de invocar al transporte. Si la
    // señal ya estaba abortada, la cancelación es verificablemente anterior al
    // despacho y no puede confundirse con un resultado incierto.
    request.signal?.throwIfAborted();
    let response: Response;
    try {
      response = await transport.request(path, request);
    } catch (error) {
      // TAC-P0-12: en una escritura, cualquier excepción posterior a la
      // invocación del transporte (incluida InventoryError lanzada por el
      // transporte, AbortError, TypeError o error de red) no puede tratarse como
      // rechazo definitivo. El POST/PUT pudo haberse aplicado.
      if (write)
        throw new InventoryError(
          "RESULTADO_INCIERTO",
          uncertainWriteMessage(writeKind),
        );
      if (error instanceof InventoryError) throw error;
      if (request.signal?.aborted || isAbort(error)) throw error;
      throw new InventoryError(
        "SERVICIO_NO_DISPONIBLE",
        "Inventario no respondió a la consulta.",
      );
    }

    if (response.ok) {
      if (response.status !== 200)
        throw new InventoryError(
          write ? "RESULTADO_INCIERTO" : "RESPUESTA_INCOMPATIBLE",
          write
            ? uncertainWriteMessage(writeKind)
            : "Inventario no devolvió la confirmación HTTP prevista por el contrato.",
        );
      return response;
    }

    const status = response.status;
    const code = await problemCode(response);
    if (status === 401)
      throw new InventoryError(
        "NO_AUTENTICADO",
        "Inventario rechazó la autorización.",
      );
    if (status === 403)
      throw new InventoryError(
        "SIN_PERMISO",
        "Tu rol no permite esta operación de inventario.",
      );
    if (status === 404 && code === "TRASLADO_NO_ENCONTRADO")
      throw new InventoryError(
        "TRASLADO_NO_ENCONTRADO",
        "El traslado ya no está disponible.",
      );
    if (status === 409) {
      if (code === "TRASLADO_NO_RECIBIBLE")
        throw new InventoryError(
          "TRASLADO_NO_RECIBIBLE",
          "El traslado ya está cerrado o no admite nuevas recepciones.",
        );
      throw new InventoryError(
        "IDEMPOTENCY_CONFLICT",
        "La identidad de esta recepción ya se usó con otra intención.",
      );
    }
    if (status === 422) {
      if (code === "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO")
        throw new InventoryError(
          "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO",
          "La recepción supera la cantidad pendiente del traslado.",
        );
      if (code === "DISPOSICION_RECEPCION_INVALIDA")
        throw new InventoryError(
          "DISPOSICION_RECEPCION_INVALIDA",
          "La disposición de recepción no es válida para la operación.",
        );
      throw new InventoryError(
        "VALIDACION",
        "Inventario rechazó los datos enviados. Revisa el formulario.",
      );
    }
    if (status === 400)
      throw new InventoryError(
        "VALIDACION",
        "Inventario rechazó los datos enviados. Revisa el formulario.",
      );
    if (write && (status >= 500 || status === 408))
      throw new InventoryError(
        "RESULTADO_INCIERTO",
        uncertainWriteMessage(writeKind),
      );
    throw new InventoryError(
      "SERVICIO_NO_DISPONIBLE",
      "Inventario no pudo completar la operación.",
    );
  }

  async function json(
    path: string,
    request: InventoryHttpRequest,
    write: boolean,
    writeKind: "reception" | "threshold" = "reception",
  ): Promise<unknown> {
    const response = await send(path, request, write, writeKind);
    try {
      const body: unknown = await response.json();
      if (body === null) throw new Error("Respuesta sin DTO");
      return body;
    } catch {
      throw new InventoryError(
        write ? "RESULTADO_INCIERTO" : "RESPUESTA_INCOMPATIBLE",
        write
          ? uncertainWriteMessage(writeKind)
          : "Inventario devolvió una respuesta ilegible.",
      );
    }
  }

  async function present(dto: TrasladoInventarioDto): Promise<TransferItem> {
    if (!resolveTransferPresentation)
      throw blocked(
        "traslados",
        "falta el resolvedor autoritativo de presentación (Catálogo/ubicaciones)",
      );
    const presentation = validateTransferPresentation(
      await resolveTransferPresentation(dto),
    );
    return toTransferItem(dto, presentation);
  }

  // TAC-P0-08: la presentación corre DESPUÉS de la confirmación autoritativa.
  // Un fallo de enriquecimiento NO es un fallo de la mutación: se propaga un
  // error tipado (`InventoryPresentationFailedError`) para que hook y formulario
  // bloqueen nuevas intenciones y refresquen la vista sin repetir el POST.
  async function presentConfirmed(
    payload: Readonly<ReceiveTransferPayload>,
    dto: TrasladoInventarioDto,
  ): Promise<TransferItem> {
    try {
      return await present(dto);
    } catch (error) {
      // TAC-P1-10: deja constancia de que la confirmación existe pero la vista
      // todavía no tiene evidencia de frescura. No libera el bloqueo.
      setPresentationRefresh(payload.transferId, "AWAITING");
      throw new InventoryPresentationFailedError(
        payload.transferId,
        payload.operationId,
        error,
      );
    }
  }

  function transferQuery(
    filters: TransferFiltersQuery | undefined,
    pagina: number,
  ): string {
    const params = new URLSearchParams();
    const status = contractFilterValue(filters?.status);
    const targetLocationId = contractFilterValue(filters?.targetLocationId);
    if (status) params.set("estado", status);
    if (targetLocationId) params.set("target_location_id", targetLocationId);
    params.set("pagina", String(pagina));
    params.set("tamanio", String(PAGE_SIZE));
    return params.toString();
  }

  async function readTransfers(
    filters: TransferFiltersQuery | undefined,
  ): Promise<TransferItem[]> {
    const collected: TrasladoInventarioDto[] = [];
    const seenTransferIds = new Set<string>();
    let pagina = 1;
    let expectedTotal: number | null = null;
    for (;;) {
      const body = await json(
        `/api/v1/inventario/traslados?${transferQuery(filters, pagina)}`,
        { method: "GET" },
        false,
      );
      const page = validateTrasladoListDto(body);
      if (page.pagina !== pagina)
        throw new InventoryError(
          "RESPUESTA_INCOMPATIBLE",
          "Inventario devolvió una página de traslados distinta a la solicitada.",
        );
      if (page.tamanio !== PAGE_SIZE)
        throw new InventoryError(
          "RESPUESTA_INCOMPATIBLE",
          "Inventario devolvió un tamaño de página incoherente.",
        );
      if (expectedTotal === null) expectedTotal = page.total;
      else if (page.total !== expectedTotal)
        throw new InventoryError(
          "RESPUESTA_INCOMPATIBLE",
          "Inventario cambió el total de traslados durante la paginación.",
        );
      for (const item of page.items) {
        if (seenTransferIds.has(item.traslado_id))
          throw new InventoryError(
            "RESPUESTA_INCOMPATIBLE",
            "Inventario devolvió un traslado duplicado entre páginas.",
          );
        seenTransferIds.add(item.traslado_id);
      }
      collected.push(...page.items);
      if (collected.length > page.total)
        throw new InventoryError(
          "RESPUESTA_INCOMPATIBLE",
          "Inventario devolvió más traslados que el total declarado.",
        );
      if (collected.length === page.total) break;
      if (page.items.length === 0 || pagina >= MAX_PAGES)
        throw new InventoryError(
          "RESPUESTA_INCOMPATIBLE",
          "Inventario devolvió una paginación de traslados incoherente.",
        );
      pagina += 1;
    }
    // TAC-P0-02: `GET /api/v1/inventario/traslados` devuelve solo el estado
    // agregado del traslado (`quantity_received`, `estado`) y NO identifica qué
    // `operation_id` fue aplicado. Por tanto, la lectura general NO elimina el
    // estado `UNCERTAIN` ni habilita una segunda recepción con otro
    // `operationId`; deja constancia explícita de que la conciliación por
    // listado no es concluyente.
    for (const dto of collected) {
      const current = transferWrites.get(dto.traslado_id);
      if (current?.state === "UNCERTAIN") {
        transferWrites.set(dto.traslado_id, {
          ...current,
          reconciliation: "UNVERIFIABLE_BY_LIST_CONTRACT",
          updatedAt: dto.updated_at,
        });
      }
    }
    const items = await Promise.all(collected.map((dto) => present(dto)));
    // TAC-P1-10: solo un listado COMPLETO, presentable y con el agregado
    // coherente con la confirmación libera el bloqueo. Un HTTP 200 con saldo
    // anterior no demuestra que la recepción esté reflejada; en ese caso el
    // bloqueo permanece y se registra `UNVERIFIABLE_BY_AGGREGATE`
    // (BLOQUEADO_ESPECÍFICO). Esto no aplica a `UNCERTAIN`, que sigue sin
    // liberarse por listado (ver bloque anterior).
    for (const dto of collected) {
      const awaiting = getConfirmedTransferReceptionAwaitingRefresh(
        dto.traslado_id,
      );
      if (!awaiting) continue;
      let confirmed = confirmedReceptions.get(awaiting.operationId);
      if (!confirmed) {
        const persistedWithDto = getAllConfirmedTransferReceptionsAwaitingRefreshWithDto().find(
          (record) => record.payload.transferId === dto.traslado_id && record.payload.operationId === awaiting.operationId,
        );
        if (persistedWithDto) {
          confirmed = { payload: persistedWithDto.payload, dto: persistedWithDto.dto };
          confirmedReceptions.set(persistedWithDto.payload.operationId, confirmed);
        }
      }
      if (confirmed && sameTransferAggregate(confirmed.dto, dto)) {
        clearConfirmedTransferReceptionAwaitingRefresh(dto.traslado_id);
        setPresentationRefresh(dto.traslado_id, "REFRESHED");
      } else {
        setPresentationRefresh(
          dto.traslado_id,
          "UNVERIFIABLE_BY_AGGREGATE",
        );
      }
    }
    return items;
  }

  function dashboardPath(filters: DashboardFiltersQuery | undefined): string {
    const params = new URLSearchParams();
    const locationId = contractFilterValue(filters?.locationId);
    const categoriaId = contractFilterValue(filters?.category);
    const marcaId = contractFilterValue(filters?.brand);
    if (locationId) params.set("locationId", locationId);
    if (categoriaId) params.set("categoriaId", categoriaId);
    if (marcaId) params.set("marcaId", marcaId);
    const query = params.toString();
    return query
      ? `/api/v1/inventario/dashboard?${query}`
      : "/api/v1/inventario/dashboard";
  }

  function assertDashboardFiltersSupported(
    operation: string,
    filters: DashboardFiltersQuery | undefined,
  ): void {
    // `obtenerDashboardInventario` no publica filtro por texto libre ni por
    // estado de stock. Enviar esos filtros devolvería un agregado distinto al
    // solicitado, así que se rechaza en lugar de mostrar datos no verificables
    // como si correspondieran a la selección.
    const search = contractFilterValue(filters?.search);
    const status = contractFilterValue(filters?.status);
    if (search || status)
      throw blocked(operation, BLOCKED_DETAILS.getDashboardKpisFilter);
  }

  return {
    getThresholds(): Promise<ThresholdConfig> {
      return json("/api/v1/inventario/umbrales", { method: "GET" }, false).then(
        toThresholdConfig,
      );
    },

    updateGlobalThreshold(threshold: number): Promise<ThresholdConfig> {
      return json(
        "/api/v1/inventario/umbrales/global",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ umbral: threshold }),
        },
        true,
        "threshold",
      ).then((body) => {
        try {
          return toThresholdConfig(body);
        } catch {
          throw new InventoryError(
            "RESULTADO_INCIERTO",
            uncertainWriteMessage("threshold"),
          );
        }
      });
    },

    updateSkuThreshold(
      sku: string,
      threshold: number,
    ): Promise<ThresholdConfig> {
      return json(
        `/api/v1/inventario/umbrales/skus/${encodeURIComponent(sku)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ umbral: threshold }),
        },
        true,
        "threshold",
      ).then((body) => {
        try {
          return toThresholdConfig(body);
        } catch {
          throw new InventoryError(
            "RESULTADO_INCIERTO",
            uncertainWriteMessage("threshold"),
          );
        }
      });
    },

    getTransferWriteRecord(
      transferId: string,
    ): TransferReceptionWriteRecord | null {
      return transferWrites.get(transferId) ?? null;
    },

    getTransfers(filters?: TransferFiltersQuery): Promise<TransferItem[]> {
      return readTransfers(filters);
    },

    async receiveTransfer(
      payload,
      signal?: AbortSignal,
    ): Promise<TransferItem> {
      const key = payload.transferId;
      const frozenPayload = freezeReceiveTransferPayload(payload);
      const currentRecord = transferWrites.get(key);
      const wasUncertainRetry = currentRecord?.state === "UNCERTAIN";

      if (currentRecord?.state === "IN_FLIGHT") {
        throw new InventoryError(
          "OPERACION_EN_CURSO",
          "Ya hay una recepción en curso para este traslado; no se inicia una segunda operación.",
        );
      }

      // TAC-P0-05 / TAC-P0-09: la identidad ya fue confirmada. Antes de
      // devolver el resultado durable se compara el snapshot COMPLETO
      // (transferId, cantidad, disposición, cierre final, fecha y nota). Una
      // identidad reutilizada con otra intención nunca devuelve la confirmación
      // anterior: se rechaza como conflicto de idempotencia.
      const confirmed = confirmedReceptions.get(frozenPayload.operationId);
      if (confirmed) {
        if (
          confirmed.dto.traslado_id !== frozenPayload.transferId ||
          !areSameReceiveTransferPayloads(confirmed.payload, frozenPayload)
        ) {
          throw new InventoryError(
            "IDEMPOTENCY_CONFLICT",
            "La identidad de esta recepción ya fue confirmada con otra intención (traslado, cantidad, disposición, cierre final, fecha o nota). No se devuelve un resultado ajeno a la solicitud.",
          );
        }
        return presentConfirmed(frozenPayload, confirmed.dto);
      }

      const confirmedAwaitingPayload = getConfirmedTransferReceptionAwaitingRefresh(key);
      if (confirmedAwaitingPayload) {
        if (confirmedAwaitingPayload.operationId !== frozenPayload.operationId) {
          throw new InventoryError(
            "PRESENTACION_FALLIDA",
            "La recepción anterior ya fue confirmada por Inventory. Actualiza la bandeja para reflejar el saldo real del traslado antes de registrar otra recepción parcial.",
          );
        }
        if (!areSameReceiveTransferPayloads(confirmedAwaitingPayload, frozenPayload)) {
          throw new InventoryError(
            "IDEMPOTENCY_CONFLICT",
            "La identidad de esta recepción ya fue confirmada con otra intención (traslado, cantidad, disposición, cierre final, fecha o nota). No se devuelve un resultado ajeno a la solicitud.",
          );
        }
      }

      if (currentRecord?.state === "UNCERTAIN") {
        if (currentRecord.payload.operationId !== frozenPayload.operationId) {
          throw new InventoryError(
            "RESULTADO_INCIERTO",
            "El resultado de la recepción anterior sigue sin reconciliación concluyente (el listado general no informa operation_id). Reintenta exactamente la misma operación para recuperar su confirmación.",
          );
        }
        if (!areSameReceiveTransferPayloads(currentRecord.payload, frozenPayload)) {
          throw new InventoryError(
            "RESULTADO_INCIERTO",
            "No se puede alterar cantidad, disposición, cierre final, fecha ni nota mientras la recepción anterior tenga resultado incierto. Reintenta la solicitud inmutable original.",
          );
        }
      }

      if (isTransferReceptionStorageBlocked(key)) {
        throw new InventoryError(
          "CONTRATO_BLOQUEADO",
          "El registro persistido de recepción está corrupto o no se pudo validar; no se genera una nueva operación.",
        );
      }

      const priorReconciliation =
        currentRecord?.state === "UNCERTAIN" ? currentRecord.reconciliation : "NONE";

      // TAC-P0-06: persistir IN_FLIGHT antes del envío. Si falla el almacenamiento,
      // no se despacha el POST.
      setInFlightTransferReception(frozenPayload);

      transferWrites.set(key, {
        state: "IN_FLIGHT",
        payload: frozenPayload,
        reconciliation: priorReconciliation,
        updatedAt: frozenPayload.receivedAt,
      });

      // Fase A — envío autoritativo. Un fallo aquí NO acredita si la mutación se
      // aplicó o no; se transiciona según la matriz (TAC-P1-07).
      let body: unknown;
      try {
        body = await json(
          `/api/v1/inventario/traslados/${encodeURIComponent(key)}/recepciones`,
          {
            method: "POST",
            ...(signal ? { signal } : {}),
            headers: {
              "content-type": "application/json",
              "Idempotency-Key": frozenPayload.operationId,
            },
            body: JSON.stringify(toRecepcionTrasladoRequestDto(frozenPayload)),
          },
          true,
        );
      } catch (error) {
        // TAC-P1-07: estando en UNCERTAIN, ningún error (red, 5xx, 4xx incluido
        // 409 IDEMPOTENCY_CONFLICT) libera el bloqueo; solo lo hace un 200 con
        // DTO válido. En primer intento, un error incierto conserva UNCERTAIN y
        // un 4xx definitivo limpia el registro.
        if (wasUncertainRetry) {
          setUncertainTransferReception(frozenPayload);
          transferWrites.set(key, {
            state: "UNCERTAIN",
            payload: frozenPayload,
            reconciliation: priorReconciliation,
            updatedAt: frozenPayload.receivedAt,
          });
        } else if (
          error instanceof InventoryError &&
          error.code === "RESULTADO_INCIERTO"
        ) {
          setUncertainTransferReception(frozenPayload);
          transferWrites.set(key, {
            state: "UNCERTAIN",
            payload: frozenPayload,
            reconciliation: "NONE",
            updatedAt: frozenPayload.receivedAt,
          });
        } else {
          clearUncertainTransferReception(key, frozenPayload.operationId);
          transferWrites.delete(key);
        }
        clearInFlightTransferReception(key, frozenPayload.operationId);
        throw error;
      }

      // Fase B — validar el DTO de confirmación. Si es incompatible, el resultado
      // no se puede determinar: la mutación pudo aplicarse, se preserva UNCERTAIN.
      let traslado: TrasladoInventarioDto;
      try {
        const confirmation = validateRecepcionResponse(body);
        // TAC-P0-09: el DTO de confirmación debe corresponder a ESTA solicitud.
        // Si el `operation_id` o el `traslado_id` devueltos no coinciden, la
        // mutación no se puede declarar confirmada y se preserva UNCERTAIN.
        if (
          confirmation.operationId !== frozenPayload.operationId ||
          confirmation.traslado.traslado_id !== frozenPayload.transferId ||
          confirmation.receivedQuantity !== frozenPayload.quantityReceived ||
          confirmation.disposition !== frozenPayload.disposition
        ) {
          throw new InventoryError(
            "RESPUESTA_INCOMPATIBLE",
            "Inventario devolvió una confirmación que no corresponde a la solicitud original. No se declara la operación como confirmada.",
          );
        }
        traslado = confirmation.traslado;
      } catch (error) {
        setUncertainTransferReception(frozenPayload);
        transferWrites.set(key, {
          state: "UNCERTAIN",
          payload: frozenPayload,
          reconciliation: priorReconciliation,
          updatedAt: frozenPayload.receivedAt,
        });
        throw error;
      }

      // Fase C — registrar la confirmación autoritativa ANTES del enriquecimiento
      // de presentación (TAC-P0-05 / TAC-P0-09). Transición única persistente
      // de IN_FLIGHT/UNCERTAIN a confirmación pendiente de refresco.
      // NO se eliminan ni persisten estados intermedios vacíos que dejen al traslado sin identidad.
      confirmedReceptions.set(frozenPayload.operationId, {
        payload: frozenPayload,
        dto: traslado,
      });
      transferWrites.set(key, {
        state: "RECONCILED",
        payload: frozenPayload,
        reconciliation: "CONFIRMED_BY_IDEMPOTENT_RETRY",
        updatedAt: traslado.updated_at,
      });
      transitionToConfirmedAwaitingRefreshWithDto(frozenPayload, traslado);

      // Fase D — enriquecimiento de presentación (no autoritativo). Si falla, la
      // mutación YA está confirmada y el estado permanece RECONCILED; el POST no
      // se repite (el reintento con la misma identidad devuelve el cache).
      return presentConfirmed(frozenPayload, traslado);
    },

    getStockItems(): Promise<StockItem[]> {
      return Promise.reject(
        blocked("getStockItems", BLOCKED_DETAILS.getStockItems),
      );
    },

    getStockDetail(): Promise<StockItem | null> {
      return Promise.reject(
        blocked("getStockDetail", BLOCKED_DETAILS.getStockDetail),
      );
    },

    async getDashboardKpis(
      filters?: DashboardFiltersQuery,
    ): Promise<InventoryKpiSummary> {
      assertDashboardFiltersSupported("getDashboardKpis", filters);
      return json(dashboardPath(filters), { method: "GET" }, false).then(
        toDashboardKpiSummary,
      );
    },

    getDashboardAlerts() {
      return Promise.reject(
        blocked("getDashboardAlerts", BLOCKED_DETAILS.getDashboardAlerts),
      );
    },

    async getLocationDistribution(
      filters?: DashboardFiltersQuery,
    ): Promise<LocationDistribution[]> {
      assertDashboardFiltersSupported("getLocationDistribution", filters);
      // `porUbicacion` de obtenerDashboardInventario es la fuente autoritativa
      // de saldos por ubicación. No publica nombre de ubicación ni unidades
      // bloqueadas: esos campos se exponen como `null`, nunca como cero.
      return json(dashboardPath(filters), { method: "GET" }, false).then(
        toLocationDistributionList,
      );
    },

    getCategories() {
      return Promise.reject(
        blocked("getCategories", BLOCKED_DETAILS.getCategories),
      );
    },

    getBrands() {
      return Promise.reject(blocked("getBrands", BLOCKED_DETAILS.getBrands));
    },

    getLocations() {
      return Promise.reject(blocked("getLocations", BLOCKED_DETAILS.getLocations));
    },
  };
}
