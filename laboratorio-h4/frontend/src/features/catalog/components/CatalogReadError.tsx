import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, Stack } from "@mantine/core";
import { FeedbackAlert, PageHeader } from "../../../components/shared";

export function CatalogReadError({ error, children }: { error?: string; children?: ReactNode }) {
  return <Stack gap="lg">
    <PageHeader title="Información del producto no disponible" />
    <FeedbackAlert semantic="error" title="No se pudo consultar el producto">
      {error ?? "No se pudo recuperar la información del producto."}
    </FeedbackAlert>
    {children}
    <Button component={Link} to="/productos" variant="outline" w="fit-content">Volver al listado</Button>
  </Stack>;
}
