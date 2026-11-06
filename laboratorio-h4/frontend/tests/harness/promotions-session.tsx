import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/oswald/latin-700.css";
import "../../src/theme/global.css";
import { theme, cssVariablesResolver } from "../../src/theme/theme";
import { App } from "../../src/app/App";
import { DataModeContext } from "../../src/app/config/DataModeContext";
import { PromotionApiContext } from "../../src/app/config/PromotionApiContext";
import { PromotionSessionContext } from "../../src/app/config/PromotionSessionContext";
import { createPromotionSessionRuntime } from "../../src/features/promotions/services/promotionSessionRuntime";
if (!import.meta.env.DEV)
  throw new Error("Entrada exclusiva de pruebas locales.");
const runtime = createPromotionSessionRuntime(
  location.origin,
  location.origin + "/g7/api/v1",
);
createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
    <DataModeContext.Provider value="api">
      <PromotionSessionContext.Provider value={runtime.session}>
        <PromotionApiContext.Provider value={runtime.services}>
          <App />
        </PromotionApiContext.Provider>
      </PromotionSessionContext.Provider>
    </DataModeContext.Provider>
  </MantineProvider>,
);
