import { StatusBadge } from "../../../components/shared";
import type { Combo } from "../types/combos";
import { availabilityMessage } from "../services/availability";

export function ComboAvailability({ combo, label }: { combo: Combo; label?: string }) {
  const message = availabilityMessage(combo);
  return <StatusBadge semantic={message.semantic}>{label ?? message.label}</StatusBadge>;
}
