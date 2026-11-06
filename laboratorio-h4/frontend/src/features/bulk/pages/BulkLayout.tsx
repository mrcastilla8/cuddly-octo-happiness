import { Stack } from "@mantine/core";
import { Outlet } from "react-router-dom";
import { FeedbackAlert } from "../../../components/shared";
import { BulkUploadProvider } from "../context/BulkUploadContext";
import { useBulkRepositorySelection } from "../hooks/useBulkRepository";

export function BulkLayout() {
  const { mode, providerConfigured } = useBulkRepositorySelection();

  return (
    <BulkUploadProvider>
      <Stack gap="lg">
        {mode === "api" && !providerConfigured && (
          <FeedbackAlert semantic="warning" title="Función no disponible">
            Las operaciones de carga masiva no están disponibles en el modo actual.
          </FeedbackAlert>
        )}
        <Outlet />
      </Stack>
    </BulkUploadProvider>
  );
}
