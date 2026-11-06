import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/oswald/latin-700.css";
import "../../src/theme/global.css";
import { theme, cssVariablesResolver } from "../../src/theme/theme";
import { DataModeContext } from "../../src/app/config/DataModeContext";
import { PricingProvider } from "../../src/features/pricing/components/PricingProvider";
import { createPricingRuntime } from "../../src/features/pricing/services/pricingService";
import { AuditRuntimeContext } from "../../src/features/price-audit/services/AuditRuntimeContext";
import { createAuditRuntime } from "../../src/features/price-audit/services/auditService";
import {
  createAlternateAuditRepository,
  type AlternateAuditControl,
} from "../adapters/alternateAuditRepository";

declare global {
  interface Window {
    auditControl: AlternateAuditControl;
  }
}
const params = new URLSearchParams(location.search);
const control: AlternateAuditControl = {
  queries: [],
  requests: [],
  reads: [],
  downloads: [],
  total: Number(params.get("total") ?? 1),
  phase: "PROCESSING",
  fileAvailable: true,
};
window.auditControl = control;
const runtime = await createAuditRuntime("api", {
  api:
    params.get("missing") === "1"
      ? undefined
      : async () => createAlternateAuditRepository(control),
});
const pricing = await createPricingRuntime("api");
history.replaceState(null, "", params.get("path") ?? "/precios/auditoria");
const { App } = await import("../../src/app/App");
createRoot(document.getElementById("root")!).render(
  <MantineProvider
    theme={theme}
    cssVariablesResolver={cssVariablesResolver}
    forceColorScheme="light"
  >
    <DataModeContext.Provider value="api">
      <PricingProvider runtime={pricing}>
        <AuditRuntimeContext.Provider value={runtime}>
          <App />
        </AuditRuntimeContext.Provider>
      </PricingProvider>
    </DataModeContext.Provider>
  </MantineProvider>,
);
