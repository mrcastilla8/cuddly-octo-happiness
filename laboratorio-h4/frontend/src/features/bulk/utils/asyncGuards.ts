export interface SingleFlightGuard {
  current: boolean;
}

export async function runSingleFlight<T>(
  guard: SingleFlightGuard,
  action: () => Promise<T>,
): Promise<T | undefined> {
  if (guard.current) return undefined;
  guard.current = true;
  try {
    return await action();
  } finally {
    guard.current = false;
  }
}

export interface LatestTask {
  signal: AbortSignal;
  isCurrent: () => boolean;
}

export type AdmissionStatus = "idle" | "ready" | "pending" | "accepted" | "uncertain";

export interface AdmissionTask<T> {
  id: number;
  value: T;
  correlationId: string;
  isCurrent: () => boolean;
}

interface AdmissionOperation<T> {
  id: number;
  value: T;
  correlationId: string;
  status: AdmissionStatus;
}

/** Tracks the current user intent without cancelling an admission already sent to a provider. */
export class AdmissionCoordinator<T> {
  private nextId = 0;
  private operation: AdmissionOperation<T> | null = null;

  select(value: T | null): AdmissionStatus {
    this.nextId++;
    this.operation = value === null
      ? null
      : { id: this.nextId, value, correlationId: crypto.randomUUID(), status: "ready" };
    return this.status;
  }

  get status(): AdmissionStatus {
    return this.operation?.status ?? "idle";
  }

  begin(value: T, retryUncertain = false): AdmissionTask<T> | null {
    const operation = this.operation;
    if (
      !operation ||
      operation.value !== value ||
      operation.status === "pending" ||
      operation.status === "accepted" ||
      (operation.status === "uncertain" && !retryUncertain)
    ) {
      return null;
    }
    operation.status = "pending";
    return {
      id: operation.id,
      value,
      correlationId: operation.correlationId,
      isCurrent: () => this.operation === operation,
    };
  }

  finish(task: AdmissionTask<T>, status: "ready" | "accepted" | "uncertain"): boolean {
    if (!task.isCurrent() || this.operation?.id !== task.id) return false;
    this.operation.status = status;
    return true;
  }
}

export class LatestTaskCoordinator {
  private version = 0;
  private controller: AbortController | null = null;

  start(): LatestTask {
    this.controller?.abort();
    const controller = new AbortController();
    const version = ++this.version;
    this.controller = controller;
    return {
      signal: controller.signal,
      isCurrent: () => this.version === version && !controller.signal.aborted,
    };
  }

  cancel(): void {
    this.controller?.abort();
    this.controller = null;
    this.version++;
  }
}
