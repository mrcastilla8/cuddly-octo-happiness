import { expect, test } from "@playwright/test";

/** LIVE acceptance only: no page.route, fixtures or response substitution. */
test("G6 real read demo: products, photos, PEN prices, detail and categories", async ({
  page,
}, info) => {
  const responses: { path: string; status: number }[] = [];
  const methods: string[] = [];
  const errors: string[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/api/v1/"))
      responses.push({ path: url.pathname, status: response.status() });
  });
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/v1/"))
      methods.push(request.method());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto("/demo/g6/productos");
    await expect(
      page.getByRole("heading", {
        name: "G6 · Productos y Ofertas",
        exact: true,
      }),
    ).toBeVisible();
    const rows = page.getByRole("table").locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    await expect(page.getByTestId("real-price")).toHaveCount(count);
    for (const photo of await rows.getByRole("img").all())
      await expect
        .poll(() =>
          photo.evaluate(
            (img) =>
              img instanceof HTMLImageElement &&
              img.complete &&
              img.naturalWidth > 0,
          ),
        )
        .toBe(true);
    expect(await rows.getByRole("img").count()).toBe(count);
    await rows.first().getByRole("link").click();
    await expect(
      page.getByRole("heading", { name: "Detalle del producto", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("real-price")).toBeVisible();
    await page.getByRole("link", { name: "Volver a productos" }).click();
    await expect(rows.first()).toBeVisible();
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Categorías", exact: true })
      .click();
    await expect(
      page.getByRole("table").locator("tbody tr").first(),
    ).toBeVisible();
    await page.getByRole("table").getByRole("link").first().click();
    await expect(page).toHaveURL(/categoriaId=/);
    expect(
      responses.some((row) => row.path.includes("/precios/productos/")),
    ).toBe(true);
    expect(responses.filter((row) => row.status >= 400)).toEqual([]);
    expect(methods.every((method) => method === "GET")).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await info.attach("live-network-evidence", {
      body: JSON.stringify(
        { baseURL: info.project.use.baseURL, responses, methods, errors },
        null,
        2,
      ),
      contentType: "application/json",
    });
  }
});
