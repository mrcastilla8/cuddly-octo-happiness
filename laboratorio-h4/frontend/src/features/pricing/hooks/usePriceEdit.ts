import { useCallback, useState } from "react";
import {
  usePricingRevision,
  usePricingRuntime,
} from "../services/PricingContext";
import type {
  EditablePrice,
  PriceDraft,
  WriteTarget,
} from "../services/pricingModels";
import { validatePrice } from "../services/pricingValidation";
import { usePricingAction, usePricingRead } from "./usePricingRequest";

export function useEditableRead(target: WriteTarget) {
  const { service } = usePricingRuntime();
  const revision = usePricingRevision("readEditable");
  const { targetId, channel } = target;
  const read = useCallback(
    (signal: AbortSignal) =>
      service.readEditable({ targetId, channel }, signal),
    [service, targetId, channel],
  );
  return usePricingRead(`${targetId}:${channel}:${revision}`, read);
}
export function usePriceEdit(target: WriteTarget, initial: EditablePrice) {
  const { service } = usePricingRuntime();
  const [readPrice, setReadPrice] = useState(initial);
  const [current, setCurrent] = useState<EditablePrice>();
  const [draft, setDraft] = useState<PriceDraft>({
    regular: initial.regular,
    offer: initial.offer ?? "",
    offerAction: "CONSERVAR",
    currency: initial.currency,
    reason: "",
  });
  const [errors, setErrors] = useState<ReturnType<typeof validatePrice>>({});
  const [reviewing, setReviewing] = useState(false);
  const [resolved, setResolved] = useState(false);
  const mutation = usePricingAction<EditablePrice>();
  const refresh = usePricingAction<EditablePrice | null>();
  const [dirty, setDirty] = useState(false);
  const [finished, setFinished] = useState(false);
  const change = (next: PriceDraft) => {
    setDraft(next);
    setDirty(true);
  };
  const validate = () => {
    const next = validatePrice(draft, readPrice);
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  async function save() {
    if (
      !validate() ||
      (mutation.error?.kind === "conflict" && !resolved) ||
      mutation.error?.kind === "unknown"
    )
      return;
    const result = await mutation.run((signal) =>
      service.update({ target, draft, version: readPrice.version }, signal),
    );
    setReviewing(false);
    if (result) {
      setDirty(false);
      setFinished(true);
    } else setResolved(false);
  }
  async function reread() {
    const latest = await refresh.run((signal) =>
      service.readEditable(target, signal),
    );
    if (latest) setCurrent(latest);
  }
  function acceptReview() {
    if (!current) return;
    setReadPrice(current);
    setResolved(true);
    mutation.clear();
    setCurrent(undefined);
  }
  return {
    readPrice,
    current,
    draft,
    change,
    errors,
    validate,
    reviewing,
    setReviewing,
    resolved,
    dirty,
    finished,
    mutation,
    refresh,
    save,
    reread,
    acceptReview,
  };
}
