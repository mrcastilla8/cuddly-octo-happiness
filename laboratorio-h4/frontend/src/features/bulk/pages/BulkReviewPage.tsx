import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Group, Stack } from "@mantine/core";
import {
  IconArrowLeft,
  IconCheck,
  IconUpload,
} from "@tabler/icons-react";
import {
  EmptyState,
  FeedbackAlert,
  PageHeader,
} from "../../../components/shared";
import { BulkFileReview } from "../components/BulkFileReview";
import { useBulkUploadContext } from "../context/BulkUploadContext";
import { BulkRepositoryError } from "../services/bulkService";
import { useBulkRepository } from "../hooks/useBulkRepository";
import { runSingleFlight } from "../utils/asyncGuards";

export function BulkReviewPage() {
  const navigate = useNavigate();
  const bulkRepository = useBulkRepository();
  const isSubmittingRef = useRef(false);
  const pageIsActiveRef = useRef(true);
  const {
    selectedFile,
    fileCheck,
    admissionStatus,
    beginAdmission,
    finishAdmission,
    submissionError,
  } = useBulkUploadContext();

  useEffect(() => {
    pageIsActiveRef.current = true;
    return () => {
      pageIsActiveRef.current = false;
    };
  }, []);

  // If page is accessed directly without selecting a file
  if (!selectedFile || !fileCheck) {
    return (
      <>
        <PageHeader
          title="Revisión de archivo"
          description="Comprobación preliminar de estructura antes de confirmar la importación."
          breadcrumbs={[
            { label: "Catálogo", to: "/carga-masiva" },
            { label: "Carga masiva", to: "/carga-masiva" },
            { label: "Revisión de archivo" },
          ]}
        />
        <Stack gap="lg">
          <EmptyState
            title="Ningún archivo seleccionado"
            description="Para revisar la estructura debe seleccionar primero un archivo CSV o XLSX en la pantalla de carga masiva."
            action={
              <Button
                component={Link}
                to="/carga-masiva"
                leftSection={<IconUpload size={18} stroke={2} aria-hidden="true" />}
              >
                Ir a selección de archivo
              </Button>
            }
          />
        </Stack>
      </>
    );
  }

  const handleConfirmImport = async (retryUncertain = false) => {
    if (admissionStatus === "pending") return;
    const task = beginAdmission(selectedFile, retryUncertain);
    if (!task) return;
    await runSingleFlight(isSubmittingRef, async () => {
      try {
        const batch = await bulkRepository.createImport(selectedFile, {
          detectedRows: fileCheck.detectedRows,
          correlationId: task.correlationId,
        });
        const isCurrentAdmission = finishAdmission(task, "accepted");
        if (isCurrentAdmission && pageIsActiveRef.current && task.isCurrent()) {
          // Navigate only when this review screen still owns the current operation.
          navigate(`/carga-masiva/importaciones/${batch.batch_id}`);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la importación.";
        const category = err instanceof BulkRepositoryError ? err.category : "unknown";
        const status = category === "communication" || category === "unknown"
          ? "uncertain"
          : "ready";
        finishAdmission(task, status, { category, message });
      }
    });
  };

  const hasBlockingErrors = !fileCheck.valid;
  const admissionPending = admissionStatus === "pending";
  const admissionUncertain = admissionStatus === "uncertain";
  const admissionAlreadyAccepted = admissionStatus === "accepted";
  const admissionBlocked = admissionPending || admissionUncertain || admissionAlreadyAccepted;

  return (
    <>
      <PageHeader
        title="Revisión de archivo para importación"
        description="Verifica la estructura y columnas antes de enviar el lote a procesamiento asíncrono."
        breadcrumbs={[
          { label: "Catálogo", to: "/carga-masiva" },
          { label: "Carga masiva", to: "/carga-masiva" },
          { label: "Revisión de archivo" },
        ]}
        actions={
          <Group gap="xs">
            <Button
              component={Link}
              to="/carga-masiva"
              variant="outline"
              leftSection={<IconArrowLeft size={18} stroke={2} aria-hidden="true" />}
              disabled={admissionPending}
            >
              Cambiar archivo
            </Button>
            <Button
              leftSection={<IconCheck size={18} stroke={2} aria-hidden="true" />}
              onClick={() => void handleConfirmImport()}
              loading={admissionPending}
              disabled={admissionBlocked || hasBlockingErrors}
            >
              Confirmar importación
            </Button>
          </Group>
        }
      />

      <Stack gap="lg">
        {submissionError && (
          <FeedbackAlert
            semantic="error"
            title={
              submissionError.category === "rejected"
                ? "Archivo rechazado en la admisión"
                : submissionError.category === "configuration"
                  ? "Importación no disponible"
                  : submissionError.category === "communication"
                    ? "No se pudo completar la solicitud"
                    : "No se confirmó el resultado de admisión"
            }
          >
            {submissionError.message}
            {admissionUncertain && (
              <>
                <div>No se confirmó el resultado. Un reintento explícito conservará la correlación de esta intención.</div>
                <Button mt="xs" variant="outline" onClick={() => void handleConfirmImport(true)}>
                  Reintentar esta importación
                </Button>
              </>
            )}
          </FeedbackAlert>
        )}

        {admissionAlreadyAccepted && (
          <FeedbackAlert semantic="success" title="Archivo ya admitido">
            Este archivo ya fue admitido. Selecciona un archivo nuevo para iniciar otra importación.
          </FeedbackAlert>
        )}

        <BulkFileReview check={fileCheck} />

        <Group justify="flex-end" gap="sm">
          <Button
            component={Link}
            to="/carga-masiva"
            variant="outline"
            disabled={admissionPending}
          >
            Volver
          </Button>
          <Button
            leftSection={<IconCheck size={18} stroke={2} aria-hidden="true" />}
            onClick={() => void handleConfirmImport()}
            loading={admissionPending}
            disabled={admissionBlocked || hasBlockingErrors}
          >
            Confirmar importación
          </Button>
        </Group>
      </Stack>
    </>
  );
}
