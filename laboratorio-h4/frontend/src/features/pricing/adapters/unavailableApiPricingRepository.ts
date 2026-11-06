import { PricingFailure } from "../services/pricingModels";
import type { PricingRepository } from "../services/pricingRepository";

// Deliberately fail closed. No endpoint, credentials or fallback are invented.
export function createUnavailableApiPricingRepository(): PricingRepository {
  async function unavailable(): Promise<never> {
    throw new PricingFailure(
      "configuration",
      "Esta función no está disponible en el modo actual.",
    );
  }
  return {
    listTargets: unavailable,
    read: unavailable,
    readEditable: unavailable,
    update: unavailable,
    listSchedules: unavailable,
    schedule: unavailable,
    readHistorical: unavailable,
    prevalidate: unavailable,
    readBatch: unavailable,
    report: unavailable,
  };
}
