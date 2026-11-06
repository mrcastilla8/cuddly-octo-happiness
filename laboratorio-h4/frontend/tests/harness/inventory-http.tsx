import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/oswald/latin-700.css";
import "../../src/theme/global.css";
import { theme, cssVariablesResolver } from "../../src/theme/theme";
import { DataModeContext } from "../../src/app/config/DataModeContext";
import { resetInventoryRepository } from "../../src/features/inventory/services/inventoryProvider";
import {
  createHttpInventoryRepository,
  type InventoryHttpRequest,
} from "../../src/features/inventory/adapters/apiInventoryAdapter";
import { InventoryError } from "../../src/features/inventory/services/inventoryErrors";
import { notifyInventoryChanged } from "../../src/features/inventory/services/inventoryEvents";

// Harness de navegador para el adaptador HTTP REAL de inventario.
//
// A diferencia de `inventory-adapter.tsx` (que inyecta un repositorio
// alternativo), aquí se compone `createHttpInventoryRepository` con un
// transporte de prueba y un resolvedor de presentación controlable. Así la
// prueba Playwright recorre adaptador + hook + modal + bandeja con el mismo
// código de producción, sin inventar endpoints ni DTO: el transporte responde
// exactamente la forma del contrato OpenAPI 0.6.0-rc.1 ya validada por las
// pruebas unitarias.
//
// El escenario reproduce TAC-P0-08 y TAC-P1-10:
//   1. `GET /traslados` presenta el traslado (resolvedor disponible).
//   2. `POST /recepciones` responde 200 con un DTO válido -> confirmación.
//   3. El resolvedor de presentación falla DESPUÉS de la confirmación.
//   4. El formulario debe bloquearse y no emitir un segundo POST.
//   5. Un GET válido pero todavía desactualizado (TAC-P1-10) tampoco libera el
//      bloqueo; solo lo hace un GET cuyo agregado coincide con la confirmación.

interface InventoryHttpScenario {
  /** Hace fallar el enriquecimiento de presentación (no la mutación). */
  setPresentationDown(value: boolean): void;
  /**
   * TAC-P1-10: el GET responde el agregado previo (0/10/EN_TRANSITO) aunque el
   * POST ya haya confirmado la recepción. Sirve para probar que un HTTP 200
   * presentable no libera el bloqueo.
   */
  setStaleRead(value: boolean): void;
  /** Dispara la misma señal interna que usa la bandeja para refrescar. */
  refresh(): void;
  /** Cantidad de POST /recepciones efectivamente emitidos. */
  postCount(): number;
  /** Cantidad acumulada de unidades confirmadas por el servidor de prueba. */
  confirmedQuantity(): number;
  /** Último `operation_id` enviado en el body del POST. */
  lastOperationId(): string | null;
  /** Último body enviado en el POST. */
  lastPayload(): Record<string, unknown> | null;
}

declare global {
  interface Window {
    inventoryHttpScenario: InventoryHttpScenario;
  }
}

const TRANSFER_ID = "http-tr-1";
const SHIPPED_QUANTITY = 10;

let presentationDown = false;
let staleRead = false;
let receivedQuantity = 0;
let postCount = 0;
let lastOperationId: string | null = null;
let lastPayload: Record<string, unknown> | null = null;

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

function trasladoDto(quantityReceived = receivedQuantity) {
  const estado =
    quantityReceived === 0
      ? "EN_TRANSITO"
      : quantityReceived >= SHIPPED_QUANTITY
        ? "COMPLETADO"
        : "RECIBIDO_PARCIAL";

  return {
    traslado_id: TRANSFER_ID,
    source_incident_id: null,
    sku: "HTTP-RUN-41-BLU",
    quantity_shipped: SHIPPED_QUANTITY,
    quantity_received: quantityReceived,
    missing_quantity: SHIPPED_QUANTITY - quantityReceived,
    source_location_id: "http-loc-1",
    target_location_id: "http-loc-2",
    estado,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-02T00:00:00.000Z",
  };
}

const transport = {
  async request(
    path: string,
    request: InventoryHttpRequest,
  ): Promise<Response> {
    if (path.includes("/recepciones")) {
      if (request.method !== "POST") {
        return problemResponse(405, "METODO_NO_PERMITIDO");
      }
      const body = JSON.parse(request.body ?? "{}") as {
        operation_id?: string;
        received_quantity?: number;
        disposition?: string;
      };
      const operationId = body.operation_id ?? "";
      const quantity = body.received_quantity ?? 0;

      // Confirmación autoritativa: el servidor aplica la recepción y responde
      // con el DTO de confirmación del contrato, antes de cualquier
      // enriquecimiento de presentación.
      receivedQuantity += quantity;
      postCount += 1;
      lastOperationId = operationId;
      lastPayload = body as Record<string, unknown>;

      return jsonResponse({
        receipt_id: `receipt-${postCount}`,
        operation_id: operationId,
        traslado: trasladoDto(),
        disposition: body.disposition ?? "REINGRESAR_DISPONIBLE",
        received_quantity: quantity,
        destination_balance: null,
        completed_at: "2026-10-03T00:00:00.000Z",
      });
    }

    if (path.startsWith("/api/v1/inventario/traslados")) {
      return jsonResponse({
        // TAC-P1-10: simula una lectura que todavía no refleja el POST. El DTO
        // sigue siendo válido y presentable; solo es el saldo anterior.
        items: [trasladoDto(staleRead ? 0 : receivedQuantity)],
        pagina: 1,
        tamanio: 100,
        total: 1,
      });
    }

    return problemResponse(404, "NO_ENCONTRADO");
  },
};

const repository = createHttpInventoryRepository({
  transport,
  resolveTransferPresentation: async () => {
    if (presentationDown) {
      throw new InventoryError(
        "CONTRATO_BLOQUEADO",
        "Resolvedor autoritativo de presentación no disponible (simulación TAC-P0-08).",
      );
    }
    return {
      transferCode: "TR-HTTP-001",
      productName: "Zapatilla HTTP Trail Runner",
      sourceLocationName: "Centro de Distribución HTTP",
      targetLocationName: "Tienda HTTP Cusco",
    };
  },
});

resetInventoryRepository(repository);

window.inventoryHttpScenario = {
  setPresentationDown(value: boolean): void {
    presentationDown = value;
  },
  setStaleRead(value: boolean): void {
    staleRead = value;
  },
  refresh(): void {
    notifyInventoryChanged();
  },
  postCount(): number {
    return postCount;
  },
  confirmedQuantity(): number {
    return receivedQuantity;
  },
  lastOperationId(): string | null {
    return lastOperationId;
  },
  lastPayload(): Record<string, unknown> | null {
    return lastPayload;
  },
};

const params = new URLSearchParams(window.location.search);
window.history.replaceState(null, "", params.get("path") ?? "/inventario/traslados");

const { App } = await import("../../src/app/App");

createRoot(document.getElementById("root")!).render(
  <MantineProvider
    theme={theme}
    cssVariablesResolver={cssVariablesResolver}
    forceColorScheme="light"
  >
    {/*
      El modo de datos solo habilita/oculta features en la app; el repositorio
      ya fue inyectado explícitamente con `resetInventoryRepository`. Se usa
      "mock" porque `CommercialModeGate` mantiene Inventario bloqueado en modo
      API hasta que exista la integración real (#45/#109).
    */}
    <DataModeContext.Provider value="mock">
      <App />
    </DataModeContext.Provider>
  </MantineProvider>,
);
