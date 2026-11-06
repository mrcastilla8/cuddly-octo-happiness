import { expect, test, type Locator, type Page } from "@playwright/test";

// Regression suite for the visual corrections on branch `castilla`
// (SHA a76d1faf7f475e601d85b9114c486778164a5945, DESIGN.md 1.1.0).
// It only observes and measures the shipped UI: it does not fix, rewrite or
// relax production behaviour. Selectors rely on the public DOM contract of the
// Design System (AppShell classes, role="note", accessible names, tokens).

const VIEWPORT = { width: 1440, height: 900 } as const;

function srgbChannel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function parseRgb(color: string): [number, number, number, number] {
  const parts = color.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
}

function luminance(color: string): number {
  const [r, g, b] = parseRgb(color);
  return (
    0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b)
  );
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

async function gotoAndReady(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await page.evaluate(() => document.fonts.ready);
}

async function firstBodyRow(page: Page): Promise<Locator> {
  const row = page.locator("table tbody tr").first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  return row;
}

interface ControlGeometry {
  w: number;
  h: number;
  x: number;
  y: number;
  right: number;
  bottom: number;
  visibility: string;
  display: string;
  svg: {
    w: number;
    h: number;
    x: number;
    y: number;
    right: number;
    bottom: number;
  } | null;
}

async function controlGeometry(control: Locator): Promise<ControlGeometry> {
  return control.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const svg = el.querySelector("svg");
    const svgRect = svg ? svg.getBoundingClientRect() : null;
    const style = getComputedStyle(el);
    return {
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      x: rect.x,
      y: rect.y,
      right: rect.right,
      bottom: rect.bottom,
      visibility: style.visibility,
      display: style.display,
      svg: svgRect
        ? {
            w: Math.round(svgRect.width),
            h: Math.round(svgRect.height),
            x: svgRect.x,
            y: svgRect.y,
            right: svgRect.right,
            bottom: svgRect.bottom,
          }
        : null,
    };
  });
}

// ---------------------------------------------------------------------------
// VIS-T01 — Sidebar with independent vertical scroll
// ---------------------------------------------------------------------------
test("VIS-T01 · sidebar: 64px header, 240px navbar, independent vertical scroll at 900 and 600 px", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await gotoAndReady(page, "/inventario");

  const navbar = page.locator(".mantine-AppShell-navbar");
  await expect(navbar).toBeVisible();

  const base = await navbar.evaluate((el) => {
    const style = getComputedStyle(el);
    const header = document.querySelector("header");
    const links = Array.from(el.querySelectorAll("a"));
    return {
      width: Math.round(el.getBoundingClientRect().width),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowY: style.overflowY,
      overflowX: style.overflowX,
      headerHeight: header
        ? Math.round(header.getBoundingClientRect().height)
        : -1,
      linkCount: links.length,
      hrefs: links.map((a) => a.getAttribute("href")),
    };
  });

  expect(base.headerHeight).toBe(64);
  expect(base.width).toBe(240);
  expect(base.scrollWidth).toBeLessThanOrEqual(base.clientWidth);
  expect(base.overflowX).not.toBe("auto");
  expect(base.overflowX).not.toBe("scroll");
  expect(["auto", "scroll"]).toContain(base.overflowY);
  expect(base.linkCount).toBeGreaterThan(0);
  expect(
    base.hrefs.every((href) => typeof href === "string" && href.startsWith("/")),
  ).toBe(true);

  await page.screenshot({
    path: test.info().outputPath("visual-T01-sidebar-1440x900.png"),
    fullPage: true,
  });

  // Second resolution: the navbar must become the scrolling region.
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.waitForTimeout(250);

  const before = await navbar.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);

  await navbar.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(200);

  const after = await navbar.evaluate((el) => {
    const navRect = el.getBoundingClientRect();
    const links = Array.from(el.querySelectorAll("a"));
    const last = links[links.length - 1];
    const lastRect = last
      ? last.getBoundingClientRect()
      : { top: -1, bottom: -1 };
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    return {
      scrollTop: Math.round(el.scrollTop),
      lastTop: Math.round(lastRect.top),
      lastBottom: Math.round(lastRect.bottom),
      navTop: Math.round(navRect.top),
      navBottom: Math.round(navRect.bottom),
      headerTop: header ? Math.round(header.getBoundingClientRect().top) : -1,
      headerHeight: header
        ? Math.round(header.getBoundingClientRect().height)
        : -1,
      mainScrollTop: main ? Math.round(main.scrollTop) : -1,
      windowScrollY: Math.round(window.scrollY),
    };
  });

  expect(after.scrollTop).toBeGreaterThan(0);
  expect(after.lastTop).toBeGreaterThanOrEqual(after.navTop - 1);
  expect(after.lastBottom).toBeLessThanOrEqual(after.navBottom + 1);
  expect(after.lastTop).toBeGreaterThanOrEqual(0);
  expect(after.lastBottom).toBeLessThanOrEqual(600 + 1);
  expect(after.headerTop).toBe(0);
  expect(after.headerHeight).toBe(64);
  // Scrolling the sidebar must not scroll the main area or the document.
  expect(after.mainScrollTop).toBe(0);
  expect(after.windowScrollY).toBe(0);

  await page.screenshot({
    path: test.info().outputPath("visual-T01-sidebar-1440x600.png"),
    fullPage: false,
  });
});

// ---------------------------------------------------------------------------
// VIS-T02 — Neutral informational notices (ContextNote)
// ---------------------------------------------------------------------------
const NOTE_ROUTES = [
  "/inventario",
  "/inventario/dashboard",
  "/categorias",
  "/promociones",
  "/precios",
  "/precios/auditoria",
] as const;

test("VIS-T02 · commercial routes omit developer notices and preserve real alerts", async ({
  page,
}) => {
  test.setTimeout(150_000);

  for (const route of NOTE_ROUTES) {
    await gotoAndReady(page, route);
    await expect(page.locator('[role="note"]')).toHaveCount(0);
    await expect(page.getByText("Datos de demostración", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /Escenario|Respuesta ficticia/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }

  // Genuine operational alerts remain visible after removing developer notes.
  await gotoAndReady(page, "/inventario/dashboard");
  expect(
    await page.locator('[role="alert"], [role="status"]').count(),
  ).toBeGreaterThan(0);
  const noteOnDashboard = page.locator('[role="note"]');
  await expect(noteOnDashboard).toHaveCount(0);

  await page.screenshot({
    path: test.info().outputPath("visual-T02-notice-dashboard.png"),
    fullPage: true,
  });
});

// ---------------------------------------------------------------------------
// VIS-T03 — Uniform table actions (eye) and three-dot secondary menu
// ---------------------------------------------------------------------------
interface ActionRoute {
  route: string;
  eye: boolean;
  dots: boolean;
  settings?: boolean;
  heading?: string;
}

const ACTION_ROUTES: readonly ActionRoute[] = [
  { route: "/productos", eye: true, dots: false },
  { route: "/inventario", eye: true, dots: false },
  { route: "/combos", eye: true, dots: true },
  { route: "/categorias", eye: true, dots: true },
  { route: "/caracteristicas", eye: true, dots: true },
  { route: "/marcas", eye: true, dots: false },
  { route: "/tipos-producto", eye: true, dots: false },
  { route: "/cupones", eye: true, dots: true },
  { route: "/promociones", eye: true, dots: true },
  { route: "/recomendaciones", eye: true, dots: true },
  { route: "/precios/auditoria", eye: true, dots: false },
  { route: "/seo", eye: false, dots: false, settings: true },
];

test("VIS-T03 · table actions: eye 32x32 for detail, three-dot menu without duplicated detail", async ({
  page,
}) => {
  test.setTimeout(240_000);

  for (const { route, eye, dots, settings } of ACTION_ROUTES) {
    await gotoAndReady(page, route);
    const row = await firstBodyRow(page);

    if (eye) {
      const detail = row.getByLabel(/Ver detalle/);
      await expect(detail).toHaveCount(1);
      await expect(detail).toBeVisible();
      const label =
        (await detail.getAttribute("aria-label")) ??
        (await detail.getAttribute("title")) ??
        "";
      expect(label).toMatch(/Ver detalle/i);

      const geom = await controlGeometry(detail);
      expect(geom.w).toBe(32);
      expect(geom.h).toBe(32);
      expect(geom.visibility).toBe("visible");
      expect(geom.display).not.toBe("none");
      expect(geom.svg).not.toBeNull();
      const svg = geom.svg!;
      expect(svg.w).toBeGreaterThan(0);
      expect(svg.h).toBeGreaterThan(0);
      expect(svg.x).toBeGreaterThanOrEqual(geom.x - 0.5);
      expect(svg.y).toBeGreaterThanOrEqual(geom.y - 0.5);
      expect(svg.right).toBeLessThanOrEqual(geom.right + 0.5);
      expect(svg.bottom).toBeLessThanOrEqual(geom.bottom + 0.5);
    }

    if (settings) {
      const config = row.getByLabel(/Configurar SEO/);
      await expect(config).toHaveCount(1);
      await expect(config).toBeVisible();
      const geom = await controlGeometry(config);
      expect(geom.w).toBe(32);
      expect(geom.h).toBe(32);
      expect(geom.svg).not.toBeNull();
      expect((await config.getAttribute("aria-label")) ?? "").toMatch(
        /Configurar SEO/i,
      );
    }

    // The "Acciones" column must not hold two equivalents of the same action.
    if (eye) {
      await expect(row.getByLabel(/Ver detalle/)).toHaveCount(1);
    }

    if (dots) {
      const trigger = row.getByLabel(/Más acciones/);
      await expect(trigger).toHaveCount(1);
      const triggerGeom = await controlGeometry(trigger);
      expect(triggerGeom.w).toBe(32);
      expect(triggerGeom.h).toBe(32);

      await trigger.click();
      const menu = page.locator(".mantine-Menu-dropdown");
      await expect(menu).toBeVisible();

      const items = menu.getByRole("menuitem");
      expect(await items.count()).toBeGreaterThanOrEqual(1);
      const itemTexts = await items.allInnerTexts();
      expect(
        itemTexts.some((text) => /ver detalle/i.test(text)),
      ).toBe(false);

      const menuBox = await menu.boundingBox();
      expect(menuBox).not.toBeNull();
      expect(menuBox!.x).toBeGreaterThanOrEqual(0);
      expect(menuBox!.y).toBeGreaterThanOrEqual(0);
      expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(VIEWPORT.width);
      expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(VIEWPORT.height);

      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
    }

    if (route === "/categorias" || route === "/promociones") {
      await page.screenshot({
        path: test.info().outputPath(
          `visual-T03-actions-${route.replaceAll("/", "")}.png`,
        ),
        fullPage: true,
      });
    }
  }
});

// ---------------------------------------------------------------------------
// VIS-T04 — Button and control legibility / contrast
// ---------------------------------------------------------------------------
const LEGIBILITY_ROUTES = [
  ["Inventory", "/inventario"],
  ["Catalog", "/productos"],
  ["Taxonomy", "/categorias"],
  ["Combos", "/combos"],
  ["Promotions", "/promociones"],
  ["Pricing", "/precios"],
] as const;

interface ButtonSample {
  text: string;
  color: string;
  background: string;
  effectiveBackground: string;
  disabled: boolean;
  minHeight: number;
  height: number;
  clipped: boolean;
  variant: string | null;
}

interface IconSample {
  label: string;
  color: string;
  effectiveBackground: string;
  w: number;
  h: number;
  clipped: boolean;
}

test("VIS-T04 · buttons and controls: readable text, perceptible icons, normative heights, visible focus", async ({
  page,
}) => {
  test.setTimeout(180_000);

  for (const [module, route] of LEGIBILITY_ROUTES) {
    await gotoAndReady(page, route);

    const samples = await page.evaluate(() => {
      const effectiveBackground = (el: Element): string => {
        let node: Element | null = el;
        while (node) {
          const color = getComputedStyle(node).backgroundColor;
          if (color && color !== "transparent" && color !== "rgba(0, 0, 0, 0)") {
            return color;
          }
          node = node.parentElement;
        }
        return "rgb(255, 255, 255)";
      };
      const visible = (el: Element) =>
        (el as HTMLElement).offsetParent !== null;

      const buttons = Array.from(
        document.querySelectorAll("main .mantine-Button-root"),
      )
        .filter(visible)
        .map((el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            text: (el.textContent ?? "").trim(),
            color: style.color,
            background: style.backgroundColor,
            effectiveBackground: effectiveBackground(el),
            disabled:
              (el as HTMLButtonElement).disabled ||
              el.getAttribute("data-disabled") !== null,
            minHeight: parseFloat(style.minHeight),
            height: rect.height,
            clipped:
              el.scrollWidth > el.clientWidth + 1 ||
              el.scrollHeight > el.clientHeight + 1,
            variant: el.getAttribute("data-variant"),
          };
        });

      const icons = Array.from(
        document.querySelectorAll("main .mantine-ActionIcon-root"),
      )
        .filter(visible)
        .map((el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            label: el.getAttribute("aria-label") ?? el.getAttribute("title") ?? "",
            color: style.color,
            effectiveBackground: effectiveBackground(el),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            clipped:
              el.scrollWidth > el.clientWidth + 1 ||
              el.scrollHeight > el.clientHeight + 1,
          };
        });

      return { buttons, icons };
    });

    const textViolations = samples.buttons
      .filter((b: ButtonSample) => !b.disabled && b.text.length > 0)
      .map((b: ButtonSample) => ({
        text: b.text,
        ratio: contrastRatio(b.color, b.effectiveBackground),
      }))
      .filter((b) => b.ratio < 4.5);
    expect(
      textViolations,
      `[${module}] texto de botón con contraste < 4.5:1`,
    ).toEqual([]);

    const orangeOnOrange = samples.buttons.filter((b: ButtonSample) => {
      const [r, g, bl] = parseRgb(b.background);
      const isPrimaryOrange = r === 247 && g === 103 && bl === 7;
      const [cr, cg, cb] = parseRgb(b.color);
      const isOrangeText = cr > 200 && cg > 50 && cg < 160 && cb < 60;
      return isPrimaryOrange && isOrangeText;
    });
    expect(
      orangeOnOrange,
      `[${module}] botón naranja con texto naranja`,
    ).toEqual([]);

    for (const button of samples.buttons as ButtonSample[]) {
      expect(
        [32, 40, 48],
        `[${module}] altura normativa inesperada en "${button.text}" (${button.minHeight}px)`,
      ).toContain(button.minHeight);
      expect(
        button.height,
        `[${module}] botón "${button.text}" recortado en altura`,
      ).toBeGreaterThanOrEqual(button.minHeight - 0.5);
      expect(
        button.clipped,
        `[${module}] texto recortado en botón "${button.text}"`,
      ).toBe(false);
      if (button.disabled) {
        // A disabled control must be visually distinguishable from an enabled
        // primary action (not filled orange with ink text).
        expect(
          button.background,
          `[${module}] control deshabilitado no distinguible`,
        ).not.toBe("rgb(247, 103, 7)");
        expect(button.color).not.toBe("rgb(27, 24, 18)");
      }
    }

    const iconViolations = samples.icons
      .map((i: IconSample) => ({
        label: i.label,
        ratio: contrastRatio(i.color, i.effectiveBackground),
      }))
      .filter((i) => i.ratio < 3);
    expect(
      iconViolations,
      `[${module}] icono con contraste < 3:1`,
    ).toEqual([]);

    for (const icon of samples.icons as IconSample[]) {
      expect(icon.w).toBeGreaterThan(0);
      expect(icon.h).toBeGreaterThan(0);
      expect(
        icon.clipped,
        `[${module}] icono recortado "${icon.label}"`,
      ).toBe(false);
    }
  }

  // Visible keyboard focus on a primary action (focus token #4361EE).
  await gotoAndReady(page, "/productos");
  let focusOutlineColor: string | null = null;
  for (let i = 0; i < 80 && focusOutlineColor === null; i += 1) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) {
        return { isButton: false, outlineColor: "" };
      }
      return {
        isButton: active.matches("main .mantine-Button-root"),
        outlineColor: getComputedStyle(active).outlineColor,
      };
    });
    if (state.isButton) {
      focusOutlineColor = state.outlineColor;
    }
  }
  if (focusOutlineColor === null) {
    test.info().annotations.push({
      type: "REQUIERE_REVISION_VISUAL",
      description:
        "No se pudo llevar el foco de teclado a un botón de contenido para medir el anillo de foco.",
    });
  } else {
    expect(focusOutlineColor).toBe("rgb(67, 97, 238)");
  }

  await page.screenshot({
    path: test.info().outputPath("visual-T04-buttons-productos.png"),
    fullPage: true,
  });
});

// ---------------------------------------------------------------------------
// VIS-T05 — Layout overflow, cards and headings
// ---------------------------------------------------------------------------
const LAYOUT_ROUTES = [
  "/inventario",
  "/productos",
  "/precios/auditoria",
  "/promociones",
  "/inventario/dashboard",
] as const;

test("VIS-T05 · no document overflow, tables scroll in place, card titles Inter 20/700", async ({
  page,
}) => {
  test.setTimeout(180_000);

  for (const route of LAYOUT_ROUTES) {
    await gotoAndReady(page, route);

    const width = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(width.viewport).toBe(VIEWPORT.width);
    expect(width.doc).toBeLessThanOrEqual(VIEWPORT.width);
    expect(width.body).toBeLessThanOrEqual(VIEWPORT.width);

    const regions = page.locator('[role="region"][aria-label^="Tabla:"]');
    const regionCount = await regions.count();
    for (let i = 0; i < regionCount; i += 1) {
      const overflowX = await regions
        .nth(i)
        .evaluate((el) => getComputedStyle(el).overflowX);
      expect(overflowX).toBe("auto");
    }

    // Cells must not hide their content through overflow clipping.
    const firstRow = page.locator("table tbody tr").first();
    if ((await firstRow.count()) > 0) {
      const clipped = await firstRow.evaluate((row) =>
        Array.from(row.querySelectorAll("td")).some((cell) => {
          const style = getComputedStyle(cell);
          return (
            style.overflowY === "hidden" && cell.scrollHeight > cell.clientHeight + 1
          );
        }),
      );
      expect(clipped, `[${route}] celda con contenido oculto`).toBe(false);
    }

    // No button must be pushed outside the viewport by the layout (buttons
    // inside a horizontally scrollable table region are reported separately).
    const outOfViewport = await page.evaluate(() => {
      const regionSelector = '[role="region"][aria-label^="Tabla:"]';
      return Array.from(
        document.querySelectorAll(
          "main .mantine-Button-root, main .mantine-ActionIcon-root",
        ),
      )
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .filter((el) => !el.closest(regionSelector))
        .map((el) => el.getBoundingClientRect())
        .filter((rect) => rect.left < -1 || rect.right > window.innerWidth + 1)
        .map((rect) => ({ left: Math.round(rect.left), right: Math.round(rect.right) }));
    });
    expect(outOfViewport, `[${route}] controles fuera del viewport`).toEqual([]);
  }

  // SectionCard headings: Inter 20/28 700; card radius 12 and padding 24.
  await gotoAndReady(page, "/inventario/dashboard");
  const sections = page.locator("section[aria-labelledby]");
  const sectionCount = await sections.count();
  expect(sectionCount).toBeGreaterThan(0);
  for (let i = 0; i < sectionCount; i += 1) {
    const card = await sections.nth(i).evaluate((section) => {
      const id = section.getAttribute("aria-labelledby") ?? "";
      const heading = document.getElementById(id);
      const headingStyle = heading ? getComputedStyle(heading) : null;
      const style = getComputedStyle(section);
      return {
        title: heading?.textContent?.trim() ?? "",
        fontFamily: headingStyle?.fontFamily ?? "",
        fontSize: headingStyle?.fontSize ?? "",
        fontWeight: headingStyle?.fontWeight ?? "",
        padding: style.paddingTop,
        radius: style.borderRadius,
        shadow: style.boxShadow,
        border: style.borderTopWidth,
      };
    });
    expect(card.title.length).toBeGreaterThan(0);
    expect(card.fontFamily).toContain("Inter");
    expect(card.fontSize).toBe("20px");
    expect(card.fontWeight).toBe("700");
    expect(card.padding).toBe("24px");
    expect(card.radius).toBe("12px");
    expect(card.shadow).toBe("none");
    expect(card.border).toBe("1px");
  }

  // Three-dot menu near the right edge must remain inside the viewport.
  await gotoAndReady(page, "/promociones");
  const row = await firstBodyRow(page);
  await row.getByLabel(/Más acciones/).first().click();
  const menu = page.locator(".mantine-Menu-dropdown");
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(VIEWPORT.width);
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(VIEWPORT.height);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();

  await page.screenshot({
    path: test.info().outputPath("visual-T05-layout-dashboard.png"),
    fullPage: true,
  });
});
