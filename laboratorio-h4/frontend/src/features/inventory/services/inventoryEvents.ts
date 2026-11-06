// Señal de sincronización interna del feature de inventario.
// Permite que vistas dependientes (p. ej. dashboard) refresquen sus datos
// cuando se registra una recepción o se modifican umbrales, sin acoplarse
// a la implementación del repositorio.

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
