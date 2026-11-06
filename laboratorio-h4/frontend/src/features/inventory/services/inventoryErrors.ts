export type InventoryErrorCode =
  // Códigos de negocio ya usados por el adaptador mock y el contrato OpenAPI.
  | "VALIDACION"
  | "TRASLADO_NO_ENCONTRADO"
  | "TRASLADO_NO_RECIBIBLE"
  | "CANTIDAD_INVALIDA"
  | "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO"
  | "DISPOSICION_RECEPCION_INVALIDA"
  | "IDEMPOTENCY_CONFLICT"
  // Estado operativo local usado por el mock persistente (master).
  | "OPERATIVO"
  // Protocolo HTTP del provider (OpenAPI: TOKEN_INVALIDO/SCOPE_INSUFICIENTE/
  // SERVICIO_NO_DISPONIBLE) y estado de una operación de escritura.
  | "NO_AUTENTICADO"
  | "SIN_PERMISO"
  | "SERVICIO_NO_DISPONIBLE"
  | "RESULTADO_INCIERTO"
  | "OPERACION_EN_CURSO"
  // La respuesta no cumple el contrato vigente, o falta una dependencia
  // autoritativa que el composition root debe inyectar (nunca se sustituye
  // por un mock).
  | "RESPUESTA_INCOMPATIBLE"
  | "CONTRATO_BLOQUEADO"
  // TAC-P0-08: estado LOCAL de UI, no un código del provider. Indica que la
  // mutación ya fue confirmada por Inventory y que lo único que falló fue el
  // enriquecimiento/refresco de presentación. Nunca es un fallo transaccional.
  | "PRESENTACION_FALLIDA";

export class InventoryError extends Error {
  readonly code: InventoryErrorCode;

  constructor(code: InventoryErrorCode, message: string) {
    super(message);
    this.name = "InventoryError";
    this.code = code;
  }
}

// TAC-P0-08 — WRITE_CONFIRMED vs PRESENTATION_FAILED.
//
// El adaptador registra la confirmación autoritativa (HTTP 200 + DTO válido)
// ANTES de resolver la presentación. Si ese enriquecimiento falla, la
// recepción YA está persistida: propagar un error genérico haría que el
// formulario lo tratase como un fallo de la mutación y permitiese una segunda
// intención sobre una vista desactualizada. Este error separa ambos desenlaces:
//   - `code` conserva el motivo real de presentación (CONTRATO_BLOQUEADO,
//     RESPUESTA_INCOMPATIBLE o PRESENTACION_FALLIDA), útil para diagnóstico.
//   - `transferId`/`operationId` identifican la operación confirmada.
//   - `isInventoryPresentationFailure()` permite al hook y al formulario
//     bloquear la edición y refrescar la bandeja SIN repetir el POST.
export class InventoryPresentationFailedError extends InventoryError {
  readonly transferId: string;
  readonly operationId: string;
  readonly presentationCode: InventoryErrorCode;
  readonly presentationDetail: string;

  constructor(transferId: string, operationId: string, cause: unknown) {
    const code: InventoryErrorCode =
      cause instanceof InventoryError ? cause.code : "PRESENTACION_FALLIDA";
    const detail =
      cause instanceof Error && cause.message.length > 0
        ? cause.message
        : "No se pudo enriquecer la presentación del traslado.";
    super(
      code,
      `La recepción fue registrada en Inventory, pero no se pudo actualizar la vista: ${detail} No repitas la recepción; actualiza la bandeja para reflejar el saldo real.`,
    );
    this.name = "InventoryPresentationFailedError";
    this.transferId = transferId;
    this.operationId = operationId;
    this.presentationCode = code;
    this.presentationDetail = detail;
  }
}

export function isInventoryPresentationFailure(
  error: unknown,
): error is InventoryPresentationFailedError {
  return error instanceof InventoryPresentationFailedError;
}
