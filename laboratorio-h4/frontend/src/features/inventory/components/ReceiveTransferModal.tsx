import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { semanticTokens } from "../../../theme/tokens";
import type {
  DispositionType,
  ReceiveTransferPayload,
  TransferItem,
} from "../services/inventoryTypes";
import {
  createTransferReceptionFormSession,
  getConfirmedTransferReceptionAwaitingRefresh,
  getUncertainTransferReception,
  type TransferReceptionFormSession,
} from "../services/transferReceptionAttempt";
import { isInventoryPresentationFailure } from "../services/inventoryErrors";

interface ReceiveTransferModalProps {
  transfer: TransferItem | null;
  opened: boolean;
  submitting: boolean;
  submitError?: string | null;
  onClose: () => void;
  onConfirm: (payload: ReceiveTransferPayload) => Promise<void>;
}

interface TransferFormInnerProps {
  transfer: TransferItem;
  submitting: boolean;
  submitError?: string | null;
  onClose: () => void;
  onConfirm: (payload: ReceiveTransferPayload) => Promise<void>;
}

function TransferFormInner({
  transfer,
  submitting,
  submitError,
  onClose,
  onConfirm,
}: TransferFormInnerProps) {
  const sessionRef = useRef<TransferReceptionFormSession>(
    createTransferReceptionFormSession(transfer.id),
  );
  const [uncertainAttempt, setUncertainAttempt] =
    useState<Readonly<ReceiveTransferPayload> | null>(() =>
      getUncertainTransferReception(transfer.id),
    );
  // TAC-P0-08: si una recepción anterior ya fue confirmada pero la vista no pudo
  // refrescarse, el formulario se hidrata con ese snapshot y queda bloqueado
  // hasta que un listado exitoso actualice el traslado. Nunca genera otra
  // intención (nuevo `operationId`) desde un estado desactualizado.
  const [confirmedAttempt, setConfirmedAttempt] =
    useState<Readonly<ReceiveTransferPayload> | null>(() =>
      getConfirmedTransferReceptionAwaitingRefresh(transfer.id),
    );
  const [presentationFailure, setPresentationFailure] = useState<string | null>(
    null,
  );
  const initialAttempt =
    getUncertainTransferReception(transfer.id) ??
    getConfirmedTransferReceptionAwaitingRefresh(transfer.id);
  const [quantity, setQuantity] = useState<number | string>(() =>
    initialAttempt
      ? initialAttempt.quantityReceived
      : transfer.quantityPending,
  );
  const [disposition, setDisposition] = useState<DispositionType>(
    () => initialAttempt?.disposition ?? "REINGRESAR_DISPONIBLE",
  );
  const [finalReceipt, setFinalReceipt] = useState<boolean>(
    () => initialAttempt?.finalReceipt ?? true,
  );
  const [note, setNote] = useState<string>(() => initialAttempt?.note ?? "");
  const [errorValidation, setErrorValidation] = useState<string | null>(null);

  const isUncertainLocked = uncertainAttempt !== null;
  const isConfirmedLocked = confirmedAttempt !== null;
  const isLocked = isUncertainLocked || isConfirmedLocked;
  const numQty = Number(quantity);
  const isMissing =
    !isLocked && finalReceipt && numQty < transfer.quantityPending;
  const missingCount = transfer.quantityPending - numQty;

  const submitLockRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    try {
    // TAC-P1-10: el botón ya está deshabilitado, pero un `requestSubmit`
    // programático no debe poder reenviar mientras la vista siga bloqueada.
    // No se aplica a `UNCERTAIN`: ese caso sí permite reintentar la misma
    // intención con el snapshot inmutable.
    if (isConfirmedLocked) {
      submitLockRef.current = false;
      return;
    }
    if (isNaN(numQty) || !Number.isInteger(numQty) || numQty <= 0) {
      setErrorValidation(
        "La cantidad recibida debe ser un número entero mayor que cero.",
      );
      return;
    }
    if (!isUncertainLocked && numQty > transfer.quantityPending) {
      setErrorValidation(
        `La cantidad recibida (${numQty}) no puede ser mayor que la cantidad pendiente (${transfer.quantityPending}).`,
      );
      return;
    }
    if (note.trim().length > 500) {
      setErrorValidation(
        "La nota de recepción no puede superar los 500 caracteres.",
      );
      return;
    }

    setErrorValidation(null);

    let payload: Readonly<ReceiveTransferPayload>;
    try {
      payload = sessionRef.current.prepareSubmission({
        quantityReceived: numQty,
        disposition,
        finalReceipt,
        note,
      });
    } catch (err) {
      setErrorValidation(
        err instanceof Error
          ? err.message
          : "No se puede modificar una recepción con resultado incierto.",
      );
      return;
    }

    try {
      await onConfirm(payload);
      sessionRef.current.recordSuccess(payload);
      setUncertainAttempt(null);
      setConfirmedAttempt(null);
      setPresentationFailure(null);
      onClose();
    } catch (err) {
      // TAC-P0-08: la recepción YA fue confirmada por Inventory y solo falló el
      // enriquecimiento de presentación. No es un fallo transaccional: se
      // bloquea el formulario con el snapshot confirmado, se informa el fallo
      // de vista y NO se permite generar otra intención ni repetir el POST.
      if (isInventoryPresentationFailure(err)) {
        sessionRef.current.recordConfirmed(payload);
        setUncertainAttempt(null);
        setConfirmedAttempt(payload);
        setPresentationFailure(err.message);
        return;
      }
      // TAC-P0-01 / TAC-P0-02: si el intento quedó en RESULTADO_INCIERTO se
      // conserva el snapshot inmutable completo (operationId, receivedAt, note,
      // cantidad, disposición y recepción final) incluso si el modal se cierra.
      const locked = sessionRef.current.recordFailure(payload, err);
      setUncertainAttempt(locked);
    }
    } finally {
      submitLockRef.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <div
          style={{
            background: semanticTokens.neutral.background,
            padding: 12,
            borderRadius: 8,
          }}
        >
          <Group justify="space-between" mb={4}>
            <Text size="sm" fw={600}>
              {transfer.productName}
            </Text>
            <Text size="xs" c="dimmed">
              SKU: {transfer.sku}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Origen:{" "}
            <Text span fw={500}>
              {transfer.sourceLocationName}
            </Text>{" "}
            • Destino:{" "}
            <Text span fw={500}>
              {transfer.targetLocationName}
            </Text>
          </Text>
          <Group gap="lg" mt="xs">
            <Text size="xs">
              Despachado:{" "}
              <Text span fw={600}>
                {transfer.quantityShipped}
              </Text>
            </Text>
            <Text size="xs">
              Ya recibido:{" "}
              <Text span fw={600}>
                {transfer.quantityReceived}
              </Text>
            </Text>
            <Text size="xs">
              Pendiente:{" "}
              <Text span fw={700}>
                {transfer.quantityPending}
              </Text>
            </Text>
          </Group>
        </div>

        {isUncertainLocked && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="Operación con resultado incierto pendiente de confirmación"
            color="orange"
          >
            El envío anterior ({uncertainAttempt.operationId}) no recibió
            confirmación definitiva. Los valores de la solicitud quedaron
            bloqueados de forma inmutable para que el reintento consulte o
            recupere exactamente la misma operación sin duplicar saldos.
          </Alert>
        )}

        {isConfirmedLocked && (
          <Alert
            icon={<IconCheck size={16} />}
            title="Recepción registrada — vista pendiente de actualizar"
            color="orange"
          >
            {presentationFailure ??
              "La recepción anterior ya fue confirmada por Inventory, pero la vista del traslado aún no refleja el saldo real."}{" "}
            No repitas la recepción: la operación quedó persistida. Cierra esta
            ventana y espera a que la bandeja se actualice antes de registrar
            otra recepción parcial.
          </Alert>
        )}

        <NumberInput
          label="Cantidad recibida físicamente"
          description={`Máximo pendiente: ${transfer.quantityPending} unidades.`}
          min={1}
          max={
            isUncertainLocked
              ? Math.max(
                  transfer.quantityPending,
                  uncertainAttempt?.quantityReceived ?? transfer.quantityPending,
                )
              : transfer.quantityPending
          }
          allowDecimal={false}
          allowNegative={false}
          value={quantity}
          onChange={setQuantity}
          required
          disabled={submitting || isLocked}
          aria-label="Cantidad recibida físicamente"
        />

        <Select
          label="Disposición de las unidades recibidas"
          description="Destino contable y operativo del inventario recibido."
          data={[
            {
              value: "REINGRESAR_DISPONIBLE",
              label: "Reingresar a disponible (Aptas para venta)",
            },
            {
              value: "REINGRESAR_BLOQUEADO",
              label: "Reingresar bloqueado (Cuarentena / Incidencia)",
            },
            {
              value: "CONFIRMAR_MERMA",
              label: "Confirmar merma (Dañadas / No vendibles)",
            },
          ]}
          value={disposition}
          onChange={(val) =>
            setDisposition((val as DispositionType) ?? "REINGRESAR_DISPONIBLE")
          }
          disabled={submitting || isLocked}
          required
          aria-label="Disposición de unidades recibidas"
        />

        <Checkbox
          label="Marcar como recepción final del traslado"
          description="Si quedan unidades sin recibir, el traslado se cerrará como completado con discrepancia."
          checked={finalReceipt}
          onChange={(e) => setFinalReceipt(e.currentTarget.checked)}
          disabled={submitting || isLocked}
        />

        {isMissing && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="Aviso de discrepancia"
            color="orange"
          >
            Se registrará una recepción final con discrepancia de{" "}
            <strong>{missingCount} unidades faltantes</strong>. El traslado
            cerrará como completado con discrepancia y se emitirá una alerta sin
            acreditar dicho saldo.
          </Alert>
        )}

        {errorValidation && (
          <Alert color="red" title="Error de validación">
            {errorValidation}
          </Alert>
        )}

        {submitError && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="red"
            title="No se pudo registrar la recepción"
          >
            {submitError}
          </Alert>
        )}

        <Textarea
          label="Nota u observación de recepción (opcional, max. 500 caracteres)"
          placeholder="Ej: Embalaje exterior en buen estado, 2 unidades con empaque deteriorado..."
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.currentTarget.value)}
          disabled={submitting || isLocked}
          rows={2}
        />

        <Group justify="flex-end" gap="sm" mt="md">
          <Button
            variant="outline"
            color="gray"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={submitting}
            leftSection={<IconCheck size={16} />}
            color={isMissing ? "orange" : "primary"}
            disabled={isConfirmedLocked}
          >
            {isMissing
              ? "Confirmar recepción con discrepancia"
              : "Confirmar recepción"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function ReceiveTransferModal({
  transfer,
  opened,
  submitting,
  submitError,
  onClose,
  onConfirm,
}: ReceiveTransferModalProps) {
  if (!transfer) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Registrar recepción — ${transfer.transferCode}`}
      size="lg"
      aria-label="Registrar recepción de traslado"
    >
      <TransferFormInner
        key={transfer.id}
        transfer={transfer}
        submitting={submitting}
        submitError={submitError}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </Modal>
  );
}
