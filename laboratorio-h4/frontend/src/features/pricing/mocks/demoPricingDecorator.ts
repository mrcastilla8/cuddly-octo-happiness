import { PricingFailure } from "../services/pricingModels";
import type { PricingRepository } from "../services/pricingRepository";
import { DemoControl } from "./demoControl";
import { mockReports, prevalidationFixtures } from "./workflows";

// Fault injection is a development concern. The decorated object has the unmodified production port.
export function decorateDemoRepository(
  repository: PricingRepository,
  control: DemoControl,
): PricingRepository {
  async function check(
    operation: keyof PricingRepository,
    signal?: AbortSignal,
  ) {
    signal?.throwIfAborted();
    const scenario = control.scenario(operation);
    if (scenario === "loading") {
      const activeSignal = signal ?? new AbortController().signal;
      await new Promise<never>((_, reject) =>
        activeSignal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        ),
      );
    }
    signal?.throwIfAborted();
    if (scenario === "error")
      throw new PricingFailure(
        "error",
        "No se pudo consultar el precio. La selección se conserva; vuelve a consultar.",
      );
    if (scenario === "unauthorized")
      throw new PricingFailure(
        "unauthorized",
        "La sesión no es válida en este escenario. No se aplicó la propuesta.",
      );
    if (scenario === "forbidden")
      throw new PricingFailure(
        "forbidden",
        "No tienes autorización en este escenario. No se aplicó la propuesta.",
      );
    if (scenario === "overlap")
      throw new PricingFailure(
        "overlap",
        "La vigencia se superpone con otra del mismo objetivo y canal. Tu propuesta se conserva.",
      );
    if (scenario === "unknown")
      throw new PricingFailure(
        "unknown",
        "No se pudo confirmar el resultado. Consulta antes de decidir una nueva intención; no se reenviará automáticamente.",
      );
    return scenario;
  }
  return {
    listTargets: (signal) => repository.listTargets(signal),
    async read(query, signal) {
      const scenario = await check("read", signal);
      return scenario === "empty" ? null : repository.read(query, signal);
    },
    async readEditable(target, signal) {
      const scenario = await check("readEditable", signal);
      return scenario === "empty"
        ? null
        : repository.readEditable(target, signal);
    },
    async update(change, signal) {
      const scenario = await check("update", signal);
      if (scenario === "conflict") {
        const current = await repository.readEditable(change.target, signal);
        if (current)
          await repository.update(
            {
              target: change.target,
              version: current.version,
              draft: {
                regular: "255.00",
                offer: "",
                offerAction: "CONSERVAR",
                currency: current.currency,
                reason: "Cambio concurrente de demostración",
              },
            },
            signal,
          );
        control.set("update", "default");
        throw new PricingFailure(
          "conflict",
          "El precio cambió desde tu consulta. Relee el mismo objetivo y revisa la propuesta antes de confirmar.",
        );
      }
      return repository.update(change, signal);
    },
    async listSchedules(targetId, page, signal) {
      const scenario = await check("listSchedules", signal);
      return scenario === "empty"
        ? { items: [], total: 0, page, pageSize: 2 }
        : repository.listSchedules(targetId, page, signal);
    },
    async schedule(targetId, draft, signal) {
      await check("schedule", signal);
      return repository.schedule(targetId, draft, signal);
    },
    async readHistorical(query, at, signal) {
      const scenario = await check("readHistorical", signal);
      return scenario === "empty"
        ? null
        : repository.readHistorical(query, at, signal);
    },
    async prevalidate(input, signal) {
      const scenario = await check("prevalidate", signal);
      if (scenario === "unreadable")
        throw new PricingFailure(
          "error",
          "No se pudo analizar el archivo. La importación no fue iniciada.",
        );
      // The envelope still crosses the port. No file schema or bytes are inferred.
      if (scenario === "valid" || scenario === "rows") {
        if (!input.file || typeof input.allowPartial !== "boolean")
          throw new PricingFailure("error", "Selecciona archivo y política.");
        return structuredClone(prevalidationFixtures[scenario]);
      }
      return repository.prevalidate(input, signal);
    },
    async readBatch(id, signal) {
      const scenario = await check("readBatch", signal);
      const batch = await repository.readBatch(id, signal);
      if (!batch) return null;
      if (scenario === "queued" || scenario === "processing") {
        batch.status = scenario === "queued" ? "QUEUED" : "PROCESSING";
        batch.completed = 0;
        batch.failed = 0;
        delete batch.rows;
      }
      if (scenario === "completed") {
        batch.status = "COMPLETED";
        batch.completed = batch.total;
        batch.failed = 0;
        batch.rows = batch.rows?.map((row) => ({
          ...row,
          status: "COMPLETED",
          code: null,
          detail: null,
        }));
      }
      if (scenario === "failed") {
        batch.status = "FAILED";
        batch.completed = 0;
        batch.failed = batch.total;
        batch.rows = batch.rows?.map((row) => ({
          ...row,
          status: "FAILED",
          code: "PRECIO_INVALIDO",
          detail: "Precio rechazado",
        }));
      }
      if (scenario === "no-rows") delete batch.rows;
      return batch;
    },
    async report(id, signal) {
      await check("report", signal);
      const batch = await this.readBatch(id, signal);
      if (!batch || batch.status === "QUEUED" || batch.status === "PROCESSING")
        throw new PricingFailure(
          "error",
          "El reporte no está disponible para este lote.",
        );
      if (batch.status === "COMPLETED" || batch.status === "FAILED")
        return {
          data: new Blob(
            [
              batch.status === "COMPLETED"
                ? mockReports.completed
                : mockReports.failed,
            ],
            { type: "text/csv;charset=utf-8" },
          ),
          filename: `reporte_precios_${id}.csv`,
        };
      return repository.report(id, signal);
    },
    reconcileAudit() {
      repository.reconcileAudit?.();
    },
  };
}
