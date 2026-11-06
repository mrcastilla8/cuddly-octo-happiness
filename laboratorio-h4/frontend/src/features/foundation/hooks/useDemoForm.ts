import { useState } from "react";
import { demoService } from "../services/demoService";
import type { DemoFormValues } from "../services/demoRepository";

export function useDemoForm() {
  const [values, setValues] = useState<DemoFormValues>({
    name: "",
    description: "",
    kind: "simple",
    tags: [],
    visible: true,
  });
  const [nameError, setNameError] = useState<string>();
  const [opened, setOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [simulateError, setSimulateError] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmed, setConfirmed] = useState(false);
  const update = <K extends keyof DemoFormValues>(
    key: K,
    value: DemoFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setConfirmed(false);
    setError(undefined);
    if (key === "name") setNameError(undefined);
  };
  const review = () => {
    if (!values.name.trim()) {
      setNameError("Ingresa un nombre para este ejemplo.");
      return false;
    }
    setError(undefined);
    setOpened(true);
    return true;
  };
  const confirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await demoService.confirmExample(values, simulateError);
      setConfirmed(true);
      setOpened(false);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo confirmar.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return {
    values,
    update,
    nameError,
    opened,
    submitting,
    simulateError,
    setSimulateError,
    error,
    confirmed,
    review,
    confirm,
    cancel: () => {
      if (!submitting) setOpened(false);
    },
  };
}
