import {
  ComboError,
  type CombosAvailabilityPort,
  type CombosCatalogPort,
  type CombosPricingPort,
  type CombosRepository,
} from "../types/combos";
import type { CombosRuntime } from "../services/combosService";

const unavailable = () => new ComboError("unavailable", "La información de combos no está disponible.");
const combos: CombosRepository = {
  async list() { throw unavailable(); },
  async getById() { throw unavailable(); },
  async create() { throw unavailable(); },
  async update() { throw unavailable(); },
  async deactivate() { throw unavailable(); },
};
const catalog: CombosCatalogPort = {
  async listProducts() { throw unavailable(); },
  async getProduct() { throw unavailable(); },
  async resolveSkus() { throw unavailable(); },
};
const pricing: CombosPricingPort = {
  async readCurrent() { throw unavailable(); },
};
const availability: CombosAvailabilityPort = {
  async readStocks() { throw unavailable(); },
};
export function createUnavailableCombosAdapters(): CombosRuntime {
  return { combos, catalog, pricing, availability, now: () => Date.now() };
}
