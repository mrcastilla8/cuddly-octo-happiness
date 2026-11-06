import { test, expect } from "@playwright/test";
import { MockInventoryAdapter } from "../src/features/inventory/adapters/mockInventoryAdapter";
import { AlternateInventoryRepository } from "./adapters/alternateInventoryRepository";
import { InventoryError } from "../src/features/inventory/services/inventoryErrors";
import type { ReceiveTransferPayload } from "../src/features/inventory/services/inventoryTypes";

const { describe, beforeEach } = test;
const it = test;

describe("P1: Idempotencia y validaciones de operaciones", () => {
  let mockAdapter: MockInventoryAdapter;
  let alternateRepo: AlternateInventoryRepository;

  beforeEach(() => {
    mockAdapter = new MockInventoryAdapter();
    alternateRepo = new AlternateInventoryRepository();
  });

  describe("MockInventoryAdapter", () => {
    it("operation_id con formato UUID inválido lanza VALIDACION", async () => {
      const payload: ReceiveTransferPayload = {
        transferId: "tr-002",
        quantityReceived: 10,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        operationId: "not-a-uuid",
        receivedAt: new Date().toISOString(),
        note: "test",
      };

      await expect(mockAdapter.receiveTransfer(payload)).rejects.toThrow(
        "El identificador de operación (operation_id) debe ser un UUID válido.",
      );
    });

    it("operation_id con formato UUID inválido lanza código VALIDACION (no IDEMPOTENCY_CONFLICT)", async () => {
      const payload: ReceiveTransferPayload = {
        transferId: "tr-002",
        quantityReceived: 10,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        operationId: "not-a-uuid",
        receivedAt: new Date().toISOString(),
      };

      try {
        await mockAdapter.receiveTransfer(payload);
        throw new Error("Debió lanzar InventoryError");
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryError);
        const error = err as InventoryError;
        expect(error.code).toBe("VALIDACION");
        expect(error.code).not.toBe("IDEMPOTENCY_CONFLICT");
      }
    });

    it("Nota superior a 500 caracteres lanza VALIDACION", async () => {
      const payload: ReceiveTransferPayload = {
        transferId: "tr-002",
        quantityReceived: 10,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        operationId: "123e4567-e89b-12d3-a456-426614174000",
        receivedAt: new Date().toISOString(),
        note: "X".repeat(501),
      };

      await expect(mockAdapter.receiveTransfer(payload)).rejects.toThrow(
        "La nota de recepción (note) no puede superar los 500 caracteres.",
      );
    });

    it("Nota > 500 caracteres lanza código VALIDACION (no IDEMPOTENCY_CONFLICT)", async () => {
      const payload: ReceiveTransferPayload = {
        transferId: "tr-002",
        quantityReceived: 10,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        operationId: "123e4567-e89b-12d3-a456-426614174000",
        receivedAt: new Date().toISOString(),
        note: "X".repeat(501),
      };

      try {
        await mockAdapter.receiveTransfer(payload);
        throw new Error("Debió lanzar InventoryError");
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryError);
        const error = err as InventoryError;
        expect(error.code).toBe("VALIDACION");
        expect(error.code).not.toBe("IDEMPOTENCY_CONFLICT");
      }
    });

    it("Retry con misma operation_id y misma intención es idempotente (stock físico y disponible no se duplican)", async () => {
      const operationId = "123e4567-e89b-12d3-a456-426614174000";
      const payload: ReceiveTransferPayload = {
        transferId: "tr-002",
        quantityReceived: 10,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: false,
        operationId,
        receivedAt: new Date().toISOString(),
        note: "first",
      };

      // 1. Estado inicial previo a la recepción
      const initialStock = await mockAdapter.getStockItems();
      const destStockInitial = initialStock.find(
        (s) => s.sku === "POL-RUN-M-BLU" && s.locationId === "RET-SAN",
      );
      const onHandBefore = destStockInitial?.onHand ?? 0;
      const availableBefore = destStockInitial?.available ?? 0;
      const blockedBefore = destStockInitial?.blocked ?? 0;

      const initialTransfers = await mockAdapter.getTransfers();
      const trBefore = initialTransfers.find((t) => t.id === "tr-002")!;
      expect(trBefore.quantityReceived).toBe(0);
      expect(trBefore.quantityPending).toBe(20);
      expect(trBefore.status).toBe("EN_TRANSITO");

      // 2. Primera recepción
      const result1 = await mockAdapter.receiveTransfer(payload);
      expect(result1.quantityReceived).toBe(10);
      expect(result1.quantityPending).toBe(10);
      expect(result1.status).toBe("RECIBIDO_PARCIAL");

      // Snapshot independiente tras primera recepción
      const stockAfterFirst = structuredClone(await mockAdapter.getStockItems());
      const destStockFirst = stockAfterFirst.find(
        (s) => s.sku === "POL-RUN-M-BLU" && s.locationId === "RET-SAN",
      )!;
      expect(destStockFirst.onHand).toBe(onHandBefore + 10);
      expect(destStockFirst.available).toBe(availableBefore + 10);
      expect(destStockFirst.blocked).toBe(blockedBefore);

      const transfersAfterFirst = structuredClone(await mockAdapter.getTransfers());
      const trFirst = transfersAfterFirst.find((t) => t.id === "tr-002")!;
      expect(trFirst.quantityReceived).toBe(10);
      expect(trFirst.quantityPending).toBe(10);
      expect(trFirst.status).toBe("RECIBIDO_PARCIAL");

      // 3. Segunda recepción (reintento) con MISMA operation_id y misma intención pero nota distinta
      const payload2: ReceiveTransferPayload = {
        ...payload,
        note: "retry with different note",
      };
      const result2 = await mockAdapter.receiveTransfer(payload2);

      // El resultado devuelto debe ser idéntico al primero
      expect(result2).toEqual(result1);

      // Snapshot independiente tras reintento
      const stockAfterRetry = structuredClone(await mockAdapter.getStockItems());
      const destStockRetry = stockAfterRetry.find(
        (s) => s.sku === "POL-RUN-M-BLU" && s.locationId === "RET-SAN",
      )!;

      // Demostrar que el saldo físico y disponible NO se duplicaron (siguen en 10, no en 20)
      expect(destStockRetry.onHand).toBe(destStockFirst.onHand);
      expect(destStockRetry.available).toBe(destStockFirst.available);
      expect(destStockRetry.blocked).toBe(destStockFirst.blocked);
      expect(stockAfterRetry).toEqual(stockAfterFirst);

      // Demostrar que el traslado NO se modificó una segunda vez
      const transfersAfterRetry = structuredClone(await mockAdapter.getTransfers());
      const trRetry = transfersAfterRetry.find((t) => t.id === "tr-002")!;
      expect(trRetry.quantityReceived).toBe(10);
      expect(trRetry.quantityPending).toBe(10);
      expect(trRetry.status).toBe("RECIBIDO_PARCIAL");
      expect(transfersAfterRetry).toEqual(transfersAfterFirst);
    });

    it("Disposición REINGRESAR_BLOQUEADO acredita saldo bloqueado y reintento es idempotente", async () => {
      const operationId = "123e4567-e89b-12d3-a456-426614174001";
      const payload: ReceiveTransferPayload = {
        transferId: "tr-003",
        quantityReceived: 5,
        disposition: "REINGRESAR_BLOQUEADO",
        finalReceipt: false,
        operationId,
        receivedAt: new Date().toISOString(),
        note: "recepcion bloqueada",
      };

      const destStockBefore = (await mockAdapter.getStockItems()).find(
        (s) => s.sku === "PNT-TRK-M-BLK" && s.locationId === "RET-MFL",
      )!;
      const onHandBefore = destStockBefore.onHand;
      const blockedBefore = destStockBefore.blocked;
      const availableBefore = destStockBefore.available;

      // Primera recepción
      await mockAdapter.receiveTransfer(payload);

      const stockAfterFirst = structuredClone(await mockAdapter.getStockItems());
      const destStockFirst = stockAfterFirst.find(
        (s) => s.sku === "PNT-TRK-M-BLK" && s.locationId === "RET-MFL",
      )!;
      expect(destStockFirst.onHand).toBe(onHandBefore + 5);
      expect(destStockFirst.blocked).toBe(blockedBefore + 5);
      // El saldo disponible no aumenta cuando la disposición es bloqueada
      expect(destStockFirst.available).toBe(availableBefore);

      // Reintento con misma operation_id
      await mockAdapter.receiveTransfer({ ...payload, note: "reintento bloqueado" });

      const stockAfterRetry = structuredClone(await mockAdapter.getStockItems());
      const destStockRetry = stockAfterRetry.find(
        (s) => s.sku === "PNT-TRK-M-BLK" && s.locationId === "RET-MFL",
      )!;
      expect(destStockRetry.onHand).toBe(destStockFirst.onHand);
      expect(destStockRetry.blocked).toBe(destStockFirst.blocked);
      expect(destStockRetry.available).toBe(destStockFirst.available);
      expect(stockAfterRetry).toEqual(stockAfterFirst);
    });

    it("Reutilización de operation_id con intención diferente lanza IDEMPOTENCY_CONFLICT", async () => {
      const operationId = "223e4567-e89b-12d3-a456-426614174000";
      const payload1: ReceiveTransferPayload = {
        transferId: "tr-002",
        quantityReceived: 10,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: false,
        operationId,
        receivedAt: new Date().toISOString(),
        note: "first",
      };

      // Primera recepción exitosa
      await mockAdapter.receiveTransfer(payload1);

      // Segunda recepción con MISMA operation_id pero intención diferente (cantidad distinta)
      const payload2: ReceiveTransferPayload = {
        transferId: "tr-002",
        quantityReceived: 20, // intención diferente
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        operationId,
        receivedAt: new Date().toISOString(),
        note: "second",
      };

      await expect(mockAdapter.receiveTransfer(payload2)).rejects.toThrow(
        "Idempotencia conflictiva: la misma operation_id fue reutilizada para otra intención.",
      );

      // Verificar que el error tiene código IDEMPOTENCY_CONFLICT
      try {
        await mockAdapter.receiveTransfer(payload2);
        throw new Error("Debió lanzar IDEMPOTENCY_CONFLICT");
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryError);
        const error = err as InventoryError;
        expect(error.code).toBe("IDEMPOTENCY_CONFLICT");
      }
    });

    it("Traslado cerrado no permite nueva recepción y lanza TRASLADO_NO_RECIBIBLE", async () => {
      // Completar el traslado tr-002
      const payload1: ReceiveTransferPayload = {
        transferId: "tr-002",
        quantityReceived: 20,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        operationId: "323e4567-e89b-12d3-a456-426614174000",
        receivedAt: new Date().toISOString(),
        note: "complete",
      };
      const closedTransfer = await mockAdapter.receiveTransfer(payload1);
      expect(closedTransfer.status).toBe("COMPLETADO");
      expect(closedTransfer.quantityPending).toBe(0);

      // Intentar recibir de nuevo el mismo traslado (ya COMPLETADO) con nueva operation_id
      const payload2: ReceiveTransferPayload = {
        transferId: "tr-002",
        quantityReceived: 5,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        operationId: "423e4567-e89b-12d3-a456-426614174000",
        receivedAt: new Date().toISOString(),
        note: "retry",
      };

      await expect(mockAdapter.receiveTransfer(payload2)).rejects.toThrow(
        "El traslado ya está cerrado o no admite nuevas recepciones.",
      );

      try {
        await mockAdapter.receiveTransfer(payload2);
        throw new Error("Debió lanzar TRASLADO_NO_RECIBIBLE");
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryError);
        const error = err as InventoryError;
        expect(error.code).toBe("TRASLADO_NO_RECIBIBLE");
      }
    });
  });

  describe("AlternateInventoryRepository (mock-independiente)", () => {
    it("operation_id con formato UUID inválido lanza VALIDACION", async () => {
      await expect(
        alternateRepo.receiveTransfer({
          transferId: "alt-tr-901",
          quantityReceived: 10,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: true,
          operationId: "not-a-uuid",
          receivedAt: new Date().toISOString(),
        }),
      ).rejects.toThrow("El identificador de operación (operation_id) debe ser un UUID válido.");

      try {
        await alternateRepo.receiveTransfer({
          transferId: "alt-tr-901",
          quantityReceived: 10,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: true,
          operationId: "not-a-uuid",
          receivedAt: new Date().toISOString(),
        });
        throw new Error("Debió lanzar InventoryError");
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryError);
        const error = err as InventoryError;
        expect(error.code).toBe("VALIDACION");
      }
    });

    it("nota superior a 500 caracteres lanza VALIDACION", async () => {
      await expect(
        alternateRepo.receiveTransfer({
          transferId: "alt-tr-901",
          quantityReceived: 10,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: true,
          operationId: "723e4567-e89b-12d3-a456-426614174000",
          receivedAt: new Date().toISOString(),
          note: "X".repeat(501),
        }),
      ).rejects.toThrow("La nota de recepción (note) no puede superar los 500 caracteres.");

      try {
        await alternateRepo.receiveTransfer({
          transferId: "alt-tr-901",
          quantityReceived: 10,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: true,
          operationId: "723e4567-e89b-12d3-a456-426614174000",
          receivedAt: new Date().toISOString(),
          note: "X".repeat(501),
        });
        throw new Error("Debió lanzar InventoryError");
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryError);
        const error = err as InventoryError;
        expect(error.code).toBe("VALIDACION");
      }
    });

    it("Retry con misma operation_id y misma intención es idempotente (stock físico y disponible no se duplican)", async () => {
      const operationId = "523e4567-e89b-12d3-a456-426614174000";
      const payload: ReceiveTransferPayload = {
        transferId: "alt-tr-901",
        quantityReceived: 10,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: false,
        operationId,
        receivedAt: new Date().toISOString(),
        note: "first",
      };

      // 1. Estado inicial previo a la recepción
      const initialStock = await alternateRepo.getStockItems();
      const destStockInitial = initialStock.find(
        (s) => s.sku === "ALT-RUN-41-BLU" && s.locationId === "ALT-LOC-02",
      );
      const onHandBefore = destStockInitial?.onHand ?? 0;
      const availableBefore = destStockInitial?.available ?? 0;
      const blockedBefore = destStockInitial?.blocked ?? 0;

      const initialTransfers = await alternateRepo.getTransfers();
      const trBefore = initialTransfers.find((t) => t.id === "alt-tr-901")!;
      expect(trBefore.quantityReceived).toBe(0);
      expect(trBefore.quantityPending).toBe(20);
      expect(trBefore.status).toBe("EN_TRANSITO");

      // 2. Primera recepción
      const result1 = await alternateRepo.receiveTransfer(payload);
      expect(result1.quantityReceived).toBe(10);
      expect(result1.quantityPending).toBe(10);
      expect(result1.status).toBe("RECIBIDO_PARCIAL");

      // Snapshot independiente tras primera recepción
      const stockAfterFirst = structuredClone(await alternateRepo.getStockItems());
      const destStockFirst = stockAfterFirst.find(
        (s) => s.sku === "ALT-RUN-41-BLU" && s.locationId === "ALT-LOC-02",
      )!;
      expect(destStockFirst.onHand).toBe(onHandBefore + 10);
      expect(destStockFirst.available).toBe(availableBefore + 10);
      expect(destStockFirst.blocked).toBe(blockedBefore);

      const transfersAfterFirst = structuredClone(await alternateRepo.getTransfers());
      const trFirst = transfersAfterFirst.find((t) => t.id === "alt-tr-901")!;
      expect(trFirst.quantityReceived).toBe(10);
      expect(trFirst.quantityPending).toBe(10);
      expect(trFirst.status).toBe("RECIBIDO_PARCIAL");

      // 3. Segunda recepción (reintento) con MISMA operation_id y misma intención
      const result2 = await alternateRepo.receiveTransfer({
        ...payload,
        note: "retry with different note",
      });

      // El resultado devuelto debe ser idéntico al primero
      expect(result2).toEqual(result1);

      // Snapshot independiente tras reintento
      const stockAfterRetry = structuredClone(await alternateRepo.getStockItems());
      const destStockRetry = stockAfterRetry.find(
        (s) => s.sku === "ALT-RUN-41-BLU" && s.locationId === "ALT-LOC-02",
      )!;

      // Demostrar que el saldo físico y disponible NO se duplicaron (siguen en 10, no en 20)
      expect(destStockRetry.onHand).toBe(destStockFirst.onHand);
      expect(destStockRetry.available).toBe(destStockFirst.available);
      expect(destStockRetry.blocked).toBe(destStockFirst.blocked);
      expect(stockAfterRetry).toEqual(stockAfterFirst);

      // Demostrar que el traslado NO se modificó una segunda vez
      const transfersAfterRetry = structuredClone(await alternateRepo.getTransfers());
      const trRetry = transfersAfterRetry.find((t) => t.id === "alt-tr-901")!;
      expect(trRetry.quantityReceived).toBe(10);
      expect(trRetry.quantityPending).toBe(10);
      expect(trRetry.status).toBe("RECIBIDO_PARCIAL");
      expect(transfersAfterRetry).toEqual(transfersAfterFirst);
    });

    it("Disposición REINGRESAR_BLOQUEADO acredita saldo bloqueado y reintento es idempotente", async () => {
      const operationId = "823e4567-e89b-12d3-a456-426614174000";
      const payload: ReceiveTransferPayload = {
        transferId: "alt-tr-901",
        quantityReceived: 5,
        disposition: "REINGRESAR_BLOQUEADO",
        finalReceipt: false,
        operationId,
        receivedAt: new Date().toISOString(),
        note: "bloqueado",
      };

      const initialStock = await alternateRepo.getStockItems();
      const destStockInitial = initialStock.find(
        (s) => s.sku === "ALT-RUN-41-BLU" && s.locationId === "ALT-LOC-02",
      );
      const onHandBefore = destStockInitial?.onHand ?? 0;
      const blockedBefore = destStockInitial?.blocked ?? 0;
      const availableBefore = destStockInitial?.available ?? 0;

      // Primera recepción
      await alternateRepo.receiveTransfer(payload);

      const stockAfterFirst = structuredClone(await alternateRepo.getStockItems());
      const destStockFirst = stockAfterFirst.find(
        (s) => s.sku === "ALT-RUN-41-BLU" && s.locationId === "ALT-LOC-02",
      )!;
      expect(destStockFirst.onHand).toBe(onHandBefore + 5);
      expect(destStockFirst.blocked).toBe(blockedBefore + 5);
      expect(destStockFirst.available).toBe(availableBefore);

      // Reintento con misma operation_id
      await alternateRepo.receiveTransfer({ ...payload, note: "reintento bloqueado" });

      const stockAfterRetry = structuredClone(await alternateRepo.getStockItems());
      const destStockRetry = stockAfterRetry.find(
        (s) => s.sku === "ALT-RUN-41-BLU" && s.locationId === "ALT-LOC-02",
      )!;
      expect(destStockRetry.onHand).toBe(destStockFirst.onHand);
      expect(destStockRetry.blocked).toBe(destStockFirst.blocked);
      expect(destStockRetry.available).toBe(destStockFirst.available);
      expect(stockAfterRetry).toEqual(stockAfterFirst);
    });

    it("reutilización con intención diferente lanza IDEMPOTENCY_CONFLICT", async () => {
      const operationId = "623e4567-e89b-12d3-a456-426614174000";
      await alternateRepo.receiveTransfer({
        transferId: "alt-tr-901",
        quantityReceived: 10,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: false,
        operationId,
        receivedAt: new Date().toISOString(),
      });

      await expect(
        alternateRepo.receiveTransfer({
          transferId: "alt-tr-901",
          quantityReceived: 20, // intención diferente
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: true,
          operationId,
          receivedAt: new Date().toISOString(),
        }),
      ).rejects.toThrow("Idempotencia conflictiva: la misma operation_id fue reutilizada para otra intención.");

      try {
        await alternateRepo.receiveTransfer({
          transferId: "alt-tr-901",
          quantityReceived: 20,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: true,
          operationId,
          receivedAt: new Date().toISOString(),
        });
        throw new Error("Debió lanzar IDEMPOTENCY_CONFLICT");
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryError);
        const error = err as InventoryError;
        expect(error.code).toBe("IDEMPOTENCY_CONFLICT");
      }
    });

    it("Traslado cerrado no admite nueva recepción y lanza TRASLADO_NO_RECIBIBLE", async () => {
      // Completar alt-tr-901
      const payload1: ReceiveTransferPayload = {
        transferId: "alt-tr-901",
        quantityReceived: 20,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        operationId: "923e4567-e89b-12d3-a456-426614174000",
        receivedAt: new Date().toISOString(),
      };
      const closed = await alternateRepo.receiveTransfer(payload1);
      expect(closed.status).toBe("COMPLETADO");
      expect(closed.quantityPending).toBe(0);

      // Intentar recibir de nuevo con otra operation_id
      const payload2: ReceiveTransferPayload = {
        transferId: "alt-tr-901",
        quantityReceived: 5,
        disposition: "REINGRESAR_DISPONIBLE",
        finalReceipt: true,
        operationId: "a23e4567-e89b-12d3-a456-426614174000",
        receivedAt: new Date().toISOString(),
      };

      await expect(alternateRepo.receiveTransfer(payload2)).rejects.toThrow(
        "El traslado ya está cerrado o no admite nuevas recepciones.",
      );

      try {
        await alternateRepo.receiveTransfer(payload2);
        throw new Error("Debió lanzar TRASLADO_NO_RECIBIBLE");
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryError);
        const error = err as InventoryError;
        expect(error.code).toBe("TRASLADO_NO_RECIBIBLE");
      }
    });
  });
});
