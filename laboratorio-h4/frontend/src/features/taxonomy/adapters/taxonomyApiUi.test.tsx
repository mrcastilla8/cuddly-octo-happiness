// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { DataModeContext } from "../../../app/config/DataModeContext";
import { configureTaxonomyGateway } from "../services/taxonomyGatewayRuntime";
import { ProductTypeListPage } from "../pages/ProductTypeListPage";
import { ProductTypeSchemaPage } from "../pages/ProductTypeSchemaPage";
import { TaxonomyModeGate } from "../../../app/config/TaxonomyModeGate";
vi.mock("../../shared/useMockStateRevision", () => ({
  useMockStateRevision: () => 0,
}));
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
afterEach(() => {
  cleanup();
  configureTaxonomyGateway(undefined);
});
it("muestra 403 en la interfaz sin sustituir la respuesta por fixtures", async () => {
  const request = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 403 }));
  configureTaxonomyGateway({ request });
  render(
    <MantineProvider>
      <DataModeContext.Provider value="api">
        <MemoryRouter>
          <ProductTypeListPage />
        </MemoryRouter>
      </DataModeContext.Provider>
    </MantineProvider>,
  );
  expect(await screen.findByText(/HTTP 403/)).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(1);
});

it("el gate abre solo la pantalla con adaptador HTTP y mantiene las demás bloqueadas", () => {
  configureTaxonomyGateway({ request: vi.fn() });
  const view = render(
    <MantineProvider>
      <DataModeContext.Provider value="api">
        <MemoryRouter initialEntries={["/caracteristicas"]}>
          <TaxonomyModeGate>
            <span>contenido habilitado</span>
          </TaxonomyModeGate>
        </MemoryRouter>
      </DataModeContext.Provider>
    </MantineProvider>,
  );
  expect(
    screen.getByText("Esta función no está disponible en el modo actual."),
  ).toBeTruthy();
  view.unmount();
  render(
    <MantineProvider>
      <DataModeContext.Provider value="api">
        <MemoryRouter initialEntries={["/tipos-producto"]}>
          <TaxonomyModeGate>
            <span>contenido habilitado</span>
          </TaxonomyModeGate>
        </MemoryRouter>
      </DataModeContext.Provider>
    </MantineProvider>,
  );
  expect(screen.getByText("contenido habilitado")).toBeTruthy();
});

it("habilita la consulta de esquema solo con el adapter configurado", () => {
  configureTaxonomyGateway(undefined);
  const blocked = render(
    <MantineProvider>
      <DataModeContext.Provider value="api">
        <MemoryRouter initialEntries={["/tipos-producto/type-1/esquema"]}>
          <TaxonomyModeGate><span>esquema disponible</span></TaxonomyModeGate>
        </MemoryRouter>
      </DataModeContext.Provider>
    </MantineProvider>,
  );
  expect(screen.queryByText("esquema disponible")).toBeNull();
  blocked.unmount();
  configureTaxonomyGateway({ request: vi.fn() });
  render(
    <MantineProvider>
      <DataModeContext.Provider value="api">
        <MemoryRouter initialEntries={["/tipos-producto/type-1/esquema"]}>
          <TaxonomyModeGate><span>esquema disponible</span></TaxonomyModeGate>
        </MemoryRouter>
      </DataModeContext.Provider>
    </MantineProvider>,
  );
  expect(screen.getByText("esquema disponible")).toBeTruthy();
});

it("muestra esquema API tipado en modo lectura sin controles administrativos", async () => {
  const request = vi.fn().mockResolvedValue(Response.json({
    tipoProducto: { tipoProductoId: "type-1", nombre: "Calzado HTTP", estado: "ACTIVO", schemaVersion: 0 },
    caracteristicas: [],
    schemaVersion: 0,
  }));
  configureTaxonomyGateway({ request });
  render(
    <MantineProvider>
      <DataModeContext.Provider value="api">
        <MemoryRouter initialEntries={["/tipos-producto/type-1/esquema"]}>
          <Routes><Route path="/tipos-producto/:id/esquema" element={<TaxonomyModeGate><ProductTypeSchemaPage /></TaxonomyModeGate>} /></Routes>
        </MemoryRouter>
      </DataModeContext.Provider>
    </MantineProvider>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: "Calzado HTTP" })).toBeTruthy();
  expect(screen.getByText("Este tipo de producto no tiene características asociadas.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /desactivar|asociar|reactivar/i })).toBeNull();
  expect(request).toHaveBeenCalledWith(
    "/api/v1/tipos-producto/type-1/caracteristicas",
    expect.any(AbortSignal),
  );
});

it("presenta HTTP 404 como tipo no encontrado sin recurrir a datos mock", async () => {
  const request = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
  configureTaxonomyGateway({ request });
  render(
    <MantineProvider>
      <DataModeContext.Provider value="api">
        <MemoryRouter initialEntries={["/tipos-producto/type-missing/esquema"]}>
          <Routes><Route path="/tipos-producto/:id/esquema" element={<TaxonomyModeGate><ProductTypeSchemaPage /></TaxonomyModeGate>} /></Routes>
        </MemoryRouter>
      </DataModeContext.Provider>
    </MantineProvider>,
  );
  expect(await screen.findByText("Tipo de producto no encontrado")).toBeTruthy();
  expect(screen.queryByText("Calzado deportivo")).toBeNull();
  expect(request).toHaveBeenCalledTimes(1);
});

it.each([
  "/categorias",
  "/caracteristicas",
  "/tipos-producto/nuevo",
  "/tipos-producto/type-1",
  "/marcas",
  "/seo",
])("mantiene la ruta administrativa %s bloqueada en modo API", (path) => {
  configureTaxonomyGateway({ request: vi.fn() });
  render(
    <MantineProvider>
      <DataModeContext.Provider value="api">
        <MemoryRouter initialEntries={[path]}>
          <TaxonomyModeGate>
            <span>acción administrativa disponible</span>
          </TaxonomyModeGate>
        </MemoryRouter>
      </DataModeContext.Provider>
    </MantineProvider>,
  );
  expect(
    screen.getByText("Esta función no está disponible en el modo actual."),
  ).toBeTruthy();
  expect(screen.queryByText("acción administrativa disponible")).toBeNull();
});

it("identifica el mock de Taxonomía como datos simulados", () => {
  render(
    <MantineProvider>
      <DataModeContext.Provider value="mock">
        <MemoryRouter initialEntries={["/categorias"]}>
          <TaxonomyModeGate>
            <span>contenido mock</span>
          </TaxonomyModeGate>
        </MemoryRouter>
      </DataModeContext.Provider>
    </MantineProvider>,
  );
  expect(screen.getByText("Datos simulados")).toBeTruthy();
  expect(screen.getByText("contenido mock")).toBeTruthy();
});
