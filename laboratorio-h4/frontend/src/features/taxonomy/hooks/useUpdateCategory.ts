import { useEffect, useRef, useState } from "react";
import { categoryService } from "../services/categoryService";
import { generarSlug } from "../services/slug";
import type {
  CategoryDetail,
  CategoryUpdateInput,
  SlugCheckResult,
} from "../types";

export type UpdateCategoryPhase =
  | "idle"
  | "comprobando"
  | "confirmando"
  | "guardando"
  | "actualizado";

export function useUpdateCategory() {
  const [phase, setPhase] = useState<UpdateCategoryPhase>("idle");
  const [slugCheck, setSlugCheck] = useState<SlugCheckResult | null>(null);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CategoryDetail | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const comprobar = (nombre: string) => {
    const propuesto = generarSlug(nombre);
    setSlug(propuesto);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setSlugCheck(null);
    setResultado(null);
    setPhase("comprobando");
    void categoryService.comprobarSlug(propuesto, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setSlugCheck(result);
        setSlug(result.slug);
        setPhase("confirmando");
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "No se pudo verificar el slug.",
        );
        setPhase("idle");
      },
    );
  };

  const actualizar = (input: CategoryUpdateInput) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setPhase("guardando");
    void categoryService.actualizar(input, controller.signal).then(
      (detalle) => {
        if (controller.signal.aborted) return;
        setResultado(detalle);
        setPhase("actualizado");
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo actualizar la categoría.",
        );
        setPhase("confirmando");
      },
    );
  };

  const cerrar = () => {
    controllerRef.current?.abort();
    setError(null);
    setSlugCheck(null);
    setPhase("idle");
  };

  return {
    phase,
    slugCheck,
    slug,
    error,
    resultado,
    setSlug,
    comprobar,
    actualizar,
    cerrar,
  };
}