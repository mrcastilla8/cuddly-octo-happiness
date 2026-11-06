import type { Combo, ComboDraft } from "../types/combos";

export const blankComboDraft: ComboDraft = { name: "", description: "", components: [], price: "" };

export function draftFromCombo(combo?: Combo): ComboDraft {
  return combo
    ? { name: combo.name, description: combo.description ?? "", components: combo.components.map(({ sku, productName, quantity }) => ({ sku, productName, quantity })), price: (combo.priceMinor / 100).toFixed(2) }
    : { ...blankComboDraft, components: [] };
}

export function keepDraftAfterVersionConflict(draft: ComboDraft, currentVersion: Combo | undefined) {
  return { draft, currentVersion };
}

function normalizeDraft(draft: ComboDraft): string {
  return JSON.stringify({
    name: draft.name.trim(),
    description: draft.description.trim(),
    price: draft.price.trim(),
    components: draft.components.map((component) => ({ sku: component.sku, quantity: component.quantity })),
  });
}

export function isDraftDirty(draft: ComboDraft, baseline: ComboDraft): boolean {
  return normalizeDraft(draft) !== normalizeDraft(baseline);
}

export interface ComboDraftDiff {
  field: string;
  server: string;
  draft: string;
  changed: boolean;
}

function describeComponents(components: { sku: string; quantity: number }[]): string {
  if (components.length === 0) return "Sin componentes";
  return components.map((component) => `${component.sku} ×${component.quantity}`).join(", ");
}

// Field-by-field comparison between the local draft and the current server
// version, used during VERSION_CONFLICT recovery.
export function diffComboDraft(draft: ComboDraft, server: Combo): ComboDraftDiff[] {
  const draftPrice = draft.price.trim();
  const serverPrice = (server.priceMinor / 100).toFixed(2);
  const rows: Omit<ComboDraftDiff, "changed">[] = [
    { field: "Nombre", server: server.name, draft: draft.name.trim() || "(vacío)" },
    { field: "Descripción", server: server.description ?? "(sin descripción)", draft: draft.description.trim() || "(sin descripción)" },
    { field: "Componentes", server: describeComponents(server.components), draft: describeComponents(draft.components) },
    { field: "Precio", server: `S/ ${serverPrice}`, draft: draftPrice ? `S/ ${draftPrice}` : "(sin precio)" },
  ];
  return rows.map((row) => ({ ...row, changed: row.server !== row.draft }));
}
