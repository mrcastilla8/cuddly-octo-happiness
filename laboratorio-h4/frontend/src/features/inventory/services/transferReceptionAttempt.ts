import { InventoryError } from "./inventoryErrors";
import type {
  DispositionType,
  ReceiveTransferPayload,
} from "./inventoryTypes";
import type { TrasladoInventarioDto } from "./inventoryMappers";

// Gestión inmutable de intentos de recepción de traslados (TAC-P0-01 / TAC-P0-02).
//
// TAC-P0-06: el registro de intentos inciertos y de confirmaciones con refresco
// pendiente se persiste en `sessionStorage` (por pestaña) además de mantenerse
// en memoria como caché sincronizada. Esto evita perder la identidad de una
// operación incierta al recargar el navegador, pero no garantiza conciliación
// entre dispositivos, entre pestañas ni tras borrar manualmente los datos del
// navegador o cerrar la sesión.
//
// El backend (`traslados.service.ts`) calcula el fingerprint de idempotencia con:
//   traslado_id, received_quantity, disposition, final_receipt, received_at,
//   note ?? null, intention = "recepcion_traslado".
// Por tanto:
//   1. Un reintento de la misma operación debe reutilizar EXACTAMENTE el mismo
//      `operationId`, `receivedAt`, `quantityReceived`, `disposition`,
//      `finalReceipt` y `note` (idéntica `Idempotency-Key` e idéntico JSON).
//   2. Cualquier cambio de cantidad, disposición, recepción final o nota
//      constituye una intención distinta y nunca puede reutilizar `operationId`.
//   3. Mientras una recepción esté en estado `UNCERTAIN` (respuesta perdida o
//      fallo >=500), no se permite mutar el contenido ni sustituir `operationId`
//      al cerrar/reabrir el modal o tras un `GET /inventario/traslados` genérico.
//
// Límite documentado: `sessionStorage` es por pestaña y se pierde al borrar los
// datos del navegador o al cerrar la pestaña. No se garantiza conciliación entre
// pestañas, dispositivos ni entre sesiones. No se implementa
// `GET /inventario/operaciones/{operationId}`; ese contrato está reservado a
// operaciones de Ventas/Postventa y no constituye conciliación autorizada de
// recepciones humanas.

export type TransferReceptionWriteState =
  | "IN_FLIGHT"
  | "UNCERTAIN"
  | "RECONCILED";

export type TransferReceptionReconciliationStatus =
  | "NONE"
  | "UNVERIFIABLE_BY_LIST_CONTRACT"
  | "CONFIRMED_BY_IDEMPOTENT_RETRY";

export type TransferReceptionPresentationRefresh =
  | "AWAITING"
  | "REFRESHED"
  | "UNVERIFIABLE_BY_AGGREGATE";

export interface TransferReceptionWriteRecord {
  readonly state: TransferReceptionWriteState;
  readonly payload: Readonly<ReceiveTransferPayload>;
  readonly reconciliation: TransferReceptionReconciliationStatus;
  readonly updatedAt: string;
  readonly presentationRefresh?: TransferReceptionPresentationRefresh;
}

export interface TransferReceptionDraftInput {
  readonly quantityReceived: number;
  readonly disposition: DispositionType;
  readonly finalReceipt: boolean;
  readonly note?: string;
}

const STORAGE_KEY = "inventory.transferReceptionAttempts.v1";
const STORAGE_VERSION = 2;

const DISPOSITIONS: readonly string[] = [
  "REINGRESAR_DISPONIBLE",
  "REINGRESAR_BLOQUEADO",
  "CONFIRMAR_MERMA",
];

export interface PersistedConfirmedReceptionWithDto {
  payload: ReceiveTransferPayload;
  dto: TrasladoInventarioDto;
}

interface PersistedTransferReceptionState {
  version: number;
  uncertain: unknown;
  inFlight: unknown;
  confirmedAwaiting: unknown;
  confirmedAwaitingWithDto?: unknown;
}

// Registros compartidos en memoria (caché sincronizada con sessionStorage).
const uncertainReceptionsByTransferId = new Map<
  string,
  Readonly<ReceiveTransferPayload>
>();
const inFlightReceptionsByTransferId = new Map<
  string,
  Readonly<ReceiveTransferPayload>
>();
const confirmedReceptionsAwaitingRefreshByTransferId = new Map<
  string,
  Readonly<ReceiveTransferPayload>
>();
const confirmedReceptionsAwaitingRefreshWithDtoByTransferId = new Map<
  string,
  PersistedConfirmedReceptionWithDto
>();

// Traslados cuyo registro persistido está corrupto o no pudo validarse. Se
// bloquean sin inventar una identidad de operación.
const blockedTransferIds = new Set<string>();
let storageCorruptedAll = false;
let storageEphemeral = false;
let lastGoodPersistedState: string | null = null;

function createMemoryStorage(): Storage {
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

let fallbackStorage: Storage | null = null;

function getSessionStorage(): Storage {
  try {
    if (typeof sessionStorage !== "undefined" && sessionStorage) {
      storageEphemeral = false;
      return sessionStorage;
    }
  } catch {
    // Ignorar y usar almacenamiento en memoria fuera del navegador.
  }
  storageEphemeral = true;
  if (!fallbackStorage) fallbackStorage = createMemoryStorage();
  return fallbackStorage;
}

export function isTransferReceptionStorageEphemeral(): boolean {
  return storageEphemeral;
}

function isValidReceiveTransferPayload(value: unknown): value is ReceiveTransferPayload {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.transferId === "string" &&
    typeof payload.operationId === "string" &&
    typeof payload.receivedAt === "string" &&
    typeof payload.quantityReceived === "number" &&
    Number.isSafeInteger(payload.quantityReceived) &&
    payload.quantityReceived > 0 &&
    typeof payload.disposition === "string" &&
    DISPOSITIONS.includes(payload.disposition) &&
    typeof payload.finalReceipt === "boolean" &&
    (payload.note === undefined || typeof payload.note === "string")
  );
}

function isValidTrasladoDtoForPersistence(value: unknown): value is TrasladoInventarioDto {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const dto = value as Record<string, unknown>;
  return (
    typeof dto.traslado_id === "string" &&
    typeof dto.sku === "string" &&
    typeof dto.quantity_shipped === "number" &&
    Number.isSafeInteger(dto.quantity_shipped) &&
    dto.quantity_shipped >= 1 &&
    typeof dto.quantity_received === "number" &&
    Number.isSafeInteger(dto.quantity_received) &&
    dto.quantity_received >= 0 &&
    typeof dto.missing_quantity === "number" &&
    Number.isSafeInteger(dto.missing_quantity) &&
    dto.missing_quantity >= 0 &&
    typeof dto.source_location_id === "string" &&
    typeof dto.target_location_id === "string" &&
    typeof dto.estado === "string" &&
    ["EN_TRANSITO", "RECIBIDO_PARCIAL", "COMPLETADO", "COMPLETADO_CON_DISCREPANCIA"].includes(
      dto.estado,
    ) &&
    typeof dto.created_at === "string" &&
    typeof dto.updated_at === "string" &&
    (dto.source_incident_id === undefined || dto.source_incident_id === null || typeof dto.source_incident_id === "string")
  );
}

function markBlockedTransferId(value: unknown): void {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).transferId === "string"
  ) {
    blockedTransferIds.add((value as { transferId: string }).transferId);
    return;
  }
  storageCorruptedAll = true;
}

function markBlockedFromUnknown(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) markBlockedTransferId(item);
    if (value.length === 0) storageCorruptedAll = true;
    return;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["uncertain", "inFlight", "confirmedAwaiting"]) {
      if (Array.isArray(record[key])) {
        for (const item of record[key] as unknown[]) markBlockedTransferId(item);
      } else if (record[key] !== undefined) {
        storageCorruptedAll = true;
      }
    }
    return;
  }
  storageCorruptedAll = true;
}

function isPersistedState(value: unknown): value is PersistedTransferReceptionState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  return (
    state.version === STORAGE_VERSION &&
    Array.isArray(state.uncertain) &&
    Array.isArray(state.inFlight) &&
    Array.isArray(state.confirmedAwaiting)
  );
}

function persistState(): void {
  const storage = getSessionStorage();
  if (!storage) {
    throw new InventoryError(
      "CONTRATO_BLOQUEADO",
      "No se pudo persistir el intento de recepción: almacenamiento no disponible.",
    );
  }
  const confirmedAwaitingWithDto: PersistedConfirmedReceptionWithDto[] = [];
  for (const [transferId, record] of confirmedReceptionsAwaitingRefreshWithDtoByTransferId.entries()) {
    if (isValidReceiveTransferPayload(record.payload) && isValidTrasladoDtoForPersistence(record.dto)) {
      confirmedAwaitingWithDto.push({
        payload: freezeReceiveTransferPayload(record.payload),
        dto: record.dto,
      });
    } else {
      blockedTransferIds.add(transferId);
    }
  }
  const state: PersistedTransferReceptionState = {
    version: STORAGE_VERSION,
    uncertain: [...uncertainReceptionsByTransferId.values()],
    inFlight: [...inFlightReceptionsByTransferId.values()],
    confirmedAwaiting: [...confirmedReceptionsAwaitingRefreshByTransferId.values()],
    confirmedAwaitingWithDto,
  };
  const serialized = JSON.stringify(state);
  try {
    storage.setItem(STORAGE_KEY, serialized);
    if (typeof storage.getItem === "function") {
      const verified = storage.getItem(STORAGE_KEY);
      if (verified !== serialized) {
        throw new Error("Persisted snapshot verification failed");
      }
    }
    lastGoodPersistedState = serialized;
  } catch {
    if (lastGoodPersistedState !== null && typeof storage.setItem === "function") {
      try {
        storage.setItem(STORAGE_KEY, lastGoodPersistedState);
      } catch {
        // Fall through to throw
      }
    }
    throw new InventoryError(
      "CONTRATO_BLOQUEADO",
      "No se pudo persistir el intento de recepción.",
    );
  }
}

function restoreFromStorage(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  let rawToParse: string | null;
  try {
    rawToParse = storage.getItem(STORAGE_KEY);
  } catch {
    storageCorruptedAll = true;
    return;
  }
  if (rawToParse === null) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawToParse);
  } catch {
    storageCorruptedAll = true;
    return;
  }
  if (!isPersistedState(parsed)) {
    markBlockedFromUnknown(parsed);
    if (blockedTransferIds.size === 0) storageCorruptedAll = true;
    return;
  }

  for (const item of parsed.inFlight as unknown[]) {
    if (isValidReceiveTransferPayload(item)) {
      const frozen = freezeReceiveTransferPayload(item);
      // Conservadoramente, un IN_FLIGHT restaurado tras reload se trata como
      // UNCERTAIN: no se sabe si el POST llegó al backend.
      uncertainReceptionsByTransferId.set(frozen.transferId, frozen);
    } else {
      markBlockedTransferId(item);
    }
  }
  for (const item of parsed.uncertain as unknown[]) {
    if (isValidReceiveTransferPayload(item)) {
      const frozen = freezeReceiveTransferPayload(item);
      uncertainReceptionsByTransferId.set(frozen.transferId, frozen);
    } else {
      markBlockedTransferId(item);
    }
  }
  for (const item of parsed.confirmedAwaiting as unknown[]) {
    if (isValidReceiveTransferPayload(item)) {
      const frozen = freezeReceiveTransferPayload(item);
      confirmedReceptionsAwaitingRefreshByTransferId.set(frozen.transferId, frozen);
    } else {
      markBlockedTransferId(item);
    }
  }

  if (Array.isArray(parsed.confirmedAwaitingWithDto)) {
    for (const item of parsed.confirmedAwaitingWithDto as unknown[]) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        if (
          isValidReceiveTransferPayload(record.payload) &&
          isValidTrasladoDtoForPersistence(record.dto)
        ) {
          const frozen = freezeReceiveTransferPayload(record.payload);
          confirmedReceptionsAwaitingRefreshWithDtoByTransferId.set(frozen.transferId, {
            payload: frozen,
            dto: record.dto as TrasladoInventarioDto,
          });
          confirmedReceptionsAwaitingRefreshByTransferId.set(frozen.transferId, frozen);
        } else {
          markBlockedTransferId(record.payload);
        }
      } else {
        storageCorruptedAll = true;
      }
    }
  } else if ((parsed as PersistedTransferReceptionState).confirmedAwaitingWithDto !== undefined) {
    storageCorruptedAll = true;
  }

  // El estado IN_FLIGHT ya fue promovido a UNCERTAIN; no se conserva como tal.
  inFlightReceptionsByTransferId.clear();

  // Fail-closed: si hay corrupción (storageCorruptedAll o blockedTransferIds.size > 0),
  // NUNCA reescribir storage; de lo contrario se eliminarían silenciosamente los
  // registros corruptos y se perdería el bloqueo al recargar el navegador.
  if (storageCorruptedAll || blockedTransferIds.size > 0) {
    return;
  }

  // Si hubo IN_FLIGHT promovido a UNCERTAIN y el storage está sano, persistir la promoción.
  if (Array.isArray(parsed.inFlight) && parsed.inFlight.length > 0) {
    try {
      persistState();
    } catch {
      // La restauración no debe lanzar durante la carga del módulo.
    }
  } else {
    lastGoodPersistedState = rawToParse;
  }
}

restoreFromStorage();

export function createTransferOperationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function normalizeReceptionNote(
  note: string | undefined,
): string | undefined {
  if (note === undefined) return undefined;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function computeReceiveTransferContentSignature(
  transferId: string,
  draft: TransferReceptionDraftInput,
): string {
  return JSON.stringify([
    transferId,
    draft.quantityReceived,
    draft.disposition,
    draft.finalReceipt,
    normalizeReceptionNote(draft.note) ?? null,
  ]);
}

export function freezeReceiveTransferPayload(
  payload: ReceiveTransferPayload,
): Readonly<ReceiveTransferPayload> {
  const normalizedNote = normalizeReceptionNote(payload.note);
  const copy: ReceiveTransferPayload = {
    transferId: payload.transferId,
    quantityReceived: payload.quantityReceived,
    disposition: payload.disposition,
    finalReceipt: payload.finalReceipt,
    operationId: payload.operationId,
    receivedAt: payload.receivedAt,
    ...(normalizedNote !== undefined ? { note: normalizedNote } : {}),
  };
  return Object.freeze(copy);
}

export function areSameReceiveTransferPayloads(
  a: ReceiveTransferPayload,
  b: ReceiveTransferPayload,
): boolean {
  return (
    a.transferId === b.transferId &&
    a.operationId === b.operationId &&
    a.quantityReceived === b.quantityReceived &&
    a.disposition === b.disposition &&
    a.finalReceipt === b.finalReceipt &&
    a.receivedAt === b.receivedAt &&
    (normalizeReceptionNote(a.note) ?? null) ===
      (normalizeReceptionNote(b.note) ?? null)
  );
}

export function getUncertainTransferReception(
  transferId: string,
): Readonly<ReceiveTransferPayload> | null {
  return uncertainReceptionsByTransferId.get(transferId) ?? null;
}

export function setUncertainTransferReception(
  payload: ReceiveTransferPayload,
): Readonly<ReceiveTransferPayload> {
  const frozen = freezeReceiveTransferPayload(payload);
  inFlightReceptionsByTransferId.delete(frozen.transferId);
  uncertainReceptionsByTransferId.set(frozen.transferId, frozen);
  persistState();
  return frozen;
}

export function clearUncertainTransferReception(
  transferId: string,
  operationId?: string,
): void {
  const current = uncertainReceptionsByTransferId.get(transferId);
  if (!current) return;
  if (operationId !== undefined && current.operationId !== operationId) return;
  uncertainReceptionsByTransferId.delete(transferId);
  try {
    persistState();
  } catch {
    // La limpieza no debe lanzar; el estado en memoria ya se actualizó.
  }
}

export function resetUncertainTransferReceptions(): void {
  uncertainReceptionsByTransferId.clear();
  inFlightReceptionsByTransferId.clear();
  blockedTransferIds.clear();
  storageCorruptedAll = false;
  storageEphemeral = false;
  lastGoodPersistedState = null;
  confirmedReceptionsAwaitingRefreshWithDtoByTransferId.clear();
  const storage = getSessionStorage();
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorar errores de almacenamiento en reset.
    }
  }
}

// Simula la rehidratación conservando el contenido existente de sessionStorage
// y reconstruyendo el estado del módulo (reemplaza reset() en pruebas de recarga).
export function rehydrateTransferReceptionsForTesting(): void {
  uncertainReceptionsByTransferId.clear();
  inFlightReceptionsByTransferId.clear();
  confirmedReceptionsAwaitingRefreshByTransferId.clear();
  confirmedReceptionsAwaitingRefreshWithDtoByTransferId.clear();
  blockedTransferIds.clear();
  storageCorruptedAll = false;
  lastGoodPersistedState = null;
  restoreFromStorage();
}

export function setInFlightTransferReception(
  payload: ReceiveTransferPayload,
): Readonly<ReceiveTransferPayload> {
  if (typeof window !== "undefined") {
    const storage = getSessionStorage();
    try {
      if (storage === fallbackStorage && storageEphemeral) {
        throw new InventoryError(
          "CONTRATO_BLOQUEADO",
          "No se garantiza la persistencia de la recepción en este entorno. No se inicia el envío para evitar pérdida de identidad.",
        );
      }
    } catch (error) {
      if (error instanceof InventoryError) throw error;
    }
  }
  const frozen = freezeReceiveTransferPayload(payload);
  const transferId = frozen.transferId;

  if (isTransferReceptionStorageBlocked(transferId)) {
    throw new InventoryError(
      "CONTRATO_BLOQUEADO",
      "El registro persistido de recepción está corrupto o no se pudo validar; no se genera una nueva operación.",
    );
  }

  // Conservar estado previo de los mapas para rollback fail-closed si falla la persistencia
  const prevUncertain = uncertainReceptionsByTransferId.get(transferId);
  const prevInFlight = inFlightReceptionsByTransferId.get(transferId);
  const prevConfirmed = confirmedReceptionsAwaitingRefreshByTransferId.get(transferId);
  const prevConfirmedWithDto = confirmedReceptionsAwaitingRefreshWithDtoByTransferId.get(transferId);

  uncertainReceptionsByTransferId.delete(transferId);
  inFlightReceptionsByTransferId.set(transferId, frozen);

  try {
    persistState();
  } catch (error) {
    // Rollback fail-closed: restaurar mapas al estado previo exacto
    if (prevUncertain) {
      uncertainReceptionsByTransferId.set(transferId, prevUncertain);
    } else {
      uncertainReceptionsByTransferId.delete(transferId);
    }
    if (prevInFlight) {
      inFlightReceptionsByTransferId.set(transferId, prevInFlight);
    } else {
      inFlightReceptionsByTransferId.delete(transferId);
    }
    if (prevConfirmed) {
      confirmedReceptionsAwaitingRefreshByTransferId.set(transferId, prevConfirmed);
    } else {
      confirmedReceptionsAwaitingRefreshByTransferId.delete(transferId);
    }
    if (prevConfirmedWithDto) {
      confirmedReceptionsAwaitingRefreshWithDtoByTransferId.set(transferId, prevConfirmedWithDto);
    } else {
      confirmedReceptionsAwaitingRefreshWithDtoByTransferId.delete(transferId);
    }
    throw error;
  }

  return frozen;
}

export function clearInFlightTransferReception(
  transferId: string,
  operationId?: string,
): void {
  const current = inFlightReceptionsByTransferId.get(transferId);
  if (!current) return;
  if (operationId !== undefined && current.operationId !== operationId) return;
  inFlightReceptionsByTransferId.delete(transferId);
  try {
    persistState();
  } catch {
    // Ignorar errores de almacenamiento en limpieza.
  }
}

export function isTransferReceptionStorageBlocked(transferId: string): boolean {
  return storageCorruptedAll || blockedTransferIds.has(transferId);
}

export function getConfirmedTransferReceptionAwaitingRefresh(
  transferId: string,
): Readonly<ReceiveTransferPayload> | null {
  return confirmedReceptionsAwaitingRefreshByTransferId.get(transferId) ?? null;
}

export function getConfirmedTransferReceptionAwaitingRefreshWithDto(
  transferId: string,
): PersistedConfirmedReceptionWithDto | null {
  return confirmedReceptionsAwaitingRefreshWithDtoByTransferId.get(transferId) ?? null;
}

export function getAllUncertainTransferReceptions(): Array<Readonly<ReceiveTransferPayload>> {
  return [...uncertainReceptionsByTransferId.values()];
}

export function getAllConfirmedTransferReceptionsAwaitingRefresh(): Array<Readonly<ReceiveTransferPayload>> {
  return [...confirmedReceptionsAwaitingRefreshByTransferId.values()];
}

export function getAllConfirmedTransferReceptionsAwaitingRefreshWithDto(): Array<PersistedConfirmedReceptionWithDto> {
  return [...confirmedReceptionsAwaitingRefreshWithDtoByTransferId.values()];
}

export function markTransferReceptionConfirmedAwaitingRefresh(
  payload: ReceiveTransferPayload,
): Readonly<ReceiveTransferPayload> {
  const frozen = freezeReceiveTransferPayload(payload);
  uncertainReceptionsByTransferId.delete(frozen.transferId);
  inFlightReceptionsByTransferId.delete(frozen.transferId);
  confirmedReceptionsAwaitingRefreshByTransferId.set(frozen.transferId, frozen);
  persistState();
  return frozen;
}

export function transitionToConfirmedAwaitingRefreshWithDto(
  payload: ReceiveTransferPayload,
  dto: TrasladoInventarioDto,
): Readonly<ReceiveTransferPayload> {
  const frozen = freezeReceiveTransferPayload(payload);
  const transferId = frozen.transferId;

  // Transición atómica de mapas en memoria (sin pasar por estados intermedios vacíos)
  uncertainReceptionsByTransferId.delete(transferId);
  inFlightReceptionsByTransferId.delete(transferId);
  confirmedReceptionsAwaitingRefreshByTransferId.set(transferId, frozen);
  confirmedReceptionsAwaitingRefreshWithDtoByTransferId.set(transferId, {
    payload: frozen,
    dto,
  });

  try {
    persistState();
  } catch {
    // Si la persistencia de la confirmación falla (ej. cuota de sessionStorage agotada):
    // 1. En storage, persistState() restaura lastGoodPersistedState (o setItem fallido no modifica el storage),
    //    manteniendo el snapshot IN_FLIGHT previo intacto con el operationId y payload originales.
    // 2. Al recargar la pestaña, restoreFromStorage() promoverá ese IN_FLIGHT a UNCERTAIN,
    //    conservando la identidad inmutable y el bloqueo estricto contra nuevas intenciones.
    // 3. En la sesión actual en memoria no se revierte la confirmación, pues el servidor
    //    ya acreditó el 200 con DTO válido. No se presenta el fallo local de storage
    //    como un rechazo de la mutación.
  }

  return frozen;
}

export const markTransferReceptionConfirmedAwaitingRefreshWithDto =
  transitionToConfirmedAwaitingRefreshWithDto;

export function clearConfirmedTransferReceptionAwaitingRefresh(
  transferId: string,
): void {
  confirmedReceptionsAwaitingRefreshByTransferId.delete(transferId);
  confirmedReceptionsAwaitingRefreshWithDtoByTransferId.delete(transferId);
  try {
    persistState();
  } catch {
    // Ignorar errores de almacenamiento en limpieza.
  }
}

export function resetConfirmedTransferReceptionsAwaitingRefresh(): void {
  confirmedReceptionsAwaitingRefreshByTransferId.clear();
  confirmedReceptionsAwaitingRefreshWithDtoByTransferId.clear();
  try {
    persistState();
  } catch {
    // Ignorar errores de almacenamiento en reset.
  }
}

export interface TransferReceptionFormSessionOptions {
  readonly createId?: () => string;
  readonly now?: () => string;
}

export interface TransferReceptionFormSession {
  readonly transferId: string;
  getUncertainPayload(): Readonly<ReceiveTransferPayload> | null;
  getLastAttemptPayload(): Readonly<ReceiveTransferPayload> | null;
  prepareSubmission(
    draft: TransferReceptionDraftInput,
  ): Readonly<ReceiveTransferPayload>;
  recordSuccess(payload: Readonly<ReceiveTransferPayload>): void;
  recordConfirmed(payload: Readonly<ReceiveTransferPayload>): void;
  recordFailure(
    payload: Readonly<ReceiveTransferPayload>,
    error: unknown,
  ): Readonly<ReceiveTransferPayload> | null;
}

export function createTransferReceptionFormSession(
  transferId: string,
  options: TransferReceptionFormSessionOptions = {},
): TransferReceptionFormSession {
  const createId = options.createId ?? createTransferOperationId;
  const now = options.now ?? (() => new Date().toISOString());

  let lastAttempt: Readonly<ReceiveTransferPayload> | null =
    getUncertainTransferReception(transferId) ??
    getConfirmedTransferReceptionAwaitingRefresh(transferId);

  return {
    transferId,

    getUncertainPayload(): Readonly<ReceiveTransferPayload> | null {
      return getUncertainTransferReception(transferId);
    },

    getLastAttemptPayload(): Readonly<ReceiveTransferPayload> | null {
      return lastAttempt;
    },

    prepareSubmission(
      draft: TransferReceptionDraftInput,
    ): Readonly<ReceiveTransferPayload> {
      if (isTransferReceptionStorageBlocked(transferId)) {
        throw new InventoryError(
          "CONTRATO_BLOQUEADO",
          "El registro persistido de recepción está corrupto o no se pudo validar; no se genera una nueva operación.",
        );
      }

      const draftSignature = computeReceiveTransferContentSignature(
        transferId,
        draft,
      );

      const confirmed =
        getConfirmedTransferReceptionAwaitingRefresh(transferId);
      if (confirmed) {
        const confirmedSignature = computeReceiveTransferContentSignature(
          transferId,
          confirmed,
        );
        if (confirmedSignature !== draftSignature) {
          throw new InventoryError(
            "PRESENTACION_FALLIDA",
            "La recepción anterior ya fue confirmada por Inventory. Actualiza la bandeja para reflejar el saldo real del traslado antes de registrar otra recepción parcial.",
          );
        }
        lastAttempt = confirmed;
        return confirmed;
      }

      const uncertain = getUncertainTransferReception(transferId);

      if (uncertain) {
        const uncertainSignature = computeReceiveTransferContentSignature(
          transferId,
          uncertain,
        );
        if (draftSignature !== uncertainSignature) {
          throw new InventoryError(
            "RESULTADO_INCIERTO",
            "Existe una recepción con resultado incierto para este traslado. No se puede modificar la cantidad, disposición, cierre final ni nota hasta recuperar la confirmación de la solicitud original.",
          );
        }
        lastAttempt = uncertain;
        return uncertain;
      }

      if (lastAttempt) {
        const previousSignature = computeReceiveTransferContentSignature(
          transferId,
          lastAttempt,
        );
        if (draftSignature === previousSignature) {
          return lastAttempt;
        }
      }

      const normalizedNote = normalizeReceptionNote(draft.note);
      const created = freezeReceiveTransferPayload({
        transferId,
        quantityReceived: draft.quantityReceived,
        disposition: draft.disposition,
        finalReceipt: draft.finalReceipt,
        operationId: createId(),
        receivedAt: now(),
        ...(normalizedNote !== undefined ? { note: normalizedNote } : {}),
      });
      lastAttempt = created;
      return created;
    },

    recordSuccess(payload: Readonly<ReceiveTransferPayload>): void {
      clearUncertainTransferReception(transferId, payload.operationId);
      lastAttempt = payload;
    },

    recordConfirmed(payload: Readonly<ReceiveTransferPayload>): void {
      lastAttempt = markTransferReceptionConfirmedAwaitingRefresh(payload);
    },

    recordFailure(
      payload: Readonly<ReceiveTransferPayload>,
      error: unknown,
    ): Readonly<ReceiveTransferPayload> | null {
      if (
        error instanceof InventoryError &&
        error.code === "RESULTADO_INCIERTO"
      ) {
        const stored = setUncertainTransferReception(payload);
        lastAttempt = stored;
        return stored;
      }
      return getUncertainTransferReception(transferId);
    },
  };
}