/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LocalFileCheckResult } from "../types/bulk";
import type { BulkFailureCategory } from "../services/bulkService";
import { checkLocalFile } from "../utils/localFileCheck";
import {
  AdmissionCoordinator,
  type AdmissionStatus,
  type AdmissionTask,
  LatestTaskCoordinator,
} from "../utils/asyncGuards";

export interface BulkSubmissionError {
  category: BulkFailureCategory;
  message: string;
}

interface BulkUploadContextValue {
  selectedFile: File | null;
  fileCheck: LocalFileCheckResult | null;
  checking: boolean;
  setSelectedFile: (file: File | null) => Promise<void>;
  clearSelection: () => void;
  admissionStatus: AdmissionStatus;
  beginAdmission: (file: File, retryUncertain?: boolean) => AdmissionTask<File> | null;
  finishAdmission: (
    task: AdmissionTask<File>,
    status: "ready" | "accepted" | "uncertain",
    error?: BulkSubmissionError | null,
  ) => boolean;
  submissionError: BulkSubmissionError | null;
}

const BulkUploadContext = createContext<BulkUploadContextValue | null>(null);

export function BulkUploadProvider({ children }: { children: ReactNode }) {
  const [selectedFile, setFileState] = useState<File | null>(null);
  const [fileCheck, setFileCheck] = useState<LocalFileCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [admissionStatus, setAdmissionStatus] = useState<AdmissionStatus>("idle");
  const [submissionError, setSubmissionError] =
    useState<BulkSubmissionError | null>(null);

  const admissionCoordinatorRef = useRef<AdmissionCoordinator<File> | null>(null);
  if (admissionCoordinatorRef.current == null) {
    admissionCoordinatorRef.current = new AdmissionCoordinator<File>();
  }
  const validationCoordinatorRef = useRef<LatestTaskCoordinator | null>(null);
  if (validationCoordinatorRef.current == null) {
    validationCoordinatorRef.current = new LatestTaskCoordinator();
  }

  const setSelectedFile = useCallback(async (file: File | null) => {
    const coordinator = validationCoordinatorRef.current;
    if (!coordinator) return;
    const admissionCoordinator = admissionCoordinatorRef.current;
    admissionCoordinator?.select(file);
    setAdmissionStatus(admissionCoordinator?.status ?? "idle");
    setSubmissionError(null);

    if (!file) {
      coordinator.cancel();
      setFileState(null);
      setFileCheck(null);
      setChecking(false);
      return;
    }

    setFileState(file);
    setFileCheck(null); // Invalidate previous result immediately
    setChecking(true);
    const task = coordinator.start();

    try {
      const result = await checkLocalFile(file, task.signal);
      // Only commit result if this is still the active validation
      if (task.isCurrent()) {
        setFileCheck(result);
      }
    } catch (err) {
      if (!task.signal.aborted) throw err;
    } finally {
      if (task.isCurrent()) {
        setChecking(false);
      }
    }
  }, []);

  const clearSelection = useCallback(() => {
    validationCoordinatorRef.current?.cancel();
    admissionCoordinatorRef.current?.select(null);
    setFileState(null);
    setFileCheck(null);
    setChecking(false);
    setSubmissionError(null);
    setAdmissionStatus("idle");
  }, []);

  const beginAdmission = useCallback((file: File, retryUncertain = false) => {
    const task = admissionCoordinatorRef.current?.begin(file, retryUncertain) ?? null;
    if (task) setAdmissionStatus(admissionCoordinatorRef.current?.status ?? "idle");
    return task;
  }, []);

  const finishAdmission = useCallback((
    task: AdmissionTask<File>,
    status: "ready" | "accepted" | "uncertain",
    error: BulkSubmissionError | null = null,
  ) => {
    const coordinator = admissionCoordinatorRef.current;
    if (!coordinator?.finish(task, status)) return false;
    setAdmissionStatus(coordinator.status);
    setSubmissionError(error);
    return true;
  }, []);

  return (
    <BulkUploadContext.Provider
      value={{
        selectedFile,
        fileCheck,
        checking,
        setSelectedFile,
        clearSelection,
        admissionStatus,
        beginAdmission,
        finishAdmission,
        submissionError,
      }}
    >
      {children}
    </BulkUploadContext.Provider>
  );
}

export function useBulkUploadContext(): BulkUploadContextValue {
  const context = useContext(BulkUploadContext);
  if (!context) {
    throw new Error(
      "useBulkUploadContext debe utilizarse dentro de un BulkUploadProvider",
    );
  }
  return context;
}
