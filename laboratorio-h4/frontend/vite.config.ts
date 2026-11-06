import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolveDataMode } from "./src/app/config/dataMode.ts";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (command === "build")
    resolveDataMode(process.env.VITE_DATA_MODE ?? env.VITE_DATA_MODE, false);
  const demo =
    process.env.VITE_G6_READ_DEMO ?? env.VITE_G6_READ_DEMO ?? "false";
  if (!["true", "false"].includes(demo))
    throw new Error("VITE_G6_READ_DEMO debe ser true/false.");
  if (
    demo === "true" &&
    (process.env.VITE_DATA_MODE ?? env.VITE_DATA_MODE) !== "api"
  )
    throw new Error("La demo de lectura real requiere VITE_DATA_MODE=api.");
  if (demo === "true" && !(process.env.VITE_GATEWAY_ORIGIN ?? env.VITE_GATEWAY_ORIGIN))
    throw new Error("La demo requiere VITE_GATEWAY_ORIGIN explícito y CORS aprobado por Gateway.");
  const labProxy =
    (process.env.VITE_H4_LAB_PROXY ?? env.VITE_H4_LAB_PROXY) === "true";
  if (labProxy && (process.env.VITE_DATA_MODE ?? env.VITE_DATA_MODE) !== "api")
    throw new Error("El proxy H4 solo admite VITE_DATA_MODE=api.");
  return {
    plugins: [react()],
    ...(labProxy
      ? {
          server: {
            proxy: {
              "/api/v1": {
                target: "http://127.0.0.1:3000",
                changeOrigin: false,
              },
            },
          },
        }
      : {}),
  };
});
