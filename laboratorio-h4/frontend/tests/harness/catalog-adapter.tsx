import { createRoot } from "react-dom/client";
import { createBrowserRouter, Link, RouterProvider } from "react-router-dom";
import { ApplicationShell } from "../../src/app/layout/ApplicationShell";
import { productRoutes } from "../../src/app/routes/productRoutes";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/oswald/latin-700.css";
import "../../src/theme/global.css";
import { theme, cssVariablesResolver } from "../../src/theme/theme";
import { PricingProvider } from "../../src/features/pricing/components/PricingProvider";
import { createPricingRuntime } from "../../src/features/pricing/services/pricingService";
import { DataModeContext } from "../../src/app/config/DataModeContext";
import { CatalogServicesContext } from "../../src/features/catalog/services/CatalogServicesContext";
import { createCatalogServices } from "../../src/features/catalog/services/catalogServices";
import { createUnavailableApiCatalogRepository } from "../../src/features/catalog/adapters/unavailableApiCatalogRepository";
import type { ProductCreatePayload, ProductDetailView, ProductUpdatePayload, VariantCreatePayload } from "../../src/features/catalog/services/catalogRepository";
import type { TaxonomyRepository } from "../../src/features/catalog/services/taxonomyRepository";

declare global { interface Window { catalogPayload?: VariantCreatePayload; productPayload?: ProductUpdatePayload; createdProductPayload?: ProductCreatePayload; schemaReady?: boolean; renamedListOption?: boolean } }
const params = new URLSearchParams(location.search);
const product: ProductDetailView = {
  id: "external-product", name: "Producto del adapter alternativo", skuBase: "EXTERNAL",
  hasVariants: true, categoryId: "external-category", categoryName: "Categoría externa",
  typeId: "external-type", typeName: "Tipo externo", brandId: "external-brand", brandName: "Marca externa",
  status: "BORRADOR", preparationSummary: "PENDING", catalogVersion: 9,
  description: "Descripción existente", images: [], attributes: params.has("product-edit") ? [{ caracteristicaId: "historic", nombre: "Dato histórico", tipo: "TEXTO", valor: "Conservar" }] : [], physicalProfile: null, variants: [],
  preparation: { productId: "external-product", hasVariants: true,
    pricing: { status: "PENDING", manualRetryAllowed: false }, inventario: null, variantes: [] },
};
if (params.has("lista-edit")) product.attributes = [{
  caracteristicaId: "external-list", nombre: "Opción externa", tipo: "LISTA",
  valorId: params.has("lista-missing-id") ? undefined : "external-value", valor: "Etiqueta anterior",
}];
if (params.has("publication")) {
  product.hasVariants = false;
  product.publishedCommercially = params.get("publication") === "unknown" ? undefined : params.get("publication") === "true";
}
const catalog = {
  ...createUnavailableApiCatalogRepository(),
  list: async () => ({ items: [product], total: 1, page: 1, pageSize: 10 }),
  getById: async (id: string) => {
    if (id === "second-product" || id === "failed-product") {
      await new Promise(resolve => setTimeout(resolve, 600));
      if (id === "failed-product") throw new Error("Segundo producto no disponible");
      return { ...product, id, name: "Segundo producto", skuBase: "SECOND" };
    }
    return product;
  },
  update: async (_id: string, payload: ProductUpdatePayload) => {
    window.productPayload = payload;
    throw new Error("Guardado recibido");
  },
  create: async (payload: ProductCreatePayload): Promise<never> => {
    window.createdProductPayload = payload;
    throw new Error("Alta recibida");
  },
  createVariant: async (_id: string, payload: VariantCreatePayload): Promise<never> => {
    window.catalogPayload = payload;
    throw new Error("Respuesta del adapter alternativo");
  },
};
const taxonomy: TaxonomyRepository = {
  getCategories: async () => [{ id: "external-category", nombre: "Categoría externa", activo: true }],
  getProductTypes: async () => [{ id: "external-type", nombre: "Tipo externo", activo: true }],
  getBrands: async () => [{ id: "external-brand", nombre: "Marca externa", activo: true }],
  getAttributeSchema: async () => {
    if (params.has("schema-error")) throw new Error("Esquema no disponible");
    if (params.has("schema-delayed")) {
      while (!window.schemaReady) await new Promise(resolve => setTimeout(resolve, 20));
    }
    if (params.has("schema-empty")) return [];
    return [
      { caracteristicaId: "external-list", nombre: "Opción externa", tipo: "LISTA", obligatorio: true,
        esIdentificadora: true, opciones: [{ id: "external-value", valor: window.renamedListOption ? "Etiqueta renombrada" : "Etiqueta vigente" }] },
      { caracteristicaId: "external-number", nombre: "Temperatura", tipo: "NUMERO", obligatorio: true,
        esIdentificadora: false, minimum: -20, maximum: 20, unidad: "°C" },
      { caracteristicaId: "external-text", nombre: "Descripción técnica", tipo: "TEXTO", obligatorio: true,
        esIdentificadora: false, maxLength: 100 },
    ];
  },
};
const services = createCatalogServices("api", { apiCatalog: () => catalog, apiTaxonomy: () => taxonomy });
const runtime = await createPricingRuntime("api");
history.replaceState(null, "", params.get("path") ?? "/productos/external-product/variantes/nueva");
const { App } = await import("../../src/app/App");
function RouteLinks() {
  return <div style={{ position: "fixed", top: 8, right: 20, zIndex: 1000, display: "flex", gap: 16 }}><Link to="/productos/second-product/variantes/nueva">Cambiar producto</Link><Link to="/productos/failed-product/variantes/nueva">Producto con error</Link></div>;
}
const app = params.has("navigation") ? <RouterProvider router={createBrowserRouter([
  { element: <><ApplicationShell /><RouteLinks /></>, children: productRoutes },
])} /> : <App />;
createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
    <DataModeContext.Provider value="api">
      <CatalogServicesContext.Provider value={services}>
        <PricingProvider runtime={runtime}>{app}</PricingProvider>
      </CatalogServicesContext.Provider>
    </DataModeContext.Provider>
  </MantineProvider>,
);
