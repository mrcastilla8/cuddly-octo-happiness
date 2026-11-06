// Solo verificación de UI con HTTP simulado; no es composition root ni E2E real.
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/oswald/latin-700.css";
import "../../../theme/global.css";
import { theme, cssVariablesResolver } from "../../../theme/theme";
import { ContextNote } from "../../../components/shared";
import { DataModeContext } from "../../../app/config/DataModeContext";
import { PricingProvider } from "../components/PricingProvider";
import { createPricingRuntime } from "../services/pricingService";
import { createHttpPricingRepository } from "../adapters/httpPricingRepository";
import { AuditRuntimeContext } from "../../price-audit/services/AuditRuntimeContext";
import { createAuditRuntime } from "../../price-audit/services/auditService";

if (!import.meta.env.DEV)
  throw new Error("Harness exclusivo de pruebas locales.");
const params = new URLSearchParams(location.search);
const runtime = await createPricingRuntime("api", {
  api: async () =>
    createHttpPricingRepository({
      // Fixture explícita de la frontera de Catálogo; no es un proveedor real.
      listCatalogTargets: async () => [
        {
          kind: "product",
          id: "http-test",
          productId: "http-product",
          label: "Producto HTTP de prueba",
        },
      ],
      transport: { request: (path, init) => fetch(path, init) },
    }),
});
const audit = {
  ...(await createAuditRuntime("mock")),
  ReviewTools: () => (
    <ContextNote title="Auditoría MK-014 mock:">
      Datos de demostración; sin Gateway, PostgreSQL ni auditoría real.
    </ContextNote>
  ),
};
history.replaceState(
  null,
  "",
  params.get("path") ?? "/precios?target=http-test",
);
const { App } = await import("../../../app/App");
const element = document.getElementById("root");
if (!element) throw new Error("Falta el contenedor de pruebas.");
createRoot(element).render(
  <MantineProvider
    theme={theme}
    cssVariablesResolver={cssVariablesResolver}
    forceColorScheme="light"
  >
    <DataModeContext.Provider value="api">
      <AuditRuntimeContext.Provider value={audit}>
        <PricingProvider runtime={runtime}>
          <App />
        </PricingProvider>
      </AuditRuntimeContext.Provider>
    </DataModeContext.Provider>
  </MantineProvider>,
);
