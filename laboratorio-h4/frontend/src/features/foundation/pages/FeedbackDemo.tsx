import { useState } from "react";
import { Button, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  ConfirmDialog,
  EmptyState,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import type { Semantic } from "../../../theme/tokens";

const badges: { semantic: Semantic; label: string }[] = [
  { semantic: "neutral", label: "Sin verificar" },
  { semantic: "info", label: "Solicitud recibida" },
  { semantic: "success", label: "Confirmado" },
  { semantic: "warning", label: "Con observaciones" },
  { semantic: "error", label: "No disponible" },
  { semantic: "promotion", label: "Promoción de ejemplo" },
];
export function FeedbackDemo() {
  const [dialog, setDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <>
      <PageHeader
        title="Mensajes y estados"
        description="Feedback persistente y semántico, con explicación textual y foco independiente."
        breadcrumbs={[
          { label: "Componentes" },
          { label: "Mensajes y estados" },
        ]}
      />
      <Stack gap="lg">
        <SectionCard
          title="Estados semánticos"
          description="El componente recibe una intención visual; cada feature decide el significado con sus fuentes."
        >
          <Group gap="sm">
            {badges.map(({ semantic, label }) => (
              <StatusBadge key={semantic} semantic={semantic}>
                {label}
              </StatusBadge>
            ))}
          </Group>
        </SectionCard>
        <SimpleGrid cols={2} spacing="lg">
          <FeedbackAlert semantic="success" title="Resultado confirmado">
            Ejemplo de resultado confirmado. El texto explica el alcance de la
            confirmación.
          </FeedbackAlert>
          <FeedbackAlert semantic="warning" title="Resultado con observaciones">
            Ejemplo parcial: conserva lo confirmado y explica qué queda
            pendiente.
          </FeedbackAlert>
          <FeedbackAlert semantic="info" title="Solicitud recibida">
            Ejemplo de admisión. No equivale a una operación terminada.
          </FeedbackAlert>
          <FeedbackAlert semantic="error" title="Consulta no disponible">
            Ejemplo de error. No sustituye el dato desconocido por cero ni por
            «Agotado».
          </FeedbackAlert>
        </SimpleGrid>
        <SectionCard title="Acciones y carga localizada">
          <Group gap="sm">
            <Button onClick={() => setDialog(true)}>Abrir confirmación</Button>
            <Button
              variant="outline"
              onClick={() => setLoading((value) => !value)}
            >
              {loading
                ? "Finalizar carga de ejemplo"
                : "Mostrar carga de ejemplo"}
            </Button>
            <Button variant="subtle" disabled>
              Acción deshabilitada
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            La acción deshabilitada no está disponible en esta demostración.
          </Text>
          {loading && (
            <>
              <Button loading disabled>
                Consultando ejemplo
              </Button>
              <Text size="sm" role="status">
                Consulta de ejemplo en curso. Usa «Finalizar carga de ejemplo»
                para terminar la revisión.
              </Text>
            </>
          )}
        </SectionCard>
        <SectionCard title="Región sin resultados">
          <EmptyState
            title="Sin coincidencias"
            description="No hay resultados para la búsqueda actual. Una feature puede proporcionar aquí una acción para limpiar sus filtros."
          />
        </SectionCard>
      </Stack>
      <ConfirmDialog
        opened={dialog}
        title="Descartar ejemplo"
        confirmLabel="Descartar ejemplo"
        destructive
        onCancel={() => setDialog(false)}
        onConfirm={() => setDialog(false)}
      >
        <Text size="sm">
          Esta confirmación muestra la variante destructiva. Solo cierra este
          ejemplo; no elimina registros.
        </Text>
      </ConfirmDialog>
    </>
  );
}
