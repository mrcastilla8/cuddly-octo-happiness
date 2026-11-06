import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const views = [
  ["MK-005-S01", "/cupones"],
  ["MK-005-S02", "/cupones/nuevo"],
  ["MK-005-S03", "/cupones/run10/editar"],
  ["MK-005-S04", "/cupones/run10"],
  ["MK-005-S05", "/cupones/run10/limites"],
  ["MK-005-S06", "/cupones/run10/estado"],
  ["MK-006-S01", "/promociones"],
  ["MK-006-S02", "/promociones/nueva"],
  ["MK-006-S03", "/promociones/carrera/editar"],
  ["MK-006-S04", "/promociones/nueva/alcance"],
  ["MK-006-S05", "/promociones/carrera"],
  ["MK-006-S06", "/promociones/carrera/estado"],
  ["MK-007-S01", "/recomendaciones"],
  ["MK-007-S02", "/recomendaciones/nueva/venta-cruzada"],
  ["MK-007-S03", "/recomendaciones/mejora-rendimiento/editar"],
  ["MK-007-S04", "/recomendaciones/nueva/upselling"],
  ["MK-007-S05", "/recomendaciones/nueva/venta-cruzada/productos"],
  ["MK-007-S06", "/recomendaciones/mejora-rendimiento"],
  ["MK-007-S07", "/recomendaciones/mejora-rendimiento/estado"],
] as const;

test("19 vistas desktop: geometría, tipografía y diálogo según DESIGN 1.1; capturas para revisión UX", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const metrics = [];
  for (const [id, route] of views) {
    const isDialog =
      id === "MK-005-S06" || id === "MK-006-S06" || id === "MK-007-S07";
    await page.goto(route);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: /Cargando|Consultando/ }),
    ).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await expect(heading).toHaveCSS("font-family", /Oswald/);
    await expect(heading).toHaveCSS("font-size", "32px");
    await expect(heading).toHaveCSS("line-height", "40px");
    await expect(heading).toHaveCSS("text-transform", "uppercase");
    const geometry = await page.evaluate(() => {
      const main = document.querySelector("main")!,
        title = document.querySelector("h1")!;
      const mainStyle = getComputedStyle(main),
        bodyStyle = getComputedStyle(document.body);
      return {
        width: innerWidth,
        height: innerHeight,
        pageWidth: document.documentElement.scrollWidth,
        titleLeft: title.getBoundingClientRect().left,
        titleTop: title.getBoundingClientRect().top,
        rightPadding: mainStyle.paddingRight,
        bottomPadding: mainStyle.paddingBottom,
        bodyFont: bodyStyle.fontFamily,
        background: bodyStyle.backgroundColor,
        formWidth: document.querySelector("main form")?.getBoundingClientRect()
          .width,
      };
    });
    expect(geometry.width).toBe(1440);
    expect(geometry.height).toBe(900);
    expect(geometry.pageWidth).toBeLessThanOrEqual(1440);
    expect(geometry.titleLeft).toBe(272);
    expect(geometry.titleTop).toBeGreaterThanOrEqual(96);
    expect(geometry.rightPadding).toBe("32px");
    expect(geometry.bottomPadding).toBe("32px");
    expect(geometry.bodyFont).toContain("Inter");
    expect(geometry.background).toBe("rgb(247, 245, 240)");
    if (id === "MK-007-S02" || id === "MK-007-S03" || id === "MK-007-S04") {
      await expect(page.locator('[data-field="origin"]')).toHaveCSS(
        "row-gap",
        "16px",
      );
    }
    if (isDialog) {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveCSS("opacity", "1");
      const rect = await dialog.boundingBox();
      expect(rect?.width).toBe(480);
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(900);
      await expect(dialog.locator(":focus")).toHaveCount(1);
    }
    metrics.push({ id, route, ...geometry });
    const capture = info.outputPath(`${id}.png`);
    await page.screenshot({
      path: capture,
      animations: "disabled",
      fullPage: !isDialog,
    });
    await info.attach(id, { path: capture, contentType: "image/png" });
  }
  const measurements = info.outputPath("mediciones-19-vistas.json");
  await writeFile(measurements, JSON.stringify(metrics, null, 2));
  await info.attach("mediciones-19-vistas", {
    path: measurements,
    contentType: "application/json",
  });
});

test("el modo API global bloquea las 19 vistas sin cargar datos ni adapters mock", async ({
  page,
}) => {
  test.setTimeout(90000);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  // Exercise the real application entry point with the same globally resolved
  // mode as VITE_DATA_MODE=api; do not bypass CommercialModeGate.
  await page.route("**/src/main.tsx*", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const selection = /import\.meta\.env\.VITE_DATA_MODE/;
    expect(body).toMatch(selection);
    await route.fulfill({ response, body: body.replace(selection, '"api"') });
  });

  await page.goto("/cupones");
  await expect(
    page.getByText("Datos de demostración", { exact: true }),
  ).toHaveCount(0);
  for (const [, path] of views) {
    await page.goto(`${path}?modoRevision=1&escenario=forbidden`);
    await expect(page.getByRole("alert")).toContainText(
      "Función no disponible",
    );
    await expect(
      page.getByText("Datos de demostración", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect(
    requests.some((url) => /features\/promotions\/|\/mocks\//.test(url)),
  ).toBe(false);
});
