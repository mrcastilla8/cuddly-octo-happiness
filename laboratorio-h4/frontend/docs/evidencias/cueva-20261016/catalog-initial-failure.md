# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: catalog.spec.ts >> MK-003 Gestión de productos (CRUD principal) >> S01: listado, búsqueda, filtros combinados y conservación de contexto
- Location: tests\catalog.spec.ts:13:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /modelo=variants/
Received string:  "http://127.0.0.1:5173/productos"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × locator resolved to <html lang="es" data-mantine-color-scheme="light" data-respect-reduced-motion="true">…</html>
       - unexpected value "http://127.0.0.1:5173/productos"

```

```yaml
- banner:
  - img "Inka Athletics"
  - paragraph: Productos y Ofertas
- navigation:
  - paragraph: Navegación
  - navigation "Navegación de la aplicación":
    - paragraph: CATÁLOGO
    - link "Gestión de productos":
      - /url: /productos
    - link "Carga masiva":
      - /url: /carga-masiva
    - link "Descargas y exportación":
      - /url: /carga-masiva/descargas
    - paragraph: PROMOCIONES
    - link "Venta cruzada y upselling":
      - /url: /recomendaciones
    - link "Ofertas y promociones":
      - /url: /promociones
    - link "Cupones de descuento":
      - /url: /cupones
    - paragraph: PRECIOS
    - link "Consultar precios":
      - /url: /precios
    - link "Importar precios":
      - /url: /precios/importar
    - link "Historial de precios":
      - /url: /precios/auditoria
    - paragraph: TAXONOMÍA
    - link "Categorías":
      - /url: /categorias
    - link "Características":
      - /url: /caracteristicas
    - link "Tipos de producto":
      - /url: /tipos-producto
    - link "Marcas":
      - /url: /marcas
    - link "SEO":
      - /url: /seo
- main:
  - link "Inicio":
    - /url: /precios
  - text: /
  - link "Catálogo":
    - /url: /productos
  - text: /
  - paragraph: Productos
  - heading "Gestión de productos" [level=1]
  - paragraph: Administra productos simples y productos con variantes. Consulta el estado de catálogo y las preparaciones antes de publicar.
  - link "Crear producto":
    - /url: /productos/nuevo
    - img
    - text: Crear producto
  - region "Filtros":
    - text: Búsqueda
    - textbox "Búsqueda":
      - /placeholder: Buscar por nombre, SKU base o descripción...
    - text: Categoría
    - combobox "Categoría": Todas las categorías
    - img
    - text: Tipo
    - combobox "Tipo": Todos los tipos
    - img
    - text: Modelo
    - combobox "Modelo": "Modelo: Todos"
    - img
    - combobox "Estado del producto": Todos los estados
    - img
    - status: Mostrando 7 de 7 productos
  - 'region "Tabla: Listado de productos"':
    - table "Listado de productos":
      - caption: Listado de productos
      - rowgroup:
        - row "PRODUCTO SKU BASE MODELO DE VENTA PREPARACIÓN ESTADO ACCIONES":
          - columnheader "PRODUCTO"
          - columnheader "SKU BASE"
          - columnheader "MODELO DE VENTA"
          - columnheader "PREPARACIÓN"
          - columnheader "ESTADO"
          - columnheader "ACCIONES"
      - rowgroup:
        - row "Camisa Oxford Manga Larga Camisa Oxford Manga Larga Ropa · Camisa CAM-OXF Con variantes Completada Activo Ver detalle":
          - cell "Camisa Oxford Manga Larga Camisa Oxford Manga Larga Ropa · Camisa":
            - img "Camisa Oxford Manga Larga"
            - paragraph: Camisa Oxford Manga Larga
            - paragraph: Ropa · Camisa
          - cell "CAM-OXF":
            - paragraph: CAM-OXF
          - cell "Con variantes"
          - cell "Completada"
          - cell "Activo"
          - cell "Ver detalle":
            - link "Ver detalle":
              - /url: /productos/PROD-OXF-001
              - img
              - text: Ver detalle
        - row "Mochila Deportiva Endurance Mochila Deportiva Endurance Accesorios · Mochila MOCH-ENT-001 Simple Completada Borrador Ver detalle":
          - cell "Mochila Deportiva Endurance Mochila Deportiva Endurance Accesorios · Mochila":
            - img "Mochila Deportiva Endurance"
            - paragraph: Mochila Deportiva Endurance
            - paragraph: Accesorios · Mochila
          - cell "MOCH-ENT-001":
            - paragraph: MOCH-ENT-001
          - cell "Simple"
          - cell "Completada"
          - cell "Borrador"
          - cell "Ver detalle":
            - link "Ver detalle":
              - /url: /productos/PROD-MOCH-001
              - img
              - text: Ver detalle
        - row "Zapatilla Running Pro Zapatilla Running Pro Calzado · Zapatilla ZAP-RUN-001 Con variantes Completada Inactivo Ver detalle":
          - cell "Zapatilla Running Pro Zapatilla Running Pro Calzado · Zapatilla":
            - img "Zapatilla Running Pro"
            - paragraph: Zapatilla Running Pro
            - paragraph: Calzado · Zapatilla
          - cell "ZAP-RUN-001":
            - paragraph: ZAP-RUN-001
          - cell "Con variantes"
          - cell "Completada"
          - cell "Inactivo"
          - cell "Ver detalle":
            - link "Ver detalle":
              - /url: /productos/PROD-ZAP-001
              - img
              - text: Ver detalle
        - row "Casaca Cortaviento Trail Casaca Cortaviento Trail Ropa · Casaca CAS-COR-001 Simple Completada Activo Ver detalle":
          - cell "Casaca Cortaviento Trail Casaca Cortaviento Trail Ropa · Casaca":
            - img "Casaca Cortaviento Trail"
            - paragraph: Casaca Cortaviento Trail
            - paragraph: Ropa · Casaca
          - cell "CAS-COR-001":
            - paragraph: CAS-COR-001
          - cell "Simple"
          - cell "Completada"
          - cell "Activo"
          - cell "Ver detalle":
            - link "Ver detalle":
              - /url: /productos/PROD-CAS-001
              - img
              - text: Ver detalle
        - row "PO Polo Técnico Transpirable Ropa · Camisa POL-TEC-002 Simple En curso Borrador Ver detalle":
          - cell "PO Polo Técnico Transpirable Ropa · Camisa":
            - text: PO
            - paragraph: Polo Técnico Transpirable
            - paragraph: Ropa · Camisa
          - cell "POL-TEC-002":
            - paragraph: POL-TEC-002
          - cell "Simple"
          - cell "En curso"
          - cell "Borrador"
          - cell "Ver detalle":
            - link "Ver detalle":
              - /url: /productos/PROD-POL-002
              - img
              - text: Ver detalle
        - row "PA Pantalón Trekking Alpinista Ropa · Camisa PAN-TRK-003 Simple Parcial Borrador Ver detalle":
          - cell "PA Pantalón Trekking Alpinista Ropa · Camisa":
            - text: PA
            - paragraph: Pantalón Trekking Alpinista
            - paragraph: Ropa · Camisa
          - cell "PAN-TRK-003":
            - paragraph: PAN-TRK-003
          - cell "Simple"
          - cell "Parcial"
          - cell "Borrador"
          - cell "Ver detalle":
            - link "Ver detalle":
              - /url: /productos/PROD-PAN-003
              - img
              - text: Ver detalle
        - row "CA Casaca Térmica Andina Ropa · Casaca CAS-TER-004 Con variantes Parcial Borrador Ver detalle":
          - cell "CA Casaca Térmica Andina Ropa · Casaca":
            - text: CA
            - paragraph: Casaca Térmica Andina
            - paragraph: Ropa · Casaca
          - cell "CAS-TER-004":
            - paragraph: CAS-TER-004
          - cell "Con variantes"
          - cell "Parcial"
          - cell "Borrador"
          - cell "Ver detalle":
            - link "Ver detalle":
              - /url: /productos/PROD-TRA-004
              - img
              - text: Ver detalle
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { evidencePath } from "./support/evidence";
  3   |
  4   | async function noPageOverflow(page: Page) {
  5   |   expect(
  6   |     await page.evaluate(
  7   |       () => document.documentElement.scrollWidth <= window.innerWidth,
  8   |     ),
  9   |   ).toBe(true);
  10  | }
  11  |
  12  | test.describe("MK-003 Gestión de productos (CRUD principal)", () => {
  13  |   test("S01: listado, búsqueda, filtros combinados y conservación de contexto", async ({
  14  |     page,
  15  |   }) => {
  16  |     await page.goto("/productos");
  17  |     await expect(
  18  |       page.getByRole("heading", { name: "Gestión de productos", exact: true }),
  19  |     ).toBeVisible();
  20  |
  21  |     // Verify initial items
  22  |     await expect(page.getByText("Camisa Oxford Manga Larga")).toBeVisible();
  23  |     await expect(page.getByText("Mochila Deportiva Endurance")).toBeVisible();
  24  |
  25  |     // Search filter
  26  |     const searchInput = page.getByPlaceholder(
  27  |       "Buscar por nombre, SKU base o descripción...",
  28  |     );
  29  |     await searchInput.fill("Oxford");
  30  |     await expect(page.getByText("Camisa Oxford Manga Larga")).toBeVisible();
  31  |     await expect(page.getByText("Mochila Deportiva Endurance")).toHaveCount(0);
  32  |
  33  |     // Clear search
  34  |     await searchInput.fill("");
  35  |
  36  |     // Filter by sale model "Con variantes"
  37  |     const modelSelect = page.getByRole("combobox", { name: "Modelo" });
  38  |     await modelSelect.click();
  39  |     await page.getByRole("option", { name: "Con variantes" }).click();
  40  |     await expect(page).toHaveURL(/modelo=variants/);
  41  |
  42  |     // Navigate to detail and return
  43  |     await page
  44  |       .getByRole("link", { name: "Ver detalle" })
  45  |       .first()
  46  |       .click();
  47  |     await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  48  |
  49  |     // Return to list
  50  |     await page.getByRole("link", { name: "Volver a la lista" }).click();
> 51  |     await expect(page).toHaveURL(/modelo=variants/);
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  52  |     await noPageOverflow(page);
  53  |   });
  54  |
  55  |   test("S01: estados deterministas de revisión (empty, no-results, error)", async ({
  56  |     page,
  57  |   }) => {
  58  |     // Empty list
  59  |     await page.goto("/productos?modoRevision=1&escenario=list-empty");
  60  |     await expect(page.getByText("Aún no hay productos")).toBeVisible();
  61  |
  62  |     // Error state
  63  |     await page.goto("/productos?modoRevision=1&escenario=list-error");
  64  |     await expect(
  65  |       page.getByText("No se pudieron consultar los productos"),
  66  |     ).toBeVisible();
  67  |     await expect(
  68  |       page.getByRole("button", { name: "Reintentar consulta" }),
  69  |     ).toBeVisible();
  70  |
  71  |     // Recover from error
  72  |     await page.getByRole("button", { name: "Reintentar consulta" }).click();
  73  |     await expect(page.getByText("Camisa Oxford Manga Larga")).toBeVisible();
  74  |     await noPageOverflow(page);
  75  |   });
  76  |
  77  |   test("S02: crear producto simple en BORRADOR y navegación inmediata a S06", async ({
  78  |     page,
  79  |   }) => {
  80  |     await page.goto("/productos/nuevo");
  81  |     await expect(
  82  |       page.getByRole("heading", { name: "Crear producto" }),
  83  |     ).toBeVisible();
  84  |
  85  |     // Check minimum validation triggers
  86  |     await page.getByRole("button", { name: "Guardar borrador" }).click();
  87  |     await expect(page.getByText("El nombre es obligatorio.")).toBeVisible();
  88  |
  89  |     // Fill minimum required data
  90  |     await page.getByLabel("Nombre del producto").fill("Casaca Polar Andina");
  91  |     await page
  92  |       .getByLabel("Descripción comercial")
  93  |       .fill("Casaca térmica de alta montaña en polar reciclado.");
  94  |     await page.getByLabel("SKU Base").fill("CAS-POL-999");
  95  |     await page.getByLabel("Precio base inicial (S/.)").fill("149.90");
  96  |
  97  |     // Physical profile for simple product
  98  |     await page.getByLabel("Peso (kg)").fill("0.65");
  99  |     await page.getByLabel("Largo (cm)").fill("35");
  100 |     await page.getByLabel("Ancho (cm)").fill("25");
  101 |     await page.getByLabel("Alto (cm)").fill("8");
  102 |
  103 |     // Submit form
  104 |     await page.getByRole("button", { name: "Guardar borrador" }).click();
  105 |
  106 |     // FLOW-003 §4.1: Must navigate directly to S06 preparation page!
  107 |     await expect(page).toHaveURL(/\/productos\/PROD-.*\/preparacion/);
  108 |     await expect(
  109 |       page.getByRole("heading", { name: "Preparación del producto" }),
  110 |     ).toBeVisible();
  111 |     await expect(page.getByText("Borrador guardado exitosamente.")).toBeVisible();
  112 |     await noPageOverflow(page);
  113 |   });
  114 |
  115 |   test("S02: validación de SKU duplicado conserva datos", async ({ page }) => {
  116 |     await page.goto("/productos/nuevo?modoRevision=1&escenario=create-duplicate-sku");
  117 |     await page.getByLabel("Nombre del producto").fill("Producto Duplicado");
  118 |     await page.getByLabel("Descripción comercial").fill("Descripción de prueba.");
  119 |     await page.getByLabel("SKU Base").fill("CAM-OXF");
  120 |     await page.getByLabel("Precio base inicial (S/.)").fill("99");
  121 |
  122 |     await page.getByRole("button", { name: "Guardar borrador" }).click();
  123 |     await expect(
  124 |       page.getByText("El SKU base \"CAM-OXF\" ya está registrado en el catálogo."),
  125 |     ).toBeVisible();
  126 |
  127 |     // Form inputs must remain preserved
  128 |     await expect(page.getByLabel("Nombre del producto")).toHaveValue(
  129 |       "Producto Duplicado",
  130 |     );
  131 |   });
  132 |
  133 |   test("S03: editar producto conserva SKU y modelo inmutables", async ({
  134 |     page,
  135 |   }) => {
  136 |     await page.goto("/productos/PROD-MOCH-001/editar");
  137 |     await expect(
  138 |       page.getByRole("heading", { name: /Editar: Mochila Deportiva/ }),
  139 |     ).toBeVisible();
  140 |
  141 |     // SKU Base and sale model are immutable / disabled
  142 |     await expect(page.getByLabel("SKU Base")).toBeDisabled();
  143 |     await expect(page.getByLabel("SKU Base")).toHaveValue("MOCH-ENT-001");
  144 |     await expect(page.getByLabel("Precio base inicial (S/.)")).toBeDisabled();
  145 |
  146 |     // Modify editable fields
  147 |     const nameInput = page.getByLabel("Nombre del producto");
  148 |     await nameInput.fill("Mochila Deportiva Endurance Pro");
  149 |     await page.getByRole("button", { name: "Guardar cambios" }).click();
  150 |
  151 |     // Navigates back to S04 detail
```