import { useState } from "react";
import { usePricingRuntime } from "../services/PricingContext";
import type { PrevalidationView } from "../services/pricingModels";
import { usePricingAction } from "./usePricingRequest";

export function usePriceImport() {
  const { service } = usePricingRuntime();
  const [file, setFile] = useState<File | null>(null);
  const [policy, setPolicy] = useState<"all" | "partial" | "">("");
  const [step, setStep] = useState(0);
  const preview = usePricingAction<PrevalidationView>();
  function invalidate() {
    preview.clear();
    setStep(0);
  }
  return {
    file,
    policy,
    step,
    preview,
    changeFile: (value: File | null) => {
      if (!preview.busy) {
        setFile(value);
        invalidate();
      }
    },
    changePolicy: (value: string) => {
      if (!preview.busy && (value === "all" || value === "partial")) {
        setPolicy(value);
        invalidate();
      }
    },
    back: () => setStep(0),
    prevalidate: async () => {
      if (!file || !policy) return;
      const result = await preview.run((signal) =>
        service.prevalidate(
          { file, allowPartial: policy === "partial" },
          signal,
        ),
      );
      if (result) setStep(1);
    },
  };
}
