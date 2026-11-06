import { expect, test } from "@playwright/test";
for (const scenario of ["session", "forbidden"]) {
  test(`MK-006/MK-007: access guards (${scenario}) apply to list, direct creation, edit and state routes`, async ({
    page,
  }) => {
    for (const [route, action] of [
      ["/promociones", "Crear promoción"],
      ["/recomendaciones", "Crear venta cruzada"],
    ]) {
      await page.goto(`${route}?modoRevision=1&escenario=${scenario}`);
      await expect(
        page.getByRole("button", { name: "Volver a consultar", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: action, exact: true }),
      ).toHaveAttribute("data-disabled", "true");
    }
    for (const route of [
      "/promociones/nueva",
      "/promociones/carrera/editar",
      "/promociones/carrera/estado",
      "/recomendaciones/nueva/upselling",
      "/recomendaciones/completa-carrera/editar",
      "/recomendaciones/completa-carrera/estado",
    ]) {
      await page.goto(`${route}?modoRevision=1&escenario=${scenario}`);
      await expect(page.getByRole("alert")).toContainText(
        scenario === "session" ? "sesión" : "permiso",
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("textbox", { name: /Nombre/ })).toHaveCount(
        0,
      );
    }
  });
}
test("MK-006/MK-007: loading, empty, missing and retry are distinct and preserve list filters", async ({
  page,
}) => {
  for (const [route, emptyTitle, detail, missingTitle, filter, value] of [
    [
      "/promociones",
      "Todavía no hay promociones",
      "/promociones/carrera",
      "Promoción no encontrada",
      "Modalidad",
      "Con cupón",
    ],
    [
      "/recomendaciones",
      "Todavía no hay reglas",
      "/recomendaciones/completa-carrera",
      "Regla no encontrada",
      "Tipo de regla",
      "Upselling",
    ],
  ]) {
    await page.goto(`${route}?modoRevision=1&escenario=loading`);
    await expect(
      page.getByRole("status", { name: /^Cargando / }),
    ).toBeVisible();
    await page.goto(`${route}?modoRevision=1&escenario=empty`);
    await expect(page.getByText(emptyTitle!, { exact: true })).toBeVisible();
    await page.goto(`${detail}?modoRevision=1&escenario=missing`);
    await expect(page.getByText(missingTitle!, { exact: true })).toBeVisible();
    await page.goto(
      `${route}?modoRevision=1&escenario=error&modalidad=coupon&tipo=upsell`,
    );
    await expect(page.getByRole("alert")).toContainText("contexto");
    await page
      .getByRole("button", { name: "Volver a consultar", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: filter!, exact: true }),
    ).toHaveValue(value!);
  }
});
test("MK-006: unknown normalized edit and state reconcile without a duplicate write; saving prevents departure", async ({
  page,
}) => {
  await page.goto(
    "/promociones/carrera/editar?modoRevision=1&escenario=unknown-result",
  );
  await page
    .getByLabel("Nombre de la promoción", { exact: true })
    .fill("  Confirmación consultada  ");
  await page.getByLabel("Valor del beneficio", { exact: true }).fill("12,5");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByLabel("Nombre de la promoción", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Consultar resultado", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Confirmación consultada", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Desactivar promoción", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Desactivar promoción", exact: true })
    .click();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Activar promoción", exact: true }),
  ).toBeFocused();
  // La desactivación confirmada de "carrera" ahora persiste al navegar. La revisión de
  // estado sin confirmar se ejercita sobre otra promoción que sigue activa.
  await page.goto(
    "/promociones/running/estado?modoRevision=1&escenario=unknown-result",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Desactivar promoción", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Consultar estado", exact: true })
    .click();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Activar promoción", exact: true }),
  ).toBeVisible();
  await page.goto(
    "/promociones/carrera/editar?modoRevision=1&escenario=saving",
  );
  await page
    .getByLabel("Nombre de la promoción", { exact: true })
    .fill("Guardado pendiente");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Guardar cambios", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("navigation", { name: "Navegación de la aplicación" })
    .getByRole("link", { name: "Cupones de descuento" })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Descartar cambios", exact: true }),
  ).toBeDisabled();
});
test("MK-007: self-origin correction and conflict resolution retain typed candidates and return focus", async ({
  page,
}) => {
  await page.goto(
    "/recomendaciones/completa-carrera/editar?modoRevision=1&escenario=conflict",
  );
  await page
    .getByRole("combobox", { name: "Producto de origen", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Casaca Cortaviento Trail", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByText(
      "No se admite el origen como recomendado ni productos repetidos.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Quitar Casaca Cortaviento Trail", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("combobox", { name: "Producto de origen", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Camiseta Running Endurance", exact: true })
    .click();
  await page
    .getByLabel("Nombre de la regla", { exact: true })
    .fill("Regla revisada");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Consultar registro actual", exact: true })
    .click();
  await expect(page.getByRole("table")).toContainText("Casaca Cortaviento Trail");
  await page
    .getByRole("button", { name: "Guardar propuesta revisada", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Regla revisada", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Desactivar regla", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Desactivar regla", exact: true })
    .click();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Activar regla", exact: true }),
  ).toBeFocused();
});
