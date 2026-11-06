import { PromotionApiContext } from "../../../app/config/PromotionApiContext";
import { useContext, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createPromotionRuntime,
  getPromotionRuntime,
} from "../services/promotionServices";
import { DataModeContext } from "../../../app/config/DataModeContext";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

export function usePromotionServices() {
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const mockRevision = useMockStateRevision([
    "promotions",
    "promotions-campaigns",
    "promotions-coupons",
    "promotions-recommendations",
    "catalog",
    "taxonomy",
    "taxonomy-categories",
  ]);
  const mode = useContext(DataModeContext);
  if (!mode)
    throw new Error("La aplicación requiere configurar su modo de datos.");
  const api = useContext(PromotionApiContext);
  const runtime = useMemo(
    () =>
      mode === "api" && api
        ? createPromotionRuntime(mode, { api: () => api })
        : getPromotionRuntime(mode),
    [mode, api],
  );
  const context = runtime.resolve(params);
  const retry = () => {
    setParams(context.clearTransientParams, { replace: true });
    setRevision((value) => value + 1);
  };
  return { ...context, revision: revision + mockRevision, retry };
}
