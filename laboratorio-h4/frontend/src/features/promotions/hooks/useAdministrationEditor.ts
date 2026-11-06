import { useState } from "react";
import {
  AdministrationError,
  type AdministrationRecord,
  type AdministrationRepository,
} from "../services/administration";
import { usePromotionCommand } from "./usePromotionCommand";
export function useAdministrationEditor<T extends AdministrationRecord, D>(
  initial: T | null,
  empty: D,
  draftOf: (record: T) => D,
  validate: (draft: D) => Record<string, string>,
  repository: AdministrationRepository<T, D>,
  normalize: (draft: D) => D,
  confirmedRepository: AdministrationRepository<T, D> = repository,
) {
  const [original] = useState(() =>
    initial ? draftOf(initial) : structuredClone(empty),
  );
  const [draft, setDraft] = useState(original);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<T | null>(null);
  const [current, setCurrent] = useState<T | null>(null);
  const [checking, setChecking] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string>();
  const command = usePromotionCommand<T>();
  const unknown =
    command.error instanceof AdministrationError &&
    command.error.kind === "unknown";
  const conflict =
    command.error instanceof AdministrationError &&
    command.error.kind === "conflict";
  const update = (next: D) => {
    if (!command.submitting && !unknown) {
      setDraft(next);
      setErrors({});
    }
  };
  const submit = async (focusInvalid: (field: string) => void) => {
    if (command.submitting || unknown || (conflict && !current)) return;
    const proposal = normalize(draft);
    const nextErrors = validate(proposal);
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) {
      focusInvalid(first);
      return;
    }
    setDraft(proposal);
    const result = await command.run(async (signal) => {
      try {
        return await (
          conflict && current ? confirmedRepository : repository
        ).save(initial?.id ?? null, proposal, signal);
      } catch (cause: unknown) {
        if (cause instanceof AdministrationError) {
          setErrors(cause.fields);
          const field = Object.keys(cause.fields)[0];
          if (field) focusInvalid(field);
        }
        throw cause;
      }
    });
    if (result) setConfirmed(result);
  };
  const consult = async () => {
    if (checking) return;
    if (!initial) {
      setRecoveryMessage(
        "Consulta el listado para localizar el registro. No se repetirá automáticamente una creación sin resultado confirmado.",
      );
      return;
    }
    setChecking(true);
    try {
      const result = await confirmedRepository.read(
        initial.id,
        new AbortController().signal,
      );
      if (result) {
        setCurrent(result);
        if (
          unknown &&
          JSON.stringify(draftOf(result)) === JSON.stringify(draft)
        )
          setConfirmed(result);
        else
          setRecoveryMessage(
            "Registro actual consultado. Tu propuesta se conserva para revisarla antes de guardar.",
          );
      } else
        setRecoveryMessage(
          "El registro no está disponible. Se conserva tu propuesta.",
        );
    } catch {
      setRecoveryMessage(
        "No se pudo consultar el resultado. No se volverá a enviar automáticamente.",
      );
    } finally {
      setChecking(false);
    }
  };
  return {
    draft,
    update,
    errors,
    submit,
    confirmed,
    current,
    checking,
    consult,
    recoveryMessage,
    unknown,
    conflict,
    dirty: JSON.stringify(draft) !== JSON.stringify(original),
    submitting: command.submitting,
    message: command.error instanceof Error ? command.error.message : undefined,
  };
}
