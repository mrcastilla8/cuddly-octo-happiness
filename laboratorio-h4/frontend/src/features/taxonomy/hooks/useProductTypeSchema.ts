import { useContext, useEffect, useState } from "react";
import { DataModeContext } from "../../../app/config/DataModeContext";
import { getTaxonomyGateway } from "../services/taxonomyGatewayRuntime";
import {
  createHttpProductTypeSchemaAdapter,
  ProductTypeSchemaHttpError,
} from "../adapters/httpProductTypeSchemaAdapter";
import { TaxonomyGatewayError } from "../services/taxonomyGatewayRuntime";
import type { ProductTypeSchema } from "../services/productTypeRepository";

export type ProductTypeSchemaState =
  | { status: "loading" }
  | { status: "success"; esquema: ProductTypeSchema }
  | { status: "not-found" }
  | { status: "error"; message: string };

function httpStatus(error: unknown): number | undefined {
  if (
    error instanceof ProductTypeSchemaHttpError ||
    error instanceof TaxonomyGatewayError
  ) return error.status;
  return undefined;
}

export function useProductTypeSchema(id: string): {
  state: ProductTypeSchemaState;
  reload: () => void;
} {
  const mode = useContext(DataModeContext);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state: ProductTypeSchemaState;
  }>();
  const key = `${mode}:${id}:${revision}`;

  useEffect(() => {
    const controller = new AbortController();
    const read = async (): Promise<ProductTypeSchema> => {
      if (mode === "mock") {
        const { productTypeService } = await import("../services/productTypeService");
        const detalle = await productTypeService.obtener(id, controller.signal);
        if (!detalle) throw new ProductTypeNotFoundError();
        return {
          tipoProducto: {
            tipoProductoId: detalle.tipoProductoId,
            nombre: detalle.nombre,
            estado: detalle.estado === "Activo" ? "ACTIVO" : "INACTIVO",
            schemaVersion: detalle.schemaVersion,
          },
          caracteristicas: detalle.asociadas.map((asociacion) => ({
            caracteristicaId: asociacion.caracteristicaId,
            obligatoria: asociacion.obligatoria,
            estado: asociacion.estado === "Activo" ? "ACTIVO" : "INACTIVO",
            schemaVersion: asociacion.schemaVersion,
            caracteristica: {
              caracteristicaId: asociacion.caracteristica.id,
              nombre: asociacion.caracteristica.nombre,
              tipo: asociacion.caracteristica.tipo,
              unidadMedida: asociacion.caracteristica.unidad ?? null,
              estado: asociacion.caracteristica.estado === "Activo" ? "ACTIVO" : "INACTIVO",
            },
          })),
          schemaVersion: detalle.schemaVersion,
        };
      }
      const gateway = getTaxonomyGateway();
      if (!gateway) throw new Error("Integración de Taxonomía no configurada.");
      return createHttpProductTypeSchemaAdapter(gateway).obtenerEsquema(id, controller.signal);
    };

    void read().then(
      (esquema) => {
        if (!controller.signal.aborted) setResult({ key, state: { status: "success", esquema } });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const status = httpStatus(error);
        setResult({
          key,
          state:
            error instanceof ProductTypeNotFoundError || status === 404
              ? { status: "not-found" }
              : {
                  status: "error",
                  message:
                    status === 401
                      ? "Autenticación requerida para consultar el esquema (HTTP 401)."
                      : status === 403
                        ? "No tienes autorización para consultar el esquema (HTTP 403)."
                        : error instanceof Error
                          ? error.message
                          : "No se pudo cargar el esquema.",
                },
        });
      },
    );
    return () => controller.abort();
  }, [id, key, mode]);

  return {
    state: result?.key === key ? result.state : { status: "loading" },
    reload: () => setRevision((value) => value + 1),
  };
}

class ProductTypeNotFoundError extends Error {}
