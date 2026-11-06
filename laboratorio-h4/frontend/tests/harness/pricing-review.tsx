import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/oswald/latin-700.css";
import { theme, cssVariablesResolver } from "../../src/theme/theme";
import "../../src/theme/global.css";
import { DataModeContext } from "../../src/app/config/DataModeContext";
import { PricingProvider } from "../../src/features/pricing/components/PricingProvider";
import { createDemoPricingRuntime } from "../../src/features/pricing/mocks/createDemoPricingRuntime";
import { browserReportDownloader } from "../../src/features/pricing/services/browserReportDownloader";
import { createCombosRuntime } from "../../src/features/combos/services/combosService";
import { CombosProvider } from "../../src/features/combos/components/CombosProvider";

const params = new URLSearchParams(window.location.search);
const pricing = createDemoPricingRuntime(browserReportDownloader, { reviewTools: true });
const combos = await createCombosRuntime("mock", pricing);
window.history.replaceState(null, "", params.get("path") ?? "/precios");
const { App } = await import("../../src/app/App");
createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} forceColorScheme="light">
    <DataModeContext.Provider value="mock">
      <PricingProvider runtime={pricing}>
        <CombosProvider mode="mock" runtime={combos}><App /></CombosProvider>
      </PricingProvider>
    </DataModeContext.Provider>
  </MantineProvider>,
);
