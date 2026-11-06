import { useCallback, useState } from "react";
import {
  usePricingRevision,
  usePricingRuntime,
} from "../services/PricingContext";
import type { ScheduleDraft, ScheduleView } from "../services/pricingModels";
import { localInstant, validateSchedule } from "../services/pricingValidation";
import { usePricingAction, usePricingRead } from "./usePricingRequest";

export function usePriceSchedules(targetId: string) {
  const { service } = usePricingRuntime();
  const update = usePricingRevision("listSchedules");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const read = useCallback(
    (signal: AbortSignal) => service.listSchedules(targetId, page, signal),
    [service, targetId, page],
  );
  const listing = usePricingRead(
    `${targetId}:${page}:${revision}:${update}`,
    read,
  );
  return {
    listing,
    page,
    setPage,
    refresh: () => {
      setPage(1);
      setRevision((value) => value + 1);
    },
  };
}
export function useScheduleForm(
  targetId: string,
  currency: string,
  channel: "global" | "retail",
  onCreated: () => void,
) {
  const { service, clock } = usePricingRuntime();
  const update = usePricingRevision("readHistorical");
  const initial = (): ScheduleDraft => ({
    kind: "REGULAR",
    amount: "",
    currency,
    channel,
    start: "",
    end: "",
    reason: "",
  });
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validateSchedule>>({});
  const action = usePricingAction<ScheduleView>();
  const start = localInstant(draft.start);
  const read = useCallback(
    (signal: AbortSignal) =>
      start
        ? service.readHistorical(
            { targetId, channel: draft.channel },
            start,
            signal,
          )
        : Promise.resolve(null),
    [service, targetId, draft.channel, start],
  );
  const reference = usePricingRead(
    `${targetId}:${draft.channel}:${start}:${update}`,
    read,
    `${targetId}:${draft.channel}:${start}`,
  );
  const change = (next: ScheduleDraft) => {
    setDraft(next);
    setDirty(true);
  };
  const validate = () => {
    const price =
      reference.state.status === "success"
        ? (reference.state.result?.price ?? null)
        : (reference.previous?.price ?? null);
    const next = validateSchedule(draft, clock.now(), price);
    if (
      start &&
      Date.parse(start) > Date.parse(clock.now()) &&
      !price &&
      !next.amount
    )
      next.amount =
        "Consulta una vigencia disponible antes de confirmar la programación.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  async function create() {
    if (!validate() || action.error?.kind === "unknown" || action.result)
      return;
    const result = await action.run((signal) =>
      service.schedule(targetId, draft, signal),
    );
    setReviewing(false);
    if (result) {
      setDirty(false);
      onCreated();
    }
  }
  function newDraft() {
    action.clear();
    setDraft(initial());
    setDirty(false);
    setErrors({});
  }
  return {
    draft,
    change,
    dirty,
    reviewing,
    setReviewing,
    errors,
    validate,
    create,
    action,
    newDraft,
    reference,
    now: clock.now(),
  };
}
