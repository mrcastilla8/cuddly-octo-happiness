import { Suspense, type ReactNode } from "react";
import { Button, Group, Stack, Text } from "@mantine/core";
import { Link } from "react-router-dom";
import {
  EmptyState,
  FeedbackAlert,
  PageHeader,
} from "../../../components/shared";
import { usePricingContext } from "../hooks/usePricingContext";
import {
  usePricingRuntime,
  useRetryPricingCatalog,
} from "../services/PricingContext";

export function PricingPageFrame({
  title,
  description,
  children,
  requiresTarget = true,
  actions,
}: {
  title: string;
  description: string;
  children: ReactNode;
  requiresTarget?: boolean;
  actions?: ReactNode;
}) {
  const context = usePricingContext();
  const runtime = usePricingRuntime();
  const retryCatalog = useRetryPricingCatalog();
  const Tools = runtime.ReviewTools;
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: "Precios", to: `/precios${context.suffix}` },
          { label: title },
        ]}
        actions={
          actions ?? (
            <Button
              component={Link}
              to={`/precios${context.suffix}`}
              variant="outline"
            >
              Volver a precios
            </Button>
          )
        }
      />
      <Stack gap="lg">
        {Tools && (
          <Suspense fallback={null}>
            <Tools />
          </Suspense>
        )}
        {requiresTarget && context.catalog.status === "loading" ? (
          <Text size="sm" role="status">
            Cargando productos y SKU…
          </Text>
        ) : requiresTarget && context.catalog.status === "error" ? (
          <FeedbackAlert
            semantic="error"
            title="Selección no disponible"
            actions={
              <Button variant="outline" onClick={retryCatalog}>
                Volver a cargar productos y SKU
              </Button>
            }
          >
            {context.catalog.message}
          </FeedbackAlert>
        ) : requiresTarget && context.invalid ? (
          <EmptyState
            title="Selecciona un objetivo válido"
            description="Selecciona un producto o SKU disponible en el catálogo conectado."
            action={
              <Button component={Link} to="/precios" variant="outline">
                Seleccionar producto o SKU
              </Button>
            }
          />
        ) : (
          children
        )}
      </Stack>
    </>
  );
}
export function PricingLinks({ suffix }: { suffix: string }) {
  return (
    <Group gap="sm" aria-label="Tareas de precios">
      <Button component={Link} to={`/precios/editar${suffix}`}>
        Editar precio
      </Button>
      <Button
        component={Link}
        to={`/precios/programaciones${suffix}`}
        variant="outline"
      >
        Programar precio
      </Button>
      <Button
        component={Link}
        to={`/precios/historico${suffix}`}
        variant="outline"
      >
        Consultar histórico
      </Button>
    </Group>
  );
}
export function PricingContextLabel({
  label,
  channel,
}: {
  label: string;
  channel: string;
}) {
  return (
    <Text size="sm" fw={600}>
      {label} · Canal solicitado: {channel === "retail" ? "Retail" : "Global"}
    </Text>
  );
}
