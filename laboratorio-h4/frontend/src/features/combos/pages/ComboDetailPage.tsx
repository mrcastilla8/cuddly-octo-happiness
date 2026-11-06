import { useEffect, useRef, useState } from "react";
import { Button, Group, Stack, Table, Text } from "@mantine/core";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ComboAvailability } from "../components/ComboAvailability";
import { useCombosRuntime } from "../hooks/useCombosRuntime";
import { formatMoney } from "../services/comboRules";
import {
  availabilityMessageText,
  calculateInformativeAvailability,
  isVerifiedPositiveAvailability,
  isUnavailableForNewSales,
} from "../services/availability";
import { RequestIdentity } from "../services/requestIdentity";
import { EmptyState, FeedbackAlert, PageHeader, SectionCard, ConfirmDialog, StatusBadge } from "../../../components/shared";
import type { Combo, ComboAvailability as ComboAvailabilityInfo, SkuPrice } from "../types/combos";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

type DetailState =
  | { key: string; status: "loading" }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "success"; combo: Combo | null };

type PriceState =
  | { key: string; status: "loading" }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "success"; prices: SkuPrice[] };

type AvailabilityState =
  | { key: string; status: "loading" }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "success"; availability: ComboAvailabilityInfo };

export function ComboDetailPage({ unavailable = false }: { unavailable?: boolean }) {
  const { comboId = "" } = useParams();
  return <ComboDetailForId key={comboId} comboId={comboId} unavailable={unavailable} />;
}

function ComboDetailForId({ comboId, unavailable }: { comboId: string; unavailable: boolean }) {
  const { combos, catalog, pricing, availability: availabilityPort } = useCombosRuntime();
  const [params] = useSearchParams();
  const scenario = params.get("scenario");
  const [state, setState] = useState<DetailState>({ key: "", status: "loading" });
  const [retry, setRetry] = useState(0);
  const [priceState, setPriceState] = useState<PriceState>({ key: "", status: "loading" });
  const [priceRetry, setPriceRetry] = useState(0);
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>({ key: "", status: "loading" });
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const identity = useRef(new RequestIdentity());
  const combosRevision = useMockStateRevision(["combos", "catalog", "pricing"]);
  const requestKey = JSON.stringify([comboId, retry, scenario, combosRevision]);

  useEffect(() => {
    const controller = new AbortController();
    const requests = identity.current;
    const requestId = requests.begin();
    void combos.getById(comboId, controller.signal).then((value) => {
      if (!requests.isCurrent(requestId, controller.signal)) return;
      if (!value) {
        setState({ key: requestKey, status: "success", combo: null });
        return;
      }
      const combo = structuredClone(value);
      if (scenario === "detail-inactive" || scenario === "unavailable-inactive") combo.status = "INACTIVO";
      setState({ key: requestKey, status: "success", combo });
    }).catch((reason: unknown) => {
      if (requests.isCurrent(requestId, controller.signal)) {
        setState({ key: requestKey, status: "error", message: reason instanceof Error ? reason.message : "No se pudo consultar el combo." });
      }
    });
    return () => {
      controller.abort();
      requests.invalidate();
    };
  }, [comboId, combos, requestKey, scenario]);

  const combo = state.key === requestKey && state.status === "success" ? state.combo : null;
  const isLoading = state.key !== requestKey || state.status === "loading";
  const error = state.key === requestKey && state.status === "error" ? state.message : null;
  const comboStatus = combo?.status;
  const componentsKey = combo ? combo.components.map((component) => `${component.sku}:${component.quantity}`).join("|") : "";
  // Keyed reads: a result only applies to the exact request it answered. When the
  // key changes the derived view is "loading" without a synchronous setState in an
  // effect (avoids cascading renders flagged by react-hooks/set-state-in-effect).
  const pricingRevision = useMockStateRevision(["pricing"]);
  const inventoryRevision = useMockStateRevision(["inventory", "catalog"]);
  const priceKey = JSON.stringify([comboId, componentsKey, priceRetry, scenario, pricingRevision]);
  const availabilityKey = JSON.stringify([comboId, componentsKey, comboStatus, availabilityRetry, scenario, inventoryRevision]);
  const priceResult: PriceState =
    combo && priceState.key === priceKey ? priceState : { key: priceKey, status: "loading" };
  const availabilityResult: AvailabilityState =
    combo && availabilityState.key === availabilityKey
      ? availabilityState
      : { key: availabilityKey, status: "loading" };

  // COM-02: consult current Pricing references instead of trusting stored prices.
  useEffect(() => {
    if (!combo) return;
    const controller = new AbortController();
    const skus = combo.components.map((component) => component.sku);
    const request =
      scenario === "pricing-error"
        ? Promise.reject(
            new Error("Pricing no está disponible temporalmente para confirmar las referencias vigentes."),
          )
        : pricing.readCurrent(skus, controller.signal);
    void request
      .then((prices) => {
        if (controller.signal.aborted) return;
        setPriceState({ key: priceKey, status: "success", prices });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setPriceState({ key: priceKey, status: "error", message: reason instanceof Error ? reason.message : "Pricing no está disponible." });
      });
    return () => controller.abort();
  }, [combo, pricing, priceKey, scenario]);

  // COM-03: recompute informative availability from the injectable snapshot and
  // the shared Catalog activity.
  useEffect(() => {
    if (!combo || comboStatus === undefined) return;
    let active = true;
    const components = combo.components.map((component) => ({ sku: component.sku, quantity: component.quantity }));
    void Promise.all([
      catalog.resolveSkus(components.map((component) => component.sku)),
      availabilityPort.readStocks(components.map((component) => component.sku)),
    ]).then(([resolved, readings]) => {
      if (!active) return;
      const sellable = new Map(resolved.map((entry) => [entry.sku, entry.sellable]));
      const computed = calculateInformativeAvailability(
        comboStatus,
        components.map((component) => ({ sku: component.sku, quantity: component.quantity, active: sellable.get(component.sku) ?? null })),
        new Map(readings.map((reading) => [reading.sku, reading])),
      );
      setAvailabilityState({ key: availabilityKey, status: "success", availability: applyAvailabilityScenario(computed, scenario) });
    }).catch((reason: unknown) => {
      if (!active) return;
      setAvailabilityState({ key: availabilityKey, status: "error", message: reason instanceof Error ? reason.message : "La disponibilidad no está disponible." });
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityPort, catalog, comboStatus, availabilityKey, scenario]);

  async function deactivate() {
    const current = state.status === "success" ? state.combo : null;
    if (!current || submitting) return;
    setSubmitting(true);
    setMutationError(null);
    try {
      const updated = await combos.deactivate(current.id);
      setState((previous) => previous.key === requestKey && previous.status === "success" ? { ...previous, combo: updated } : previous);
      setConfirm(false);
    } catch (reason) {
      setMutationError(reason instanceof Error ? reason.message : "No se pudo desactivar el combo.");
    } finally {
      setSubmitting(false);
    }
  }

  const breadcrumbs = [{ label: "Combos", to: "/combos" }, { label: combo?.name ?? "Detalle" }];

  if (isLoading) return <><PageHeader title="Detalle del combo" breadcrumbs={breadcrumbs} /><Text role="status">Cargando detalle…</Text></>;
  if (error) return <FeedbackAlert semantic="error" title="No se pudo consultar el combo" actions={<Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Reintentar</Button>}>{error}</FeedbackAlert>;
  if (!combo) return <><PageHeader title="Combo no encontrado" breadcrumbs={[{ label: "Combos", to: "/combos" }, { label: "No encontrado" }]} /><EmptyState title="No encontramos ese combo" description="La referencia puede no existir o ya no estar disponible." action={<Button component={Link} to="/combos">Volver a combos</Button>} /></>;

  const availabilityInfo: ComboAvailabilityInfo = availabilityResult.status === "success"
    ? availabilityResult.availability
    : { state: combo.status === "INACTIVO" ? "COMBO_INACTIVO" : "NO_VERIFICABLE", verifiable: false, quantity: null, freshness: "NO_VERIFICABLE", calculatedAt: null, reason: availabilityResult.status === "error" ? availabilityResult.message : "Consultando disponibilidad…" };
  const comboView: Combo = { ...combo, availability: availabilityInfo };

  if (unavailable && combo.status === "ACTIVO" && isVerifiedPositiveAvailability(availabilityInfo)) {
    return <Navigate to={`/combos/${combo.id}`} replace />;
  }

  const isUnavailable = isUnavailableForNewSales(comboView);
  const currentPrices = priceResult.status === "success" ? priceResult.prices : null;
  const currentTotals = currentPrices ? sumCurrentReferences(combo, currentPrices) : null;
  const storedRegularTotal = sumStored(combo, "regularUnitMinor");
  const storedPublicTotal = sumStored(combo, "publicUnitMinor");

  return <>
    <PageHeader title={unavailable ? "Combo no disponible" : combo.name} description={combo.description ?? undefined} breadcrumbs={breadcrumbs} actions={<Group><Button component={Link} to={`/combos/${combo.id}/editar`} variant="outline">Editar</Button>{combo.status === "ACTIVO" && !unavailable && <Button color="danger" onClick={() => setConfirm(true)}>Desactivar combo</Button>}</Group>} />
    {mutationError && <FeedbackAlert semantic="error" title="No se pudo desactivar el combo">{mutationError}</FeedbackAlert>}
    {isUnavailable && <FeedbackAlert semantic={availabilityInfo.state === "DISPONIBLE" ? "info" : "warning"} title={availabilityMessageText(comboView)}>{availabilityInfo.reason ?? "El estado administrativo se conserva; la disponibilidad es informativa y no garantiza stock."}</FeedbackAlert>}

    <Stack mt="lg" gap="lg">
      <SectionCard title="Resumen comercial">
        <Group gap="xl" wrap="wrap">
          <div><Text size="sm" c="dimmed">Estado</Text><StatusBadge>{combo.status}</StatusBadge></div>
          <div><Text size="sm" c="dimmed">Precio comercial guardado</Text><Text fw={600}>{formatMoney(combo.priceMinor)}</Text></div>
          <div><Text size="sm" c="dimmed">Disponibilidad estimada</Text><ComboAvailability combo={comboView} /></div>
        </Group>
      </SectionCard>

      <SectionCard title="Precios de referencia">
        {priceResult.status === "loading" && <Text size="sm" role="status">Consultando precios vigentes…</Text>}
        {priceResult.status === "error" && <FeedbackAlert semantic="warning" title="Precios de referencia vigentes no disponibles" actions={<Button variant="outline" onClick={() => setPriceRetry((value) => value + 1)}>Reintentar lectura</Button>}>{priceResult.message}</FeedbackAlert>}
        {currentTotals && <Group gap="xl" wrap="wrap">
          <div><Text size="sm" c="dimmed">Suma regular vigente</Text><Text fw={600}>{formatMoney(currentTotals.regularMinor)}</Text></div>
          <div><Text size="sm" c="dimmed">Suma pública vigente</Text><Text fw={600}>{formatMoney(currentTotals.publicMinor)}</Text></div>
          <div><Text size="sm" c="dimmed">Referencias vigentes confirmadas</Text><Text fw={600}>{currentTotals.confirmed} / {combo.components.length}</Text></div>
        </Group>}
        {currentTotals && !currentTotals.complete && <FeedbackAlert semantic="warning" title="Referencias vigentes parciales">No se confirmó una referencia global vigente única para todos los componentes.</FeedbackAlert>}
        <Text size="sm" c="dimmed" mt="md">Referencias almacenadas en el combo (histórico):</Text>
        <Group gap="xl" wrap="wrap">
          <div><Text size="sm" c="dimmed">Suma regular almacenada</Text><Text>{formatMoney(storedRegularTotal)}</Text></div>
          <div><Text size="sm" c="dimmed">Suma pública almacenada</Text><Text>{formatMoney(storedPublicTotal)}</Text></div>
        </Group>
      </SectionCard>

      <SectionCard title="Componentes">
        <Table.ScrollContainer minWidth={700}><Table><Table.Thead><Table.Tr><Table.Th>Producto</Table.Th><Table.Th>SKU vendible</Table.Th><Table.Th>Cantidad</Table.Th><Table.Th>Precio regular (vigente)</Table.Th><Table.Th>Precio público (vigente)</Table.Th><Table.Th>Subtotal regular</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{combo.components.map((item) => {
          const current = currentPrices?.find((price) => price.sku === item.sku);
          const currentRegular = current?.regularMinor ?? null;
          const currentPublic = current ? (current.offerMinor ?? current.regularMinor) : null;
          return <Table.Tr key={item.sku}>
            <Table.Td>{item.productName}</Table.Td>
            <Table.Td>{item.sku}</Table.Td>
            <Table.Td>{item.quantity}</Table.Td>
            <Table.Td>{current ? formatMoney(currentRegular) : priceResult.status === "loading" ? "Consultando…" : "No disponible"}</Table.Td>
            <Table.Td>{current ? formatMoney(currentPublic) : priceResult.status === "loading" ? "Consultando…" : "No disponible"}</Table.Td>
            <Table.Td>{current && currentRegular !== null ? formatMoney(currentRegular * item.quantity) : "No disponible"}</Table.Td>
          </Table.Tr>;
        })}</Table.Tbody></Table></Table.ScrollContainer>
      </SectionCard>

      {availabilityResult.status === "error" && <FeedbackAlert semantic="warning" title="Disponibilidad no verificable" actions={<Button variant="outline" onClick={() => setAvailabilityRetry((value) => value + 1)}>Reintentar disponibilidad</Button>}>{availabilityResult.message}</FeedbackAlert>}

      <Group>{unavailable && <Button component={Link} to={`/combos/${combo.id}`} variant="outline">Ver definición</Button>}{!unavailable && isUnavailable && <Button component={Link} to={`/combos/${combo.id}/no-disponible`} variant="outline">Ver situación de disponibilidad</Button>}<Button component={Link} to="/combos" variant="subtle">Volver a combos</Button></Group>
    </Stack>

    <ConfirmDialog opened={confirm} title="Desactivar combo" confirmLabel="Desactivar combo" destructive submitting={submitting} onCancel={() => setConfirm(false)} onConfirm={() => void deactivate()} error={mutationError ? <Text c="red" role="alert">{mutationError}</Text> : undefined}>
      <Text>El combo <strong>{combo.name}</strong> dejará de ofrecerse para nuevas ventas. Su definición histórica y sus componentes permanecerán conservados.</Text>
    </ConfirmDialog>
  </>;
}

function sumStored(combo: Combo, field: "regularUnitMinor" | "publicUnitMinor"): number | null {
  if (combo.components.some((component) => component[field] === null)) return null;
  return combo.components.reduce((sum, component) => sum + (component[field] ?? 0) * component.quantity, 0);
}

function sumCurrentReferences(combo: Combo, prices: SkuPrice[]): { regularMinor: number | null; publicMinor: number | null; confirmed: number; complete: boolean } {
  let regular = 0;
  let publicTotal = 0;
  let confirmed = 0;
  let complete = true;
  for (const component of combo.components) {
    const price = prices.find((candidate) => candidate.sku === component.sku);
    const effectivePublic = price ? price.offerMinor ?? price.regularMinor : null;
    if (!price || price.regularMinor === null || effectivePublic === null) { complete = false; continue; }
    confirmed += 1;
    regular += price.regularMinor * component.quantity;
    publicTotal += effectivePublic * component.quantity;
  }
  return { regularMinor: complete ? regular : null, publicMinor: complete ? publicTotal : null, confirmed, complete };
}

function applyAvailabilityScenario(computed: ComboAvailabilityInfo, scenario: string | null): ComboAvailabilityInfo {
  switch (scenario) {
    case "detail-active-zero":
    case "unavailable-zero-stock":
      return { ...computed, state: "AGOTADO", verifiable: true, quantity: 0, freshness: "ACTUALIZADA" };
    case "detail-stale":
      return { ...computed, state: "DESACTUALIZADA", verifiable: true, quantity: 4, freshness: "DESACTUALIZADA" };
    case "detail-incomplete":
      return { ...computed, state: "INCOMPLETA", verifiable: false, quantity: null, freshness: "INCOMPLETA" };
    case "detail-unverifiable":
    case "unavailable-unknown":
      return { ...computed, state: "NO_VERIFICABLE", verifiable: false, quantity: null, freshness: "NO_VERIFICABLE" };
    case "detail-component-inactive":
      return { ...computed, state: "COMPONENTE_INACTIVO", verifiable: false, quantity: null, freshness: "INCOMPLETA" };
    default:
      return computed;
  }
}
