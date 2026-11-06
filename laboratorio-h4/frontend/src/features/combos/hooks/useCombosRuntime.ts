import { useContext } from "react";
import { CombosContext } from "../services/CombosContext";

export function useCombosRuntime() {
  const runtime = useContext(CombosContext);
  if (!runtime) throw new Error("CombosProvider no está configurado.");
  return runtime;
}
