import { useState } from "react";
import {
  Button,
  Group,
  NumberInput,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import {
  ConfirmDialog,
  FeedbackAlert,
  SectionCard,
} from "../../../components/shared";

// Demonstrates form composition only. No PATCH, price mutation or concurrency claim.
export function PriceEditExample() {
  const [scope, setScope] = useState("product");
  const [offerAction, setOfferAction] = useState("keep");
  const [regular, setRegular] = useState<string | number>("259.90");
  const [offer, setOffer] = useState<string | number>("229.90");
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const options = [
    {
      value: "product",
      title: "Precio base del producto",
      description: "Alcance que pueden heredar sus variantes.",
    },
    {
      value: "sku",
      title: "Precio específico del SKU",
      description: "Requiere una lectura del SKU seleccionado.",
    },
  ];
  return (
    <SectionCard
      title="Propuesta de nuevos valores"
      description="Edita los valores propuestos para el precio."
    >
      <Radio.Group label="Alcance del precio" value={scope} onChange={setScope}>
        <SimpleGrid cols={2} spacing="lg" mt="sm">
          {options.map((option) => (
            <Radio.Card key={option.value} value={option.value}>
              <Group gap="sm">
                {scope === option.value && (
                  <IconCheck size={20} stroke={2} aria-hidden="true" />
                )}
                <Text size="sm" fw={600}>
                  {option.title}
                </Text>
              </Group>
              <Text size="sm" mt="sm">
                {option.description}
              </Text>
            </Radio.Card>
          ))}
        </SimpleGrid>
      </Radio.Group>
      <NumberInput
        label="Nuevo precio regular (PEN)"
        value={regular}
        onChange={setRegular}
        decimalSeparator="."
        hideControls
      />
      <Radio.Group
        label="Acción para la oferta"
        value={offerAction}
        onChange={setOfferAction}
      >
        <Group gap="md" mt="sm">
          <Radio value="keep" label="Conservar oferta" />
          <Radio value="set" label="Establecer oferta" />
          <Radio value="remove" label="Retirar oferta" />
        </Group>
      </Radio.Group>
      {offerAction === "set" && (
        <NumberInput
          label="Nuevo importe de oferta (PEN)"
          value={offer}
          onChange={setOffer}
          decimalSeparator="."
          hideControls
        />
      )}
      {offerAction === "remove" && (
        <FeedbackAlert semantic="info" title="Sin oferta">
          El retiro representa ausencia de oferta; no un importe de cero.
        </FeedbackAlert>
      )}
      <Textarea
        label="Motivo del cambio"
        value={reason}
        onChange={(event) => setReason(event.currentTarget.value)}
      />
      <Group justify="flex-end">
        <Button onClick={() => setReviewing(true)}>Revisar presentación</Button>
      </Group>
      <ConfirmDialog
        opened={reviewing}
        onCancel={() => setReviewing(false)}
        onConfirm={() => setReviewing(false)}
        title="Revisar propuesta de ejemplo"
        confirmLabel="Cerrar revisión"
      >
        <Stack gap="md">
          <Text size="sm">
            Regular propuesto: {regular || "Sin importe"} PEN. Alcance:{" "}
            {scope === "product" ? "producto" : "SKU seleccionado"}.
          </Text>
        </Stack>
      </ConfirmDialog>
    </SectionCard>
  );
}
