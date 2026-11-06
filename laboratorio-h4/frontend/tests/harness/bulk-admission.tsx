import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "../../src/theme/global.css";
import { HashRouter, Route, Routes } from "react-router-dom";
import { DataModeContext } from "../../src/app/config/DataModeContext";
import { theme, cssVariablesResolver } from "../../src/theme/theme";
import { BulkRepositoryContext } from "../../src/features/bulk/services/BulkRepositoryContext";
import type { BulkRepository } from "../../src/features/bulk/services/bulkRepository";
import type { BulkImportBatch } from "../../src/features/bulk/types/bulk";
import { mockBulkRepository } from "../../src/features/bulk/adapters/mockBulkRepository";
import { BulkLayout } from "../../src/features/bulk/pages/BulkLayout";
import { BulkUploadPage } from "../../src/features/bulk/pages/BulkUploadPage";
import { BulkReviewPage } from "../../src/features/bulk/pages/BulkReviewPage";
import { BulkProgressPage } from "../../src/features/bulk/pages/BulkProgressPage";

interface BulkAdmissionTestApi {
  requestCount: number;
  resolve(index: number): void;
}

declare global {
  interface Window {
    __bulkAdmissionTest: BulkAdmissionTestApi;
  }
}

const pendingAdmissions: Array<(batch: BulkImportBatch) => void> = [];
window.__bulkAdmissionTest = {
  requestCount: 0,
  resolve(index: number) {
    pendingAdmissions[index]?.({
      batch_id: `batch-deferred-${index}`,
      status: "QUEUED",
      total_rows: 1,
      completed_rows: 0,
      failed_rows: 0,
      needs_reconciliation: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },
};

const deferredRepository: BulkRepository = {
  ...mockBulkRepository,
  createImport: (_file, _summary, signal) => {
    signal?.throwIfAborted();
    window.__bulkAdmissionTest.requestCount++;
    return new Promise((resolve) => pendingAdmissions.push(resolve));
  },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      forceColorScheme="light"
    >
      <DataModeContext.Provider value="api">
        <BulkRepositoryContext.Provider value={deferredRepository}>
          <HashRouter>
            <Routes>
              <Route element={<BulkLayout />}>
                <Route path="/carga-masiva" element={<BulkUploadPage />} />
                <Route path="/carga-masiva/revisar" element={<BulkReviewPage />} />
                <Route path="/carga-masiva/importaciones/:batchId" element={<BulkProgressPage />} />
              </Route>
            </Routes>
          </HashRouter>
        </BulkRepositoryContext.Provider>
      </DataModeContext.Provider>
    </MantineProvider>
  </StrictMode>,
);
