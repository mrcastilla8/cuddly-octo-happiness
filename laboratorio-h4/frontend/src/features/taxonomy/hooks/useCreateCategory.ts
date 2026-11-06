import { useEffect, useRef, useState } from "react";
import { categoryService } from "../services/categoryService";
import { generarSlug } from "../services/slug";
import type {
  CategoryCreateInput,
  CategoryCreateResult,
  SlugCheckResult,
} from "../types";

export type CreateCategoryPhase =
  | "idle"
  | "comprobando"
  | "confirmando"
  | "guardando"
  | "creado";

export function useCreateCategory() {
  const [phase, setPhase] = useState<CreateCategoryPhase>("idle");
  const [slugCheck, setSlugCheck] = useState<SlugCheckResult | null>(null);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<CategoryCreateResult | null>(null);
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
    setCreado(null);
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

  const confirmar = (input: CategoryCreateInput) => {
    if (phase !== "confirmando" || !slugCheck) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setPhase("guardando");
    void categoryService.crear(input, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setCreado(result);
        setPhase("creado");
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "No se pudo crear la categoría.",
        );
        setPhase("confirmando");
      },
    );
  };

  const cerrar = () => {
    controllerRef.current?.abort();
    setError(null);
    setSlugCheck(null);
    setSlug("");
    setPhase("idle");
  };

  return { phase, slugCheck, slug, error, creado, setSlug, comprobar, confirmar, cerrar };
}
