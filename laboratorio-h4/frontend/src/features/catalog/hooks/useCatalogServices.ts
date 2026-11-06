import { useContext } from "react";
import { DataModeContext } from "../../../app/config/DataModeContext";
import { getCatalogServices, type CatalogServices } from "../services/catalogServices";
import { CatalogServicesContext } from "../services/CatalogServicesContext";

export function useCatalogServices(): CatalogServices {
  const mode = useContext(DataModeContext);
  const services = useContext(CatalogServicesContext);
  if (!mode) {
    throw new Error("Catálogo requiere DataModeContext.");
  }
  return services ?? getCatalogServices(mode);
}
