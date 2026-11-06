// Test-only entrypoint. Uses actual pages and HTTP adapters; never imported by src/main.
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/oswald/latin-700.css";
import "../../src/theme/global.css";
import { theme, cssVariablesResolver } from "../../src/theme/theme";
import { ApplicationShell } from "../../src/app/layout/ApplicationShell";
import { productRoutes } from "../../src/app/routes/productRoutes";
import { DataModeContext } from "../../src/app/config/DataModeContext";
import { PromotionApiContext } from "../../src/app/config/PromotionApiContext";
import { createHttpPromotionServices } from "../../src/features/promotions/adapters/httpPromotionServices";

declare global {
  interface Window {
    __promotionsHttpTest?: { token: string };
  }
}
if (!import.meta.env.DEV || !window.__promotionsHttpTest)
  throw new Error(
    "La entrada aislada requiere configuración explícita de prueba.",
  );
const services = createHttpPromotionServices({
  gatewayOrigin: location.origin,
  getAccessToken: async (signal) => {
    signal.throwIfAborted();
    return window.__promotionsHttpTest?.token ?? null;
  },
});
const router = createBrowserRouter([
  { element: <ApplicationShell />, children: productRoutes },
]);
createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
    <DataModeContext.Provider value="api">
      <PromotionApiContext.Provider value={services}>
        <RouterProvider router={router} />
      </PromotionApiContext.Provider>
    </DataModeContext.Provider>
  </MantineProvider>,
);
