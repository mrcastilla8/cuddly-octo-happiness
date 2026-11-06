import { demoItems } from "../mocks/items";
import type { DemoRepository } from "../services/demoRepository";

export const mockDemoRepository: DemoRepository = {
  async confirmExample(_values, simulateError) {
    if (simulateError)
      throw new Error(
        "No se pudo confirmar el ejemplo. Tus entradas se conservan. Desactiva el fallo simulado y vuelve a confirmar.",
      );
    // Local demonstration only: no storage, endpoint or commercial mutation.
  },
  async list(query, scenario, signal) {
    signal.throwIfAborted();
    // Explicit loading fixture remains pending until the reviewer chooses another scenario.
    if (scenario === "loading")
      await new Promise<never>((_, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });
    if (scenario === "error")
      throw new Error(
        "La consulta de demostración falló. Los filtros se conservan; puedes volver a consultar.",
      );
    if (scenario === "empty") return { items: [], total: 0 };
    const search = query.search.trim().toLocaleLowerCase("es");
    const filtered = demoItems.filter(
      (item) =>
        (query.status === "all" || item.status === query.status) &&
        `${item.name} ${item.reference}`
          .toLocaleLowerCase("es")
          .includes(search),
    );
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered
        .slice(start, start + query.pageSize)
        .map((item) => ({ ...item })),
      total: filtered.length,
    };
  },
};
