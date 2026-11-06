import type { PricingRepository } from "../services/pricingRepository";
import type { RepositoryUpdates } from "../services/pricingRuntime";

export type DemoScenario =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "conflict"
  | "overlap"
  | "unauthorized"
  | "forbidden"
  | "unknown"
  | "blocked"
  | "valid"
  | "rows"
  | "unreadable"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "no-rows";
export class DemoControl implements RepositoryUpdates {
  private listeners = new Set<() => void>();
  private values = new Map<keyof PricingRepository, DemoScenario>();
  private revisions = new Map<keyof PricingRepository, number>();
  private revision = 0;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  version = (operation: keyof PricingRepository) =>
    this.revisions.get(operation) ?? 0;
  snapshot = () => this.revision;
  scenario(operation: keyof PricingRepository) {
    return (
      this.values.get(operation) ??
      (operation === "prevalidate" ? "blocked" : "default")
    );
  }
  set(operation: keyof PricingRepository, scenario: DemoScenario) {
    this.values.set(operation, scenario);
    this.revisions.set(operation, this.version(operation) + 1);
    this.revision++;
    this.listeners.forEach((listener) => listener());
  }
  reset() {
    for (const operation of this.values.keys())
      this.set(operation, operation === "prevalidate" ? "blocked" : "default");
  }
}
