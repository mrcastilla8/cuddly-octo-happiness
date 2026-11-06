import { createRoot } from "react-dom/client";
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
import {
  AlternatePricingRepository,
  type AdapterAudit,
} from "../adapters/alternatePricingRepository";

declare global {
  interface Window {
    pricingAudit: AdapterAudit;
  }
}
const params = new URLSearchParams(window.location.search);
const clock = { now: () => "2026-10-17T12:00:00Z" };
const repository = new AlternatePricingRepository(clock);
window.pricingAudit = repository.audit;
repository.audit.failCatalog = params.get("fail-catalog") === "1";
const runtime = await createPricingRuntime("api", {
  api: params.get("missing") === "1" ? undefined : async () => repository,
  clock,
});
if (params.get("missing") !== "1")
  runtime.notice = {
    title: "Adapter de verificación",
    description:
      "Segundo origen de prueba, sin backend real. Usa las páginas y rutas de producto sin modificarlas.",
  };
window.history.replaceState(null, "", params.get("path") ?? "/precios");
// Import the identical App/router only after establishing the requested business URL.
const { App } = await import("../../src/app/App");
createRoot(document.getElementById("root")!).render(
  <MantineProvider
    theme={theme}
    cssVariablesResolver={cssVariablesResolver}
    forceColorScheme="light"
  >
    <DataModeContext.Provider value="api">
      <PricingProvider runtime={runtime}>
        <App />
      </PricingProvider>
    </DataModeContext.Provider>
  </MantineProvider>,
);
