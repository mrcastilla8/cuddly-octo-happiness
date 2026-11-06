import { expect, test } from "@playwright/test";
import {
  createMockPromotionServices,
  createPromotionRuntime,
} from "../src/features/promotions/services/promotionServices";
import { createMockCouponRepository } from "../src/features/promotions/adapters/mockCouponRepository";
import { createDemoServices } from "../src/features/promotions/dev/demoServices";
import { campaignFixtures } from "../src/features/promotions/mocks/campaigns";
import type {
  CampaignDraft,
  CampaignRepository,
} from "../src/features/promotions/services/campaignRepository";
import type {
  CouponInput,
  CouponView,
  CouponRepository,
} from "../src/features/promotions/services/couponRepository";
import type { PromotionCatalogRepository } from "../src/features/promotions/services/catalogRepository";
import type { RecommendationDraft } from "../src/features/promotions/services/recommendationRepository";
import {
  couponInputErrors,
  validateCouponDraft,
} from "../src/features/promotions/services/couponValidation";
import {
  couponDateLabel,
  couponPromotionValidity,
  type CouponPromotionValidity,
} from "../src/features/promotions/services/couponPresentation";
import { couponFixtures } from "../src/features/promotions/mocks/coupons";

const signal = () => new AbortController().signal;
const query = { status: "all", kind: "all", page: 1, pageSize: 100 } as const;

function couponWithValidity(validFrom?: string, validUntil?: string): CouponView {
  const fixture = couponFixtures[0]!;
  return {
    ...structuredClone(fixture),
    promotion: {
      ...structuredClone(fixture.promotion)!,
      validFrom,
      validUntil,
    },
  };
}

test("presentación de vigencia usa instantes completos y clasifica límites", () => {
  const from = "2026-10-20T00:00:00-05:00";
  const until = "2026-10-21T00:00:00-05:00";
  const atFrom = new Date(from);
  const atUntil = new Date(until);
  const cases: Array<[CouponView, Date, CouponPromotionValidity]> = [
    [couponWithValidity(from, until), new Date("2026-10-19T23:59:59-05:00"), "not-started"],
    [couponWithValidity(from, until), atFrom, "available"],
    [couponWithValidity(from, until), new Date("2026-10-20T12:00:00-05:00"), "available"],
    [couponWithValidity(from, until), atUntil, "expired"],
    [couponWithValidity(undefined, until), atFrom, "unknown"],
    [couponWithValidity("fecha-invalida", until), atFrom, "unknown"],
    [couponWithValidity(until, from), atFrom, "unknown"],
  ];
  for (const [coupon, now, expected] of cases)
    expect(couponPromotionValidity(coupon, now)).toBe(expected);
});

test("presentación de vigencia conserva fecha, hora y zona de Lima", () => {
  const label = couponDateLabel("2026-10-31T00:00:00-05:00");
  expect(label).toContain("31 oct.");
  expect(label).toContain("12:00");
});

test("el repositorio mock conserva contadores durante consultas", async () => {
  const services = createMockPromotionServices({}, { persist: false });
  const signal = new AbortController().signal;
  const known = await services.coupons.read("cyberinka20", signal);
  const knownFromLimits = (
    await services.coupons.list({ status: "all", page: 1, pageSize: 100 }, signal)
  ).items.find((coupon) => coupon.id === "cyberinka20");
  const knownAgain = await services.coupons.read("cyberinka20", signal);
  expect(known?.consumedUses).toBe(500);
  expect(known?.remainingUses).toBe(0);
  expect(knownFromLimits?.remainingUses).toBe(0);
  expect(knownAgain?.consumedUses).toBe(known?.consumedUses);
  expect(knownAgain?.remainingUses).toBe(known?.remainingUses);

  const unknown = {
    ...structuredClone(couponFixtures[0]!),
    id: "sin-capacidad",
    consumedUses: 4,
    remainingUses: undefined,
  } satisfies CouponView;
  const unknownRepository = createMockCouponRepository(
    { promotions: async () => [] },
    [unknown],
    { persist: false },
  );
  const unknownDetail = await unknownRepository.read("sin-capacidad", signal);
  const unknownAgain = await unknownRepository.read("sin-capacidad", signal);
  expect(unknownDetail?.consumedUses).toBe(4);
  expect(unknownDetail?.remainingUses).toBeUndefined();
  expect(unknownAgain?.consumedUses).toBe(unknownDetail?.consumedUses);
  expect(unknownAgain?.remainingUses).toBeUndefined();
});

test("composición global: api sin provider falla y no sustituye fallos por mocks", () => {
  expect(() => createPromotionRuntime("api")).toThrow(
    "La administración de promociones no está disponible",
  );
  expect(() =>
    createPromotionRuntime("api", {
      api: () => {
        throw new Error("Provider no disponible");
      },
    }),
  ).toThrow("Provider no disponible");
});

test("composición global: los cuatro puertos API se inyectan juntos sin escenarios DEV", async () => {
  const ports = createMockPromotionServices(); // Service double, not an HTTP implementation.
  const runtime = createPromotionRuntime("api", { api: () => ports });
  const params = new URLSearchParams("modoRevision=1&escenario=forbidden");
  const context = runtime.resolve(params);
  expect(runtime.mode).toBe("api");
  expect(context.services).toBe(ports);
  expect(context.confirmedServices).toBe(ports);
  await expect(context.prepareCreation(signal())).resolves.toBeUndefined();
  expect(context.clearTransientParams(params).toString()).toBe(params.toString());
});
const campaign = (name: string): CampaignDraft => ({
  ...structuredClone(campaignFixtures[0]!.configuration),
  name,
  productIds: ["PROD-RUN-001"],
  skus: ["CAM-RUN-BLA-M"],
  mode: "coupon",
  status: "inactive",
});
const coupon = (promotionId: string, code = "PRUEBA"): CouponInput => ({
  code,
  promotionId,
  status: "inactive",
  globalLimit: null,
  customerLimit: null,
  minimumAmount: null,
  cancellationPolicy: "restore",
});
async function pair(services = createMockPromotionServices()) {
  const a = await services.campaigns.save(null, campaign("A"), signal());
  const b = await services.campaigns.save(null, campaign("B"), signal());
  return { services, a, b };
}
const catalog: PromotionCatalogRepository = {
  async products(receivedSignal) {
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    return ["externo-origen", "externo-recomendado"].map((id) => ({
      id,
      name: id,
      active: true,
      categoryId: "categoria-externa",
      skus: [{ sku: `SKU-${id}`, label: id, active: true }],
    }));
  },
  async categories(receivedSignal) {
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    return [
      { id: "categoria-externa", name: "Categoría externa", active: true },
    ];
  },
};
const recommendation = (): RecommendationDraft => ({
  name: "Regla externa",
  kind: "cross-sell",
  originType: "category",
  originId: "categoria-externa",
  status: "inactive",
  priority: "1",
  validFrom: "2026-10-01T00:00",
  validUntil: "2026-11-01T00:00",
  candidates: [
    {
      productId: "externo-recomendado",
      order: "1",
      criterion: "",
      justification: "",
    },
  ],
});

test("composición: sustituir Catálogo cambia las referencias de ambos adaptadores sin fixtures cruzados", async () => {
  const services = createMockPromotionServices({ catalog });
  const draft = {
    ...campaign("Catálogo sustituido"),
    productIds: ["externo-origen"],
    skus: ["SKU-externo-recomendado"],
  };
  expect(
    (await services.campaigns.save(null, draft, signal())).configuration
      .productIds,
  ).toEqual(["externo-origen"]);
  expect(
    (await services.recommendations.save(null, recommendation(), signal()))
      .configuration.originId,
  ).toBe("categoria-externa");
  await expect(
    services.campaigns.save(null, campaign("Referencia anterior"), signal()),
  ).rejects.toMatchObject({ fields: { scope: expect.any(String) } });
  await expect(
    services.recommendations.save(
      null,
      { ...recommendation(), originId: "running" },
      signal(),
    ),
  ).rejects.toMatchObject({ fields: { origin: expect.any(String) } });
  expect((await services.coupons.list(query, signal())).total).toBeGreaterThan(
    0,
  );
});

test("composición: sustituir Promociones alimenta las opciones y validación de Cupones", async () => {
  const row = {
    id: "provider-promocion",
    name: "Promoción del provider",
    status: "inactive" as const,
    canChangeMode: true,
    configuration: campaign("Promoción del provider"),
  };
  let calls = 0;
  const campaigns: CampaignRepository = {
    async list(receivedQuery, receivedSignal) {
      expect(receivedSignal).toBeInstanceOf(AbortSignal);
      expect(receivedQuery.kind).toBe("coupon");
      calls++;
      return { items: [row], total: 1, page: 1 };
    },
    async read(id) {
      return id === row.id ? row : null;
    },
    async save() {
      throw new Error("No se solicita esta operación");
    },
    async changeStatus() {
      throw new Error("No se solicita esta operación");
    },
  };
  const services = createMockPromotionServices({ campaigns });
  expect(
    (await services.coupons.promotions(signal())).map((item) => item.id),
  ).toEqual([row.id]);
  expect(
    (await services.coupons.create(coupon(row.id), signal())).promotion?.name,
  ).toBe(row.name);
  await expect(
    services.coupons.create(coupon("bienvenida", "INVALIDO"), signal()),
  ).rejects.toMatchObject({ fields: { promotionId: expect.any(String) } });
  expect(calls).toBe(3);
  expect(
    (await services.recommendations.list(query, signal())).total,
  ).toBeGreaterThan(0);
});

for (const uses of [0, 2, undefined]) {
  test(`composición: Cupones sustituido gobierna asociaciones vigentes e historial de uso ${uses}`, async () => {
    let current: CouponView | null = null;
    const coupons: CouponRepository = {
      async list(_, receivedSignal) {
        expect(receivedSignal).toBeInstanceOf(AbortSignal);
        return {
          items: current ? [structuredClone(current)] : [],
          total: current ? 1 : 0,
          page: 1,
        };
      },
      async read() {
        return current ? structuredClone(current) : null;
      },
      async promotions() {
        return [];
      },
      async create() {
        throw new Error("No se solicita esta operación");
      },
      async update() {
        throw new Error("No se solicita esta operación");
      },
      async changeStatus() {
        throw new Error("No se solicita esta operación");
      },
    };
    const { services, a, b } = await pair(
      createMockPromotionServices({ coupons }),
    );
    current = {
      ...coupon(a.id),
      id: "provider-cupon",
      consumedUses: uses,
      remainingUses: null,
      promotion: {
        name: a.name,
        validFrom: "2026-10-01T00:00:00-05:00",
        validUntil: "2026-11-01T00:00:00-05:00",
      },
    };
    expect((await services.campaigns.read(a.id, signal()))?.canChangeMode).toBe(
      false,
    );
    current.promotionId = b.id;
    const expected = uses === 0 ? true : uses === undefined ? undefined : false;
    expect((await services.campaigns.read(a.id, signal()))?.canChangeMode).toBe(
      expected,
    );
    expect((await services.campaigns.read(b.id, signal()))?.canChangeMode).toBe(
      false,
    );
    if (expected !== true)
      await expect(
        services.campaigns.save(
          a.id,
          { ...a.configuration, mode: "automatic" },
          signal(),
        ),
      ).rejects.toMatchObject({ fields: { mode: expect.any(String) } });
    current = null;
    // Uses retained by a coupon after reassignment are not new uses of B.
    expect((await services.campaigns.read(b.id, signal()))?.canChangeMode).toBe(
      uses === undefined ? undefined : true,
    );
  });
}

test("composición: sustituir Recomendaciones no modifica los otros servicios; instancias aisladas", async () => {
  const supplied = createMockPromotionServices({ catalog }).recommendations;
  const services = createMockPromotionServices({ recommendations: supplied });
  expect(services.recommendations).toBe(supplied);
  await services.recommendations.save(null, recommendation(), signal());
  const a = await services.campaigns.save(
    null,
    campaign("Instancia aislada"),
    signal(),
  );
  expect(
    await createMockPromotionServices().campaigns.read(a.id, signal()),
  ).toBeNull();
  expect(
    (await services.catalog.products(signal())).some(
      (item) => item.id === "PROD-RUN-001",
    ),
  ).toBe(true);
});

test("reasignar el último cupón sin uso libera la modalidad anterior y bloquea la nueva", async () => {
  const { services, a, b } = await pair();
  const row = await services.coupons.create(coupon(a.id), signal());
  expect((await services.campaigns.read(a.id, signal()))?.canChangeMode).toBe(
    false,
  );
  await services.coupons.update(row.id, coupon(b.id), signal());
  expect((await services.campaigns.read(a.id, signal()))?.canChangeMode).toBe(
    true,
  );
  expect((await services.campaigns.read(b.id, signal()))?.canChangeMode).toBe(
    false,
  );
  expect(
    (
      await services.campaigns.save(
        a.id,
        { ...a.configuration, mode: "automatic" },
        signal(),
      )
    ).configuration.mode,
  ).toBe("automatic");
  await expect(
    services.campaigns.save(
      b.id,
      { ...b.configuration, mode: "automatic" },
      signal(),
    ),
  ).rejects.toMatchObject({ fields: { mode: expect.any(String) } });
});

test("varios cupones, incluso inactivos, mantienen el bloqueo hasta la última reasignación", async () => {
  const { services, a, b } = await pair();
  const first = await services.coupons.create(coupon(a.id, "UNO"), signal());
  const last = await services.coupons.create(coupon(a.id, "DOS"), signal());
  await services.coupons.update(first.id, coupon(b.id, "UNO"), signal());
  expect((await services.campaigns.read(a.id, signal()))?.canChangeMode).toBe(
    false,
  );
  await services.coupons.update(last.id, coupon(b.id, "DOS"), signal());
  expect((await services.campaigns.read(a.id, signal()))?.canChangeMode).toBe(
    true,
  );
});

test("una reasignación rechazada conserva la asociación y no libera la modalidad", async () => {
  const { services, a } = await pair();
  const row = await services.coupons.create(coupon(a.id), signal());
  await expect(
    services.coupons.update(row.id, coupon("inexistente"), signal()),
  ).rejects.toMatchObject({ kind: "validation" });
  expect((await services.coupons.read(row.id, signal()))?.promotionId).toBe(
    a.id,
  );
  expect((await services.campaigns.read(a.id, signal()))?.canChangeMode).toBe(
    false,
  );
});

test("activación seguida de desactivación y reasignación no borra el historial", async () => {
  const { services, a, b } = await pair();
  const row = await services.coupons.create(coupon(a.id), signal());
  await services.campaigns.changeStatus(a.id, "active", signal());
  await services.campaigns.changeStatus(a.id, "inactive", signal());
  await services.coupons.update(row.id, coupon(b.id), signal());
  expect((await services.campaigns.read(a.id, signal()))?.canChangeMode).toBe(
    false,
  );
  await expect(
    services.campaigns.save(
      a.id,
      { ...a.configuration, mode: "automatic" },
      signal(),
    ),
  ).rejects.toMatchObject({ fields: { mode: expect.any(String) } });
});

test("editar datos generales conserva capacidad desconocida y bloquea un cambio de modalidad", async () => {
  const services = createMockPromotionServices();
  const row = (await services.campaigns.read(
    "capacidad-desconocida",
    signal(),
  ))!;
  expect(row.canChangeMode).toBeUndefined();
  const edited = await services.campaigns.save(
    row.id,
    { ...row.configuration, name: "Nombre editado" },
    signal(),
  );
  expect(edited.canChangeMode).toBeUndefined();
  await expect(
    services.campaigns.save(
      row.id,
      { ...edited.configuration, mode: "coupon" },
      signal(),
    ),
  ).rejects.toMatchObject({ fields: { mode: expect.any(String) } });
});

const invalidInputs: {
  name: string;
  field: string;
  patch: Partial<CouponInput>;
}[] = [
  { name: "monto cero", field: "minimumAmount", patch: { minimumAmount: "0" } },
  {
    name: "monto negativo",
    field: "minimumAmount",
    patch: { minimumAmount: "-1" },
  },
  {
    name: "monto no numérico",
    field: "minimumAmount",
    patch: { minimumAmount: "abc" },
  },
  {
    name: "política ausente",
    field: "cancellationPolicy",
    patch: { cancellationPolicy: "" as CouponInput["cancellationPolicy"] },
  },
  {
    name: "política ajena",
    field: "cancellationPolicy",
    patch: { cancellationPolicy: "otra" as CouponInput["cancellationPolicy"] },
  },
  { name: "límite negativo", field: "globalLimit", patch: { globalLimit: -1 } },
  {
    name: "límite decimal",
    field: "customerLimit",
    patch: { customerLimit: 1.5 },
  },
];
for (const { name, field, patch } of invalidInputs) {
  test(`validación directa: alta y edición rechazan ${name} sin alterar registros`, async () => {
    const repository = createMockCouponRepository(
      {
        promotions: async () => [
          {
            id: "promo",
            name: "Promo",
            mode: "coupon",
            validFrom: "2026-10-01T00:00:00-05:00",
            validUntil: "2026-11-01T00:00:00-05:00",
          },
        ],
      },
      [],
    );
    const valid = coupon("promo");
    await expect(
      repository.create({ ...valid, ...patch }, signal()),
    ).rejects.toMatchObject({
      kind: "validation",
      fields: { [field]: expect.any(String) },
    });
    expect((await repository.list(query, signal())).total).toBe(0);
    const row = await repository.create(valid, signal());
    await expect(
      repository.update(row.id, { ...valid, ...patch }, signal()),
    ).rejects.toMatchObject({
      kind: "validation",
      fields: { [field]: expect.any(String) },
    });
    expect(await repository.read(row.id, signal())).toEqual(row);
    expect(
      couponInputErrors({ ...valid, ...patch })[
        field as keyof ReturnType<typeof couponInputErrors>
      ],
    ).toBeTruthy();
  });
}

test("formulario y adaptador comparten la validación de monto y restitución; normalización y unicidad", async () => {
  const services = createMockPromotionServices();
  const input = coupon("bienvenida", "  prueba_uno  ");
  const draft = {
    ...input,
    status: "inactive" as const,
    globalLimit: "",
    customerLimit: "",
    minimumAmount: "-1",
    cancellationPolicy: "" as const,
  };
  expect(validateCouponDraft(draft).errors).toMatchObject({
    minimumAmount: couponInputErrors({ ...input, minimumAmount: "-1" })
      .minimumAmount,
    cancellationPolicy: couponInputErrors({
      ...input,
      cancellationPolicy: "" as CouponInput["cancellationPolicy"],
    }).cancellationPolicy,
  });
  const row = await services.coupons.create(
    { ...input, minimumAmount: " 1,50 " },
    signal(),
  );
  expect(row.code).toBe("PRUEBA_UNO");
  expect(row.minimumAmount).toBe("1.50");
  await services.coupons.update(
    row.id,
    { ...input, minimumAmount: "2" },
    signal(),
  );
  await expect(services.coupons.create(input, signal())).rejects.toMatchObject({
    fields: { code: expect.any(String) },
  });
});

test("adaptadores rechazan estados, modalidad, beneficio, combinación y criterio inválidos", async () => {
  const services = createMockPromotionServices({ catalog });
  const invalidStatus = "otro" as "active";
  await expect(
    services.coupons.create(
      { ...coupon("bienvenida"), status: invalidStatus },
      signal(),
    ),
  ).rejects.toMatchObject({ fields: { status: expect.any(String) } });
  for (const port of [
    services.coupons,
    services.campaigns,
    services.recommendations,
  ])
    await expect(
      port.changeStatus("inexistente", invalidStatus, signal()),
    ).rejects.toMatchObject({ kind: "validation" });
  const draft = {
    ...campaign("Validaciones"),
    productIds: ["externo-origen"],
    skus: [],
  };
  for (const patch of [
    { benefit: "0" },
    { mode: "otro" as "coupon" },
    { status: invalidStatus },
    { discountType: "otro" as "amount" },
    {
      combination: {
        pricing: "sí" as unknown as boolean,
        automatic: false,
        coupon: false,
      },
    },
  ])
    await expect(
      services.campaigns.save(null, { ...draft, ...patch }, signal()),
    ).rejects.toMatchObject({ kind: "validation" });
  for (const patch of [
    { kind: "otro" as "upsell" },
    { originType: "otro" as "product" },
    { status: invalidStatus },
    { kind: "upsell" as const },
  ])
    await expect(
      services.recommendations.save(
        null,
        { ...recommendation(), ...patch },
        signal(),
      ),
    ).rejects.toMatchObject({ kind: "validation" });
});

test("DEV: rechazo/conflicto no escriben; resultado incierto puede consultarse; base independiente", async () => {
  const { services, a } = await pair();
  for (const scenario of ["rejected", "conflict"] as const) {
    const demo = createDemoServices(services, scenario);
    await expect(
      demo.coupons.create(coupon(a.id), signal()),
    ).rejects.toMatchObject({ kind: scenario });
    await expect(
      demo.campaigns.save(
        a.id,
        { ...a.configuration, name: "No guardar" },
        signal(),
      ),
    ).rejects.toMatchObject({ kind: scenario });
  }
  expect((await services.campaigns.read(a.id, signal()))?.name).toBe("A");
  expect(
    (await services.coupons.list(query, signal())).items.some(
      (item) => item.code === "PRUEBA",
    ),
  ).toBe(false);
  await expect(
    createDemoServices(services, "unknown-result").coupons.create(
      coupon(a.id),
      signal(),
    ),
  ).rejects.toMatchObject({ kind: "unknown" });
  expect(
    (await services.coupons.list(query, signal())).items.filter(
      (item) => item.code === "PRUEBA",
    ),
  ).toHaveLength(1);
  expect((await services.campaigns.read(a.id, signal()))?.canChangeMode).toBe(
    false,
  );
  expect(
    (
      await createDemoServices(services, "empty").campaigns.list(
        query,
        signal(),
      )
    ).total,
  ).toBe(0);
  expect(
    (await services.campaigns.list(query, signal())).total,
  ).toBeGreaterThan(0);
});

test("cancelación de consultas y guardados no produce mutaciones", async () => {
  const services = createMockPromotionServices();
  const controller = new AbortController();
  controller.abort();
  await expect(
    services.coupons.create(coupon("bienvenida"), controller.signal),
  ).rejects.toThrow();
  await expect(
    services.campaigns.save(null, campaign("Abortada"), controller.signal),
  ).rejects.toThrow();
  await expect(
    services.recommendations.save(null, recommendation(), controller.signal),
  ).rejects.toThrow();
  const loading = new AbortController();
  const pending = createDemoServices(services, "loading").coupons.list(
    query,
    loading.signal,
  );
  loading.abort();
  await expect(pending).rejects.toThrow();
  expect(
    (await services.coupons.list(query, signal())).items.some(
      (item) => item.code === "PRUEBA",
    ),
  ).toBe(false);
});
