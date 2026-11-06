import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/oswald/latin-700.css";
import "../../src/theme/global.css";
import { theme, cssVariablesResolver } from "../../src/theme/theme";
import { DataModeContext } from "../../src/app/config/DataModeContext";
import { CatalogServicesContext } from "../../src/features/catalog/services/CatalogServicesContext";
import { createOptionalCatalogHttpServices } from "../../src/features/catalog/services/catalogHttpRuntime";
import { PricingProvider } from "../../src/features/pricing/components/PricingProvider";
import { createPricingRuntime } from "../../src/features/pricing/services/pricingService";

const path = new URLSearchParams(location.search).get("path") ?? "/productos/nuevo";
history.replaceState(null, "", path);
const services = createOptionalCatalogHttpServices("https://gateway.test")!;
const pricing = await createPricingRuntime("api");
const { App } = await import("../../src/app/App");
createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} forceColorScheme="light">
    <DataModeContext.Provider value="api"><CatalogServicesContext.Provider value={services}>
      <PricingProvider runtime={pricing}><App /></PricingProvider>
    </CatalogServicesContext.Provider></DataModeContext.Provider>
  </MantineProvider>,
);
