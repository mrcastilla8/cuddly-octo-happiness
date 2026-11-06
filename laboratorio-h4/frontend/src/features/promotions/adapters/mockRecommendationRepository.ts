import { recommendationFixtures } from "../mocks/recommendations";
import type { PromotionCatalogRepository } from "../services/catalogRepository";
import { AdministrationError, pageOf } from "../services/administration";
import {
  recommendationErrors,
  normalizeRecommendationDraft,
} from "../services/recommendationValidation";
import type {
  RecommendationRepository,
  RecommendationView,
} from "../services/recommendationRepository";
import {
  isMockPersistenceAvailable,
  isRecord,
  publishMockChange,
  readMockState,
  saveMockState,
  subscribeExternalMockChanges,
} from "../../shared/mockState";

interface MockRecommendationState {
  records: RecommendationView[];
  sequence: number;
}

function isRecommendationRecord(value: unknown): value is RecommendationView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.status === "string" &&
    ["active", "inactive", "draft"].includes(value.status)
  );
}

function isMockRecommendationState(value: unknown): value is MockRecommendationState {
  return (
    isRecord(value) &&
    Array.isArray(value.records) &&
    value.records.every(isRecommendationRecord) &&
    typeof value.sequence === "number" &&
    Number.isFinite(value.sequence) &&
    value.sequence >= 0
  );
}

export function createMockRecommendationRepository(
  catalog: () => PromotionCatalogRepository,
  fixtures: readonly RecommendationView[] = recommendationFixtures,
  options: { persist?: boolean } = {},
): RecommendationRepository {
  const persistEnabled = options.persist === true && isMockPersistenceAvailable();
  const restored = persistEnabled
    ? readMockState<MockRecommendationState>("promotions-recommendations", isMockRecommendationState)
    : null;
  const records: RecommendationView[] = restored
    ? restored.records
    : fixtures.map((item) => structuredClone(item));
  let sequence = restored ? restored.sequence : 0;
  const persist = (): boolean => {
    // A non-persistent instance (persist: false) must never touch `localStorage`.
    let ok = true;
    if (persistEnabled) {
      ok = saveMockState("promotions-recommendations", { records, sequence } satisfies MockRecommendationState);
    }
    publishMockChange("promotions-recommendations");
    publishMockChange("promotions");
    return ok;
  };
  if (persistEnabled) {
    subscribeExternalMockChanges("promotions-recommendations", () => {
      const stored = readMockState<MockRecommendationState>(
        "promotions-recommendations",
        isMockRecommendationState,
      );
      if (!stored) return;
      records.length = 0;
      records.push(...stored.records);
      sequence = stored.sequence;
      publishMockChange("promotions-recommendations");
      publishMockChange("promotions");
    });
  }
  return {
    async list(query, signal) {
      signal.throwIfAborted();
      return pageOf(
        records.filter(
          (item) =>
            (query.status === "all" || item.status === query.status) &&
            (query.kind === "all" || item.configuration.kind === query.kind),
        ),
        query.page,
        query.pageSize,
      );
    },
    async read(id, signal) {
      signal.throwIfAborted();
      const record = records.find((item) => item.id === id);
      return record ? structuredClone(record) : null;
    },
    async save(id, draft, signal) {
      signal.throwIfAborted();
      const errors = recommendationErrors(draft);
      const previous = id ? records.find((item) => item.id === id) : null;
      if (id && !previous)
        throw new AdministrationError(
          "rejected",
          "La regla no está disponible para editar.",
        );
      const retained = previous ? {
        productIds: [
          ...(previous.configuration.originType === "product" ? [previous.configuration.originId] : []),
          ...previous.configuration.candidates.map((candidate) => candidate.productId),
        ],
        skus: [],
      } : undefined;
      const catalogProducts = await catalog().products(signal, retained);
      const catalogCategories = await catalog().categories(signal);
      signal.throwIfAborted();
      const origins =
        draft.originType === "category" ? catalogCategories : catalogProducts;
      if (!origins.some((item) => item.id === draft.originId && item.active))
        errors.origin = "El origen no está disponible o está inactivo.";
      draft.candidates.forEach((candidate, index) => {
        if (
          !catalogProducts.some(
            (item) => item.id === candidate.productId && item.active,
          )
        )
          errors[`candidate-${index}`] =
            "El producto recomendado no está disponible o está inactivo.";
      });
      if (previous && draft.kind !== previous.configuration.kind)
        errors.kind =
          "La edición conserva el tipo de regla. Crea una regla nueva para otro tipo.";
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
      const record: RecommendationView = {
        id: id ?? `regla-demo-${++sequence}`,
        name: draft.name.trim(),
        status: previous?.status ?? draft.status,
        configuration: {
          ...normalizeRecommendationDraft(draft),
          name: draft.name.trim(),
          status: previous?.status ?? draft.status,
          candidates: draft.candidates.map((item) => ({
            ...item,
            criterion: draft.kind === "cross-sell" ? "" : item.criterion,
            justification:
              draft.kind === "cross-sell" ? "" : item.justification,
          })),
        },
      };
      if (id) records[records.findIndex((item) => item.id === id)] = record;
      else records.push(record);
      if (!persist() && persistEnabled) {
        throw new AdministrationError(
          "rejected",
          "No se pudo guardar el cambio. Vuelve a intentarlo.",
        );
      }
      return structuredClone(record);
    },
    async changeStatus(id, status, signal) {
      signal.throwIfAborted();
      if (status !== "active" && status !== "inactive")
        throw new AdministrationError(
          "validation",
          "Selecciona un estado válido.",
        );
      const index = records.findIndex((item) => item.id === id),
        previous = records[index];
      if (!previous)
        throw new AdministrationError(
          "rejected",
          "La regla no está disponible.",
        );
      const record = {
        ...previous,
        status,
        configuration: { ...previous.configuration, status },
      };
      records[index] = record;
      if (!persist() && persistEnabled) {
        throw new AdministrationError(
          "rejected",
          "No se pudo guardar el cambio. Vuelve a intentarlo.",
        );
      }
      return structuredClone(record);
    },
  };
}
