// Señal de refresco de datos del feature de inventario.
//
// Es una abstracción de sincronización interna: permite que las vistas
// dependientes (p. ej. dashboard) vuelvan a consultar sus datos cuando el
// repositorio confirma una mutación (recepción de traslado, cambio de umbral)
// o cuando una herramienta de desarrollo cambia de escenario simulado.
//
// Los componentes NO dependen de eventos exclusivos del mock. La integración
// HTTP futura podrá traducir aquí el evento backend `inventory.stock.changed`
// (recibido vía BFF/SSE) sin alterar hook ni componente alguno.

type InventoryChangeListener = () => void;

const listeners = new Set<InventoryChangeListener>();

export function notifyInventoryChanged(): void {
  for (const listener of Array.from(listeners)) {
    listener();
  }
}

export function subscribeInventoryChanged(
  listener: InventoryChangeListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
