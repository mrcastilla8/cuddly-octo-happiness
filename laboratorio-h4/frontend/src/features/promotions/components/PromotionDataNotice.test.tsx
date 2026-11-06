import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";
import { DataModeContext } from "../../../app/config/DataModeContext";
import { theme } from "../../../theme/theme";
import { PromotionDataNotice } from "./PromotionDataNotice";

const campaignNotice =
  "Entorno de prueba: la información presentada es de referencia y no confirma una aplicación comercial.";

function renderNotice(mode: "mock" | "api") {
  return renderToStaticMarkup(
    React.createElement(
      DataModeContext.Provider,
      { value: mode },
      React.createElement(
        MantineProvider,
        { theme },
        React.createElement(PromotionDataNotice, { kind: "recommendations" }),
      ),
    ),
  );
}

describe("PromotionDataNotice", () => {
  it("renderiza el aviso de recomendaciones en modo mock", () => {
    expect(renderNotice("mock")).toContain(campaignNotice);
  });

  it("no renderiza el aviso en modo api", () => {
    expect(renderNotice("api")).not.toContain(campaignNotice);
  });
});
