import { campaignFixtures } from "../mocks/campaigns";
import type { PromotionHistory } from "../mocks/promotionHistory";
import { AdministrationError, pageOf } from "../services/administration";
import {
  campaignErrors,
  normalizeCampaignDraft,
} from "../services/campaignValidation";
import type {
  CampaignRepository,
  CampaignView,
} from "../services/campaignRepository";
import type { PromotionCatalogRepository } from "../services/catalogRepository";
import {
  isMockPersistenceAvailable,
  isRecord,
  publishMockChange,
  readMockState,
  saveMockState,
  subscribeExternalMockChanges,
} from "../../shared/mockState";

interface MockCampaignState {
  records: CampaignView[];
  sequence: number;
}

function isCampaignRecord(value: unknown): value is CampaignView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.status === "string" &&
    ["active", "inactive", "draft", "expired", "scheduled"].includes(value.status)
  );
}

function isMockCampaignState(value: unknown): value is MockCampaignState {
  return (
    isRecord(value) &&
    Array.isArray(value.records) &&
    value.records.every(isCampaignRecord) &&
    typeof value.sequence === "number" &&
    Number.isFinite(value.sequence) &&
    value.sequence >= 0
  );
}

export function createMockCampaignRepository(
  dependencies: {
    catalog: () => PromotionCatalogRepository;
    hasCoupons: (id: string, signal: AbortSignal) => Promise<boolean>;
    history: PromotionHistory;
  },
  fixtures: readonly CampaignView[] = campaignFixtures,
  options: { persist?: boolean } = {},
): CampaignRepository {
  const persistEnabled = options.persist === true && isMockPersistenceAvailable();
  const restored = persistEnabled
    ? readMockState<MockCampaignState>("promotions-campaigns", isMockCampaignState)
    : null;
  const records = restored ? restored.records : fixtures.map((item) => structuredClone(item));
  let sequence = restored ? restored.sequence : 0;
  const persist = (): boolean => {
    // A non-persistent instance (persist: false) must never touch `localStorage`.
    let ok = true;
    if (persistEnabled) {
      ok = saveMockState("promotions-campaigns", { records, sequence } satisfies MockCampaignState);
    }
    publishMockChange("promotions-campaigns");
    publishMockChange("promotions");
    return ok;
  };
  if (persistEnabled) {
    subscribeExternalMockChanges("promotions-campaigns", () => {
      const stored = readMockState<MockCampaignState>(
        "promotions-campaigns",
        isMockCampaignState,
      );
      if (!stored) return;
      records.length = 0;
      records.push(...stored.records);
      sequence = stored.sequence;
      publishMockChange("promotions-campaigns");
      publishMockChange("promotions");
    });
  }
  async function snapshot(record: CampaignView, signal: AbortSignal) {
    const hasCoupons = await dependencies.hasCoupons(record.id, signal);
    signal.throwIfAborted();
    return structuredClone({
      ...record,
      canChangeMode: dependencies.history.capability(
        record.id,
        record.status === "active",
        hasCoupons,
      ),
    });
  }
  return {
    async list(query, signal) {
      signal.throwIfAborted();
      const page = pageOf(
        records.filter(
          (item) =>
            (query.status === "all" || item.status === query.status) &&
            (query.kind === "all" || item.configuration.mode === query.kind),
        ),
        query.page,
        query.pageSize,
      );
      return {
        ...page,
        items: await Promise.all(
          page.items.map((item) => snapshot(item, signal)),
        ),
      };
    },
    async read(id, signal) {
      signal.throwIfAborted();
      const record = records.find((item) => item.id === id);
      return record ? snapshot(record, signal) : null;
    },
    async save(id, draft, signal) {
      signal.throwIfAborted();
      const original = id ? records.find((item) => item.id === id) : null;
      if (id && !original)
        throw new AdministrationError(
          "rejected",
          "La promoción no está disponible para editar.",
        );
      const errors = campaignErrors(draft);
      if (Object.keys(errors).length)
        throw new AdministrationError(
          "validation",
          "Revisa los campos indicados. El borrador se conserva.",
          errors,
        );
      const products = await dependencies.catalog().products(signal, original
        ? { productIds: original.configuration.productIds, skus: original.configuration.skus }
        : undefined);
      signal.throwIfAborted();
      if (
        draft.productIds.some(
          (value) => !products.some((item) => item.id === value && item.active),
        ) ||
        draft.skus.some(
          (value) =>
            !products.some(
              (item) =>
                item.active &&
                item.skus.some((sku) => sku.sku === value && sku.active),
            ),
        )
      )
        errors.scope =
          "El alcance incluye una referencia no disponible o inactiva.";
      if (
        original &&
        draft.mode !== original.configuration.mode &&
        (await snapshot(original, signal)).canChangeMode !== true
      )
        errors.mode =
          "No está permitido cambiar la modalidad. Crea otra promoción.";
      if (Object.keys(errors).length)
        throw new AdministrationError(
          "validation",
          "Revisa los campos indicados. El borrador se conserva.",
          errors,
        );
      if (draft.status !== "active" && draft.status !== "inactive")
        throw new AdministrationError(
          "validation",
          "Selecciona un estado inicial.",
        );
      signal.throwIfAborted();
      const configuration = normalizeCampaignDraft(draft),
        status = original?.status ?? draft.status;
      const record: CampaignView = {
        id: id ?? "promocion-demo-" + ++sequence,
        name: configuration.name,
        status,
        canChangeMode: undefined,
        configuration: { ...configuration, status },
      };
      // Existing unknown history remains unknown. Only a confirmed creation initializes history.
      if (!original)
        dependencies.history.initialize(record.id, status === "active");
      if (id) records[records.findIndex((item) => item.id === id)] = record;
      else records.push(record);
      if (!persist() && persistEnabled) {
        throw new AdministrationError(
          "rejected",
          "No se pudo guardar el cambio. Vuelve a intentarlo.",
        );
      }
      return snapshot(record, signal);
    },
    async changeStatus(id, status, signal) {
      signal.throwIfAborted();
      if (status !== "active" && status !== "inactive")
        throw new AdministrationError(
          "validation",
          "Selecciona un estado válido.",
        );
      const index = records.findIndex((item) => item.id === id),
        original = records[index];
      if (!original)
        throw new AdministrationError(
          "rejected",
          "La promoción no está disponible.",
        );
      const record = {
        ...original,
        status,
        configuration: { ...original.configuration, status },
      };
      if (status === "active") dependencies.history.activate(id);
      records[index] = record;
      if (!persist() && persistEnabled) {
        throw new AdministrationError(
          "rejected",
          "No se pudo guardar el cambio. Vuelve a intentarlo.",
        );
      }
      return snapshot(record, signal);
    },
  };
}
