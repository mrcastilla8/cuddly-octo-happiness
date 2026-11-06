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
import { DataModeContext } from "../../src/app/config/DataModeContext";
import { resetInventoryRepository } from "../../src/features/inventory/services/inventoryProvider";
import {
  AlternateInventoryRepository,
  type AlternateInventoryAudit,
} from "../adapters/alternateInventoryRepository";

declare global {
  interface Window {
    inventoryAudit: AlternateInventoryAudit;
  }
}

const params = new URLSearchParams(window.location.search);
const repository = new AlternateInventoryRepository();
window.inventoryAudit = repository.audit;
repository.audit.failRead = params.get("fail-read") === "1";
repository.audit.failReceive = params.get("fail-receive") === "1";
repository.audit.empty = params.get("empty") === "1";
repository.audit.failCategories = params.get("fail-categories") === "1";
repository.audit.failBrands = params.get("fail-brands") === "1";
repository.audit.failLocations = params.get("fail-locations") === "1";

// Inyectar el repositorio alternativo en el singleton
resetInventoryRepository(repository);

window.history.replaceState(null, "", params.get("path") ?? "/inventario");

const { App } = await import("../../src/app/App");

createRoot(document.getElementById("root")!).render(
  <MantineProvider
    theme={theme}
    cssVariablesResolver={cssVariablesResolver}
    forceColorScheme="light"
  >
    <DataModeContext.Provider value="mock">
      <App />
    </DataModeContext.Provider>
  </MantineProvider>,
);
